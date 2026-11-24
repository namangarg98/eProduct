import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi, product, renderApp } from './helpers.tsx';

describe('Search', () => {
  it('searches only when the search button is clicked and shows only matching results', async () => {
    const fetchMock = mockApi((url) => {
      if (url === '/api/categories') return { status: 200, body: [] };
      if (url === '/api/products/featured') return { status: 200, body: [product('9', 'Featured Item')] };
      if (url === '/api/products?search=gold%20ring') return { status: 200, body: [product('2', 'Gold Ring', 'jewelery')] };
      return { status: 404, body: { error: 'Not found' } };
    });
    renderApp('/');
    await screen.findByText('Featured Item');

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search products' }), '  gold ring ');
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('search='), undefined);

    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(await screen.findByRole('heading', { name: 'Results for “gold ring”' })).toBeInTheDocument();
    const results = within(screen.getByRole('list')).getAllByRole('link');
    expect(results.map((tile) => within(tile).getByRole('heading').textContent)).toEqual(['Gold Ring']);
    expect(fetchMock).toHaveBeenCalledWith('/api/products?search=gold%20ring', undefined);
  });

  it('shows a message when nothing matches', async () => {
    mockApi(() => ({ status: 200, body: [] }));
    renderApp('/search?q=zzz');
    expect(await screen.findByText('No products match “zzz”.')).toBeInTheDocument();
  });
});
