# 🚀 EJEMPLO PRÁCTICO: Actualizar Cart Component

## Paso a paso para integrar ShoppingCartService en tu componente de carrito

### ANTES (usando localStorage o mock data):

```typescript
// cart.component.ts - VERSIÓN ANTIGUA
import { Component } from "@angular/core";
import { CartService } from "../../services/cart.service"; // Servicio viejo

export class CartComponent {
  cartItems: any[] = [];

  constructor(private cartService: CartService) {}

  ngOnInit() {
    // Carga desde localStorage
    this.cartItems = this.cartService.getItems();
  }

  updateQuantity(itemId: string, quantity: number) {
    // Actualiza en memoria local
    this.cartService.updateQuantity(itemId, quantity);
    this.cartItems = this.cartService.getItems();
  }
}
```

---

### DESPUÉS (usando API real):

```typescript
// cart.component.ts - VERSIÓN NUEVA CON INTEGRACIÓN
import { Component, OnInit, OnDestroy, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterLink } from "@angular/router";
import { Subject, takeUntil } from "rxjs";

// ✅ IMPORTAR SERVICIOS NUEVOS
import { ShoppingCartService } from "../../services/shopping-cart.service";
import { CouponService } from "../../services/coupon.service";

// ✅ IMPORTAR MODELOS
import { ShoppingCartDTO, CartItemDTO, UpdateCartItemRequest, ApplyCouponRequest } from "../../models/cart.model";

@Component({
  selector: "app-cart",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./cart.component.html",
  styleUrls: ["./cart.component.css"],
})
export class CartComponent implements OnInit, OnDestroy {
  // ✅ INYECTAR SERVICIOS CON inject()
  private cartService = inject(ShoppingCartService);
  private couponService = inject(CouponService);

  // ✅ ESTADO DEL COMPONENTE
  cart: ShoppingCartDTO | null = null;
  loading = false;
  error: string | null = null;
  couponCode = "";

  // Para manejar suscripciones
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.loadCart();
    this.subscribeToCartUpdates();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ CARGAR CARRITO DESDE BACKEND
  loadCart(): void {
    this.loading = true;
    this.error = null;

    this.cartService
      .getCart()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cart) => {
          this.cart = cart;
          this.loading = false;
          console.log("✅ Carrito cargado:", cart);
        },
        error: (err) => {
          this.error = "No se pudo cargar el carrito";
          this.loading = false;
          console.error("❌ Error al cargar carrito:", err);
        },
      });
  }

  // ✅ SUSCRIBIRSE A CAMBIOS DEL CARRITO
  subscribeToCartUpdates(): void {
    this.cartService.cart$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (cart) => {
        this.cart = cart;
      },
    });
  }

  // ✅ ACTUALIZAR CANTIDAD DE UN ITEM
  updateQuantity(item: CartItemDTO, newQuantity: number): void {
    if (newQuantity < 1) {
      this.removeItem(item);
      return;
    }

    if (newQuantity > item.availableStock) {
      this.showError(`Stock disponible: ${item.availableStock}`);
      return;
    }

    const request: UpdateCartItemRequest = {
      itemId: item.id,
      quantity: newQuantity,
    };

    this.cartService
      .updateCartItem(item.id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCart) => {
          console.log("✅ Cantidad actualizada");
          this.showSuccess("Cantidad actualizada");
        },
        error: (err) => {
          console.error("❌ Error al actualizar:", err);
          this.showError(err.error?.message || "No se pudo actualizar la cantidad");
        },
      });
  }

  // ✅ INCREMENTAR CANTIDAD
  incrementQuantity(item: CartItemDTO): void {
    this.updateQuantity(item, item.quantity + 1);
  }

  // ✅ DECREMENTAR CANTIDAD
  decrementQuantity(item: CartItemDTO): void {
    this.updateQuantity(item, item.quantity - 1);
  }

  // ✅ ELIMINAR ITEM DEL CARRITO
  removeItem(item: CartItemDTO): void {
    if (!confirm(`¿Eliminar "${item.productName}" del carrito?`)) {
      return;
    }

    this.cartService
      .removeCartItem(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log("✅ Item eliminado");
          this.showSuccess("Producto eliminado del carrito");
        },
        error: (err) => {
          console.error("❌ Error al eliminar:", err);
          this.showError("No se pudo eliminar el producto");
        },
      });
  }

  // ✅ VACIAR CARRITO COMPLETO
  clearCart(): void {
    if (!this.cart || this.cart.items.length === 0) {
      return;
    }

    if (!confirm("¿Vaciar todo el carrito?")) {
      return;
    }

    this.cartService
      .clearCart(this.cart.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log("✅ Carrito vaciado");
          this.showSuccess("Carrito vaciado");
          this.cart = null;
        },
        error: (err) => {
          console.error("❌ Error al vaciar carrito:", err);
          this.showError("No se pudo vaciar el carrito");
        },
      });
  }

  // ✅ APLICAR CUPÓN DE DESCUENTO
  applyCoupon(): void {
    if (!this.cart) {
      this.showError("No hay carrito activo");
      return;
    }

    const code = this.couponCode.trim().toUpperCase();
    if (!code) {
      this.showError("Ingresa un código de cupón");
      return;
    }

    const request: ApplyCouponRequest = {
      couponCode: code,
    };

    this.cartService
      .applyCoupon(this.cart.id, request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCart) => {
          console.log("✅ Cupón aplicado:", updatedCart.appliedCoupon);
          this.showSuccess(`Cupón aplicado: -$${updatedCart.discount.toFixed(2)}`);
          this.couponCode = "";
        },
        error: (err) => {
          console.error("❌ Error al aplicar cupón:", err);
          this.showError(err.error?.message || "Cupón inválido");
        },
      });
  }

  // ✅ REMOVER CUPÓN
  removeCoupon(): void {
    if (!this.cart || !this.cart.appliedCoupon) {
      return;
    }

    this.cartService
      .removeCoupon(this.cart.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log("✅ Cupón removido");
          this.showSuccess("Cupón removido");
        },
        error: (err) => {
          console.error("❌ Error al remover cupón:", err);
          this.showError("No se pudo remover el cupón");
        },
      });
  }

  // ✅ PROCEDER AL CHECKOUT
  proceedToCheckout(): void {
    if (!this.cart) {
      this.showError("No hay items en el carrito");
      return;
    }

    // Primero validar el carrito
    this.cartService
      .validateCart(this.cart.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (validation) => {
          if (!validation.valid) {
            // Mostrar errores de validación
            const errors = validation.errors.map((e) => e.message).join("\n");
            this.showError(`Errores en el carrito:\n${errors}`);
            return;
          }

          // Si es válido, proceder al checkout
          this.checkout();
        },
        error: (err) => {
          console.error("❌ Error al validar carrito:", err);
          this.showError("No se pudo validar el carrito");
        },
      });
  }

  // ✅ EJECUTAR CHECKOUT
  private checkout(): void {
    if (!this.cart) return;

    this.loading = true;

    this.cartService
      .checkout(this.cart.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log("✅ Checkout exitoso:", response);
          this.showSuccess("¡Orden creada exitosamente!");
          // Redirigir a página de confirmación
          // this.router.navigate(['/order-confirmation', response.data.orderId]);
        },
        error: (err) => {
          console.error("❌ Error en checkout:", err);
          this.showError(err.error?.message || "No se pudo completar la compra");
          this.loading = false;
        },
      });
  }

  // ✅ CALCULAR SUBTOTAL DE UN ITEM
  getItemSubtotal(item: CartItemDTO): number {
    return item.unitPrice * item.quantity;
  }

  // ✅ VERIFICAR SI HAY DESCUENTO
  hasDiscount(): boolean {
    return this.cart ? this.cart.discount > 0 : false;
  }

  // ✅ OBTENER PORCENTAJE DE AHORRO
  getSavingsPercentage(): number {
    if (!this.cart || this.cart.subtotal === 0) return 0;
    return (this.cart.discount / this.cart.subtotal) * 100;
  }

  // ✅ HELPERS PARA NOTIFICACIONES
  private showSuccess(message: string): void {
    // Implementar con tu sistema de notificaciones (toast, snackbar, etc.)
    console.log("✅ SUCCESS:", message);
    // Ejemplo: this.toastService.show(message, 'success');
  }

  private showError(message: string): void {
    // Implementar con tu sistema de notificaciones
    console.error("❌ ERROR:", message);
    // Ejemplo: this.toastService.show(message, 'error');
  }
}
```

