import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import type { Product } from '../src/api.ts';
import { App } from '../src/App.tsx';

export const product = (id: string, title: string, category = 'electronics'): Product => ({
  id,
  title,
  price: 9.99,
  description: `About ${title}`,
  category,
  image: `https://example.com/${id}.png`,
  rating: { rate: 4.5, count: 10 },
});

type Handler = (url: string, init?: RequestInit) => { status: number; body?: unknown };

/** Stubs fetch with a router of `/api/...` path → response, and returns the mock for assertions. */
export function mockApi(handler: Handler) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const { status, body } = handler(url, init);
    return new Response(body === undefined ? null : JSON.stringify(body), { status });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

export function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}
