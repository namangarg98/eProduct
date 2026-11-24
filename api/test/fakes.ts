import { openFeaturedRepository, type FeaturedRepository } from '../src/db/featuredRepository.ts';
import type { EmailMessage, EmailSender } from '../src/email/EmailSender.ts';
import type { ProductRepository } from '../src/products/ProductRepository.ts';
import type { Product } from '../src/types.ts';

function makeProduct(id: string, category: string, overrides: Partial<Product> = {}): Product {
  return {
    id,
    title: `Product ${id}`,
    price: 10,
    description: `Description ${id}`,
    category,
    image: `https://example.com/${id}.png`,
    rating: { rate: 4, count: 10 },
    ...overrides,
  };
}

const PRODUCTS: Product[] = [
  makeProduct('1', 'electronics', { title: 'Wireless Keyboard' }),
  makeProduct('2', 'electronics', { title: 'USB Monitor' }),
  makeProduct('3', 'electronics', { title: 'Laptop Stand' }),
  makeProduct('4', 'jewelery', { title: 'Silver Ring', description: 'Handmade ring' }),
  makeProduct('5', 'jewelery', { title: 'Gold Chain' }),
  makeProduct('6', "men's clothing", { title: 'Cotton Jacket' }),
];

/** In-memory ProductRepository with the same matching rules as the real one. */
export class InMemoryProductRepository implements ProductRepository {
  private readonly products: Product[];

  constructor(products: Product[] = PRODUCTS) {
    this.products = products;
  }

  async findById(id: string) {
    return this.products.find((product) => product.id === id);
  }
  async findByCategory(category: string) {
    return this.products.filter((product) => product.category === category);
  }
  async listCategories() {
    return [...new Set(this.products.map((product) => product.category))].sort();
  }
  async search(term: string) {
    const needle = term.toLowerCase();
    return this.products.filter((product) =>
      [product.title, product.description, product.category].some((text) =>
        text.toLowerCase().includes(needle),
      ),
    );
  }
}

/** The real repository on an in-memory database: same rules as production, nothing on disk. */
export const fixedFeatured = (ids: string[]): FeaturedRepository => openFeaturedRepository(':memory:', ids);

export class RecordingEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];
  async send(message: EmailMessage) {
    this.sent.push(message);
  }
}