---

## TEMPLATE ACTUALIZADO (cart.component.html)

```html
<!-- LOADING STATE -->
<div *ngIf="loading" class="loading-container">
  <div class="spinner"></div>
  <p>Cargando carrito...</p>
</div>

<!-- ERROR STATE -->
<div *ngIf="error && !loading" class="error-container">
  <p>{{ error }}</p>
  <button (click)="loadCart()">Reintentar</button>
</div>

<!-- CARRITO VACÍO -->
<div *ngIf="!cart || cart.items.length === 0" class="empty-cart">
  <i class="fas fa-shopping-cart"></i>
  <h2>Tu carrito está vacío</h2>
  <p>Agrega productos para empezar tu compra</p>
  <a routerLink="/catalogo" class="btn btn-primary">Ir al catálogo</a>
</div>

<!-- CARRITO CON ITEMS -->
<div *ngIf="cart && cart.items.length > 0" class="cart-container">
  <div class="cart-header">
    <h1>Mi Carrito ({{ cart.itemCount }} items)</h1>
    <button (click)="clearCart()" class="btn btn-link"><i class="fas fa-trash"></i> Vaciar carrito</button>
  </div>

  <!-- LISTA DE ITEMS -->
  <div class="cart-items">
    <div *ngFor="let item of cart.items" class="cart-item">
      <!-- Imagen del producto -->
      <div class="item-image">
        <img [src]="item.productImage || '/assets/placeholder.png'" [alt]="item.productName" />
      </div>

      <!-- Info del producto -->
      <div class="item-info">
        <h3>{{ item.productName }}</h3>
        <p class="item-sku">SKU: {{ item.productSku }}</p>
        <p class="item-price">${{ item.unitPrice.toFixed(2) }} c/u</p>

        <!-- Stock disponible -->
        <p class="item-stock" *ngIf="item.availableStock < 10">⚠️ Solo {{ item.availableStock }} disponibles</p>
      </div>

      <!-- Controles de cantidad -->
      <div class="item-quantity">
        <button (click)="decrementQuantity(item)" [disabled]="item.quantity <= 1">-</button>
        <input type="number" [value]="item.quantity" (change)="updateQuantity(item, +$any($event.target).value)" min="1" [max]="item.availableStock" />
        <button (click)="incrementQuantity(item)" [disabled]="item.quantity >= item.availableStock">+</button>
      </div>

      <!-- Subtotal -->
      <div class="item-total">
        <p class="total-price">${{ item.total.toFixed(2) }}</p>
        <p class="discount" *ngIf="item.discount > 0">Descuento: -${{ item.discount.toFixed(2) }}</p>
      </div>

      <!-- Botón eliminar -->
      <button (click)="removeItem(item)" class="btn-remove">
        <i class="fas fa-times"></i>
      </button>
    </div>
  </div>

  <!-- SECCIÓN DE CUPÓN -->
  <div class="coupon-section">
    <h3>¿Tienes un cupón?</h3>

    <!-- Si hay cupón aplicado -->
    <div *ngIf="cart.appliedCoupon" class="applied-coupon">
      <div class="coupon-info">
        <i class="fas fa-tag"></i>
        <div>
          <strong>{{ cart.appliedCoupon.code }}</strong>
          <p>{{ cart.appliedCoupon.description }}</p>
          <p class="savings">Ahorras: ${{ cart.discount.toFixed(2) }}</p>
        </div>
      </div>
      <button (click)="removeCoupon()" class="btn btn-link">Remover</button>
    </div>

    <!-- Formulario para aplicar cupón -->
    <div *ngIf="!cart.appliedCoupon" class="coupon-form">
      <input type="text" [(ngModel)]="couponCode" placeholder="Código de cupón" (keyup.enter)="applyCoupon()" />
      <button (click)="applyCoupon()" class="btn btn-secondary">Aplicar</button>
    </div>
  </div>

  <!-- RESUMEN DEL CARRITO -->
  <div class="cart-summary">
    <h3>Resumen del pedido</h3>

    <div class="summary-row">
      <span>Subtotal:</span>
      <span>${{ cart.subtotal.toFixed(2) }}</span>
    </div>

    <div class="summary-row discount" *ngIf="hasDiscount()">
      <span>Descuento ({{ getSavingsPercentage().toFixed(0) }}%):</span>
      <span class="text-success">-${{ cart.discount.toFixed(2) }}</span>
    </div>

    <div class="summary-row">
      <span>Impuestos:</span>
      <span>${{ cart.tax.toFixed(2) }}</span>
    </div>

    <div class="summary-row">
      <span>Envío:</span>
      <span *ngIf="cart.shippingCost > 0"> ${{ cart.shippingCost.toFixed(2) }} </span>
      <span *ngIf="cart.shippingCost === 0" class="text-success"> ¡GRATIS! </span>
    </div>

    <div class="summary-row total">
      <strong>Total:</strong>
      <strong>${{ cart.total.toFixed(2) }}</strong>
    </div>

    <button (click)="proceedToCheckout()" class="btn btn-primary btn-block" [disabled]="loading">
      <span *ngIf="!loading">Proceder al pago</span>
      <span *ngIf="loading">Procesando...</span>
    </button>

    <a routerLink="/catalogo" class="btn btn-link btn-block"> Continuar comprando </a>
  </div>
</div>
```

