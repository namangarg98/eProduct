import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout.tsx';
import { FeaturedProvider } from './featured.tsx';
import { CategoryPage } from './pages/CategoryPage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { ProductPage } from './pages/ProductPage.tsx';
import { SearchPage } from './pages/SearchPage.tsx';

export function App() {
  return (
    <FeaturedProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="categories/:name" element={<CategoryPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="products/:id" element={<ProductPage />} />
          <Route path="*" element={<p>Page not found.</p>} />
        </Route>
      </Routes>
    </FeaturedProvider>
  );
}
