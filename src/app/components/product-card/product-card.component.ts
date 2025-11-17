import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Product } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.css']
})
export class ProductCardComponent implements OnInit {
  @Input() product!: Product;
  @Input() showStockQuantity = false;
  @Output() productClick = new EventEmitter<Product>();
  @Output() quickViewClick = new EventEmitter<Product>();
  @Output() favoriteToggle = new EventEmitter<{ product: Product, isFavorite: boolean }>();

  isInCart = false;
  cartQuantity = 0;
  addingToCart = false;
  isFavorite = false;

  constructor(
    private cartService: CartService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.updateCartStatus();
    this.loadFavoriteStatus();
    
    // Suscribirse a cambios en el carrito
    this.cartService.cartItems$.subscribe(() => {
      this.updateCartStatus();
    });
  }

  // Ver producto completo
  viewProduct(): void {
    this.productClick.emit(this.product);
  }

  // Vista rápida del producto
  quickView(event: Event): void {
    event.stopPropagation();
    this.quickViewClick.emit(this.product);
  }

  // Toggle favorito
  toggleFavorite(event: Event): void {
    event.stopPropagation();
    this.isFavorite = !this.isFavorite;
    this.saveFavoriteStatus();
    this.favoriteToggle.emit({ 
      product: this.product, 
      isFavorite: this.isFavorite 
    });
  }

  // Agregar/Quitar del carrito
  toggleCart(): void {
    if (this.addingToCart || !this.product.inStock) return;

    // Verificar si el usuario está logueado
    this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      if (!isLoggedIn) {
        // Redirigir al login si no está autenticado
        this.router.navigate(['/login'], {
          queryParams: { returnUrl: this.router.url }
        });
        return;
      }

      this.addingToCart = true;

      // Simular tiempo de carga
      setTimeout(() => {
        if (this.isInCart) {
          this.cartService.removeFromCart(this.product.id);
        } else {
          this.cartService.addToCart(this.product, 1);
        }
        this.addingToCart = false;
      }, 300);
    }).unsubscribe(); // Unsubscribe inmediatamente ya que solo necesitamos el valor actual
  }

  // Aumentar cantidad
  increaseQuantity(): void {
    if (this.cartQuantity < this.product.stockQuantity) {
      this.cartService.updateQuantity(this.product.id, this.cartQuantity + 1);
    }
  }

  // Disminuir cantidad
  decreaseQuantity(): void {
    if (this.cartQuantity > 1) {
      this.cartService.updateQuantity(this.product.id, this.cartQuantity - 1);
    }
  }

  // Obtener estrellas para el rating
  getStars(): boolean[] {
    const stars: boolean[] = [];
    const fullStars = Math.floor(this.product.rating);
    const hasHalfStar = this.product.rating % 1 !== 0;

    // Agregar estrellas llenas
    for (let i = 0; i < fullStars; i++) {
      stars.push(true);
    }

    // Agregar media estrella si es necesario
    if (hasHalfStar && stars.length < 5) {
      stars.push(true);
    }

    // Completar con estrellas vacías
    while (stars.length < 5) {
      stars.push(false);
    }

    return stars;
  }

  // Obtener texto del stock
  getStockText(): string {
    if (!this.product.inStock) {
      return 'Agotado';
    }
    
    if (this.product.stockQuantity <= 5) {
      return 'Pocas unidades';
    }
    
    return 'En stock';
  }

  // Obtener texto del botón
  getBtnText(): string {
    if (this.addingToCart) {
      return 'Agregando...';
    }
    
    if (!this.product.inStock) {
      return 'Agotado';
    }
    
    return this.isInCart ? 'En carrito' : 'Agregar al carrito';
  }

  // Manejar error de imagen
  onImageError(event: any): void {
    event.target.src = '/assets/logoP.png';
  }

  private updateCartStatus(): void {
    this.isInCart = this.cartService.isInCart(this.product.id);
    this.cartQuantity = this.cartService.getProductQuantityInCart(this.product.id);
  }

  private loadFavoriteStatus(): void {
    try {
      const favorites = JSON.parse(localStorage.getItem('music-store-favorites') || '[]');
      this.isFavorite = favorites.includes(this.product.id);
    } catch (error) {
      console.error('Error loading favorite status:', error);
      this.isFavorite = false;
    }
  }

  private saveFavoriteStatus(): void {
    try {
      const favorites = JSON.parse(localStorage.getItem('music-store-favorites') || '[]');
      
      if (this.isFavorite) {
        if (!favorites.includes(this.product.id)) {
          favorites.push(this.product.id);
        }
      } else {
        const index = favorites.indexOf(this.product.id);
        if (index > -1) {
          favorites.splice(index, 1);
        }
      }
      
      localStorage.setItem('music-store-favorites', JSON.stringify(favorites));
    } catch (error) {
      console.error('Error saving favorite status:', error);
    }
  }
}