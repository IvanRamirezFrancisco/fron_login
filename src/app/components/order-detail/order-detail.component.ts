import { Component, OnInit, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpResponse } from '@angular/common/http';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OrderService } from '../../services/order.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { 
  Order, 
  OrderStatus, 
  PaymentStatus, 
  ShippingStatus, 
  PaymentProofStatus, 
  PaymentProofResponse,
  PaymentInstructionsResponse
} from '../../models/order.model';
import Swal from 'sweetalert2';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar el worker (esto requiere que pdf.worker.min.js esté en assets/pdfjs)
(pdfjsLib as any).GlobalWorkerOptions.workerSrc = '/assets/pdfjs/pdf.worker.min.js';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.css']
})
export class OrderDetailComponent implements OnInit {

  order: Order | null = null;
  isLoading = true;
  error = '';

  // Modal de cancelación
  showCancelModal = false;
  cancelReason = '';
  isCancelling = false;
  cancelError = '';

  // Comprobante de pago
  proofMetadata: PaymentProofResponse | null = null;
  proofForm: FormGroup;
  selectedFile: File | null = null;
  isUploading = false;
  uploadError = '';
  // Visor de comprobante
  @ViewChild('pdfCanvas') pdfCanvas!: ElementRef<HTMLCanvasElement>;
  pdfDocument: any = null;
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

