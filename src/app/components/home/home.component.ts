import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { GlobalSearchComponent } from '../global-search/global-search.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, GlobalSearchComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  host: {
    '(document:click)': 'onDocumentClick($event)'
  }
})
export class HomeComponent implements OnInit {
  searchQuery = '';
  cartItemCount = 3;
  wishlistCount = 5;
  emailSubscription = '';
  
  // Usuario logueado
  isLoggedIn = false;
  currentUser: User | null = null;
  showUserMenu = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Verificar si el usuario está logueado
    this.authService.getCurrentUser().subscribe((user: User | null) => {
      this.currentUser = user;
      this.isLoggedIn = !!user;
    });
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
    { 
      id: 'guitarras', 
      name: 'Guitarras', 
      description: 'Acústicas, eléctricas y clásicas', 
      icon: 'music_note',
      productCount: 145
    },
    { 
      id: 'pianos', 
      name: 'Pianos y Teclados', 
      description: 'Pianos acústicos y digitales', 
      icon: 'piano',
      productCount: 89
    },
    { 
      id: 'baterias', 
      name: 'Baterías', 
      description: 'Acústicas y electrónicas', 
      icon: 'music_note',
      productCount: 67
    },
    { 
      id: 'vientos', 
      name: 'Vientos', 
      description: 'Saxofones, trompetas, flautas', 
      icon: 'music_note',
      productCount: 134
    },
    { 
      id: 'cuerdas', 
      name: 'Cuerdas', 
      description: 'Violines, violas, cellos', 
      icon: 'music_note',
      productCount: 98
    },
    { 
      id: 'percusion', 
      name: 'Percusi�n', 
      description: 'Tambores, maracas, cajones', 
      icon: 'music_note',
      productCount: 156
    },
    { 
      id: 'amplificadores', 
      name: 'Amplificadores', 
      description: 'Para guitarra y bajo', 
      icon: 'speaker',
      productCount: 78
    },
    { 
      id: 'accesorios', 
      name: 'Accesorios', 
      description: 'Cables, p�as, fundas', 
      icon: 'settings',
      productCount: 267
    },
    { 
      id: 'audio', 
      name: 'Audio Pro', 
      description: 'Micrófonos y equipos', 
      icon: 'mic',
      productCount: 89
    },
    { 
      id: 'vintage', 
      name: 'Vintage', 
      description: 'Instrumentos de colección', 
      icon: 'star',
      productCount: 45
    }
  ];

  // Producto especial destacado
  specialProduct = {
    name: 'Guitarra Premium Edición Limitada',
    description: 'Una guitarra excepcional con acabados únicos, perfecta para músicos profesionales que buscan calidad y distinción.',
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

  featuredProducts = [
    {
      id: 1,
      name: 'Guitarra Ac�stica Yamaha FG830',
      brand: 'Yamaha',
      price: 299,
      originalPrice: 349,
      rating: 4.8,
      reviews: 156,
      image: '/assets/products/guitarra-yamaha.jpg',
      badge: 'Oferta',
      isFavorite: false
    },
    {
      id: 2,
      name: 'Piano Digital Casio Privia PX-160',
      brand: 'Casio',
      price: 599,
      originalPrice: null,
      rating: 4.6,
      reviews: 89,
      image: '/assets/products/piano-casio.jpg',
      badge: 'Nuevo',
      isFavorite: true
    },
    {
      id: 3,
      name: 'Bater�a Pearl Roadshow',
      brand: 'Pearl',
      price: 449,
      originalPrice: 499,
      rating: 4.7,
      reviews: 67,
      image: '/assets/products/bateria-pearl.jpg',
      badge: 'Popular',
      isFavorite: false
    },
    {
      id: 4,
      name: 'Viol�n Stradivarius Copy 4/4',
      brand: 'Stradivarius',
      price: 189,
      originalPrice: null,
      rating: 4.5,
      reviews: 34,
      image: '/assets/products/violin-stradivarius.jpg',
      badge: null,
      isFavorite: false
    }
  ];

  services = [
    {
      id: 'reparacion',
      name: 'Reparaci�n de Instrumentos',
      description: 'Servicio t�cnico especializado con garant�a',
      icon: 'build'
    },
    {
      id: 'clases',
      name: 'Clases de M�sica',
      description: 'Aprende con maestros profesionales',
      icon: 'school'
    },
    {
      id: 'alquiler',
      name: 'Alquiler de Equipos',
      description: 'Renta instrumentos para eventos',
      icon: 'event'
    },
    {
      id: 'afinacion',
      name: 'Afinaci�n de Pianos',
      description: 'Servicio a domicilio disponible',
      icon: 'tune'
    }
  ];

  performSearch() {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/search'], { queryParams: { q: this.searchQuery } });
    }
  }

  navigateToCategory(categoryId: string) {
    this.router.navigate(['/catalogo'], { queryParams: { categoria: categoryId } });
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

  toggleWishlist() {
    console.log('Toggle wishlist');
  }

  toggleFavorite(productId: number) {
    const product = this.featuredProducts.find(p => p.id === productId);
    if (product) {
      product.isFavorite = !product.isFavorite;
    }
  }

  addToCart(product: any) {
    this.cartItemCount++;
    console.log('Producto agregado al carrito:', product.name);
  }

  subscribeNewsletter() {
    if (this.emailSubscription.trim()) {
      console.log('Suscripción newsletter:', this.emailSubscription);
      this.emailSubscription = '';
      alert('¡Gracias por suscribirte a nuestro newsletter!');
    }
  }

  // Métodos para el producto especial
  addSpecialToCart() {
    this.cartItemCount++;
    console.log('Producto especial agregado al carrito');
    alert('¡Producto especial agregado al carrito!');
  }

  viewProductDetails() {
    this.router.navigate(['/product-details'], { queryParams: { id: 'special' } });
  }

  // Métodos de navegación para las tarjetas de acceso rápido
  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  navigateToCatalog() {
    this.router.navigate(['/catalogo']);
  }

  navigateToHelp() {
    this.router.navigate(['/ayuda']);
  }
}
