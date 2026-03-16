import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { PublicApiService } from '../../services/public-api.service';
import { User } from '../../models/user.model';
import { PublicProduct, PublicCategory } from '../../models/product.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  host: {
    '(document:click)': 'onDocumentClick($event)'
  }
})
export class HomeComponent implements OnInit, OnDestroy {
  searchQuery = '';
  cartItemCount = 3;
  wishlistCount = 5;
  emailSubscription = '';

  // Usuario logueado
  isLoggedIn = false;
  currentUser: User | null = null;
  showUserMenu = false;

  // Datos reales del backend
  featuredProducts: PublicProduct[] = [];
  latestProducts: PublicProduct[] = [];
  categories: PublicCategory[] = [];
  loadingFeatured = true;
  loadingCategories = true;

  // ── Hero Slider ────────────────────────────────────────────────────────────
  currentSlide = 0;
  private sliderInterval?: ReturnType<typeof setInterval>;

  heroSlides = [
    {
      imageUrl: 'assets/negocio1.png',
      tag: 'Casa de Música Castillo',
      title: 'Tu Pasión,\nNuestros Instrumentos',
      subtitle: 'Descubre la colección más completa de instrumentos musicales. Calidad profesional para cada nivel.',
      cta: 'Explorar Catálogo',
      ctaLink: '/catalogo',
      ctaParams: {},
      align: 'left',
    },
    {
      imageUrl: 'assets/negocio.png',
      tag: 'Guitarras Premium',
      title: 'Guitarras Para\nCada Músico',
      subtitle: 'Desde el primer acorde hasta el escenario profesional. Modelos acústicos, eléctricos y clásicos.',
      cta: 'Ver Guitarras',
      ctaLink: '/catalogo',
      ctaParams: { categoria: 'guitarras' },
      align: 'left',
    },
    {
      imageUrl: 'assets/negocio1.png',
      tag: 'Envío a todo México',
      title: 'Sonido que\nInspira',
      subtitle: 'Pianos, teclados, baterías y mucho más. Encuentra el instrumento que lleva tu música al siguiente nivel.',
      cta: 'Ver Colección',
      ctaLink: '/catalogo',
      ctaParams: {},
      align: 'left',
    }
  ];

  goToSlide(index: number): void {
    this.currentSlide = index;
    this.resetSliderTimer();
  }

  private resetSliderTimer(): void {
    if (this.sliderInterval) clearInterval(this.sliderInterval);
    this.sliderInterval = setInterval(() => {
      this.currentSlide = (this.currentSlide + 1) % this.heroSlides.length;
    }, 6000);
  }

  private destroy$ = new Subject<void>();

  constructor(
    public router: Router,
    private authService: AuthService,
    private publicApiService: PublicApiService
  ) {}

  ngOnInit(): void {
    // Iniciar hero slider
    this.resetSliderTimer();

    // Verificar si el usuario está logueado
    this.authService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe((user: User | null) => {
      this.currentUser = user;
      this.isLoggedIn = !!user;
    });

    // Cargar productos destacados reales
    this.publicApiService.getFeaturedProducts(0, 4).pipe(takeUntil(this.destroy$)).subscribe({
      next: (page) => {
        this.featuredProducts = page.content;
        this.loadingFeatured = false;
      },
      error: () => { this.loadingFeatured = false; }
    });

    // Cargar últimos productos
    this.publicApiService.getLatestProducts().pipe(takeUntil(this.destroy$)).subscribe({
      next: (products) => { this.latestProducts = products; },
      error: () => {}
    });

    // Cargar categorías con productos activos
    this.publicApiService.getActiveCategories(true).pipe(takeUntil(this.destroy$)).subscribe({
      next: (cats) => {
        this.categories = cats;
        this.loadingCategories = false;
      },
      error: () => { this.loadingCategories = false; }
    });
  }

