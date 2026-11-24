import { useSearchParams } from 'react-router-dom';
import { api } from '../api.ts';
import { AsyncContent } from '../components/AsyncContent.tsx';
import { ProductGrid } from '../components/ProductGrid.tsx';
import { useApi } from '../useApi.ts';

export function SearchPage() {
  const [params] = useSearchParams();
  const term = params.get('q')?.trim() ?? '';
  const results = useApi(() => (term ? api.search(term) : Promise.resolve([])), term);

  if (!term) return <p className="notice">Enter a search term to find products.</p>;

  return (
    <>
      <h1 className="page-title">Results for “{term}”</h1>
      <AsyncContent state={results}>
        {(products) =>
          products.length > 0 ? (
            <>
              <p className="muted">{products.length} found</p>
              <ProductGrid products={products} />
            </>
          ) : (
            <p className="notice">No products match “{term}”.</p>
          )
        }
      </AsyncContent>
    </>
  );
}
