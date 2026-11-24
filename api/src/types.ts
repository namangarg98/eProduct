export interface Product {
  /** String so the ID format is not tied to the current data source. */
  id: string;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: { rate: number; count: number };
}

export interface CategoryProducts {
  /** Featured products in this category, in their chosen order (max 5). */
  topRated: Product[];
  /** Remaining products in the category, never repeating topRated. */
  others: Product[];
}
