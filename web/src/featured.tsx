import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api.ts';

export const MAX_FEATURED = 5;

interface FeaturedState {
  /** Starred product IDs in display order; undefined until loaded. */
  ids: string[] | undefined;
  /** Increments on every change, so pages showing top rated products know to reload. */
  version: number;
  /** Message from the last failed star/unstar, if any. */
  error: string | undefined;
  toggle: (id: string) => Promise<void>;
}

const FeaturedContext = createContext<FeaturedState | undefined>(undefined);

/** Single source of truth for which products are top rated, shared by every tile and page. */
export function FeaturedProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>();
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string>();

  // If this fails, `ids` stays undefined and stars are hidden; the pages show their own
  // load errors, so no extra banner here. `error` is only for failed star clicks.
  useEffect(() => {
    api.getFeatured().then(
      (products) => setIds(products.map((product) => product.id)),
      () => {},
    );
  }, []);

  const toggle = useCallback(
    async (id: string) => {
      setError(undefined);
      try {
        const { productIds } = ids?.includes(id) ? await api.removeFeatured(id) : await api.addFeatured(id);
        // The server's list is authoritative (it enforces the limit and order).
        setIds(productIds);
        setVersion((current) => current + 1);
      } catch (err) {
        setError((err as Error).message);
      }
    },
    [ids],
  );

  return <FeaturedContext.Provider value={{ ids, version, error, toggle }}>{children}</FeaturedContext.Provider>;
}

export function useFeatured(): FeaturedState {
  const context = useContext(FeaturedContext);
  if (!context) throw new Error('useFeatured must be used inside FeaturedProvider');
  return context;
}
