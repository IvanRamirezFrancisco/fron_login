import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { Product, ProductReview, ProductQuestion } from '../../models/product.model';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProductCardComponent],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css']
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  product: Product | null = null;
  relatedProducts: Product[] = [];
  reviews: ProductReview[] = [];
  questions: ProductQuestion[] = [];
  
  loading = true;
  error: string | null = null;
  
  // Galería de imágenes
  selectedImageIndex = 0;
  
  // Tabs
  activeTab: 'description' | 'specifications' | 'questions' | 'reviews' = 'description';
  
  // Selector de cantidad
  quantity = 1;
  
  // Estado de autenticación
  isLoggedIn = false;
  
  // Añadiendo al carrito
  addingToCart = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cartService: CartService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Verificar autenticación
    this.authService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.isLoggedIn = !!user;
    });

    // Obtener ID del producto de la ruta
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const productId = params['id'];
      if (productId) {
        this.loadProduct(productId);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProduct(id: string): void {
    this.loading = true;
    this.error = null;

    // Cargar producto
    this.productService.getProduct(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (product) => {
        if (product) {
          this.product = product;
          this.loadRelatedData(id);
        } else {
          this.error = 'Producto no encontrado';
          this.loading = false;
        }
      },
      error: (err) => {
        this.error = 'Error al cargar el producto';
        this.loading = false;
      }
    });
  }

  private loadRelatedData(productId: string): void {
    // Cargar productos relacionados
    this.productService.getRelatedProducts(productId).pipe(takeUntil(this.destroy$)).subscribe(
      related => this.relatedProducts = related
    );

    // Cargar reseñas
    this.productService.getProductReviews(productId).pipe(takeUntil(this.destroy$)).subscribe(
      reviews => this.reviews = reviews
    );

    // Cargar preguntas
    this.productService.getProductQuestions(productId).pipe(takeUntil(this.destroy$)).subscribe(
      questions => this.questions = questions
    );

    this.loading = false;
  }

  // Cambiar imagen seleccionada
  selectImage(index: number): void {
    this.selectedImageIndex = index;
  }

  // Cambiar tab activa
  setActiveTab(tab: 'description' | 'specifications' | 'questions' | 'reviews'): void {
    this.activeTab = tab;
  }

  // Incrementar cantidad
  incrementQuantity(): void {
    if (this.product && this.quantity < this.product.stockQuantity) {
      this.quantity++;
    }
  }

  // Decrementar cantidad
  decrementQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  // Añadir al carrito
  addToCart(event?: MouseEvent): void {
    if (!this.product) return;

    if (!this.isLoggedIn) {
      // Redirigir al login si no está autenticado
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/producto/${this.product.id}` }
      });
      return;
    }

    this.addingToCart = true;
    
    // Obtener coordenadas del botón para la animación
    const buttonElement = event?.currentTarget as HTMLElement;
    const rect = buttonElement?.getBoundingClientRect();
    
    this.cartService.addToCart(this.product, this.quantity, undefined, {
      x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    });
    
    // Simular delay para UX
    setTimeout(() => {
      this.addingToCart = false;
    }, 500);
  }

  // Apartar producto (acción placeholder)
  reserveProduct(): void {
    if (!this.product) return;

    if (!this.isLoggedIn) {
      this.router.navigate(['/register'], {
        queryParams: { returnUrl: `/producto/${this.product.id}` }
      });
      return;
    }

    alert('Función de apartado en desarrollo');
  }

  // Generar array de estrellas para rating
  getStars(rating: number): boolean[] {
    return Array(5).fill(false).map((_, index) => index < Math.round(rating));
  }

  // Calcular precio con descuento
  get discountedPrice(): number {
    if (this.product && this.product.discount) {
      return this.product.price;
    }
    return this.product?.price || 0;
  }

  // Volver atrás
  goBack(): void {
    this.router.navigate(['/catalogo']);
  }

  // Navegar a producto relacionado
  viewRelatedProduct(product: Product): void {
    this.router.navigate(['/producto', product.id]);
    // Scroll to top
    window.scrollTo(0, 0);
  }
}
