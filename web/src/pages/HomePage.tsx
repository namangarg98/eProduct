import { api } from '../api.ts';
import { AsyncContent } from '../components/AsyncContent.tsx';
import { ProductGrid } from '../components/ProductGrid.tsx';
import { MAX_FEATURED, useFeatured } from '../featured.tsx';
import { useApi } from '../useApi.ts';

export function HomePage() {
  const { version } = useFeatured();
  const featured = useApi(api.getFeatured, 'featured', version);

  return (
    <>
      <section className="hero">
        <h1>Find something you'll love</h1>
        <p>Browse our catalogue, or start with the products our team rates the best.</p>
      </section>
      <h2 className="section-title">Top rated</h2>
      <AsyncContent state={featured}>
        {(products) =>
          products.length > 0 ? (
            <ProductGrid products={products} />
          ) : (
            <p className="notice">No top rated products yet. Star up to {MAX_FEATURED} products to feature them here.</p>
          )
        }
      </AsyncContent>
    </>
  );
}
