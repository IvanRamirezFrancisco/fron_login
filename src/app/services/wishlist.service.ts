import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  WishlistItemDTO,
  AddToWishlistRequest,
  UpdateWishlistItemRequest,
  WishlistSummaryDTO,
  WishlistNotificationDTO,
  PriceDropItemDTO,
  BulkAddToWishlistRequest,
  BulkRemoveFromWishlistRequest,
  MoveToCartResponse,
  WishlistResponse,
  NotificationsResponse
} from '../models/wishlist.model';

/**
 * Servicio para gestionar la lista de deseos (wishlist)
 * Consume los 15 endpoints de WishlistController del backend
 */
@Injectable({
  providedIn: 'root'
})
export class WishlistService {
  private readonly API_URL = `${environment.apiUrl}/wishlist`;
  
  // Subject para compartir el estado de la wishlist entre componentes
  private wishlistSubject = new BehaviorSubject<WishlistItemDTO[]>([]);
  public wishlist$ = this.wishlistSubject.asObservable();
  
  private wishlistCountSubject = new BehaviorSubject<number>(0);
  public wishlistCount$ = this.wishlistCountSubject.asObservable();

  constructor(private http: HttpClient) {
    // Cargar wishlist al inicializar el servicio
    this.loadWishlist();
  }

  // ============================================
  // ENDPOINTS PRINCIPALES
  // ============================================

  /**
   * Obtener la wishlist del usuario
   * GET /api/wishlist
   * Requiere: USER role
   */
  getWishlist(): Observable<WishlistItemDTO[]> {
    return this.http.get<WishlistItemDTO[]>(this.API_URL).pipe(
      tap(items => {
        this.wishlistSubject.next(items);
        this.wishlistCountSubject.next(items.length);
      })
    );
  }

  /**
   * Agregar producto a la wishlist
   * POST /api/wishlist
   * Requiere: USER role
   */
  addToWishlist(request: AddToWishlistRequest): Observable<WishlistItemDTO> {
    return this.http.post<WishlistItemDTO>(this.API_URL, request).pipe(
      tap(() => {
        // Recargar la wishlist después de agregar
        this.getWishlist().subscribe();
      })
    );
  }

  /**
   * Obtener un item específico de la wishlist
   * GET /api/wishlist/{itemId}
   * Requiere: USER role
   */
  getWishlistItem(itemId: number): Observable<WishlistItemDTO> {
    return this.http.get<WishlistItemDTO>(`${this.API_URL}/${itemId}`);
  }

  /**
   * Actualizar un item de la wishlist
   * PUT /api/wishlist/{itemId}
   * Requiere: USER role
   */
  updateWishlistItem(itemId: number, request: UpdateWishlistItemRequest): Observable<WishlistItemDTO> {
    return this.http.put<WishlistItemDTO>(`${this.API_URL}/${itemId}`, request).pipe(
      tap(() => {
        // Recargar la wishlist después de actualizar
        this.getWishlist().subscribe();
      })
    );
  }