---

## ESTILOS (cart.component.css)

```css
/* Agregar a tu archivo de estilos existente */

.cart-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.cart-item {
  display: grid;
  grid-template-columns: 100px 1fr auto auto auto;
  gap: 20px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 15px;
  align-items: center;
}

.item-image img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 8px;
}

.item-quantity {
  display: flex;
  align-items: center;
  gap: 10px;
}

.item-quantity button {
  width: 32px;
  height: 32px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  border-radius: 4px;
}

.item-quantity button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.item-quantity input {
  width: 60px;
  text-align: center;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 5px;
}

.cart-summary {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  position: sticky;
  top: 20px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.summary-row.total {
  font-size: 1.3em;
  padding-top: 15px;
  border-top: 2px solid #333;
  margin-top: 15px;
}

.loading-container {
  text-align: center;
  padding: 50px;
}

.empty-cart {
  text-align: center;
  padding: 100px 20px;
}

.empty-cart i {
  font-size: 80px;
  color: #ccc;
  margin-bottom: 20px;
}
```

---

## 🎯 PRÓXIMOS PASOS

1. **Importar FormsModule** en tu componente para usar `[(ngModel)]`:

   ```typescript
   import { FormsModule } from '@angular/forms';

   @Component({
     imports: [CommonModule, RouterLink, FormsModule]
   })
   ```

2. **Implementar sistema de notificaciones** (toast/snackbar)

3. **Agregar animaciones** para agregar/remover items

4. **Testing:** Probar con el backend corriendo en `localhost:8080`

---

**¿Listo para probar? Sigue estos pasos:**

1. Asegúrate de que el backend esté corriendo
2. Haz login en el frontend
3. Agrega productos al carrito
4. Verifica en Network Tab que las llamadas se hacen correctamente
5. ¡Disfruta tu carrito funcional! 🎉
