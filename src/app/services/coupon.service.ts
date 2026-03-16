import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CouponDTO,
  CreateCouponRequest,
  ValidateCouponRequest,
  CouponValidationResponse,
  CouponStatsDTO,
  CouponOverviewDTO,
  PaginatedResponse,
  CouponListResponse
} from '../models/cart.model';

/**
 * Servicio para gestionar cupones de descuento
 * Consume los 11 endpoints de CouponController del backend
 */
@Injectable({
  providedIn: 'root'
})
export class CouponService {
  private readonly API_URL = `${environment.apiUrl}/coupons`;
  private readonly ADMIN_API_URL = `${environment.apiUrl}/admin/coupons`;

  constructor(private http: HttpClient) {}

  // ============================================
  // ENDPOINTS PÚBLICOS
  // ============================================

  /**
   * Obtener cupones activos disponibles
   * GET /api/coupons/active
   * Público
   */
  getActiveCoupons(page: number = 0, size: number = 10): Observable<PaginatedResponse<CouponDTO>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<PaginatedResponse<CouponDTO>>(`${this.API_URL}/active`, { params });
  }

  /**
   * Validar un cupón para un carrito
   * POST /api/coupons/validate
   * Público
   */
  validateCoupon(request: ValidateCouponRequest): Observable<CouponValidationResponse> {
    return this.http.post<CouponValidationResponse>(`${this.API_URL}/validate`, request);
  }

  /**
   * Verificar disponibilidad de un cupón por código
   * GET /api/coupons/check/{code}
   * Público
   */
  checkCouponAvailability(code: string): Observable<{ available: boolean; message: string }> {
    return this.http.get<{ available: boolean; message: string }>(`${this.API_URL}/check/${code}`);
  }

  // ============================================
  // ENDPOINTS DE ADMINISTRACIÓN
  // ============================================

  /**
   * Crear un nuevo cupón
   * POST /api/admin/coupons
   * Requiere: ADMIN role
   */
  createCoupon(request: CreateCouponRequest): Observable<CouponDTO> {
    return this.http.post<CouponDTO>(this.ADMIN_API_URL, request);
  }

  /**
   * Obtener todos los cupones (con paginación)
   * GET /api/admin/coupons
   * Requiere: ADMIN role
   */
  getAllCoupons(page: number = 0, size: number = 20): Observable<CouponListResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<CouponListResponse>(this.ADMIN_API_URL, { params });
  }

  /**
   * Obtener cupón por ID
   * GET /api/admin/coupons/id/{couponId}
   * Requiere: ADMIN role
   */
  getCouponById(couponId: number): Observable<CouponDTO> {
    return this.http.get<CouponDTO>(`${this.ADMIN_API_URL}/id/${couponId}`);
  }

  /**
   * Obtener cupón por código
   * GET /api/admin/coupons/code/{code}
   * Requiere: ADMIN role
   */
  getCouponByCode(code: string): Observable<CouponDTO> {
    return this.http.get<CouponDTO>(`${this.ADMIN_API_URL}/code/${code}`);
  }

  /**
   * Actualizar un cupón existente
   * PUT /api/admin/coupons/{couponId}
   * Requiere: ADMIN role
   */
  updateCoupon(couponId: number, request: Partial<CreateCouponRequest>): Observable<CouponDTO> {
    return this.http.put<CouponDTO>(`${this.ADMIN_API_URL}/${couponId}`, request);
  }

  /**
   * Desactivar un cupón
   * PATCH /api/admin/coupons/{couponId}/deactivate
   * Requiere: ADMIN role
   */
  deactivateCoupon(couponId: number): Observable<CouponDTO> {
    return this.http.patch<CouponDTO>(`${this.ADMIN_API_URL}/${couponId}/deactivate`, {});
  }

  /**
   * Obtener estadísticas de uso de un cupón
   * GET /api/admin/coupons/{couponId}/stats
   * Requiere: ADMIN role
   */
  getCouponStats(couponId: number): Observable<CouponStatsDTO> {
    return this.http.get<CouponStatsDTO>(`${this.ADMIN_API_URL}/${couponId}/stats`);
  }

  /**
   * Obtener overview general de cupones
   * GET /api/admin/coupons/stats/overview
   * Requiere: ADMIN role
   */
  getCouponsOverview(): Observable<CouponOverviewDTO> {
    return this.http.get<CouponOverviewDTO>(`${this.ADMIN_API_URL}/stats/overview`);
  }

  // ============================================
  // MÉTODOS HELPER
  // ============================================

  /**
   * Formatear descuento para mostrar
   */
  formatDiscount(coupon: CouponDTO): string {
    if (coupon.discountType === 'PERCENTAGE') {
      return `${coupon.discountValue}%`;
    } else if (coupon.discountType === 'FIXED') {
      return `$${coupon.discountValue.toFixed(2)}`;
    } else {
      return 'Envío Gratis';
    }
  }

  /**
   * Verificar si el cupón está vigente
   */
  isCouponValid(coupon: CouponDTO): boolean {
    const now = new Date();
    const validFrom = new Date(coupon.validFrom);
    const validUntil = new Date(coupon.validUntil);
    
    return coupon.isActive && now >= validFrom && now <= validUntil;
  }

  /**
   * Calcular descuento aplicado
   */
  calculateDiscount(coupon: CouponDTO, amount: number): number {
    if (coupon.discountType === 'PERCENTAGE') {
      const discount = (amount * coupon.discountValue) / 100;
      return coupon.maximumDiscount 
        ? Math.min(discount, coupon.maximumDiscount)
        : discount;
    } else if (coupon.discountType === 'FIXED') {
      return Math.min(coupon.discountValue, amount);
    }
    return 0;
  }

  /**
   * Verificar si se alcanza el mínimo de compra
   */
  meetsMinimumPurchase(coupon: CouponDTO, amount: number): boolean {
    return !coupon.minimumPurchase || amount >= coupon.minimumPurchase;
  }

  /**
   * Obtener mensaje de error de validación
   */
  getValidationError(coupon: CouponDTO, amount: number): string | null {
    if (!this.isCouponValid(coupon)) {
      return 'El cupón no está vigente';
    }
    if (!this.meetsMinimumPurchase(coupon, amount)) {
      return `Compra mínima requerida: $${coupon.minimumPurchase?.toFixed(2)}`;
    }
    if (coupon.usageLimit && coupon.currentUsageCount >= coupon.usageLimit) {
      return 'El cupón ha alcanzado su límite de uso';
    }
    return null;
  }

  /**
   * Formatear fecha de validez
   */
  formatValidityPeriod(coupon: CouponDTO): string {
    const validFrom = new Date(coupon.validFrom).toLocaleDateString();
    const validUntil = new Date(coupon.validUntil).toLocaleDateString();
    return `${validFrom} - ${validUntil}`;
  }

  /**
   * Obtener color de badge según estado del cupón
   */
  getCouponStatusClass(coupon: CouponDTO): string {
    if (!coupon.isActive) return 'inactive';
    if (!this.isCouponValid(coupon)) return 'expired';
    if (coupon.usageLimit && coupon.currentUsageCount >= coupon.usageLimit) return 'exhausted';
    return 'active';
  }
}
