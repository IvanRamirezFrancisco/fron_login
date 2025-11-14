export interface Product {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  images: string[];
  category: ProductCategory;
  brand: string;
  inStock: boolean;
  stockQuantity: number;
  rating: number;
  reviewCount: number;
  specifications: ProductSpecification[];
  tags: string[];
  featured: boolean;
  isNew: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parentId?: string;
  subcategories?: ProductCategory[];
}

export interface ProductSpecification {
  name: string;
  value: string;
  unit?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedOptions?: { [key: string]: string };
}

export interface ProductFilter {
  categories?: string[];
  brands?: string[];
  priceRange?: {
    min: number;
    max: number;
  };
  inStockOnly?: boolean;
  rating?: number;
  search?: string;
}

export interface ProductSort {
  field: 'name' | 'price' | 'rating' | 'createdAt';
  direction: 'asc' | 'desc';
}

export interface ProductSearchResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: {
    categories: ProductCategory[];
    brands: string[];
    priceRange: {
      min: number;
      max: number;
    };
  };
}