import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.ts';
import { AsyncContent } from '../components/AsyncContent.tsx';
import { EnquiryForm } from '../components/EnquiryForm.tsx';
import { useApi } from '../useApi.ts';

export function ProductPage() {
  const { id = '' } = useParams();
  const product = useApi(() => api.getProduct(id), id);
  const [enquiring, setEnquiring] = useState(false);

  return (
    <AsyncContent state={product}>
      {(product) => {
        const categoryUrl = `/categories/${encodeURIComponent(product.category)}`;
        return (
          <>
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <Link to="/">Home</Link> / <Link to={categoryUrl}>{product.category}</Link>
            </nav>
            <article className="product">
              <div className="product__media">
                <img src={product.image} alt={product.title} />
              </div>
              <div>
                <Link to={categoryUrl} className="badge">
                  {product.category}
                </Link>
                <h1 className="product__title">{product.title}</h1>
                <span className="rating">
                  {product.rating.rate} / 5 · {product.rating.count} reviews
                </span>
                <p className="product__price">${product.price.toFixed(2)}</p>
                <p className="product__description">{product.description}</p>
                {enquiring ? (
                  <EnquiryForm productId={product.id} />
                ) : (
                  <button className="button button--large" type="button" onClick={() => setEnquiring(true)}>
                    Enquire
                  </button>
                )}
              </div>
            </article>
          </>
        );
      }}
    </AsyncContent>
  );
}
