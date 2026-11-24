import { z } from 'zod';
import { UpstreamError } from '../errors.ts';
import type { Product } from '../types.ts';
import type { ProductRepository } from './ProductRepository.ts';

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5000;

// Upstream data is untrusted: validate it before it reaches the rest of the app.
const upstreamProductsSchema = z.array(
  z.object({
    id: z.number().int(),
    title: z.string(),
    price: z.number(),
    description: z.string(),
    category: z.string(),
    image: z.url(),
    rating: z.object({ rate: z.number(), count: z.number() }),
  }),
);

interface Options {
  baseUrl: string;
  ttlMs?: number;
  fetchFn?: typeof fetch;
}

/**
 * Fake Store has 20 products and no search endpoint, so the whole catalogue is
 * fetched once and cached; every query runs against the cache. A large catalogue
 * would need a different implementation, which the ProductRepository interface allows.
 */
export class FakeStoreProductRepository implements ProductRepository {
  readonly #baseUrl: string;
  readonly #ttlMs: number;
  readonly #fetch: typeof fetch;
  #cache: { products: Promise<Product[]>; expiresAt: number } | undefined;

  constructor({ baseUrl, ttlMs = DEFAULT_TTL_MS, fetchFn = fetch }: Options) {
    this.#baseUrl = baseUrl.replace(/\/$/, '');
    this.#ttlMs = ttlMs;
    this.#fetch = fetchFn;
  }

  async findById(id: string): Promise<Product | undefined> {
    return (await this.#all()).find((product) => product.id === id);
  }

  async findByCategory(category: string): Promise<Product[]> {
    return (await this.#all()).filter((product) => product.category === category);
  }

  async listCategories(): Promise<string[]> {
    const categories = new Set((await this.#all()).map((product) => product.category));
    return [...categories].sort();
  }

  async search(term: string): Promise<Product[]> {
    const needle = term.toLowerCase();
    return (await this.#all()).filter((product) =>
      [product.title, product.description, product.category].some((text) =>
        text.toLowerCase().includes(needle),
      ),
    );
  }

  #all(): Promise<Product[]> {
    if (!this.#cache || Date.now() >= this.#cache.expiresAt) {
      // Cache the promise so concurrent requests share one upstream call.
      const products = this.#fetchAll();
      this.#cache = { products, expiresAt: Date.now() + this.#ttlMs };
      // Never cache a failure: the next request retries.
      products.catch(() => {
        if (this.#cache?.products === products) this.#cache = undefined;
      });
    }
    return this.#cache.products;
  }

  async #fetchAll(): Promise<Product[]> {
    let body: unknown;
    try {
      const response = await this.#fetch(`${this.#baseUrl}/products`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      body = await response.json();
    } catch (cause) {
      throw new UpstreamError('Product service unavailable', { cause });
    }
    const parsed = upstreamProductsSchema.safeParse(body);
    if (!parsed.success) {
      throw new UpstreamError('Product service unavailable', { cause: parsed.error });
    }
    return parsed.data.map((product) => ({ ...product, id: String(product.id) }));
  }
}
