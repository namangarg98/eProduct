import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi, product, renderApp } from './helpers.tsx';

const CATALOGUE = [
  product('1', 'Laptop'),
  product('2', 'Monitor'),
  product('3', 'Keyboard'),
  product('4', 'Mouse'),
  product('5', 'Webcam'),
  product('6', 'Headset'),
  product('7', 'Ring', 'jewelery'),
];

/** Fake backend with real top rated state, so the UI is tested against API behaviour. */
function mockBackend(initialFeatured: string[]) {
  let featured = [...initialFeatured];
  const byId = (id: string) => CATALOGUE.find((p) => p.id === id)!;
  const featuredProducts = () => featured.map(byId);

  return mockApi((url, init) => {
    const method = init?.method ?? 'GET';
    const toggle = url.match(/^\/api\/products\/featured\/(\w+)$/);
    if (toggle && method === 'PUT') {
      if (featured.length >= 5) return { status: 409, body: { error: 'You can choose at most 5 top rated products' } };
      featured = [...featured, toggle[1]!];
      return { status: 200, body: { productIds: featured } };
    }
    if (toggle && method === 'DELETE') {
      featured = featured.filter((id) => id !== toggle[1]);
      return { status: 200, body: { productIds: featured } };
    }
    if (url === '/api/categories') return { status: 200, body: ['electronics', 'jewelery'] };
    if (url === '/api/products/featured') return { status: 200, body: featuredProducts() };
    if (url === '/api/categories/electronics/products') {
      const inCategory = CATALOGUE.filter((p) => p.category === 'electronics');
      return {
        status: 200,
        body: {
          topRated: featuredProducts().filter((p) => p.category === 'electronics'),
          others: inCategory.filter((p) => !featured.includes(p.id)),
        },
      };
    }
    return { status: 404, body: { error: 'Not found' } };
  });
}

const tileTitles = (section: HTMLElement) =>
  within(section)
    .queryAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent);

const sectionByHeading = (name: string) => screen.getByRole('heading', { level: 2, name }).closest('section')!;

describe('Top rated (star) selection', () => {
  it('category link shows the chosen products as top rated and the rest as additional products', async () => {
    mockBackend(['3', '7', '1']);
    renderApp('/');
    await userEvent.click(await screen.findByRole('link', { name: 'electronics' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'electronics' })).toBeInTheDocument();
    expect(tileTitles(sectionByHeading('Top rated'))).toEqual(['Keyboard', 'Laptop']);
    expect(tileTitles(sectionByHeading('More products'))).toEqual(['Monitor', 'Mouse', 'Webcam', 'Headset']);
  });

  it('starring a product adds it to the home page; unstarring removes it', async () => {
    mockBackend(['1']);
    renderApp('/categories/electronics');

    await userEvent.click(await screen.findByRole('button', { name: 'Add Monitor to top rated' }));
    expect(await screen.findByRole('button', { name: 'Remove Monitor from top rated' })).toHaveAttribute('aria-pressed', 'true');
    expect(tileTitles(sectionByHeading('Top rated'))).toEqual(['Laptop', 'Monitor']);

    await userEvent.click(screen.getByRole('link', { name: 'eProduct' }));
    expect(await screen.findByRole('heading', { level: 3, name: 'Monitor' })).toBeInTheDocument();

    // On the home page, unstarring removes the tile itself.
    await userEvent.click(screen.getByRole('button', { name: 'Remove Laptop from top rated' }));
    await waitFor(() => expect(screen.queryByRole('heading', { level: 3, name: 'Laptop' })).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { level: 3, name: 'Monitor' })).toBeInTheDocument();
  });

  it('disables the remaining stars once 5 are chosen', async () => {
    mockBackend(['1', '2', '3', '4']);
    renderApp('/categories/electronics');

    const add = (title: string) => screen.findByRole('button', { name: `Add ${title} to top rated` });
    expect(await add('Headset')).toBeEnabled();

    await userEvent.click(await add('Webcam'));
    await screen.findByRole('button', { name: 'Remove Webcam from top rated' });

    expect(await add('Headset')).toBeDisabled();
    expect(await add('Headset')).toHaveAttribute('title', 'Maximum 5 top rated products');
    // Already-starred products can still be unstarred.
    expect(screen.getByRole('button', { name: 'Remove Laptop from top rated' })).toBeEnabled();
  });

  it('shows the server error when the API refuses a star (e.g. filled from another tab)', async () => {
    mockApi((url, init) => {
      if (init?.method === 'PUT') return { status: 409, body: { error: 'You can choose at most 5 top rated products' } };
      if (url === '/api/categories') return { status: 200, body: ['electronics'] };
      if (url === '/api/products/featured') return { status: 200, body: [] };
      return { status: 200, body: { topRated: [], others: CATALOGUE.slice(0, 2) } };
    });
    renderApp('/categories/electronics');

    await userEvent.click(await screen.findByRole('button', { name: 'Add Laptop to top rated' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('You can choose at most 5 top rated products');
    expect(screen.getByRole('button', { name: 'Add Laptop to top rated' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('home page explains how to choose when nothing is top rated', async () => {
    mockBackend([]);
    renderApp('/');
    expect(await screen.findByText(/No top rated products yet. Star up to 5/)).toBeInTheDocument();
  });
});
