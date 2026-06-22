import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CartService, BackendCartItem } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import { CartValidationResponse, CartValidationError } from '../../models/cart.model';
import { CheckoutRequest, PaymentMethodType } from '../../models/order.model';
import { AuthService } from '../../services/auth.service';
import { take } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit, OnDestroy {

  checkoutForm!: FormGroup;

  cartItems: BackendCartItem[] = [];
  cartSubtotal = 0;
  cartTax = 0;
  cartDiscount = 0;
  cartTotal = 0;
  unavailableItemsTotal = 0;
  canCheckout = false;
  warningMessage: string | null = null;

  isValidating = false;
  isSubmitting = false;
  submitted = false;
  validationErrors: string[] = [];
  generalError = '';
  userDataLoadStatus: 'NONE' | 'PARTIAL' | 'COMPLETE' = 'NONE';

  private subs: Subscription[] = [];

  readonly paymentMethods: { value: PaymentMethodType; label: string; icon: string; description: string; badges?: string[] }[] = [
    {
      value: 'BANK_TRANSFER',
      label: 'Transferencia bancaria',
      icon: 'account_balance',
      description: 'Recibirás los datos bancarios después de generar tu pedido. Tu pedido quedará pendiente hasta confirmar el pago.',
      badges: ['Comprobante requerido', 'Revisión manual']
    },
    {
      value: 'MERCADO_PAGO',
      label: 'Mercado Pago',
      icon: 'shield',
      description: 'Paga de forma segura con tarjeta, saldo o medios disponibles en Mercado Pago.',
      badges: ['Checkout Pro', 'Pago protegido', 'Redirección segura']
    }
  ];

  constructor(
    private fb: FormBuilder,
    private cartService: CartService,
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.subscribeToCart();
    this.loadUserData();
    this.cartService.loadCart().subscribe({
      error: () => {
        this.generalError = 'No pudimos cargar tu carrito. Verifica tu conexión.';
      }
    });
  }

  hasAvailableUserData = false;

  loadUserData(force: boolean = false): void {
    this.authService.user$.pipe(take(1)).subscribe(user => {
      if (user && (user.firstName || user.lastName || user.phone)) {
        this.hasAvailableUserData = true;
        const shipping = this.checkoutForm.get('shippingAddress');
        if (shipping) {
          let hasName = false;
          let hasLastName = false;
          let hasPhone = false;

          const fNameCtrl = shipping.get('firstName');
          if (user.firstName && fNameCtrl && (force || (!fNameCtrl.dirty && !fNameCtrl.value))) {
            fNameCtrl.setValue(user.firstName);
          }
          if (fNameCtrl?.value) hasName = true;

          const lNameCtrl = shipping.get('lastName');
          if (user.lastName && lNameCtrl && (force || (!lNameCtrl.dirty && !lNameCtrl.value))) {
            lNameCtrl.setValue(user.lastName);
          }
          if (lNameCtrl?.value) hasLastName = true;

          const phoneCtrl = shipping.get('phone');
          if (user.phone && phoneCtrl && (force || (!phoneCtrl.dirty && !phoneCtrl.value))) {
            const cleanPhone = user.phone.replace(/\D/g, '');
            if (cleanPhone) {
              phoneCtrl.setValue(cleanPhone.substring(0, 10));
            }
          }
          if (phoneCtrl?.value && phoneCtrl.value.length === 10) hasPhone = true;

          if (hasName && hasLastName && hasPhone) {
            this.userDataLoadStatus = 'COMPLETE';
          } else if (hasName || hasLastName || hasPhone) {
            this.userDataLoadStatus = 'PARTIAL';
          } else {
            this.userDataLoadStatus = 'NONE';
          }
        }
      } else {
        this.hasAvailableUserData = false;
        this.userDataLoadStatus = 'NONE';
      }
    });
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private buildForm(): void {
    this.checkoutForm = this.fb.group({
      shippingAddress: this.fb.group({
        firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]{2,}$/)]],
        lastName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]{2,}$/)]],
        phone: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
        street: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
        exteriorNumber: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(20)]],
        interiorNumber: ['', [Validators.maxLength(20)]],
        neighborhood: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
        city: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s-]+$/)]],
        state: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100), Validators.pattern(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/)]],
        zipCode: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
        references: ['', [Validators.maxLength(250)]]
      }),
      requireInvoice: [false],
      billingAddress: this.fb.group({
        rfc: ['', [Validators.minLength(12), Validators.maxLength(13), Validators.pattern(/^[A-Z0-9&]{12,13}$/)]],
        businessName: ['', [Validators.maxLength(200)]],
        fiscalZipCode: ['', [Validators.pattern(/^\d{5}$/)]],
        invoiceEmail: ['', [Validators.email, Validators.maxLength(100)]]
      }),
      paymentMethod: ['BANK_TRANSFER', Validators.required],
      notes: ['', Validators.maxLength(500)]
    });

    // Validar campos de facturación solo si se requiere factura
    this.checkoutForm.get('requireInvoice')!.valueChanges.subscribe(required => {
      const billingGroup = this.checkoutForm.get('billingAddress') as FormGroup;
      if (required) {
        billingGroup.get('rfc')!.setValidators([Validators.required, Validators.minLength(12), Validators.maxLength(13), Validators.pattern(/^[A-Z0-9&]{12,13}$/)]);
        billingGroup.get('businessName')!.setValidators([Validators.required, Validators.maxLength(200)]);
        billingGroup.get('fiscalZipCode')!.setValidators([Validators.required, Validators.pattern(/^\d{5}$/)]);
        billingGroup.get('invoiceEmail')!.setValidators([Validators.required, Validators.email, Validators.maxLength(100)]);
      } else {
        billingGroup.get('rfc')!.clearValidators();
        billingGroup.get('businessName')!.clearValidators();
        billingGroup.get('fiscalZipCode')!.clearValidators();
        billingGroup.get('invoiceEmail')!.clearValidators();
      }
      billingGroup.get('rfc')!.updateValueAndValidity();
      billingGroup.get('businessName')!.updateValueAndValidity();
      billingGroup.get('fiscalZipCode')!.updateValueAndValidity();
      billingGroup.get('invoiceEmail')!.updateValueAndValidity();
    });
  }

  private subscribeToCart(): void {
    this.subs.push(
      this.cartService.cartItems$.subscribe(items => {
        this.cartItems = items;
        this.cartSubtotal = this.cartService.getSubtotal();
        this.cartTax = this.cartService.getTaxes();
        this.cartDiscount = this.cartService.getDiscount();
        this.cartTotal = this.cartService.getFinalTotal();
        this.unavailableItemsTotal = this.cartService.getUnavailableItemsTotal();
      }),
      this.cartService.canCheckout$.subscribe(val => this.canCheckout = val),
      this.cartService.warningMessage$.subscribe(msg => this.warningMessage = msg)
    );
  }

  isRequireInvoice(): boolean {
    return !!this.checkoutForm.get('requireInvoice')!.value;
  }

  selectPaymentMethod(method: PaymentMethodType): void {
    this.checkoutForm.get('paymentMethod')!.setValue(method);
  }

  isFieldInvalid(fieldPath: string): boolean {
    const ctrl = this.checkoutForm.get(fieldPath);
    return !!(ctrl && ctrl.invalid && (this.submitted || ctrl.dirty || ctrl.touched));
  }

  sanitizeNumericField(fieldPath: string, maxLength: number): void {
    const ctrl = this.checkoutForm.get(fieldPath);
    if (!ctrl || ctrl.value == null) return;
    
    let val = ctrl.value.toString();
    let sanitized = val.replace(/\D/g, '');
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    if (val !== sanitized) {
      ctrl.setValue(sanitized, { emitEvent: false });
    }
  }

  sanitizeRfcField(): void {
    const ctrl = this.checkoutForm.get('billingAddress.rfc');
    if (!ctrl || ctrl.value == null) return;
    
    let val = ctrl.value.toString();
    let sanitized = val.toUpperCase().replace(/\s/g, '');
    if (sanitized.length > 13) {
      sanitized = sanitized.substring(0, 13);
    }
    if (val !== sanitized) {
      ctrl.setValue(sanitized, { emitEvent: false });
    }
  }

  get isProcessing(): boolean {
    return this.isSubmitting || this.isValidating || this.isProcessingPayment;
  }

  onSubmit(): void {
    if (this.isSubmitting) return;
    this.generalError = '';
    this.validationErrors = [];

    if (!this.canCheckout) {
      Swal.fire({
        icon: 'warning',
        title: 'Carrito no válido',
        text: 'Tu carrito contiene productos no disponibles. Elimínalos o muévelos a tu lista de deseos antes de continuar.',
        confirmButtonColor: '#722f37'
      });
      return;
    }

    if (this.cartItems.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Carrito vacío',
        text: 'Tu carrito está vacío. Agrega productos antes de hacer tu pedido.',
        confirmButtonColor: '#722f37'
      });
      return;
    }

    this.submitted = true;
    this.checkoutForm.markAllAsTouched();
    if (this.checkoutForm.invalid) {
      setTimeout(() => {
        const firstError = document.querySelector('.input-error, .ng-invalid');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
      return;
    }

    // Validar carrito en tiempo real antes de crear la orden
    this.isValidating = true;
    this.cartService.validateCart().subscribe({
      next: (validation: CartValidationResponse) => {
        this.isValidating = false;
        // canCheckout si no hay errores de tipo ERROR
        const hasErrors = validation.errors?.some(e => e.severity === 'ERROR') ?? !validation.valid;
        if (hasErrors || !validation.valid) {
          this.validationErrors = (validation.errors ?? []).map((e: CartValidationError) => e.message);
          if (validation.warnings?.length) {
            this.validationErrors.push(
              `${validation.warnings.length} producto(s) con advertencias de disponibilidad.`
            );
          }
          Swal.fire({
            icon: 'error',
            title: 'Tu carrito cambió',
            text: 'Algunos productos ya no tienen stock. Por favor revisa tu carrito.',
            confirmButtonColor: '#722f37'
          });
          return;
        }
        this.submitOrder();
      },
      error: () => {
        this.isValidating = false;
        this.generalError = 'No pudimos validar tu carrito. Inténtalo de nuevo.';
      }
    });
  }

  private submitOrder(): void {
    const formValue = this.checkoutForm.value;
    
    // Construir string de envío
    const s = formValue.shippingAddress;
    const interiorStr = s.interiorNumber ? ` Int. ${s.interiorNumber}` : '';
    const refStr = s.references ? ` (Ref: ${s.references})` : '';
    const shippingString = `${s.firstName} ${s.lastName}, Tel: ${s.phone}\n${s.street} ${s.exteriorNumber}${interiorStr}\nCol. ${s.neighborhood}, ${s.city}, ${s.state}, CP: ${s.zipCode}${refStr}`.trim();

    // Construir string de facturación
    let billingString = shippingString;
    if (formValue.requireInvoice) {
      const b = formValue.billingAddress;
      billingString = `FACTURAR A:\nRFC: ${b.rfc}\nRazón Social: ${b.businessName}\nCP Fiscal: ${b.fiscalZipCode}\nEmail Factura: ${b.invoiceEmail}`;
    }

    const request: CheckoutRequest = {
      shippingAddress: shippingString,
      billingAddress: billingString,
      paymentMethod: formValue.paymentMethod as PaymentMethodType,
      notes: formValue.notes ? (formValue.notes as string).trim() : undefined
    };

    this.isSubmitting = true;
    this.orderService.createOrder(request).subscribe({
      next: (order) => {
        if (request.paymentMethod === 'MERCADO_PAGO') {
          this.processMercadoPago(order.id);
        } else {
          this.isSubmitting = false;
          this.router.navigate(['/orders/my', order.id]);
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        const status = err?.status;
        if (status === 400) {
          this.generalError = err?.error?.error ?? 'Datos del formulario no válidos. Revisa tu información.';
        } else if (status === 401) {
          this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
        } else if (status === 409) {
          this.generalError = 'No se pudo crear el pedido. Algunos productos ya no tienen stock. Revisa tu carrito.';
          this.cartService.loadCart().subscribe();
        } else {
          this.generalError = 'Error al crear el pedido. No perderás los datos del formulario. Inténtalo de nuevo.';
        }
      }
    });
  }

  isProcessingPayment = false;

  private processMercadoPago(orderId: number): void {
    this.isProcessingPayment = true;
    this.orderService.createPayment(orderId, { provider: 'MERCADO_PAGO' }).subscribe({
      next: (response) => {
        if (response.checkoutUrl) {
          window.location.href = response.checkoutUrl;
        } else {
          this.handleMpError('URL no generada', orderId);
        }
      },
      error: (err) => {
        this.handleMpError(err, orderId);
      }
    });
  }

  private handleMpError(err: any, orderId: number): void {
    this.isProcessingPayment = false;
    this.isSubmitting = false;
    let errorMsg = 'No pudimos iniciar Mercado Pago. Intenta nuevamente más tarde.';
    const status = err?.status;

    if (status === 400) {
      errorMsg = 'Mercado Pago no está disponible o la solicitud no es válida.';
    } else if (status === 401) {
      errorMsg = 'Tu sesión expiró. Inicia sesión nuevamente.';
    } else if (status === 403) {
      errorMsg = 'No tienes permiso para pagar esta orden.';
    } else if (status === 404) {
      errorMsg = 'No se encontró la orden.';
    } else if (status === 409) {
      errorMsg = 'Ya existe un intento de pago activo o la orden ya fue pagada.';
    } else if (status === 0) {
      errorMsg = 'No se pudo conectar con el servidor.';
    }

    Swal.fire({
      icon: 'error',
      title: 'El pedido se creó, pero...',
      text: errorMsg + ' Puedes intentarlo nuevamente desde el detalle del pedido.',
      confirmButtonText: 'Ver pedido',
      confirmButtonColor: '#722f37',
      allowOutsideClick: false
    }).then(() => {
      this.router.navigate(['/orders/my', orderId]);
    });
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = '/assets/logoP.png';
  }

  trackByItemId(_: number, item: BackendCartItem): number {
    return item.backendItemId;
  }
}
