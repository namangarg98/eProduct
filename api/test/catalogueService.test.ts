import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogueService } from '../src/catalogueService.ts';
import { NotFoundError } from '../src/errors.ts';
import { fixedFeatured, InMemoryProductRepository } from './fakes.ts';

const ids = (products: { id: string }[]) => products.map((product) => product.id);

describe('CatalogueService', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('getFeatured', () => {
    it('returns the chosen products in the chosen order', async () => {
      const service = new CatalogueService(new InMemoryProductRepository(), fixedFeatured(['5', '1', '6', '3', '4']));
      expect(ids(await service.getFeatured())).toEqual(['5', '1', '6', '3', '4']);
    });

    it('skips featured IDs that are no longer in the catalogue', async () => {
      const service = new CatalogueService(new InMemoryProductRepository(), fixedFeatured(['5', '999', '1']));
      expect(ids(await service.getFeatured())).toEqual(['5', '1']);
      expect(console.warn).toHaveBeenCalledWith('featured_product_missing', 'id=999');
    });
  });

  describe('getCategoryProducts', () => {
    it('top rated comes only from the chosen products, in chosen order, with the rest in others', async () => {
      const service = new CatalogueService(new InMemoryProductRepository(), fixedFeatured(['3', '4', '1']));
      const result = await service.getCategoryProducts('electronics');
      expect(ids(result.topRated)).toEqual(['3', '1']);
      expect(ids(result.others)).toEqual(['2']);
    });

    it('top rated is empty when none of the chosen products are in the category', async () => {
      const service = new CatalogueService(new InMemoryProductRepository(), fixedFeatured(['1', '2']));
      const result = await service.getCategoryProducts('jewelery');
      expect(result.topRated).toEqual([]);
      expect(ids(result.others)).toEqual(['4', '5']);
    });

    it('throws NotFoundError for an unknown category', async () => {
      const service = new CatalogueService(new InMemoryProductRepository(), fixedFeatured([]));
      await expect(service.getCategoryProducts('toys')).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  it('getProduct throws NotFoundError for an unknown id', async () => {
    const service = new CatalogueService(new InMemoryProductRepository(), fixedFeatured([]));
    await expect(service.getProduct('999')).rejects.toBeInstanceOf(NotFoundError);
  });
});