  // Instrucciones bancarias
  paymentInstructions: PaymentInstructionsResponse | null = null;
  loadingInstructions = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private fb: FormBuilder,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {
    this.proofForm = this.fb.group({
      referenceNumber: ['', [Validators.maxLength(100)]],
      bankName: ['', [Validators.maxLength(100)]],
      amountDeclared: [null, [Validators.min(0.01)]],
      transferDate: [''],
      notes: ['', [Validators.maxLength(500)]]
    });
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id || id <= 0) {
      this.error = 'Pedido no válido.';
      this.isLoading = false;
      return;
    }
    this.loadOrder(id);
  }

  loadOrder(id: number): void {
    this.isLoading = true;
    this.error = '';
    this.orderService.getMyOrderById(id).subscribe({
      next: (order) => {
        this.order = order;
        this.isLoading = false;
        if (order.paymentMethod === 'BANK_TRANSFER' || order.paymentMethod === 'TRANSFER') {
          this.loadPaymentInstructions(id);
        }
        if (order.hasPaymentProof) {
          this.loadProofMetadata(id);
        }
      },
      error: (err) => {
        this.isLoading = false;
        if (err?.status === 403 || err?.status === 404) {
          this.error = 'No tienes permiso para ver este pedido o no existe.';
        } else if (err?.status === 401) {
          this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
        } else {
          this.error = 'No pudimos cargar los detalles del pedido.';
        }
      }
    });
  }

  isPayingWithMP = false;

  payWithMercadoPago(): void {
    if (!this.order) return;
    this.isPayingWithMP = true;
    this.orderService.createPayment(this.order.id, { provider: 'MERCADO_PAGO' }).subscribe({
      next: (response) => {
        if (response.checkoutUrl) {
          window.location.href = response.checkoutUrl;
        } else {
          this.isPayingWithMP = false;
          Swal.fire('Error', 'No se recibió la URL de pago de Mercado Pago', 'error');
        }
      },
      error: (err) => {
        this.isPayingWithMP = false;
        console.error('Error al crear pago MP:', err);
        if (err.status === 409) {
          Swal.fire('Atención', 'Ya existe un intento de pago activo para esta orden.', 'warning');
        } else {
          Swal.fire('Error', 'No se pudo iniciar el pago con Mercado Pago', 'error');
        }
      }
    });
  }

  canClientCancel(): boolean {
    if (!this.order) return false;
    return this.orderService.canClientCancel(this.order.status);
  }

  openCancelModal(): void {
    this.cancelReason = '';
    this.cancelError = '';
    this.showCancelModal = true;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.cancelError = '';
  }

  confirmCancel(): void {
    if (!this.order || this.isCancelling) return;
    this.isCancelling = true;
    this.cancelError = '';

    const request = { reason: this.cancelReason.trim() || 'Cancelado por el cliente' };

    this.orderService.cancelMyOrder(this.order.id, request).subscribe({
      next: (updated) => {
        this.order = updated;
        this.isCancelling = false;
        this.showCancelModal = false;
        Swal.fire({
          icon: 'success',
          title: 'Pedido cancelado',
          text: 'Tu pedido ha sido cancelado correctamente.',
          confirmButtonColor: '#722f37'
        });
      },
      error: (err) => {
        this.isCancelling = false;
        const msg = err?.error?.error ?? err?.error?.message;
        if (msg) {
          this.cancelError = msg;
        } else if (err?.status === 400) {
          this.cancelError = 'No se pudo cancelar el pedido. Verifica su estado actual.';
        } else {
          this.cancelError = 'Error al cancelar. Inténtalo de nuevo.';
        }
      }
    });
  }

  getStatusBadgeClass(status: OrderStatus): string {
    const map: Record<string, string> = {
      PENDING: 'badge-amber', CONFIRMED: 'badge-blue', PROCESSING: 'badge-indigo',
      COMPLETED: 'badge-green', CANCELLED: 'badge-red'
    };
    return map[status] ?? 'badge-gray';
  }

  getStatusLabel(status: OrderStatus): string {
    const map: Record<string, string> = {
      PENDING: 'Pendiente', CONFIRMED: 'Confirmado', PROCESSING: 'En proceso',
      COMPLETED: 'Entregado', CANCELLED: 'Cancelado'
    };
    return map[status] ?? status;
  }

  getPaymentLabel(status: PaymentStatus): string {
    const map: Record<string, string> = {
      PENDING: 'Pendiente pago', PAID: 'Pagado', FAILED: 'Pago fallido',
      REFUNDED: 'Reembolsado', PARTIALLY_REFUNDED: 'Reembolso parcial'
    };
    return map[status] ?? status;
  }

  getShippingLabel(status: ShippingStatus): string {
    const map: Record<string, string> = {
      PENDING: 'Por preparar', PREPARING: 'Preparando', SHIPPED: 'Enviado',
      IN_TRANSIT: 'En camino', DELIVERED: 'Entregado', RETURNED: 'Devuelto'
    };
    return map[status] ?? status;
  }

  getPaymentMethodLabel(method: string): string {
    const map: Record<string, string> = {
      CASH_ON_DELIVERY: 'Pago al recibir',
      BANK_TRANSFER: 'Transferencia bancaria'
    };
    return map[method] ?? method;
  }

  getCancelSourceLabel(source: string | undefined): string {
    const map: Record<string, string> = {
      CUSTOMER: 'Por el cliente',
      ADMIN: 'Por el administrador',
      SYSTEM: 'Por el sistema'
    };
    return source ? (map[source] ?? source) : '';
  }

  formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = '/assets/logoP.png';
  }

  // ==================== LÓGICA DE COMPROBANTE DE PAGO ====================

  loadPaymentInstructions(orderId: number): void {
    this.loadingInstructions = true;
    this.orderService.getPaymentInstructions(orderId).subscribe({
      next: (instructions) => {
        this.paymentInstructions = instructions;
        this.loadingInstructions = false;
      },
      error: (err) => {
        console.error('Error cargando instrucciones de pago', err);
        this.loadingInstructions = false;
      }
    });
  }

  copyToClipboard(text: string | number | undefined | null, fieldName: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text.toString()).then(() => {
      Swal.fire({
        toast: true,
        position: 'bottom-end',
        icon: 'success',
        title: `${fieldName} copiado al portapapeles`,
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });
    }).catch(err => {
      console.error('No se pudo copiar el texto', err);
    });
  }

  loadProofMetadata(orderId: number): void {
    this.orderService.getMyPaymentProof(orderId).subscribe({
      next: (proof) => {
        this.proofMetadata = proof;
      },
      error: (err) => {
        console.error('Error cargando metadata del comprobante', err);
      }
    });
  }

  onFileSelected(event: any): void {
    this.uploadError = '';
    const file = event.target.files[0];
    if (!file) {
      this.selectedFile = null;
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.uploadError = 'El archivo supera el límite de 5 MB.';
      this.selectedFile = null;
      event.target.value = '';
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      this.uploadError = 'Solo se permiten archivos JPG, PNG o PDF.';
      this.selectedFile = null;
      event.target.value = '';
      return;
    }

    this.selectedFile = file;
  }

  submitProof(): void {
    if (!this.order || !this.selectedFile) {
      this.uploadError = 'Debes seleccionar un archivo.';
      return;
    }
    
    if (this.proofForm.invalid) {
      this.uploadError = 'Verifica los campos del formulario.';
      return;
    }

    this.isUploading = true;
    this.uploadError = '';

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    const values = this.proofForm.value;
    if (values.referenceNumber) formData.append('referenceNumber', values.referenceNumber);
    if (values.bankName) formData.append('bankName', values.bankName);
    if (values.amountDeclared) formData.append('amountDeclared', values.amountDeclared);
    if (values.transferDate) formData.append('transferDate', values.transferDate);
    if (values.notes) formData.append('notes', values.notes);

    this.orderService.uploadPaymentProof(this.order.id, formData).subscribe({
      next: (proof) => {
        this.isUploading = false;
        this.proofMetadata = proof;
        if (this.order) {
          this.order.hasPaymentProof = true;
          this.order.paymentProofStatus = proof.status;
        }
        Swal.fire({
          icon: 'success',
          title: 'Comprobante subido',
          text: 'Tu comprobante está en revisión.',
          confirmButtonColor: '#722f37'
        });
      },
      error: (err) => {
        this.isUploading = false;
        const msg = err?.error?.error ?? err?.error?.message ?? 'Error al subir comprobante.';
        this.uploadError = msg;
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
    if (!this.order) return;
    
    this.showProofPreviewModal = true;
    this.loadingProofPreview = true;
    this.proofPreviewError = null;
    this.proofPreviewOrderNumber = this.order.orderNumber;
    this.proofPreviewStatus = this.order.paymentProofStatus || 'PENDING_REVIEW';
    
    this.orderService.getMyPaymentProofFile(this.order.id).subscribe({
      next: async (response) => {
        this.loadingProofPreview = false;
        const rawBlob = response.body;

        const contentType = response.headers.get('Content-Type') || (rawBlob as any)?.type || 'application/pdf';
        const typedBlob = new Blob([rawBlob as Blob], { type: contentType });

        // LOGS TEMPORALES DIAGNOSTICO
        console.log('--- DIAGNOSTICO PDF.JS CLIENTE ---');
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
        console.log('----------------------------------');

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
        text: 'El navegador bloqueó la nueva pestaña. Usa el botón Descargar comprobante.',
        confirmButtonColor: '#722f37'
      });
    }
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
    console.error('Error descargando blob', err);
    
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
