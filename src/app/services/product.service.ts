import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Product, ProductCategory, ProductFilter, ProductSort, ProductSearchResponse } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private products: Product[] = [
    // Guitarras
    {
      id: '1',
      name: 'Guitarra Eléctrica Fender Stratocaster',
      description: 'Guitarra eléctrica clásica Fender Stratocaster con sonido auténtico y versatilidad excepcional. Perfecta para todos los estilos musicales.',
      shortDescription: 'Guitarra eléctrica profesional con sonido clásico',
      price: 899.99,
      originalPrice: 1099.99,
      discount: 18,
      images: ['/assets/logoP.png'],
      category: { id: 'guitars', name: 'Guitarras', slug: 'guitarras', icon: 'music_note' },
      brand: 'Fender',
      inStock: true,
      stockQuantity: 15,
      rating: 4.8,
      reviewCount: 124,
      specifications: [
        { name: 'Cuerpo', value: 'Aliso' },
        { name: 'Mástil', value: 'Arce' },
        { name: 'Trastes', value: '22' },
        { name: 'Pastillas', value: '3 Single Coil' }
      ],
      tags: ['eléctrica', 'profesional', 'versátil'],
      featured: true,
      isNew: false,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    },
    {
      id: '2',
      name: 'Guitarra Acústica Taylor 814ce',
      description: 'Guitarra acústica de alta gama Taylor con electrificación y sonido excepcional. Ideal para presentaciones en vivo y grabaciones.',
      shortDescription: 'Guitarra acústica premium con electrificación',
      price: 3299.99,
      images: ['/assets/logoP.png'],
      category: { id: 'guitars', name: 'Guitarras', slug: 'guitarras', icon: 'music_note' },
      brand: 'Taylor',
      inStock: true,
      stockQuantity: 8,
      rating: 4.9,
      reviewCount: 89,
      specifications: [
        { name: 'Tapa', value: 'Abeto de Sitka sólido' },
        { name: 'Aros y Fondo', value: 'Palisandro del Este Indio sólido' },
        { name: 'Mástil', value: 'Caoba tropical' },
        { name: 'Electrificación', value: 'Taylor ES2' }
      ],
      tags: ['acústica', 'premium', 'electrificada'],
      featured: true,
      isNew: false,
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-20')
    },
    // Pianos
    {
      id: '3',
      name: 'Piano Digital Yamaha P-125',
      description: 'Piano digital portátil con teclas contrapesadas y sonidos auténticos de piano de cola. Perfecto para principiantes y profesionales.',
      shortDescription: 'Piano digital portátil de 88 teclas',
      price: 649.99,
      images: ['/assets/logoP.png'],
      category: { id: 'pianos', name: 'Pianos', slug: 'pianos', icon: 'piano' },
      brand: 'Yamaha',
      inStock: true,
      stockQuantity: 12,
      rating: 4.7,
      reviewCount: 156,
      specifications: [
        { name: 'Teclas', value: '88 teclas contrapesadas' },
        { name: 'Sonidos', value: '24 voces' },
        { name: 'Polifonía', value: '192 notas' },
        { name: 'Conectividad', value: 'USB, MIDI' }
      ],
      tags: ['digital', 'portátil', '88-teclas'],
      featured: false,
      isNew: true,
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date('2024-02-01')
    },
    // Baterías
    {
      id: '4',
      name: 'Batería Pearl Export EXX725S',
      description: 'Set completo de batería Pearl Export con 5 tambores y herrajes incluidos. Excelente calidad para principiantes y intermedios.',
      shortDescription: 'Set completo de batería de 5 piezas',
      price: 799.99,
      originalPrice: 899.99,
      discount: 11,
      images: ['/assets/logoP.png'],
      category: { id: 'drums', name: 'Baterías', slug: 'baterias', icon: 'radio' },
      brand: 'Pearl',
      inStock: true,
      stockQuantity: 6,
      rating: 4.6,
      reviewCount: 73,
      specifications: [
        { name: 'Configuración', value: '5 piezas' },
        { name: 'Bombo', value: '22" x 18"' },
        { name: 'Tarola', value: '14" x 5.5"' },
        { name: 'Toms', value: '10", 12", 16"' }
      ],
      tags: ['acústica', 'completa', 'principiantes'],
      featured: false,
      isNew: false,
      createdAt: new Date('2024-01-25'),
      updatedAt: new Date('2024-01-25')
    },
    // Bajos
    {
      id: '5',
      name: 'Bajo Eléctrico Music Man StingRay',
      description: 'Bajo eléctrico de 4 cuerdas con sonido distintivo y construcción de alta calidad. Utilizado por profesionales en todo el mundo.',
      shortDescription: 'Bajo eléctrico profesional de 4 cuerdas',
      price: 1899.99,
      images: ['/assets/logoP.png'],
      category: { id: 'bass', name: 'Bajos', slug: 'bajos', icon: 'queue_music' },
      brand: 'Music Man',
      inStock: true,
      stockQuantity: 4,
      rating: 4.9,
      reviewCount: 45,
      specifications: [
        { name: 'Cuerdas', value: '4' },
        { name: 'Cuerpo', value: 'Fresno del pantano' },
        { name: 'Mástil', value: 'Arce' },
        { name: 'Pastilla', value: 'Humbucker activa' }
      ],
      tags: ['eléctrico', 'profesional', '4-cuerdas'],
      featured: true,
      isNew: false,
      createdAt: new Date('2024-01-18'),
      updatedAt: new Date('2024-01-18')
    }
  ];

  private categories: ProductCategory[] = [
    { id: 'guitars', name: 'Guitarras', slug: 'guitarras', icon: 'music_note' },
    { id: 'pianos', name: 'Pianos', slug: 'pianos', icon: 'piano' },
    { id: 'drums', name: 'Baterías', slug: 'baterias', icon: 'radio' },
    { id: 'bass', name: 'Bajos', slug: 'bajos', icon: 'queue_music' },
    { id: 'wind', name: 'Vientos', slug: 'vientos', icon: 'wind_power' },
    { id: 'accessories', name: 'Accesorios', slug: 'accesorios', icon: 'settings' }
  ];

  constructor() { }

  // Obtener todos los productos
  getProducts(): Observable<Product[]> {
    return of(this.products).pipe(delay(500));
  }

  // Obtener producto por ID
  getProduct(id: string): Observable<Product | undefined> {
    const product = this.products.find(p => p.id === id);
    return of(product).pipe(delay(300));
  }

  // Buscar productos con filtros
  searchProducts(
    filter: ProductFilter = {},
    sort: ProductSort = { field: 'name', direction: 'asc' },
    page: number = 1,
    limit: number = 12
  ): Observable<ProductSearchResponse> {
    let filteredProducts = [...this.products];

    // Aplicar filtros
    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      filteredProducts = filteredProducts.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.description.toLowerCase().includes(searchTerm) ||
        p.brand.toLowerCase().includes(searchTerm) ||
        p.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    if (filter.categories && filter.categories.length > 0) {
      filteredProducts = filteredProducts.filter(p =>
        filter.categories!.includes(p.category.id)
      );
    }

    if (filter.brands && filter.brands.length > 0) {
      filteredProducts = filteredProducts.filter(p =>
        filter.brands!.includes(p.brand)
      );
    }

    if (filter.priceRange) {
      filteredProducts = filteredProducts.filter(p =>
        p.price >= filter.priceRange!.min && p.price <= filter.priceRange!.max
      );
    }

    if (filter.inStockOnly) {
      filteredProducts = filteredProducts.filter(p => p.inStock);
    }

    if (filter.rating) {
      filteredProducts = filteredProducts.filter(p => p.rating >= filter.rating!);
    }

    // Aplicar ordenamiento
    filteredProducts.sort((a, b) => {
      let comparison = 0;
      
      switch (sort.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sort.direction === 'asc' ? comparison : -comparison;
    });

    // Aplicar paginación
    const total = filteredProducts.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + limit);

    const response: ProductSearchResponse = {
      products: paginatedProducts,
      total,
      page,
      limit,
      totalPages,
      filters: {
        categories: this.categories,
        brands: Array.from(new Set(this.products.map(p => p.brand))),
        priceRange: {
          min: Math.min(...this.products.map(p => p.price)),
          max: Math.max(...this.products.map(p => p.price))
        }
      }
    };

    return of(response).pipe(delay(800));
  }

  // Obtener productos destacados
  getFeaturedProducts(): Observable<Product[]> {
    const featured = this.products.filter(p => p.featured);
    return of(featured).pipe(delay(400));
  }

  // Obtener productos nuevos
  getNewProducts(): Observable<Product[]> {
    const newProducts = this.products.filter(p => p.isNew);
    return of(newProducts).pipe(delay(400));
  }

  // Obtener categorías
  getCategories(): Observable<ProductCategory[]> {
    return of(this.categories).pipe(delay(200));
  }

  // Obtener productos por categoría
  getProductsByCategory(categoryId: string): Observable<Product[]> {
    const categoryProducts = this.products.filter(p => p.category.id === categoryId);
    return of(categoryProducts).pipe(delay(500));
  }
}