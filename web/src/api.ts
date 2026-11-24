// The only module that knows the backend's URLs and response shapes.

export interface Product {
  id: string;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating: { rate: number; count: number };
}

export interface CategoryProducts {
  topRated: Product[];
  others: Product[];
}

export interface EnquiryInput {
  productId: string;
  name: string;
  email: string;
  phone?: string;
  message?: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, init);
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(response.status, body.error ?? 'Something went wrong');
  }
  return (response.status === 204 ? undefined : await response.json()) as T;
}

export const api = {
  getFeatured: () => request<Product[]>('/products/featured'),
  getCategories: () => request<string[]>('/categories'),
  getCategoryProducts: (name: string) =>
    request<CategoryProducts>(`/categories/${encodeURIComponent(name)}/products`),
  search: (term: string) => request<Product[]>(`/products?search=${encodeURIComponent(term)}`),
  getProduct: (id: string) => request<Product>(`/products/${encodeURIComponent(id)}`),
  addFeatured: (id: string) =>
    request<{ productIds: string[] }>(`/products/featured/${encodeURIComponent(id)}`, { method: 'PUT' }),
  removeFeatured: (id: string) =>
    request<{ productIds: string[] }>(`/products/featured/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  submitEnquiry: (enquiry: EnquiryInput) =>
    request<void>('/enquiries', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(enquiry),
    }),
};