  /**
   * Eliminar un item de la wishlist
   * DELETE /api/wishlist/{itemId}
   * Requiere: USER role
   */
  removeFromWishlist(itemId: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${itemId}`).pipe(
      tap(() => {
        // Recargar la wishlist después de eliminar
        this.getWishlist().subscribe();
      })
    );
  }

  /**
   * Obtener resumen de la wishlist
   * GET /api/wishlist/summary
   * Requiere: USER role
   */
  getWishlistSummary(): Observable<WishlistSummaryDTO> {
    return this.http.get<WishlistSummaryDTO>(`${this.API_URL}/summary`);
  }

  /**
   * Obtener items con descuento
   * GET /api/wishlist/price-drops
   * Requiere: USER role
   */
  getPriceDrops(): Observable<PriceDropItemDTO[]> {
    return this.http.get<PriceDropItemDTO[]>(`${this.API_URL}/price-drops`);
  }

  /**
   * Verificar precios de todos los items
   * POST /api/wishlist/check-prices
   * Requiere: USER role
   */
  checkPrices(): Observable<WishlistItemDTO[]> {
    return this.http.post<WishlistItemDTO[]>(`${this.API_URL}/check-prices`, {}).pipe(
      tap(items => {
        this.wishlistSubject.next(items);
      })
    );
  }

  /**
   * Mover item al carrito
   * POST /api/wishlist/{itemId}/move-to-cart
   * Requiere: USER role
   */
  moveToCart(itemId: number): Observable<MoveToCartResponse> {
    return this.http.post<MoveToCartResponse>(`${this.API_URL}/${itemId}/move-to-cart`, {}).pipe(
      tap(() => {
        // Recargar la wishlist después de mover al carrito
        this.getWishlist().subscribe();
      })
    );
  }

  /**
   * Obtener notificaciones de la wishlist
   * GET /api/wishlist/notifications
   * Requiere: USER role
   */
  getNotifications(unreadOnly: boolean = false): Observable<NotificationsResponse> {
    const url = unreadOnly 
      ? `${this.API_URL}/notifications?unreadOnly=true`
      : `${this.API_URL}/notifications`;
    
    return this.http.get<NotificationsResponse>(url);
  }

  /**
   * Marcar notificación como leída
   * PATCH /api/wishlist/notifications/{notificationId}/read
   * Requiere: USER role
   */
  markNotificationAsRead(notificationId: number): Observable<void> {
    return this.http.patch<void>(`${this.API_URL}/notifications/${notificationId}/read`, {});
  }

  /**
   * Agregar múltiples productos a la wishlist
   * POST /api/wishlist/bulk-add
   * Requiere: USER role
   */
  bulkAddToWishlist(request: BulkAddToWishlistRequest): Observable<WishlistItemDTO[]> {
    return this.http.post<WishlistItemDTO[]>(`${this.API_URL}/bulk-add`, request).pipe(
      tap(() => {
        // Recargar la wishlist después de agregar múltiples items
        this.getWishlist().subscribe();
      })
    );
  }

  /**
   * Eliminar múltiples items de la wishlist
   * POST /api/wishlist/bulk-remove
   * Requiere: USER role
   */
  bulkRemoveFromWishlist(request: BulkRemoveFromWishlistRequest): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/bulk-remove`, request).pipe(
      tap(() => {
        // Recargar la wishlist después de eliminar múltiples items
        this.getWishlist().subscribe();
      })
    );
  }

  /**
   * Vaciar la wishlist completamente
   * DELETE /api/wishlist/clear
   * Requiere: USER role
   */
  clearWishlist(): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/clear`).pipe(
      tap(() => {
        this.wishlistSubject.next([]);
        this.wishlistCountSubject.next(0);
      })
    );
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Verificar si un producto está en la wishlist
   */
  isInWishlist(productId: number): boolean {
    const items = this.wishlistSubject.value;
    return items.some(item => item.productId === productId);
  }

  /**
   * Obtener item de wishlist por productId
   */
  getItemByProductId(productId: number): WishlistItemDTO | undefined {
    const items = this.wishlistSubject.value;
    return items.find(item => item.productId === productId);
  }

  /**
   * Calcular ahorro total por descuentos
   */
  calculateTotalSavings(items: WishlistItemDTO[]): number {
    return items.reduce((total, item) => total + item.priceDrop, 0);
  }

  /**
   * Obtener items con alertas activas
   */
  getItemsWithAlerts(items: WishlistItemDTO[]): WishlistItemDTO[] {
    return items.filter(item => 
      item.notifyWhenAvailable || item.notifyOnDiscount
    );
  }

  /**
   * Ordenar wishlist por prioridad
   */
  sortByPriority(items: WishlistItemDTO[]): WishlistItemDTO[] {
    return [...items].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Ordenar wishlist por descuento
   */
  sortByDiscount(items: WishlistItemDTO[]): WishlistItemDTO[] {
    return [...items].sort((a, b) => b.priceDropPercentage - a.priceDropPercentage);
  }

  /**
   * Formatear tiempo desde que se agregó
   */
  getTimeSinceAdded(addedAt: string): string {
    const now = new Date();
    const added = new Date(addedAt);
    const diffMs = now.getTime() - added.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    return `Hace ${Math.floor(diffDays / 30)} meses`;
  }

  /**
   * Cargar wishlist al inicializar
   */
  private loadWishlist(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.getWishlist().subscribe({
        error: (err) => {
          console.warn('No se pudo cargar la wishlist:', err);
        }
      });
    }
  }

  /**
   * Obtener wishlist actual del BehaviorSubject
   */
  getCurrentWishlist(): WishlistItemDTO[] {
    return this.wishlistSubject.value;
  }

  /**
   * Obtener contador actual de items
   */
  getCurrentCount(): number {
    return this.wishlistCountSubject.value;
  }
}
