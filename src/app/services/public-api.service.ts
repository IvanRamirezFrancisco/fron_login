import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  PublicProduct,
  PublicCategory,
  SpringPage
} from '../models/product.model';

/**
 * Servicio Angular para consumir la API pública del Storefront.
 *
 * Todos los métodos apuntan a `/api/public/...` — rutas que NO requieren
 * autenticación JWT (permitAll() en el backend).
 *
 * Nunca incluir el token Authorization en estas llamadas.
 */
@Injectable({ providedIn: 'root' })
export class PublicApiService {
  private http = inject(HttpClient);

  private readonly BASE = `${environment.apiUrl}/public`;
  private readonly PRODUCTS = `${this.BASE}/products`;
  private readonly CATEGORIES = `${this.BASE}/categories`;

  // ── Productos ───────────────────────────────────────────────────────────────

  /**
   * GET /api/public/products/latest
   * Devuelve los últimos 8 productos activos.
   */
  getLatestProducts(): Observable<PublicProduct[]> {
    return this.http.get<PublicProduct[]>(`${this.PRODUCTS}/latest`);
  }

  /**
   * GET /api/public/products/featured
   * Devuelve productos destacados paginados.
   */
  getFeaturedProducts(page = 0, size = 12): Observable<SpringPage<PublicProduct>> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);
    return this.http.get<SpringPage<PublicProduct>>(`${this.PRODUCTS}/featured`, { params });
  }

  /**
   * GET /api/public/products/catalog
   * Catálogo completo con filtros opcionales.
   *
   * @param keyword    texto de búsqueda (opcional)
   * @param categoryId filtro por categoría (opcional)
   * @param brandId    filtro por marca (opcional)
   * @param page       página 0-indexed (default 0)
   * @param size       tamaño de página (default 12, máx 50 en el backend)
   */
  getCatalog(options: {
    keyword?:    string;
    categoryId?: number;
    brandId?:    number;
    page?:       number;
    size?:       number;
    sortBy?:     'featured' | 'price_asc' | 'price_desc' | 'name_asc';
  } = {}): Observable<SpringPage<PublicProduct>> {
    let params = new HttpParams()
      .set('page', options.page ?? 0)
      .set('size', options.size ?? 12)
      .set('sortBy', options.sortBy ?? 'featured');

    if (options.keyword?.trim()) {
      params = params.set('keyword', options.keyword.trim());
    }
    if (options.categoryId != null) {
      params = params.set('categoryId', options.categoryId);
    }
    if (options.brandId != null) {
      params = params.set('brandId', options.brandId);
    }

    return this.http.get<SpringPage<PublicProduct>>(`${this.PRODUCTS}/catalog`, { params });
  }

  /**
   * GET /api/public/products/{id}
   * Detalle de un producto activo. El backend retorna 404 si no existe
   * o está inactivo.
   */
  getProductById(id: number): Observable<PublicProduct> {
    return this.http.get<PublicProduct>(`${this.PRODUCTS}/${id}`);
  }

  // ── Categorías ──────────────────────────────────────────────────────────────

  /**
   * GET /api/public/categories/active
   * Categorías activas.
   *
   * @param withProducts si true, solo retorna categorías con ≥1 producto activo
   */
  getActiveCategories(withProducts = false): Observable<PublicCategory[]> {
    const params = new HttpParams().set('withProducts', withProducts);
    return this.http.get<PublicCategory[]>(`${this.CATEGORIES}/active`, { params });
  }
}
