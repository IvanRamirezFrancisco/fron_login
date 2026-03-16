import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Order, 
  OrderStats, 
  OrderFilters, 
  PageResponse,
  OrderStatus,
  PaymentStatus,
  ShippingStatus
} from '../models/order.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = `${environment.apiUrl}/admin/orders`;

  constructor(private http: HttpClient) {}

  // ==================== LISTAR Y BUSCAR ====================

  /**
   * 📋 Obtener todas las órdenes con filtros y paginación
   */
  getAllOrders(
    page: number = 0,
    size: number = 20,
    sortBy: string = 'createdAt',
    sortDir: string = 'DESC',
    filters?: OrderFilters
  ): Observable<PageResponse<Order>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    // Agregar filtros opcionales
    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    if (filters?.orderStatus) {
      params = params.set('orderStatus', filters.orderStatus);
    }
    if (filters?.paymentStatus) {
      params = params.set('paymentStatus', filters.paymentStatus);
    }
    if (filters?.shippingStatus) {
      params = params.set('shippingStatus', filters.shippingStatus);
    }
    if (filters?.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params = params.set('endDate', filters.endDate);
    }

    return this.http.get<PageResponse<Order>>(this.apiUrl, { params });
  }

  /**
   * 🔍 Obtener detalle de una orden
   */
  getOrderById(id: number): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${id}`);
  }

  /**
   * 👤 Obtener órdenes de un cliente
   */
  getOrdersByCustomer(
    userId: number, 
    page: number = 0, 
    size: number = 20
  ): Observable<PageResponse<Order>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<PageResponse<Order>>(
      `${this.apiUrl}/customer/${userId}`, 
      { params }
    );
  }

  /**
   * 📊 Obtener estadísticas de órdenes
   */
  getOrderStats(): Observable<OrderStats> {
    return this.http.get<OrderStats>(`${this.apiUrl}/stats`);
  }

  // ==================== ACTUALIZAR ESTADOS ====================

  /**
   * 📊 Actualizar estado de la orden
   */
  updateOrderStatus(orderId: number, newStatus: OrderStatus): Observable<Order> {
    return this.http.patch<Order>(
      `${this.apiUrl}/${orderId}/status`,
      { status: newStatus }
    );
  }

  /**
   * 💳 Actualizar estado de pago
   */
  updatePaymentStatus(orderId: number, newStatus: PaymentStatus): Observable<Order> {
    return this.http.patch<Order>(
      `${this.apiUrl}/${orderId}/payment-status`,
      { paymentStatus: newStatus }
    );
  }

  /**
   * 🚚 Actualizar estado de envío
   */
  updateShippingStatus(
    orderId: number, 
    newStatus: ShippingStatus, 
    trackingNumber?: string
  ): Observable<Order> {
    const body: any = { shippingStatus: newStatus };
    if (trackingNumber) {
      body.trackingNumber = trackingNumber;
    }

    return this.http.patch<Order>(
      `${this.apiUrl}/${orderId}/shipping-status`,
      body
    );
  }

  /**
   * Cancelar una orden con motivo obligatorio.
   */
  cancelOrder(orderId: number, reason: string): Observable<Order> {
    return this.http.patch<Order>(
      `${this.apiUrl}/${orderId}/cancel`,
      { reason }
    );
  }

  /**
   * Exportar órdenes a CSV.
   */
  exportToCsv(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/csv`, {
      responseType: 'blob'
    });
  }

  // ==================== HELPERS ====================

  /**
   * 🎨 Obtener clase CSS para badge de estado de orden
   */
  getOrderStatusClass(status: OrderStatus): string {
    const classes: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'badge-warning',
      [OrderStatus.CONFIRMED]: 'badge-info',
      [OrderStatus.PROCESSING]: 'badge-primary',
      [OrderStatus.COMPLETED]: 'badge-success',
      [OrderStatus.CANCELLED]: 'badge-danger'
    };
    return classes[status] || 'badge-secondary';
  }

  /**
   * 🎨 Obtener clase CSS para badge de estado de pago
   */
  getPaymentStatusClass(status: PaymentStatus): string {
    const classes: Record<PaymentStatus, string> = {
      [PaymentStatus.PENDING]: 'badge-warning',
      [PaymentStatus.PAID]: 'badge-success',
      [PaymentStatus.FAILED]: 'badge-danger',
      [PaymentStatus.REFUNDED]: 'badge-secondary',
      [PaymentStatus.PARTIALLY_REFUNDED]: 'badge-info'
    };
    return classes[status] || 'badge-secondary';
  }

  /**
   * 🎨 Obtener clase CSS para badge de estado de envío
   */
  getShippingStatusClass(status: ShippingStatus): string {
    const classes: Record<ShippingStatus, string> = {
      [ShippingStatus.PENDING]: 'badge-warning',
      [ShippingStatus.PREPARING]: 'badge-info',
      [ShippingStatus.SHIPPED]: 'badge-primary',
      [ShippingStatus.IN_TRANSIT]: 'badge-primary',
      [ShippingStatus.DELIVERED]: 'badge-success',
      [ShippingStatus.RETURNED]: 'badge-danger'
    };
    return classes[status] || 'badge-secondary';
  }

  /**
   * 💰 Formatear precio a moneda
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  }

  /**
   * 📅 Formatear fecha
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
