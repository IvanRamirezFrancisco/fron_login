import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { PublicApiService } from '../../services/public-api.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { PublicProduct } from '../../models/product.model';

/** Modelo local de reseña (mock mientras no exista el endpoint). */
interface MockReview {
  id: number;
  author: string;
  date: string;
  rating: number;
  title: string;
  body: string;
  verified: boolean;
}

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.css']
})
export class ProductDetailComponent implements OnInit, OnDestroy {
  product: PublicProduct | null = null;

  loading = true;
  error: string | null = null;

  // Galería de imágenes
  selectedImageIndex = 0;

  // Selector de cantidad
  quantity = 1;

  // Estado de autenticación
  isLoggedIn = false;

  // Añadiendo al carrito
  addingToCart = false;

  // Reseñas mock (se reemplazarán con endpoint real en sprint futuro)
  mockReviews: MockReview[] = [
    {
      id: 1,
      author: 'Carlos M.',
      date: '12 de febrero, 2026',
      rating: 5,
      title: 'Increíble calidad de sonido',
      body: 'Llevo tocando más de 10 años y este instrumento superó mis expectativas. La construcción es sólida, la afinación se mantiene perfecta y el sonido es simplemente espectacular. Totalmente recomendado.',
      verified: true
    },
    {
      id: 2,
      author: 'Laura G.',
      date: '5 de marzo, 2026',
      rating: 4,
      title: 'Muy buen producto, envío rápido',
      body: 'Llegó en perfectas condiciones y antes de lo esperado. El instrumento es exactamente lo que se describe. Le quito una estrella porque el estuche incluido podría ser de mejor calidad, pero el instrumento en sí es excelente.',
      verified: true
    },
    {
      id: 3,
      author: 'Diego R.',
      date: '20 de marzo, 2026',
      rating: 5,
      title: 'La mejor compra que he hecho',
      body: 'Compré esto para mi hijo que está aprendiendo y quedé impresionado con la relación calidad-precio. El soporte de la tienda también fue excelente cuando tuve una pregunta sobre la afinación.',
      verified: false
    }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private publicApiService: PublicApiService,
    private cartService: CartService,
    private authService: AuthService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.authService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.isLoggedIn = !!user;
    });

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const productId = +params['id'];
      console.log('ID capturado de la URL:', productId);
      if (productId) {
        this.loadProduct(productId);
      } else {
        console.error('Error: ID de producto inválido en la URL:', params['id']);
        this.error = 'Producto no encontrado';
        this.loading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProduct(id: number): void {
    this.loading = true;
    this.error = null;
    this.selectedImageIndex = 0;
    this.quantity = 1;

    console.log('Cargando producto con ID:', id);

    this.publicApiService.getProductById(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (product) => {
        console.log('Producto cargado correctamente:', product);
        this.product = product;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error HTTP al cargar producto:', err);
        this.error = err.status === 404
          ? 'Producto no encontrado'
          : `Error al cargar el producto (${err.status})`;
        this.loading = false;
      }
    });
  }

  // ── Galería ────────────────────────────────────────────────────────────────

  /** Devuelve todas las URLs de imagen: primero imageUrl, luego las adicionales */
  get allImages(): string[] {
    if (!this.product) return [];
    const extras = (this.product.images ?? [])
      .slice()
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .map(i => i.url);
    if (this.product.imageUrl) {
      return [this.product.imageUrl, ...extras.filter(u => u !== this.product!.imageUrl)];
    }
    return extras.length ? extras : [];
  }

  get currentImage(): string {
    const imgs = this.allImages;
    return imgs[this.selectedImageIndex] ?? 'assets/icons/music-note.svg';
  }

  selectImage(index: number): void {
    this.selectedImageIndex = index;
  }

  // ── Precio ─────────────────────────────────────────────────────────────────

  get effectivePrice(): number {
    return this.product?.discountPrice ?? this.product?.price ?? 0;
  }

  get discountPercent(): number {
    if (!this.product?.discountPrice || !this.product?.price) return 0;
    return Math.round((1 - this.product.discountPrice / this.product.price) * 100);
  }

  // ── Stock / Cantidad ───────────────────────────────────────────────────────

  get inStock(): boolean {
    return (this.product?.stock ?? 0) > 0;
  }

  incrementQuantity(): void {
    if (this.product && this.quantity < this.product.stock) {
      this.quantity++;
    }
  }

  decrementQuantity(): void {
    if (this.quantity > 1) this.quantity--;
  }

  // ── Estrellas ──────────────────────────────────────────────────────────────

  getStars(rating: number): boolean[] {
    return Array(5).fill(false).map((_, i) => i < Math.round(rating));
  }

  // ── Carrito ────────────────────────────────────────────────────────────────

  addToCart(event?: MouseEvent): void {
    if (!this.product) return;

    if (!this.isLoggedIn) {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: `/producto/${this.product.id}` }
      });
      return;
    }

    this.addingToCart = true;
    const buttonElement = event?.currentTarget as HTMLElement;
    const rect = buttonElement?.getBoundingClientRect();

    this.cartService.addToCart(this.product as any, this.quantity, undefined, {
      x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2
    });

    setTimeout(() => { this.addingToCart = false; }, 500);
  }

  // ── Navegación ─────────────────────────────────────────────────────────────

  goBack(): void {
    this.router.navigate(['/catalogo']);
  }

  // ── Descripción HTML segura ────────────────────────────────────────────────

  /**
   * Sanitiza el HTML de la descripción detallada para evitar XSS.
   */
  get safeDetailedDescription(): SafeHtml | null {
    if (!this.product?.detailedDescription) return null;
    return this.sanitizer.bypassSecurityTrustHtml(this.product.detailedDescription);
  }

  /**
   * Devuelve el porcentaje de reseñas por estrella (5→1) para la barra de resumen.
   */
  getRatingBarPercent(stars: number): number {
    const total = this.mockReviews.length;
    if (total === 0) return 0;
    return Math.round((this.mockReviews.filter(r => r.rating === stars).length / total) * 100);
  }

  /**
   * Devuelve true si hay al menos una especificación técnica que mostrar
   * (campos fijos o atributos dinámicos). Controla la visibilidad de la
   * columna de ficha técnica.
   */
  get hasSpecs(): boolean {
    if (!this.product) return false;
    return !!(
      this.product.brand?.name ||
      this.product.model ||
      this.product.weight != null ||
      this.product.dimensions ||
      this.product.attributes?.length
    );
  }
}
