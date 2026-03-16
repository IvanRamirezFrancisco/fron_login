# 🔗 GUÍA DE INTEGRACIÓN FRONTEND-BACKEND

## 📋 ÍNDICE

1. [Resumen de la Integración](#resumen-de-la-integración)
2. [Arquitectura](#arquitectura)
3. [Servicios Creados](#servicios-creados)
4. [Ejemplos de Uso](#ejemplos-de-uso)
5. [Componentes a Actualizar](#componentes-a-actualizar)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 RESUMEN DE LA INTEGRACIÓN

### ✅ Lo que se ha completado:

#### **1. Modelos TypeScript (DTOs)**

- ✅ `cart.model.ts` - 10+ interfaces para carrito y cupones
- ✅ `review.model.ts` - 8+ interfaces para reseñas
- ✅ `wishlist.model.ts` - 10+ interfaces para wishlist

#### **2. Servicios Angular**

- ✅ `shopping-cart.service.ts` - 13 métodos para carrito
- ✅ `product-review.service.ts` - 18 métodos para reseñas
- ✅ `coupon.service.ts` - 11 métodos para cupones
- ✅ `wishlist.service.ts` - 15 métodos para wishlist

#### **3. Configuración**

- ✅ Interceptor JWT actualizado
- ✅ `app.config.ts` ya configurado con interceptores
- ✅ `environment.ts` apuntando a `http://localhost:8080/api`

---

## 🏗️ ARQUITECTURA

```
Frontend (Angular 19)                    Backend (Spring Boot 3.2)
├── Components                           ├── Controllers
│   ├── cart/                           │   ├── ShoppingCartController (13 endpoints)
│   ├── product-detail/                 │   ├── ProductReviewController (18 endpoints)
│   ├── wishlist/                       │   ├── CouponController (11 endpoints)
│   └── ...                             │   └── WishlistController (15 endpoints)
│                                       │
├── Services (NUEVOS ✨)                 ├── Services
│   ├── shopping-cart.service.ts ───────┼──▶ ShoppingCartService
│   ├── product-review.service.ts ──────┼──▶ ProductReviewService
│   ├── coupon.service.ts ──────────────┼──▶ CouponService
│   └── wishlist.service.ts ────────────┼──▶ WishlistService
│                                       │
├── Interceptors                        └── Security
│   └── auth.interceptor.ts ────────────────▶ JWT Authentication
│
└── Models
    ├── cart.model.ts
    ├── review.model.ts
    └── wishlist.model.ts
```

---

## 🛠️ SERVICIOS CREADOS

### 1. **ShoppingCartService**

**Archivo:** `src/app/services/shopping-cart.service.ts`

#### Endpoints disponibles:

```typescript
// Obtener carrito actual
getCart(): Observable<ShoppingCartDTO>

// Agregar producto
addToCart(cartId: number, request: AddToCartRequest): Observable<ShoppingCartDTO>

// Actualizar cantidad
updateCartItem(itemId: number, request: UpdateCartItemRequest): Observable<ShoppingCartDTO>

// Eliminar item
removeCartItem(itemId: number): Observable<ShoppingCartDTO>

// Aplicar cupón
applyCoupon(cartId: number, request: ApplyCouponRequest): Observable<ShoppingCartDTO>

// Validar carrito
validateCart(cartId: number): Observable<CartValidationResponse>

// Checkout
checkout(cartId: number): Observable<ApiResponse<any>>
```

#### Observables reactivos:

```typescript
cart$: Observable<ShoppingCartDTO | null>; // Estado del carrito
cartCount$: Observable<number>; // Número de items
```

---

### 2. **ProductReviewService**

**Archivo:** `src/app/services/product-review.service.ts`

#### Endpoints disponibles:

```typescript
// Crear reseña
createReview(request: CreateReviewRequest): Observable<ProductReviewDTO>

// Obtener reseñas con filtros
getProductReviews(productId: number, filters?: ReviewFilterParams): Observable<ReviewsResponse>

// Estadísticas
getProductStatistics(productId: number): Observable<ReviewStatisticsDTO>

// Votar reseña
voteReview(reviewId: number, request: VoteReviewRequest): Observable<ProductReviewDTO>

// Admin: Aprobar reseña
approveReview(reviewId: number): Observable<ProductReviewDTO>

// Admin: Respuesta del vendedor
addSellerResponse(reviewId: number, request: SellerResponseRequest): Observable<ProductReviewDTO>
```

#### Métodos helper:

```typescript
calculateRatingPercentages(stats: ReviewStatisticsDTO): { [key: number]: number }
formatRating(rating: number): string
getRatingClass(rating: number): string
```

---

### 3. **CouponService**

**Archivo:** `src/app/services/coupon.service.ts`

#### Endpoints disponibles:

```typescript
// Público: Cupones activos
getActiveCoupons(page?: number, size?: number): Observable<PaginatedResponse<CouponDTO>>

// Público: Validar cupón
validateCoupon(request: ValidateCouponRequest): Observable<CouponValidationResponse>

// Admin: Crear cupón
createCoupon(request: CreateCouponRequest): Observable<CouponDTO>

// Admin: Estadísticas
getCouponStats(couponId: number): Observable<CouponStatsDTO>
```

#### Métodos helper:

```typescript
formatDiscount(coupon: CouponDTO): string
isCouponValid(coupon: CouponDTO): boolean
calculateDiscount(coupon: CouponDTO, amount: number): number
meetsMinimumPurchase(coupon: CouponDTO, amount: number): boolean
```

---

### 4. **WishlistService**

**Archivo:** `src/app/services/wishlist.service.ts`

#### Endpoints disponibles:

```typescript
// Obtener wishlist
getWishlist(): Observable<WishlistItemDTO[]>

// Agregar a wishlist
addToWishlist(request: AddToWishlistRequest): Observable<WishlistItemDTO>

// Mover al carrito
moveToCart(itemId: number): Observable<MoveToCartResponse>

// Notificaciones
getNotifications(unreadOnly?: boolean): Observable<NotificationsResponse>

// Items con descuento
getPriceDrops(): Observable<PriceDropItemDTO[]>
```

#### Observables reactivos:

```typescript
wishlist$: Observable<WishlistItemDTO[]>; // Estado de la wishlist
wishlistCount$: Observable<number>; // Número de items
```

---

## 💡 EJEMPLOS DE USO

### **Ejemplo 1: Agregar producto al carrito**

```typescript
// En tu componente: product-detail.component.ts

import { Component, inject } from "@angular/core";
import { ShoppingCartService } from "../../services/shopping-cart.service";
import { AddToCartRequest } from "../../models/cart.model";

@Component({
  selector: "app-product-detail",
  templateUrl: "./product-detail.component.html",
})
export class ProductDetailComponent {
  private cartService = inject(ShoppingCartService);

  addToCart(productId: number, quantity: number = 1): void {
    // Primero obtener el carrito actual
    this.cartService.getCart().subscribe({
      next: (cart) => {
        // Preparar la request
        const request: AddToCartRequest = {
          productId: productId,
          quantity: quantity,
        };

        // Agregar al carrito
        this.cartService.addToCart(cart.id, request).subscribe({
          next: (updatedCart) => {
            console.log("✅ Producto agregado al carrito:", updatedCart);
            // Mostrar toast notification
            this.showSuccessMessage(`Producto agregado (${updatedCart.itemCount} items)`);
          },
          error: (error) => {
            console.error("❌ Error al agregar al carrito:", error);
            this.showErrorMessage(error.error?.message || "No se pudo agregar el producto");
          },
        });
      },
      error: (error) => {
        console.error("❌ Error al obtener carrito:", error);
      },
    });
  }

  // Suscribirse al contador de items del carrito
  ngOnInit(): void {
    this.cartService.cartCount$.subscribe((count) => {
      console.log(`🛒 Items en carrito: ${count}`);
    });
  }
}
```

### **Ejemplo 2: Mostrar reseñas de producto**

```typescript
// En tu componente: product-detail.component.ts

import { Component, OnInit, inject } from "@angular/core";
import { ProductReviewService } from "../../services/product-review.service";
import { ProductReviewDTO, ReviewStatisticsDTO, ReviewSortType } from "../../models/review.model";

@Component({
  selector: "app-product-detail",
  templateUrl: "./product-detail.component.html",
})
export class ProductDetailComponent implements OnInit {
  private reviewService = inject(ProductReviewService);

  reviews: ProductReviewDTO[] = [];
  statistics?: ReviewStatisticsDTO;
  currentPage = 0;

  ngOnInit(): void {
    const productId = 1; // Obtener del router
    this.loadReviews(productId);
    this.loadStatistics(productId);
  }

  loadReviews(productId: number, sortBy: ReviewSortType = ReviewSortType.RECENT): void {
    this.reviewService
      .getProductReviews(productId, {
        page: this.currentPage,
        size: 10,
        sortBy: sortBy,
        verifiedOnly: false,
      })
      .subscribe({
        next: (response) => {
          this.reviews = response.reviews;
          console.log(`✅ ${response.reviews.length} reseñas cargadas`);
        },
        error: (error) => {
          console.error("❌ Error al cargar reseñas:", error);
        },
      });
  }

  loadStatistics(productId: number): void {
    this.reviewService.getProductStatistics(productId).subscribe({
      next: (stats) => {
        this.statistics = stats;
        console.log(`⭐ Rating promedio: ${stats.averageRating}`);

        // Calcular porcentajes para barras de progreso
        const percentages = this.reviewService.calculateRatingPercentages(stats);
        console.log("📊 Distribución de ratings:", percentages);
      },
      error: (error) => {
        console.error("❌ Error al cargar estadísticas:", error);
      },
    });
  }

  voteHelpful(reviewId: number): void {
    this.reviewService.voteReview(reviewId, { isHelpful: true }).subscribe({
      next: (updatedReview) => {
        console.log("✅ Voto registrado");
        // Actualizar la reseña en la lista
        const index = this.reviews.findIndex((r) => r.id === reviewId);
        if (index !== -1) {
          this.reviews[index] = updatedReview;
        }
      },
      error: (error) => {
        console.error("❌ Error al votar:", error);
      },
    });
  }
}
```

### **Ejemplo 3: Sistema de wishlist**

```typescript
// En tu componente: product-card.component.ts

import { Component, Input, inject } from "@angular/core";
import { WishlistService } from "../../services/wishlist.service";
import { AddToWishlistRequest } from "../../models/wishlist.model";

@Component({
  selector: "app-product-card",
  templateUrl: "./product-card.component.html",
})
export class ProductCardComponent {
  @Input() productId!: number;

  private wishlistService = inject(WishlistService);
  isInWishlist = false;

  ngOnInit(): void {
    // Verificar si el producto está en la wishlist
    this.wishlistService.wishlist$.subscribe((items) => {
      this.isInWishlist = items.some((item) => item.productId === this.productId);
    });
  }

  toggleWishlist(): void {
    if (this.isInWishlist) {
      // Remover de wishlist
      const item = this.wishlistService.getItemByProductId(this.productId);
      if (item) {
        this.wishlistService.removeFromWishlist(item.id).subscribe({
          next: () => {
            console.log("✅ Removido de wishlist");
          },
          error: (error) => {
            console.error("❌ Error:", error);
          },
        });
      }
    } else {
      // Agregar a wishlist
      const request: AddToWishlistRequest = {
        productId: this.productId,
        priority: 1,
        notifyOnDiscount: true,
        notifyWhenAvailable: true,
      };

      this.wishlistService.addToWishlist(request).subscribe({
        next: (item) => {
          console.log("✅ Agregado a wishlist:", item);
        },
        error: (error) => {
          console.error("❌ Error:", error);
        },
      });
    }
  }
}
```

### **Ejemplo 4: Aplicar cupón de descuento**

```typescript
// En tu componente: cart.component.ts

import { Component, inject } from "@angular/core";
import { ShoppingCartService } from "../../services/shopping-cart.service";
import { CouponService } from "../../services/coupon.service";
import { ApplyCouponRequest } from "../../models/cart.model";

@Component({
  selector: "app-cart",
  templateUrl: "./cart.component.html",
})
export class CartComponent {
  private cartService = inject(ShoppingCartService);
  private couponService = inject(CouponService);

  couponCode = "";
  cart$ = this.cartService.cart$;

  applyCoupon(): void {
    if (!this.couponCode.trim()) {
      this.showError("Ingresa un código de cupón");
      return;
    }

    this.cartService.getCart().subscribe({
      next: (cart) => {
        const request: ApplyCouponRequest = {
          couponCode: this.couponCode.toUpperCase(),
        };

        this.cartService.applyCoupon(cart.id, request).subscribe({
          next: (updatedCart) => {
            console.log("✅ Cupón aplicado:", updatedCart.appliedCoupon);
            this.showSuccess(`Cupón aplicado: $${updatedCart.discount.toFixed(2)} de descuento`);
            this.couponCode = "";
          },
          error: (error) => {
            console.error("❌ Error al aplicar cupón:", error);
            this.showError(error.error?.message || "Cupón inválido");
          },
        });
      },
    });
  }

  removeCoupon(): void {
    this.cartService.getCart().subscribe({
      next: (cart) => {
        if (cart.appliedCoupon) {
          this.cartService.removeCoupon(cart.id).subscribe({
            next: () => {
              console.log("✅ Cupón removido");
              this.showSuccess("Cupón removido del carrito");
            },
            error: (error) => {
              console.error("❌ Error:", error);
            },
          });
        }
      },
    });
  }
}
```

---

## 🔄 COMPONENTES A ACTUALIZAR

### **1. Cart Component** (`src/app/components/cart/`)

**Cambios necesarios:**

```typescript
// ANTES (usando mock data):
private cartService = inject(CartService); // Servicio antiguo con localStorage

// DESPUÉS (usando API real):
private cartService = inject(ShoppingCartService); // Servicio nuevo con backend
```

**Actualizar métodos:**

- ✅ `loadCart()` → usar `cartService.getCart()`
- ✅ `updateQuantity()` → usar `cartService.updateCartItem()`
- ✅ `removeItem()` → usar `cartService.removeCartItem()`
- ✅ `clearCart()` → usar `cartService.clearCart()`

---

### **2. Product Detail Component** (`src/app/components/product-detail/`)

**Agregar:**

```typescript
import { ProductReviewService } from '../../services/product-review.service';
import { WishlistService } from '../../services/wishlist.service';

// Mostrar reseñas del producto
loadReviews(productId: number) {
  this.reviewService.getProductReviews(productId).subscribe(...)
}

// Botón de wishlist
toggleWishlist(productId: number) {
  this.wishlistService.addToWishlist({ productId }).subscribe(...)
}
```

---

### **3. Header Component** (`src/app/components/header/` o `header-loggedin/`)

**Mostrar contadores:**

```typescript
// Suscribirse a contadores reactivos
ngOnInit(): void {
  this.cartService.cartCount$.subscribe(count => {
    this.cartBadgeCount = count;
  });

  this.wishlistService.wishlistCount$.subscribe(count => {
    this.wishlistBadgeCount = count;
  });
}
```

---

### **4. Crear Componente de Wishlist** (si no existe)

**Comando:**

```bash
ng generate component components/wishlist
```

**Implementación básica:**

```typescript
import { Component, OnInit, inject } from "@angular/core";
import { WishlistService } from "../../services/wishlist.service";
import { WishlistItemDTO } from "../../models/wishlist.model";

@Component({
  selector: "app-wishlist",
  templateUrl: "./wishlist.component.html",
})
export class WishlistComponent implements OnInit {
  private wishlistService = inject(WishlistService);

  items: WishlistItemDTO[] = [];
  priceDrops: any[] = [];

  ngOnInit(): void {
    this.loadWishlist();
    this.loadPriceDrops();
  }

  loadWishlist(): void {
    this.wishlistService.getWishlist().subscribe({
      next: (items) => {
        this.items = items;
      },
    });
  }

  loadPriceDrops(): void {
    this.wishlistService.getPriceDrops().subscribe({
      next: (drops) => {
        this.priceDrops = drops;
      },
    });
  }

  moveToCart(itemId: number): void {
    this.wishlistService.moveToCart(itemId).subscribe({
      next: (response) => {
        console.log("✅ Movido al carrito:", response);
        this.loadWishlist(); // Recargar
      },
    });
  }
}
```

---

## 🧪 TESTING

### **1. Verificar servicios en consola del navegador:**

```javascript
// Abrir DevTools → Console

// Verificar que los servicios están disponibles
// (Agregar temporalmente en el componente)
console.log("ShoppingCartService:", this.cartService);
console.log("WishlistService:", this.wishlistService);
```

### **2. Probar endpoints manualmente:**

```typescript
// En cualquier componente, inyectar el servicio y probar:

ngOnInit(): void {
  // Test: Obtener cupones activos
  this.couponService.getActiveCoupons().subscribe(
    response => console.log('✅ Cupones:', response),
    error => console.error('❌ Error:', error)
  );

  // Test: Obtener carrito
  this.cartService.getCart().subscribe(
    cart => console.log('✅ Carrito:', cart),
    error => console.error('❌ Error:', error)
  );
}
```

### **3. Verificar en Network Tab:**

1. Abrir Chrome DevTools → Network
2. Filtrar por `XHR`
3. Ejecutar una acción (ej: agregar al carrito)
4. Verificar:
   - ✅ Request URL: `http://localhost:8080/api/cart/1/items`
   - ✅ Request Headers: `Authorization: Bearer eyJ...`
   - ✅ Response: Status 200, JSON con el carrito actualizado

---

## ⚠️ TROUBLESHOOTING

### **Problema 1: Error 401 (Unauthorized)**

**Causa:** Token JWT no válido o expirado

**Solución:**

```typescript
// 1. Verificar que el token esté guardado
console.log("Token:", localStorage.getItem("token"));

// 2. Login nuevamente
this.authService.login({ email: "admin@test.com", password: "admin123" }).subscribe((response) => console.log("Login exitoso"));
```

---

### **Problema 2: CORS Error**

**Causa:** Backend no permite requests desde `http://localhost:4200`

**Solución en Backend:**

```java
// SecurityConfig.java - Verificar que CORS esté configurado:

@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(Arrays.asList("http://localhost:4200"));
    configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH"));
    configuration.setAllowedHeaders(Arrays.asList("*"));
    configuration.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
}
```

---

### **Problema 3: Backend no responde**

**Verificar:**

1. **Servidor corriendo:**

   ```bash
   # En terminal del backend:
   mvn spring-boot:run

   # Debe mostrar:
   # Started AuthSystemApplication in X.XXX seconds
   ```

2. **Puerto correcto:**

   ```typescript
   // environment.ts
   apiUrl: "http://localhost:8080/api"; // ✅ Correcto
   ```

3. **Test con curl:**
   ```bash
   curl http://localhost:8080/api/coupons/active
   ```

---

### **Problema 4: Datos no se actualizan en UI**

**Causa:** No estás suscrito a los Observables

**Solución:**

```typescript
// ❌ MAL (no se suscribe):
this.cart = this.cartService.cart$;

// ✅ BIEN (con async pipe en template):
// component.ts:
cart$ = this.cartService.cart$;

// component.html:
<div *ngIf="cart$ | async as cart">
  {{ cart.itemCount }} items
</div>

// ✅ BIEN (suscripción manual):
this.cartService.cart$.subscribe(cart => {
  this.cart = cart;
});
```

---

## 📚 RECURSOS ADICIONALES

### **Documentación Backend:**

- 📄 `ENDPOINTS_DOCUMENTATION.md` - Referencia completa de 57 endpoints
- 📄 `TESTING_GUIDE.md` - Ejemplos de testing con curl

### **Modelos TypeScript:**

- `cart.model.ts` - Interfaces de carrito y cupones
- `review.model.ts` - Interfaces de reseñas
- `wishlist.model.ts` - Interfaces de wishlist

### **Servicios Angular:**

- `shopping-cart.service.ts` - 13 métodos
- `product-review.service.ts` - 18 métodos
- `coupon.service.ts` - 11 métodos
- `wishlist.service.ts` - 15 métodos

---

## ✅ CHECKLIST DE INTEGRACIÓN

### Configuración Inicial

- [x] Modelos TypeScript creados
- [x] Servicios Angular creados
- [x] Interceptor JWT configurado
- [x] app.config.ts actualizado
- [x] environment.ts apunta a backend correcto

### Componentes a Actualizar

- [ ] Cart Component → usar ShoppingCartService
- [ ] Product Detail → agregar reviews y wishlist
- [ ] Header → mostrar contadores reactivos
- [ ] Crear Wishlist Component (si no existe)
- [ ] Catalogo → agregar botones de wishlist

### Testing

- [ ] Verificar login y obtención de token
- [ ] Probar agregar productos al carrito
- [ ] Probar crear reseñas
- [ ] Probar agregar a wishlist
- [ ] Probar aplicar cupones
- [ ] Verificar notificaciones de wishlist

### Producción

- [ ] Actualizar `environment.prod.ts` con URL de producción
- [ ] Configurar manejo de errores global
- [ ] Agregar loading states en componentes
- [ ] Implementar toast notifications
- [ ] Testing end-to-end completo

---

**Fecha:** Febrero 2026  
**Versión Frontend:** Angular 19.2.0  
**Versión Backend:** Spring Boot 3.2.0  
**Total Endpoints Integrados:** 57
