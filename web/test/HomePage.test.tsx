import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi, product, renderApp } from './helpers.tsx';

const FEATURED = [
  product('1', 'Laptop'),
  product('2', 'Ring', 'jewelery'),
  product('3', 'Jacket', "men's clothing"),
  product('4', 'Monitor'),
  product('5', 'Necklace', 'jewelery'),
];

describe('Home page', () => {
  it('shows the 5 featured products and links each tile to its product page', async () => {
    mockApi((url) => {
      if (url === '/api/categories') return { status: 200, body: ['electronics', 'jewelery'] };
      if (url === '/api/products/featured') return { status: 200, body: FEATURED };
      if (url === '/api/products/2') return { status: 200, body: FEATURED[1] };
      return { status: 404, body: { error: 'Not found' } };
    });
    renderApp('/');

    const grid = await screen.findByRole('list');
    const tiles = within(grid).getAllByRole('link');
    expect(tiles.map((tile) => within(tile).getByRole('heading').textContent)).toEqual([
      'Laptop',
      'Ring',
      'Jacket',
      'Monitor',
      'Necklace',
    ]);
    expect(tiles[0]).toHaveTextContent('$9.99');

    await userEvent.click(tiles[1]!);
    expect(await screen.findByRole('heading', { level: 1, name: 'Ring' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enquire' })).toBeInTheDocument();
  });

  it('shows the API error message when products fail to load', async () => {
    mockApi((url) =>
      url === '/api/products/featured'
        ? { status: 502, body: { error: 'Product service unavailable' } }
        : { status: 200, body: [] },
    );
    renderApp('/');
    expect(await screen.findByRole('alert')).toHaveTextContent('Product service unavailable');
  });
});
