import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { Subscription } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { CartItem } from '../../models/product.model';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(-20px)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateY(-20px)', opacity: 0 }))
      ])
    ])
  ]
})
export class CartComponent implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  cartSubtotal = 0;
  cartTaxes = 0;
  cartShipping = 0;
  cartTotal = 0;
  freeShippingThreshold = 1000;
  updating = false;
  showClearConfirm = false;
  showCouponInput = false;
  couponCode = '';

  private subscriptions: Subscription[] = [];

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkAuthentication();
    this.subscribeToCart();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private checkAuthentication(): void {
    const authSub = this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      if (!isLoggedIn) {
        this.router.navigate(['/login'], {
          queryParams: { returnUrl: '/carrito' }
        });
      }
    });
    this.subscriptions.push(authSub);
  }

  private subscribeToCart(): void {
    const cartSub = this.cartService.cartItems$.subscribe(items => {
      this.cartItems = items;
      this.updateTotals();
    });
    this.subscriptions.push(cartSub);
  }

  private updateTotals(): void {
    this.cartSubtotal = this.cartService.getSubtotal();
    this.cartTaxes = this.cartService.getTaxes();
    this.cartShipping = this.cartService.getShipping();
    this.cartTotal = this.cartService.getFinalTotal();
  }

  // Obtener total de items
  getTotalItems(): number {
    return this.cartService.getCartCount();
  }

  // Obtener total de un item específico
  getItemTotal(item: CartItem): number {
    return item.product.price * item.quantity;
  }

  // Aumentar cantidad
  increaseQuantity(item: CartItem): void {
    if (item.quantity < item.product.stockQuantity) {
      this.updating = true;
      setTimeout(() => {
        this.cartService.updateQuantity(item.product.id, item.quantity + 1, item.selectedOptions);
        this.updating = false;
      }, 200);
    }
  }

  // Disminuir cantidad
  decreaseQuantity(item: CartItem): void {
    if (item.quantity > 1) {
      this.updating = true;
      setTimeout(() => {
        this.cartService.updateQuantity(item.product.id, item.quantity - 1, item.selectedOptions);
        this.updating = false;
      }, 200);
    }
  }

  // Actualizar cantidad desde input
  updateQuantityFromInput(item: CartItem, event: any): void {
    const newQuantity = parseInt(event.target.value);
    if (newQuantity && newQuantity > 0 && newQuantity <= item.product.stockQuantity) {
      this.cartService.updateQuantity(item.product.id, newQuantity, item.selectedOptions);
    } else {
      // Restaurar valor anterior si es inválido
      event.target.value = item.quantity;
    }
  }

  // Remover item del carrito
  removeItem(item: CartItem): void {
    this.cartService.removeFromCart(item.product.id, item.selectedOptions);
  }

  // Vaciar carrito
  clearCart(): void {
    this.showClearConfirm = true;
  }

  // Confirmar vaciar carrito
  confirmClearCart(): void {
    this.cartService.clearCart();
    this.showClearConfirm = false;
  }

  // Proceder al checkout
  proceedToCheckout(): void {
    if (this.cartItems.length > 0) {
      this.router.navigate(['/checkout']);
    }
  }

  // Toggle cupón
  toggleCoupon(): void {
    this.showCouponInput = !this.showCouponInput;
  }

  // Aplicar cupón
  applyCoupon(): void {
    if (this.couponCode.trim()) {
      // TODO: Implementar validación de cupón en el backend
      console.log('Aplicando cupón:', this.couponCode);
      // Aquí se haría la petición al backend
      // Por ahora solo mostramos un mensaje
      alert('Funcionalidad de cupones próximamente disponible');
      this.couponCode = '';
      this.showCouponInput = false;
    }
  }

  // Obtener opciones seleccionadas como array
  getSelectedOptionsArray(options: { [key: string]: string } | undefined): { key: string, value: string }[] {
    if (!options) return [];
    return Object.entries(options).map(([key, value]) => ({ key, value }));
  }

  // Manejar error de imagen
  onImageError(event: any): void {
    event.target.src = '/assets/logoP.png';
  }

  // TrackBy para optimizar *ngFor
  trackByProductId(index: number, item: CartItem): string {
    return item.product.id + JSON.stringify(item.selectedOptions || {});
  }
}