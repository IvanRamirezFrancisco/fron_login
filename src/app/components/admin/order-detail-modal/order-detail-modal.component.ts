import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../services/order.service';
import { 
  Order, 
  OrderStatus, 
  PaymentStatus, 
  ShippingStatus 
} from '../../../models/order.model';

@Component({
  selector: 'app-order-detail-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './order-detail-modal.component.html',
  styleUrls: ['./order-detail-modal.component.css']
})
export class OrderDetailModalComponent implements OnInit {
  @Input() order!: Order;
  @Output() close = new EventEmitter<void>();
  @Output() orderUpdated = new EventEmitter<Order>();

  // Estados editables
  selectedOrderStatus: OrderStatus;
  selectedPaymentStatus: PaymentStatus;
  selectedShippingStatus: ShippingStatus;
  trackingNumber: string = '';

  // UI State
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;

  // Enums para template
  OrderStatus = OrderStatus;
  PaymentStatus = PaymentStatus;
  ShippingStatus = ShippingStatus;

  orderStatusOptions = Object.values(OrderStatus);
  paymentStatusOptions = Object.values(PaymentStatus);
  shippingStatusOptions = Object.values(ShippingStatus);

  constructor(public orderService: OrderService) {
    this.selectedOrderStatus = OrderStatus.PENDING;
    this.selectedPaymentStatus = PaymentStatus.PENDING;
    this.selectedShippingStatus = ShippingStatus.PENDING;
  }

  ngOnInit(): void {
    // Inicializar con los valores actuales de la orden
    this.selectedOrderStatus = this.order.status;
    this.selectedPaymentStatus = this.order.paymentStatus;
    this.selectedShippingStatus = this.order.shippingStatus;
    this.trackingNumber = this.order.trackingNumber || '';
  }

  // ==================== CERRAR MODAL ====================

  closeModal(): void {
    this.close.emit();
  }

  // Cerrar al hacer clic en el backdrop
  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closeModal();
    }
  }

  // ==================== ACTUALIZAR ESTADOS ====================

  updateOrderStatus(): void {
    if (this.selectedOrderStatus === this.order.status) {
      return; // No hay cambios
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    this.orderService.updateOrderStatus(this.order.id, this.selectedOrderStatus)
      .subscribe({
        next: (updatedOrder) => {
          this.order = updatedOrder;
          this.successMessage = 'Estado de orden actualizado correctamente';
          this.orderUpdated.emit(updatedOrder);
          this.loading = false;
          this.hideMessageAfterDelay();
        },
        error: (err) => {
          console.error('Error al actualizar estado de orden:', err);
          this.error = err.error?.error || 'Error al actualizar el estado de la orden';
          this.loading = false;
          this.hideMessageAfterDelay();
        }
      });
  }

  updatePaymentStatus(): void {
    if (this.selectedPaymentStatus === this.order.paymentStatus) {
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    this.orderService.updatePaymentStatus(this.order.id, this.selectedPaymentStatus)
      .subscribe({
        next: (updatedOrder) => {
          this.order = updatedOrder;
          this.successMessage = 'Estado de pago actualizado correctamente';
          this.orderUpdated.emit(updatedOrder);
          this.loading = false;
          this.hideMessageAfterDelay();
        },
        error: (err) => {
          console.error('Error al actualizar estado de pago:', err);
          this.error = err.error?.error || 'Error al actualizar el estado de pago';
          this.loading = false;
          this.hideMessageAfterDelay();
        }
      });
  }

  updateShippingStatus(): void {
    if (this.selectedShippingStatus === this.order.shippingStatus && 
        this.trackingNumber === (this.order.trackingNumber || '')) {
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    this.orderService.updateShippingStatus(
      this.order.id, 
      this.selectedShippingStatus, 
      this.trackingNumber || undefined
    ).subscribe({
      next: (updatedOrder) => {
        this.order = updatedOrder;
        this.successMessage = 'Estado de envío actualizado correctamente';
        this.orderUpdated.emit(updatedOrder);
        this.loading = false;
        this.hideMessageAfterDelay();
      },
      error: (err) => {
        console.error('Error al actualizar estado de envío:', err);
        this.error = err.error?.error || 'Error al actualizar el estado de envío';
        this.loading = false;
        this.hideMessageAfterDelay();
      }
    });
  }

  hideMessageAfterDelay(): void {
    setTimeout(() => {
      this.successMessage = null;
      this.error = null;
    }, 5000);
  }

  // ==================== HELPERS ====================

  calculateItemsTotal(): number {
    return this.order.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  translateOrderStatus(status: OrderStatus): string {
    const translations: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'Pendiente',
      [OrderStatus.CONFIRMED]: 'Confirmada',
      [OrderStatus.PROCESSING]: 'Procesando',
      [OrderStatus.COMPLETED]: 'Completada',
      [OrderStatus.CANCELLED]: 'Cancelada'
    };
    return translations[status] || status;
  }

  translatePaymentStatus(status: PaymentStatus): string {
    const translations: Record<PaymentStatus, string> = {
      [PaymentStatus.PENDING]: 'Pendiente',
      [PaymentStatus.PAID]: 'Pagado',
      [PaymentStatus.FAILED]: 'Fallido',
      [PaymentStatus.REFUNDED]: 'Reembolsado',
      [PaymentStatus.PARTIALLY_REFUNDED]: 'Parcialmente Reembolsado'
    };
    return translations[status] || status;
  }

  translateShippingStatus(status: ShippingStatus): string {
    const translations: Record<ShippingStatus, string> = {
      [ShippingStatus.PENDING]: 'Pendiente',
      [ShippingStatus.PREPARING]: 'Preparando',
      [ShippingStatus.SHIPPED]: 'Enviado',
      [ShippingStatus.IN_TRANSIT]: 'En Tránsito',
      [ShippingStatus.DELIVERED]: 'Entregado',
      [ShippingStatus.RETURNED]: 'Devuelto'
    };
    return translations[status] || status;
  }
}
