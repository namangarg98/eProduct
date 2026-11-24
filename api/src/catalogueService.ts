import { MAX_FEATURED, type FeaturedRepository } from './db/featuredRepository.ts';
import { ConflictError, NotFoundError } from './errors.ts';
import type { ProductRepository } from './products/ProductRepository.ts';
import type { CategoryProducts, Product } from './types.ts';

export class CatalogueService {
  readonly #products: ProductRepository;
  readonly #featured: FeaturedRepository;

  constructor(products: ProductRepository, featured: FeaturedRepository) {
    this.#products = products;
    this.#featured = featured;
  }

  /** The chosen "top rated" products, in order. IDs no longer in the catalogue are skipped. */
  async getFeatured(): Promise<Product[]> {
    const ids = this.#featured.getFeaturedIds();
    const products = await Promise.all(ids.map((id) => this.#products.findById(id)));
    return products.filter((product, index): product is Product => {
      if (!product) console.warn('featured_product_missing', `id=${ids[index]}`);
      return product !== undefined;
    });
  }

  /** Marks a product as top rated (appended last). Returns the updated IDs, in order. */
  async addFeatured(id: string): Promise<string[]> {
    await this.getProduct(id); // 404 for products that do not exist
    if (this.#featured.add(id) === 'full') {
      throw new ConflictError(`You can choose at most ${MAX_FEATURED} top rated products`);
    }
    return this.#featured.getFeaturedIds();
  }

  /**
   * Removes a product from top rated. Not checked against the catalogue, so a product that
   * has since disappeared from the data source can still be removed.
   */
  removeFeatured(id: string): string[] {
    this.#featured.remove(id);
    return this.#featured.getFeaturedIds();
  }

  /** topRated: the chosen products in this category (≤ 5); others: the rest of the category. */
  async getCategoryProducts(category: string): Promise<CategoryProducts> {
    const products = await this.#products.findByCategory(category);
    if (products.length === 0) throw new NotFoundError('Category not found');

    const featuredIds = this.#featured.getFeaturedIds();
    const topRated = featuredIds
      .map((id) => products.find((product) => product.id === id))
      .filter((product) => product !== undefined);
    const others = products.filter((product) => !featuredIds.includes(product.id));
    return { topRated, others };
  }

  listCategories(): Promise<string[]> {
    return this.#products.listCategories();
  }

  search(term: string): Promise<Product[]> {
    return this.#products.search(term);
  }

  async getProduct(id: string): Promise<Product> {
    const product = await this.#products.findById(id);
    if (!product) throw new NotFoundError('Product not found');
    return product;
  }
}
