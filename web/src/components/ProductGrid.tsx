import { Link } from 'react-router-dom';
import type { Product } from '../api.ts';
import { StarButton } from './StarButton.tsx';

function ProductTile({ product }: { product: Product }) {
  return (
    <div className="tile">
      {/* The star sits outside the link: a button inside a link is invalid and would navigate. */}
      <StarButton productId={product.id} title={product.title} />
      <Link to={`/products/${product.id}`} className="tile__link">
        <div className="tile__media">
          <img src={product.image} alt="" loading="lazy" />
        </div>
        <div className="tile__body">
          <span className="tile__category">{product.category}</span>
          <h3 className="tile__title">{product.title}</h3>
          <div className="tile__footer">
            <span className="price">${product.price.toFixed(2)}</span>
            <span className="rating">{product.rating.rate} / 5</span>
          </div>
        </div>
      </Link>
    </div>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid">
      {products.map((product) => (
        <li key={product.id}>
          <ProductTile product={product} />
        </li>
      ))}
    </ul>
  );
}
