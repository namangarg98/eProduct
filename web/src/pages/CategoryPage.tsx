import { useParams } from 'react-router-dom';
import { api } from '../api.ts';
import { AsyncContent } from '../components/AsyncContent.tsx';
import { ProductGrid } from '../components/ProductGrid.tsx';
import { useFeatured } from '../featured.tsx';
import { useApi } from '../useApi.ts';

export function CategoryPage() {
  const { name = '' } = useParams();
  const { version } = useFeatured();
  // Reload when the top rated choice changes, so a starred product moves into "Top rated".
  const products = useApi(() => api.getCategoryProducts(name), name, version);

  return (
    <>
      <h1 className="page-title">{name}</h1>
      <AsyncContent state={products}>
        {({ topRated, others }) => (
          <>
            <p className="muted">{topRated.length + others.length} products</p>
            {/* Hidden when none of the chosen top-rated products are in this category. */}
            {topRated.length > 0 && (
              <section className="section">
                <h2 className="section-title">Top rated</h2>
                <ProductGrid products={topRated} />
              </section>
            )}
            {others.length > 0 && (
              <section className="section">
                <h2 className="section-title">{topRated.length > 0 ? 'More products' : 'Products'}</h2>
                <ProductGrid products={others} />
              </section>
            )}
          </>
        )}
      </AsyncContent>
    </>
  );
}
