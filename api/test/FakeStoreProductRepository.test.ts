import { describe, expect, it, vi } from 'vitest';
import { UpstreamError } from '../src/errors.ts';
import { FakeStoreProductRepository } from '../src/products/FakeStoreProductRepository.ts';

const upstream = [
  { id: 1, title: 'Mens Casual Shirt', price: 22.3, description: 'Slim fit', category: "men's clothing", image: 'https://x.test/1.png', rating: { rate: 4.1, count: 259 } },
  { id: 2, title: 'SSD 1TB', price: 109, description: 'Fast storage', category: 'electronics', image: 'https://x.test/2.png', rating: { rate: 4.8, count: 319 } },
];

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function makeRepo(fetchFn: typeof fetch, ttlMs?: number) {
  return new FakeStoreProductRepository({ baseUrl: 'https://store.test/', fetchFn, ttlMs });
}

describe('FakeStoreProductRepository', () => {
  it('maps upstream products and converts IDs to strings', async () => {
    const repo = makeRepo(vi.fn(async () => jsonResponse(upstream)));
    expect(await repo.findById('2')).toMatchObject({ id: '2', title: 'SSD 1TB' });
    expect(await repo.findById('999')).toBeUndefined();
  });

  it('search is case-insensitive across title, description and category', async () => {
    const repo = makeRepo(vi.fn(async () => jsonResponse(upstream)));
    expect((await repo.search('ssd')).map((p) => p.id)).toEqual(['2']);
    expect((await repo.search('SLIM')).map((p) => p.id)).toEqual(['1']);
    expect((await repo.search('Electronics')).map((p) => p.id)).toEqual(['2']);
    expect(await repo.search('nothing-matches')).toEqual([]);
  });

  it('caches the catalogue and shares one upstream call across concurrent requests', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(upstream));
    const repo = makeRepo(fetchFn);
    await Promise.all([repo.listCategories(), repo.search('a'), repo.findById('1')]);
    await repo.findByCategory('electronics');
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith('https://store.test/products', expect.anything());
  });

  it('refetches after the cache expires', async () => {
    const fetchFn = vi.fn(async () => jsonResponse(upstream));
    const repo = makeRepo(fetchFn, 0);
    await repo.listCategories();
    await repo.listCategories();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('throws UpstreamError on HTTP failure and does not cache the failure', async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse(upstream));
    const repo = makeRepo(fetchFn);
    await expect(repo.listCategories()).rejects.toBeInstanceOf(UpstreamError);
    expect(await repo.listCategories()).toEqual(['electronics', "men's clothing"]);
  });

  it('throws UpstreamError when the upstream response has an unexpected shape', async () => {
    const repo = makeRepo(vi.fn(async () => jsonResponse([{ id: 'oops' }])));
    await expect(repo.findById('1')).rejects.toBeInstanceOf(UpstreamError);
  });
});
