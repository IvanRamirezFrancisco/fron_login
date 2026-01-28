import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent implements OnInit {
  // Estados del componente
  showMobileMenu = false;
  showUserMenu = false;
  searchQuery = '';
  cartItems = 0;
  isLoggedIn = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Suscribirse al estado de autenticación
    this.authService.isLoggedIn$.subscribe(
      isLoggedIn => this.isLoggedIn = isLoggedIn
    );

    // Simular items en el carrito (esto debería venir de un servicio)
    this.cartItems = 3;
  }

  // Métodos de navegación
  isActive(route: string): boolean {
    return this.router.url === route;
  }

  performSearch(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/buscar'], { 
        queryParams: { q: this.searchQuery.trim() } 
      });
      this.searchQuery = '';
      this.closeMobileMenu();
    }
  }

  // Métodos del menú móvil
  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
    if (this.showMobileMenu) {
      this.showUserMenu = false;
    }
  }

  closeMobileMenu(): void {
    this.showMobileMenu = false;
  }

  // Métodos del menú de usuario
  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    if (this.showUserMenu) {
      this.showMobileMenu = false;
    }
  }

  closeUserMenu(): void {
    this.showUserMenu = false;
  }

  // Método de logout
  logout(): void {
    this.authService.logout();
    this.closeUserMenu();
    this.closeMobileMenu();
    this.router.navigate(['/']);
  }
}
