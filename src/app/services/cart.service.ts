import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { CartItem, Product } from '../models/product.model';

export interface CartAnimation {
  productId: string;
  productName: string;
  productImage: string;
  startX: number;
  startY: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems: CartItem[] = [];
  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  private cartTotalSubject = new BehaviorSubject<number>(0);
  private cartCountSubject = new BehaviorSubject<number>(0);
  
  // Subject para animaciones de productos agregados
  private addToCartAnimationSubject = new Subject<CartAnimation>();
  public addToCartAnimation$ = this.addToCartAnimationSubject.asObservable();

  public cartItems$ = this.cartItemsSubject.asObservable();
  public cartTotal$ = this.cartTotalSubject.asObservable();
  public cartCount$ = this.cartCountSubject.asObservable();

  constructor() {
    this.loadCartFromStorage();
    this.updateCartTotals();
  }

  // Agregar producto al carrito con animación
  addToCart(product: Product, quantity: number = 1, options?: { [key: string]: string }, animationData?: { x: number, y: number }): void {
    const existingItemIndex = this.cartItems.findIndex(
      item => item.product.id === product.id && 
      JSON.stringify(item.selectedOptions) === JSON.stringify(options)
    );

    if (existingItemIndex > -1) {
      this.cartItems[existingItemIndex].quantity += quantity;
    } else {
      this.cartItems.push({
        product,
        quantity,
        selectedOptions: options
      });
    }

    this.updateCart();
    
    // Emitir animación si se proporcionaron coordenadas
    if (animationData) {
      this.addToCartAnimationSubject.next({
        productId: product.id,
        productName: product.name,
        productImage: product.images && product.images.length > 0 ? product.images[0] : '',
        startX: animationData.x,
        startY: animationData.y
      });
    }
    
    this.showNotification(`${product.name} agregado al carrito`);
  }

  // Remover producto del carrito
  removeFromCart(productId: string, options?: { [key: string]: string }): void {
    const itemIndex = this.cartItems.findIndex(
      item => item.product.id === productId && 
      JSON.stringify(item.selectedOptions) === JSON.stringify(options)
    );

    if (itemIndex > -1) {
      const removedItem = this.cartItems.splice(itemIndex, 1)[0];
      this.updateCart();
      this.showNotification(`${removedItem.product.name} removido del carrito`);
    }
  }

  // Actualizar cantidad de un producto
  updateQuantity(productId: string, quantity: number, options?: { [key: string]: string }): void {
    const itemIndex = this.cartItems.findIndex(
      item => item.product.id === productId && 
      JSON.stringify(item.selectedOptions) === JSON.stringify(options)
    );

    if (itemIndex > -1) {
      if (quantity <= 0) {
        this.removeFromCart(productId, options);
      } else {
        this.cartItems[itemIndex].quantity = quantity;
        this.updateCart();
      }
    }
  }

  // Limpiar carrito
  clearCart(): void {
    this.cartItems = [];
    this.updateCart();
    this.showNotification('Carrito vaciado');
  }

  // Obtener items del carrito
  getCartItems(): CartItem[] {
    return [...this.cartItems];
  }

  // Obtener total del carrito
  getCartTotal(): number {
    return this.cartItems.reduce((total, item) => {
      const itemPrice = item.product.originalPrice && item.product.discount 
        ? item.product.price 
        : item.product.price;
      return total + (itemPrice * item.quantity);
    }, 0);
  }

  // Obtener cantidad total de items
  getCartCount(): number {
    return this.cartItems.reduce((count, item) => count + item.quantity, 0);
  }

  // Verificar si un producto está en el carrito
  isInCart(productId: string, options?: { [key: string]: string }): boolean {
    return this.cartItems.some(
      item => item.product.id === productId && 
      JSON.stringify(item.selectedOptions) === JSON.stringify(options)
    );
  }

  // Obtener cantidad de un producto específico en el carrito
  getProductQuantityInCart(productId: string, options?: { [key: string]: string }): number {
    const item = this.cartItems.find(
      item => item.product.id === productId && 
      JSON.stringify(item.selectedOptions) === JSON.stringify(options)
    );
    return item ? item.quantity : 0;
  }

  // Calcular subtotal (sin impuestos ni envío)
  getSubtotal(): number {
    return this.getCartTotal();
  }

  // Calcular impuestos (ejemplo: 16% IVA)
  getTaxes(): number {
    return this.getSubtotal() * 0.16;
  }

  // Calcular envío (gratis para compras mayores a $1000)
  getShipping(): number {
    const subtotal = this.getSubtotal();
    return subtotal >= 1000 ? 0 : 50;
  }

  // Calcular total final (con impuestos y envío)
  getFinalTotal(): number {
    return this.getSubtotal() + this.getTaxes() + this.getShipping();
  }

  private updateCart(): void {
    this.cartItemsSubject.next([...this.cartItems]);
    this.updateCartTotals();
    this.saveCartToStorage();
  }

  private updateCartTotals(): void {
    this.cartTotalSubject.next(this.getCartTotal());
    this.cartCountSubject.next(this.getCartCount());
  }

  private saveCartToStorage(): void {
    try {
      localStorage.setItem('music-store-cart', JSON.stringify(this.cartItems));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }

  private loadCartFromStorage(): void {
    try {
      const savedCart = localStorage.getItem('music-store-cart');
      if (savedCart) {
        this.cartItems = JSON.parse(savedCart);
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
      this.cartItems = [];
    }
  }

  private showNotification(message: string): void {
    // Aquí podrías integrar con un servicio de notificaciones
    // Por ahora, solo mostramos en consola
    console.log('Cart notification:', message);
  }
}