  ngOnDestroy(): void {
    if (this.sliderInterval) clearInterval(this.sliderInterval);
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Precio efectivo: discountPrice si existe, si no price. */
  getEffectivePrice(p: PublicProduct): number {
    return p.discountPrice ?? p.price;
  }

  /** Porcentaje de descuento redondeado. */
  getDiscountPercent(p: PublicProduct): number {
    if (!p.discountPrice || p.discountPrice >= p.price) return 0;
    return Math.round((1 - p.discountPrice / p.price) * 100);
  }

  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const userMenuContainer = target.closest('.user-menu-container');
    
    if (!userMenuContainer && this.showUserMenu) {
      this.showUserMenu = false;
    }
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  navigateToProfile(): void {
    this.closeUserMenu();
    this.router.navigate(['/dashboard/seguridad']);
  }

  logout(): void {
    this.closeUserMenu();
    this.authService.logout();
    this.isLoggedIn = false;
    this.currentUser = null;
    this.router.navigate(['/home']);
  }

  allCategories = [
    { id: 'guitarras', name: 'Guitarras', description: 'Acústicas, eléctricas y clásicas', icon: 'music_note', productCount: 0 },
    { id: 'pianos', name: 'Pianos y Teclados', description: 'Pianos acústicos y digitales', icon: 'piano', productCount: 0 },
    { id: 'baterias', name: 'Baterías', description: 'Acústicas y electrónicas', icon: 'music_note', productCount: 0 },
    { id: 'vientos', name: 'Vientos', description: 'Saxofones, trompetas, flautas', icon: 'music_note', productCount: 0 },
    { id: 'cuerdas', name: 'Cuerdas', description: 'Violines, violas, cellos', icon: 'music_note', productCount: 0 },
    { id: 'percusion', name: 'Percusión', description: 'Tambores, maracas, cajones', icon: 'music_note', productCount: 0 },
    { id: 'amplificadores', name: 'Amplificadores', description: 'Para guitarra y bajo', icon: 'speaker', productCount: 0 },
    { id: 'accesorios', name: 'Accesorios', description: 'Cables, púas, fundas', icon: 'settings', productCount: 0 },
    { id: 'audio', name: 'Audio Pro', description: 'Micrófonos y equipos', icon: 'mic', productCount: 0 },
    { id: 'vintage', name: 'Vintage', description: 'Instrumentos de colección', icon: 'star', productCount: 0 }
  ];

  specialProduct = {
    name: 'Guitarra Premium Edición Limitada',
    description: 'Una guitarra excepcional con acabados únicos, perfecta para músicos profesionales.',
    price: 1299,
    originalPrice: 1599,
    discount: 19,
    features: [
      'Madera de caoba premium',
      'Pastillas profesionales',
      'Acabado artesanal único',
      'Incluye estuche premium',
      'Garantía extendida de 3 años'
    ]
  };

  services = [
    { id: 'reparacion', name: 'Reparación de Instrumentos', description: 'Servicio técnico especializado con garantía', icon: 'build' },
    { id: 'clases', name: 'Clases de Música', description: 'Aprende con maestros profesionales', icon: 'school' },
    { id: 'alquiler', name: 'Alquiler de Equipos', description: 'Renta instrumentos para eventos', icon: 'event' },
    { id: 'afinacion', name: 'Afinación de Pianos', description: 'Servicio a domicilio disponible', icon: 'tune' }
  ];

  performSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], { queryParams: { q: this.searchQuery } });
    }
  }

  navigateToCategory(categoryId: number | string) {
    this.router.navigate(['/catalogo'], { queryParams: { categoryId } });
  }

  navigateToOffers() {
    this.router.navigate(['/ofertas']);
  }

  navigateToCart() {
    this.router.navigate(['/cart']);
  }

  navigateToService(serviceId: string) {
    this.router.navigate(['/servicios'], { queryParams: { servicio: serviceId } });
  }

  toggleWishlist() {}

  toggleFavorite(productId: number) {}

  addToCart(product: any) {
    this.cartItemCount++;
  }

  subscribeNewsletter() {
    if (this.emailSubscription.trim()) {
      this.emailSubscription = '';
    }
  }

  addSpecialToCart() {
    this.cartItemCount++;
  }

  viewProductDetails() {
    this.router.navigate(['/product-details'], { queryParams: { id: 'special' } });
  }

  navigateToLogin() { this.router.navigate(['/login']); }
  navigateToRegister() { this.router.navigate(['/register']); }
  navigateToCatalog() { this.router.navigate(['/catalogo']); }
  navigateToHelp() { this.router.navigate(['/ayuda']); }
}
