import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

export const MAX_FEATURED = 5;

type AddResult = 'added' | 'already-featured' | 'full';

export interface FeaturedRepository {
  /** Product IDs chosen as "top rated", in display order. */
  getFeaturedIds(): string[];
  /** Appends a product to the end of the list, unless it is already there or the list is full. */
  add(productId: string): AddResult;
  /** Removes a product and closes the gap, so positions stay 1..n. No-op if not featured. */
  remove(productId: string): void;
}

// The table enforces the business rules: max 5 (positions 1-5), ordered, no duplicates.
// Only the product ID is stored; product data always comes live from ProductRepository.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS featured_products (
    position   INTEGER PRIMARY KEY CHECK (position BETWEEN 1 AND ${MAX_FEATURED}),
    product_id TEXT    NOT NULL UNIQUE
  ) STRICT`;

/** Opens (or creates) the SQLite database and seeds it on first run only, so changes survive restarts. */
export function openFeaturedRepository(dbPath: string, seedIds: string[]): FeaturedRepository {
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.exec(SCHEMA);

  const selectIds = db.prepare('SELECT product_id FROM featured_products ORDER BY position').pluck();
  const insert = db.prepare('INSERT INTO featured_products (position, product_id) VALUES (?, ?)');
  const deleteAll = db.prepare('DELETE FROM featured_products');
  const getIds = () => selectIds.all() as string[];

  // Rewrites the whole list in one transaction: renumbering in place could briefly
  // collide on the position primary key, and 5 rows make a rewrite trivially cheap.
  const replaceAll = db.transaction((ids: string[]) => {
    deleteAll.run();
    ids.forEach((id, index) => insert.run(index + 1, id));
  });

  // Each transaction reads and writes synchronously, so concurrent requests cannot interleave
  // (e.g. two requests both seeing 4 products and adding a 5th and 6th).
  const add = db.transaction((productId: string): AddResult => {
    const ids = getIds();
    if (ids.includes(productId)) return 'already-featured';
    if (ids.length >= MAX_FEATURED) return 'full';
    insert.run(ids.length + 1, productId);
    return 'added';
  });

  const remove = db.transaction((productId: string) => {
    const ids = getIds();
    if (ids.includes(productId)) replaceAll(ids.filter((id) => id !== productId));
  });

  // Seed once per database (tracked with SQLite's user_version), not "whenever empty":
  // otherwise un-starring every product would bring the seed back on the next restart.
  if (db.pragma('user_version', { simple: true }) === 0) {
    db.transaction(() => {
      replaceAll(seedIds);
      db.pragma('user_version = 1');
    })();
  }

  return { getFeaturedIds: getIds, add, remove };
}
