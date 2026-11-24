import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openFeaturedRepository } from '../src/db/featuredRepository.ts';

describe('openFeaturedRepository', () => {
  let tempDir: string | undefined;
  afterEach(() => {
    if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  });

  it('seeds a new database and returns IDs in position order', () => {
    const repo = openFeaturedRepository(':memory:', ['3', '11', '12', '18', '5']);
    expect(repo.getFeaturedIds()).toEqual(['3', '11', '12', '18', '5']);
  });

  it('the table rejects more than 5 featured products', () => {
    expect(() => openFeaturedRepository(':memory:', ['1', '2', '3', '4', '5', '6'])).toThrow(/CHECK constraint/);
  });

  it('the table rejects the same product twice', () => {
    expect(() => openFeaturedRepository(':memory:', ['1', '1'])).toThrow(/UNIQUE constraint/);
  });

  describe('add', () => {
    it('appends to the end of the list', () => {
      const repo = openFeaturedRepository(':memory:', ['1', '2']);
      expect(repo.add('9')).toBe('added');
      expect(repo.getFeaturedIds()).toEqual(['1', '2', '9']);
    });

    it('does nothing when the product is already featured', () => {
      const repo = openFeaturedRepository(':memory:', ['1', '2']);
      expect(repo.add('1')).toBe('already-featured');
      expect(repo.getFeaturedIds()).toEqual(['1', '2']);
    });

    it('refuses a 6th product', () => {
      const repo = openFeaturedRepository(':memory:', ['1', '2', '3', '4', '5']);
      expect(repo.add('6')).toBe('full');
      expect(repo.getFeaturedIds()).toEqual(['1', '2', '3', '4', '5']);
    });
  });

  describe('remove', () => {
    it('closes the gap so the next add goes last', () => {
      const repo = openFeaturedRepository(':memory:', ['1', '2', '3', '4', '5']);
      repo.remove('2');
      expect(repo.getFeaturedIds()).toEqual(['1', '3', '4', '5']);
      expect(repo.add('9')).toBe('added');
      expect(repo.getFeaturedIds()).toEqual(['1', '3', '4', '5', '9']);
    });

    it('does nothing when the product is not featured', () => {
      const repo = openFeaturedRepository(':memory:', ['1', '2']);
      repo.remove('7');
      expect(repo.getFeaturedIds()).toEqual(['1', '2']);
    });
  });

  it('keeps changes across restarts and never re-seeds, even when emptied', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'eproduct-'));
    const dbPath = join(tempDir, 'test.db');
    const first = openFeaturedRepository(dbPath, ['1', '2']);
    first.remove('1');
    first.remove('2');
    expect(openFeaturedRepository(dbPath, ['1', '2']).getFeaturedIds()).toEqual([]);
  });
});
