import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';
import { User } from '../../models/user.model';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.css',
  host: {
    '(document:click)': 'onDocumentClick($event)'
  }
})
export class CatalogoComponent implements OnInit {
  searchQuery = '';
  cartItemCount = 0;
  wishlistCount = 0;

  // Usuario logueado
  isLoggedIn = false;
  currentUser: User | null = null;
  showUserMenu = false;

  // Filtros
  categoriaSeleccionada: string[] = [];
  marcaSeleccionada: string[] = [];
  precioMin = 0;
  precioMax = 100000;

  categorias = ['guitars', 'pianos', 'keyboards', 'drums', 'bass'];
  marcas: string[] = [];

  productos: Product[] = [];
  productosFiltrados: Product[] = [];
  loading = true;

  constructor(
    private router: Router,
    private authService: AuthService,
    private productService: ProductService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    // Verificar autenticación
    this.authService.getCurrentUser().subscribe((user: User | null) => {
      this.currentUser = user;
      this.isLoggedIn = !!user;
    });

    // Cargar productos
    this.loadProducts();

    // Actualizar contador de carrito
    this.cartService.cartCount$.subscribe(count => {
      this.cartItemCount = count;
    });
  }

  loadProducts(): void {
    this.loading = true;
    this.productService.getProducts().subscribe({
      next: (products) => {
        this.productos = products;
        this.productosFiltrados = products;
        
        // Obtener marcas únicas
        this.marcas = Array.from(new Set(products.map(p => p.brand)));
        
        // Calcular precio máximo
        this.precioMax = Math.max(...products.map(p => p.price)) + 1000;
        
        this.loading = false;
      },
      error: (err) => {
        console.error('Error cargando productos:', err);
        this.loading = false;
      }
    });
  }

  // Aplicar filtros
  aplicarFiltros(): void {
    this.productosFiltrados = this.productos.filter(producto => {
      // Filtrar por categoría
      const cumpleCategoria = this.categoriaSeleccionada.length === 0 || 
        this.categoriaSeleccionada.includes(producto.category.id);
      
      // Filtrar por marca
      const cumpleMarca = this.marcaSeleccionada.length === 0 || 
        this.marcaSeleccionada.includes(producto.brand);
      
      // Filtrar por precio
      const cumplePrecio = producto.price >= this.precioMin && producto.price <= this.precioMax;
      
      return cumpleCategoria && cumpleMarca && cumplePrecio;
    });
  }

  // Ver detalle del producto
  verDetalle(producto: Product): void {
    this.router.navigate(['/producto', producto.id]);
  }

  // Agregar producto al carrito
  agregarAlCarrito(producto: Product, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }

    if (!this.isLoggedIn) {
      // Redirigir al login si no está autenticado
      this.router.navigate(['/login'], { 
        queryParams: { returnUrl: this.router.url } 
      });
      return;
    }

    // Obtener coordenadas del botón para la animación
    const buttonElement = event?.currentTarget as HTMLElement;
    const rect = buttonElement?.getBoundingClientRect();
    
    // Agregar al carrito con animación
    this.cartService.addToCart(producto, 1, undefined, {
      x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2
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

  toggleFiltroCategoria(categoria: string): void {
    const index = this.categoriaSeleccionada.indexOf(categoria);
    if (index > -1) {
      this.categoriaSeleccionada.splice(index, 1);
    } else {
      this.categoriaSeleccionada.push(categoria);
    }
    this.aplicarFiltros();
  }

  toggleFiltroMarca(marca: string): void {
    const index = this.marcaSeleccionada.indexOf(marca);
    if (index > -1) {
      this.marcaSeleccionada.splice(index, 1);
    } else {
      this.marcaSeleccionada.push(marca);
    }
    this.aplicarFiltros();
  }

  limpiarFiltros(): void {
    this.categoriaSeleccionada = [];
    this.marcaSeleccionada = [];
    this.precioMin = 0;
    this.precioMax = Math.max(...this.productos.map(p => p.price)) + 1000;
    this.aplicarFiltros();
  }

  performSearch(): void {
    if (this.searchQuery.trim()) {
      // Implementar búsqueda por nombre/descripción
      this.productosFiltrados = this.productos.filter(producto =>
        producto.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        producto.description?.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    } else {
      this.aplicarFiltros();
    }
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  navigateToCart(): void {
    this.router.navigate(['/carrito']);
  }

  toggleWishlist(): void {
    console.log('Toggle wishlist');
  }

  navigateToHome(): void {
    this.router.navigate(['/home']);
  }
}

