import type { Product } from '../types.ts';

/**
 * The product data source. Swap the implementation (e.g. a CMS, Postgres, a search
 * engine) without touching services, routes or the web client.
 */
export interface ProductRepository {
  findById(id: string): Promise<Product | undefined>;
  findByCategory(category: string): Promise<Product[]>;
  listCategories(): Promise<string[]>;
  /** Case-insensitive match on title, description or category. */
  search(term: string): Promise<Product[]>;
}
