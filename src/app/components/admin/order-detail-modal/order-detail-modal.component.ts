import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../services/order.service';
import { 
  Order, 
  OrderStatus, 
  PaymentStatus, 
  ShippingStatus,
  PaymentProofResponse
} from '../../../models/order.model';
import Swal from 'sweetalert2';
import * as pdfjsLib from 'pdfjs-dist';
import { AuthService } from '../../../services/auth.service';

// Configurar el worker (esto requiere que pdf.worker.min.js esté en assets/pdfjs)
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/assets/pdfjs/pdf.worker.min.js';

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

  // Comprobante
  proofMetadata: PaymentProofResponse | null = null;
  proofLoading = false;
  // Visor de comprobante
  showProofPreviewModal = false;
  proofPreviewUrl: string | null = null;
  proofPreviewSafeUrl: SafeResourceUrl | null = null;
  proofPreviewBlob: Blob | null = null;
  proofPreviewContentType: string | null = null;
  proofPreviewFilename: string | null = null;
  proofPreviewOrderNumber: string | null = null;
  proofPreviewStatus: string | null = null;
  proofPreviewError: string | null = null;
  loadingProofPreview = false;
  @ViewChild('pdfCanvas') pdfCanvas!: ElementRef<HTMLCanvasElement>;
  pdfDocument: any = null;

  // Enums para template
  OrderStatus = OrderStatus;
  PaymentStatus = PaymentStatus;
  ShippingStatus = ShippingStatus;

  orderStatusOptions = Object.values(OrderStatus);
  paymentStatusOptions = Object.values(PaymentStatus);
  shippingStatusOptions = Object.values(ShippingStatus);

  constructor(
    public orderService: OrderService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {
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

    if (this.order.paymentMethod === 'BANK_TRANSFER' || this.order.paymentMethod === 'TRANSFER') {
      this.loadPaymentProof();
    }
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

  canManagePayments(): boolean {
    return this.authService.hasRole('ROLE_SUPER_ADMIN') || 
           this.authService.hasPermission('ORDER_UPDATE') || 
           this.authService.hasPermission('ORDER_MANAGE') || 
           this.authService.hasPermission('PAYMENT_MANAGE');
  }

  // ==================== COMPROBANTE DE PAGO (ADMIN) ====================

  loadPaymentProof(): void {
    this.proofLoading = true;
    this.orderService.getAdminPaymentProof(this.order.id).subscribe({
      next: (proof) => {
        this.proofMetadata = proof;
        this.proofLoading = false;
      },
      error: (err) => {
        this.proofLoading = false;
        // Si no hay (404), no mostramos error al admin, simplemente es que no hay.
        if (err.status !== 404) {
          console.error('Error cargando comprobante admin', err);
        }
      }
    });
  }

  private buildProofFilename(orderNumber: string, contentType: string): string {
    let cleanOrderNumber = orderNumber || 'UNKNOWN';
    if (cleanOrderNumber.startsWith('#')) {
      cleanOrderNumber = cleanOrderNumber.substring(1);
    }
    let ext = '.pdf';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = '.jpg';
    else if (contentType.includes('png')) ext = '.png';
    else if (contentType.includes('webp')) ext = '.webp';

    if (cleanOrderNumber.startsWith('ORD-')) {
      return `comprobante-${cleanOrderNumber}${ext}`;
    } else {
      return `comprobante-ORD-${cleanOrderNumber}${ext}`;
    }
  }

  viewProof(): void {
    this.showProofPreviewModal = true;
    this.loadingProofPreview = true;
    this.proofPreviewError = null;
    this.proofPreviewOrderNumber = this.order.orderNumber;
    this.proofPreviewStatus = this.order.paymentProofStatus || 'PENDING_REVIEW';
    
    this.orderService.getAdminPaymentProofFile(this.order.id).subscribe({
      next: async (response) => {
        this.loadingProofPreview = false;
        const rawBlob = response.body;

        const contentType = response.headers.get('Content-Type') || (rawBlob as any)?.type || 'application/pdf';
        const typedBlob = new Blob([rawBlob as Blob], { type: contentType });

        // LOGS TEMPORALES DIAGNOSTICO
        console.log('--- DIAGNOSTICO PDF.JS ADMIN ---');
        console.log('response.status:', response.status);
        console.log('Content-Type header:', response.headers.get('Content-Type'));
        console.log('Content-Disposition:', response.headers.get('Content-Disposition'));
        console.log('blob instanceof Blob:', rawBlob instanceof Blob);
        console.log('blob.size:', (rawBlob as any)?.size);
        console.log('blob.type:', (rawBlob as any)?.type);
        console.log('typedBlob.size:', typedBlob.size);
        console.log('typedBlob.type:', typedBlob.type);

        if (typedBlob.size > 0) {
          const head = new Uint8Array(await typedBlob.slice(0, 8).arrayBuffer());
          console.log('PDF HEAD BYTES:', Array.from(head));
          console.log('PDF HEAD TEXT:', String.fromCharCode(...head));
        }
        console.log('--------------------------------');

        if (!(typedBlob instanceof Blob) || typedBlob.size === 0) {
          this.proofPreviewError = 'Archivo inválido o vacío';
          return;
        }

        // Whitelist estricta
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(contentType)) {
          this.proofPreviewError = 'Este tipo de archivo no se puede previsualizar. Puedes descargarlo si tienes permiso.';
        }

        this.proofPreviewContentType = contentType;
        this.proofPreviewBlob = typedBlob;
        this.proofPreviewFilename = this.buildProofFilename(this.order?.orderNumber || '', contentType);

        // URL Segura
        if (this.proofPreviewUrl) URL.revokeObjectURL(this.proofPreviewUrl);
        this.proofPreviewUrl = URL.createObjectURL(typedBlob);
        this.proofPreviewSafeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.proofPreviewUrl);

        if (contentType === 'application/pdf') {
          await this.renderPdf(typedBlob);
        }
      },
      error: async (err) => {
        this.loadingProofPreview = false;
        this.proofPreviewError = await this.extractBlobErrorMessage(err);
      }
    });
  }

  async renderPdf(blob: Blob): Promise<void> {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      this.pdfDocument = await loadingTask.promise;
      const page = await this.pdfDocument.getPage(1);
      
      // Forzar que Angular renderice el modal y asigne el elemento al ViewChild
      this.cdr.detectChanges();

      setTimeout(async () => {
        if (!this.pdfCanvas?.nativeElement) {
          console.error('PDF canvas no disponible después del setTimeout');
          return;
        }
        const canvas = this.pdfCanvas.nativeElement;
        const context = canvas.getContext('2d');
        if (!context) return;
        
        // Setup viewport
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
      }, 0);
    } catch (error) {
      console.error('PDF.js render error:', error);
      this.proofPreviewError = 'No se pudo previsualizar el PDF. Puedes descargarlo.';
    }
  }

  closeProofPreview(): void {
    this.showProofPreviewModal = false;
    this.proofPreviewSafeUrl = null;
    this.proofPreviewBlob = null;
    this.proofPreviewContentType = null;
    this.proofPreviewFilename = null;
    this.proofPreviewError = null;
    this.pdfDocument = null;
    if (this.proofPreviewUrl) {
      URL.revokeObjectURL(this.proofPreviewUrl);
      this.proofPreviewUrl = null;
    }
  }

  downloadProof(): void {
    if (!this.proofPreviewUrl || !this.proofPreviewFilename) return;
    const a = document.createElement('a');
    a.href = this.proofPreviewUrl;
    a.download = this.proofPreviewFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  openProofInNewTab(): void {
    if (!this.proofPreviewUrl) return;
    const newWindow = window.open(this.proofPreviewUrl, '_blank', 'noopener,noreferrer');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      Swal.fire({
        icon: 'info',
        title: 'Ventana emergente bloqueada',
        text: 'El navegador bloqueó la nueva pestaña. Usa el botón Descargar comprobante.'
      });
    }
  }

  approveProof(): void {
    Swal.fire({
      title: '¿Aprobar comprobante?',
      text: 'El estado del pago cambiará a Pagado.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, aprobar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#166534'
    }).then((result) => {
      if (result.isConfirmed) {
        this.orderService.approvePaymentProof(this.order.id).subscribe({
          next: (proof) => {
            this.proofMetadata = proof;
            this.order.paymentStatus = PaymentStatus.PAID;
            this.selectedPaymentStatus = PaymentStatus.PAID;
            this.order.hasPaymentProof = true;
            this.order.paymentProofStatus = proof.status;
            this.orderUpdated.emit(this.order);
            Swal.fire('Aprobado', 'El comprobante ha sido aprobado.', 'success');
          },
          error: (err) => {
            const msg = err.error?.error || 'Error al aprobar.';
            Swal.fire('Error', msg, 'error');
          }
        });
      }
    });
  }

  rejectProof(): void {
    Swal.fire({
      title: 'Rechazar comprobante',
      text: 'Ingresa el motivo del rechazo:',
      input: 'textarea',
      inputPlaceholder: 'Ej. La imagen está borrosa, monto incorrecto...',
      inputAttributes: {
        'aria-label': 'Motivo del rechazo',
        'maxlength': '500'
      },
      showCancelButton: true,
      confirmButtonText: 'Rechazar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      preConfirm: (reason) => {
        if (!reason || reason.trim() === '') {
          Swal.showValidationMessage('Debes ingresar un motivo');
        }
        return reason;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.orderService.rejectPaymentProof(this.order.id, result.value).subscribe({
          next: (proof) => {
            this.proofMetadata = proof;
            this.order.paymentProofStatus = proof.status;
            this.orderUpdated.emit(this.order);
            Swal.fire('Rechazado', 'El comprobante fue rechazado.', 'success');
          },
          error: (err) => {
            const msg = err.error?.error || 'Error al rechazar.';
            Swal.fire('Error', msg, 'error');
          }
        });
      }
    });
  }

  private async extractBlobErrorMessage(error: any): Promise<string> {
    if (error?.error instanceof Blob) {
      try {
        const text = await error.error.text();
        const json = JSON.parse(text);
        return json.message || json.error || 'El archivo no está disponible en este momento.';
      } catch {
        return 'El archivo no está disponible en este momento.';
      }
    }
    return error?.error?.message || error?.message || 'El archivo no está disponible en este momento.';
  }

  private async handleBlobError(err: any): Promise<void> {
    console.error('Error descargando blob admin', err);
    
    if (err.status === 0) {
      Swal.fire('Error', 'No se pudo conectar con el servidor.', 'error');
      return;
    }
    if (err.status === 404) {
      Swal.fire('Error', 'No se encontró el comprobante.', 'error');
      return;
    }
    if (err.status === 403) {
      Swal.fire('Error', 'No tienes permiso para ver este comprobante.', 'error');
      return;
    }

    const message = await this.extractBlobErrorMessage(err);
    Swal.fire('Error', message, 'error');
  }
}
