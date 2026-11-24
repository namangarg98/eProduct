import { Link, NavLink, Outlet } from 'react-router-dom';
import { api } from '../api.ts';
import { useFeatured } from '../featured.tsx';
import { useApi } from '../useApi.ts';
import { SearchBar } from './SearchBar.tsx';

export function Layout() {
  const categories = useApi(api.getCategories, 'categories');
  const { error: featuredError } = useFeatured();

  return (
    <>
      <header className="header">
        <div className="header__inner">
          <Link to="/" className="logo">
            e<span>Product</span>
          </Link>
          <nav className="nav" aria-label="Categories">
            {categories.status === 'success' &&
              categories.data.map((category) => (
                <NavLink key={category} to={`/categories/${encodeURIComponent(category)}`}>
                  {category}
                </NavLink>
              ))}
          </nav>
          <SearchBar />
        </div>
      </header>
      <main className="main">
        {featuredError && (
          <p role="alert" className="alert">
            {featuredError}
          </p>
        )}
        <Outlet />
      </main>
      <footer className="footer">
        <div className="footer__inner">© {new Date().getFullYear()} eProduct · Proof of concept</div>
      </footer>
    </>
  );
}
