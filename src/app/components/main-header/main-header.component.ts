import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { CartService, CartAnimation } from '../../services/cart.service';
import { User } from '../../models/user.model';
import { GlobalSearchComponent } from '../global-search/global-search.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-main-header',
  imports: [CommonModule, RouterModule, FormsModule, GlobalSearchComponent],
  templateUrl: './main-header.component.html',
  styleUrl: './main-header.component.css',
  host: {
    '(document:click)': 'onDocumentClick($event)'
  }
})
export class MainHeaderComponent implements OnInit, OnDestroy {
  cartItemCount = 0;
  wishlistCount = 5;
  
  // Usuario logueado
  isLoggedIn = false;
  currentUser: User | null = null;
  showUserMenu = false;
  
  // Animación de productos
  flyingProducts: CartAnimation[] = [];
  private subscriptions = new Subscription();

  constructor(
    private router: Router,
    private authService: AuthService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    // Verificar si el usuario está logueado
    this.authService.getCurrentUser().subscribe((user: User | null) => {
      this.currentUser = user;
      this.isLoggedIn = !!user;
    });
    
    // Suscribirse al contador del carrito
    this.subscriptions.add(
      this.cartService.cartCount$.subscribe(count => {
        this.cartItemCount = count;
      })
    );
    
    // Suscribirse a las animaciones de productos
    this.subscriptions.add(
      this.cartService.addToCartAnimation$.subscribe(animation => {
        this.triggerFlyToCartAnimation(animation);
      })
    );
  }
  
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  
  triggerFlyToCartAnimation(animation: CartAnimation): void {
    // Agregar producto a la lista de animaciones
    this.flyingProducts.push(animation);
    
    // Eliminar después de que termine la animación (1.2 segundos)
    setTimeout(() => {
      const index = this.flyingProducts.findIndex(p => p.productId === animation.productId);
      if (index > -1) {
        this.flyingProducts.splice(index, 1);
      }
    }, 1200);
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

  toggleWishlist(): void {
    // Implementar lógica de wishlist
    console.log('Toggle wishlist');
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  navigateToCart(): void {
    this.router.navigate(['/carrito']);
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
}

