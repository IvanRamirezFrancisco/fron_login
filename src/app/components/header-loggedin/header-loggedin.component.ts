import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header-loggedin',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="main-header">
      <!-- Top Navigation Bar -->
      <nav class="navbar">
        <div class="nav-container">
          <!-- Logo/Brand -->
          <div class="navbar-brand">
            <a routerLink="/dashboard" class="brand-link">
              <span class="material-symbols-outlined brand-icon">music_note</span>
              <span class="brand-text">Casa de Música</span>
            </a>
          </div>

          <!-- Desktop Navigation -->
          <div class="navbar-nav desktop-nav">
            <a routerLink="/dashboard" 
               routerLinkActive="active" 
               class="nav-link">
              <span class="material-symbols-outlined nav-icon">home</span>
              <span>Inicio</span>
            </a>
            
            <div class="nav-dropdown" 
                 (mouseenter)="showDropdown('productos')" 
                 (mouseleave)="hideDropdown('productos')">
              <a href="#" class="nav-link dropdown-toggle">
                <span class="material-symbols-outlined nav-icon">library_music</span>
                <span>Productos</span>
                <span class="material-symbols-outlined dropdown-arrow">keyboard_arrow_down</span>
              </a>
              <div class="dropdown-menu" [class.show]="activeDropdown === 'productos'">
                <a href="#" class="dropdown-item">
                  <span class="material-symbols-outlined item-icon">search</span>
                  Explorar
                </a>
                <a href="#" class="dropdown-item">
                  <span class="material-symbols-outlined item-icon">star</span>
                  Destacados
                </a>
                <a href="#" class="dropdown-item">
                  <span class="material-symbols-outlined item-icon">new_releases</span>
                  Novedades
                </a>
              </div>
            </div>

            <div class="nav-dropdown" 
                 (mouseenter)="showDropdown('cuenta')" 
                 (mouseleave)="hideDropdown('cuenta')">
              <a href="#" class="nav-link dropdown-toggle">
                <span class="material-symbols-outlined nav-icon">account_circle</span>
                <span>Mi Cuenta</span>
                <span class="material-symbols-outlined dropdown-arrow">keyboard_arrow_down</span>
              </a>
              <div class="dropdown-menu account-menu" [class.show]="activeDropdown === 'cuenta'">
                <div class="user-info">
                  <div class="user-avatar">
                    <span class="material-symbols-outlined avatar-icon">person</span>
                  </div>
                  <div class="user-details">
                    <span class="user-name">{{ currentUser?.firstName }} {{ currentUser?.lastName }}</span>
                    <span class="user-email">{{ currentUser?.email }}</span>
                  </div>
                </div>
                <div class="menu-divider"></div>
                <a routerLink="/dashboard" class="dropdown-item">
                  <span class="material-symbols-outlined item-icon">dashboard</span>
                  Mi Dashboard
                </a>
                <a href="#" class="dropdown-item">
                  <span class="material-symbols-outlined item-icon">shopping_bag</span>
                  Mis Pedidos
                </a>
                <a href="#" class="dropdown-item">
                  <span class="material-symbols-outlined item-icon">favorite</span>
                  Lista de Deseos
                </a>
                <a routerLink="/profile" class="dropdown-item">
                  <span class="material-symbols-outlined item-icon">settings</span>
                  Mi Perfil
                </a>
                <div class="menu-divider"></div>
                <a href="#" class="dropdown-item logout-item" (click)="logout()">
                  <span class="material-symbols-outlined item-icon">logout</span>
                  Cerrar Sesión
                </a>
              </div>
            </div>
          </div>

          <!-- Mobile Menu Button -->
          <button class="mobile-menu-btn" (click)="toggleMobileMenu()">
            <span class="hamburger-line" [class.active]="isMobileMenuOpen"></span>
            <span class="hamburger-line" [class.active]="isMobileMenuOpen"></span>
            <span class="hamburger-line" [class.active]="isMobileMenuOpen"></span>
          </button>
        </div>

        <!-- Mobile Navigation -->
        <div class="mobile-nav" [class.show]="isMobileMenuOpen">
          <div class="mobile-nav-content">
            <a routerLink="/dashboard" 
               class="mobile-nav-item" 
               (click)="closeMobileMenu()">
              <i class="nav-icon">🏠</i>
              <span>Inicio</span>
            </a>
            
            <div class="mobile-nav-section">
              <h3 class="mobile-section-title">Productos</h3>
              <a href="#" class="mobile-nav-item">
                <i class="nav-icon">🔍</i>
                <span>Explorar</span>
              </a>
              <a href="#" class="mobile-nav-item">
                <i class="nav-icon">⭐</i>
                <span>Destacados</span>
              </a>
            </div>

            <div class="mobile-nav-section">
              <h3 class="mobile-section-title">Mi Cuenta</h3>
              <a routerLink="/dashboard" 
                 class="mobile-nav-item" 
                 (click)="closeMobileMenu()">
                <i class="nav-icon">📊</i>
                <span>Resumen</span>
              </a>
              <a href="#" class="mobile-nav-item">
                <i class="nav-icon">📋</i>
                <span>Mis Pedidos</span>
              </a>
              <a href="#" class="mobile-nav-item">
                <i class="nav-icon">❤️</i>
                <span>Favoritos</span>
              </a>
              <a routerLink="/profile" 
                 class="mobile-nav-item" 
                 (click)="closeMobileMenu()">
                <i class="nav-icon">⚙️</i>
                <span>Mi Perfil</span>
              </a>
            </div>

            <div class="mobile-nav-footer">
              <button class="mobile-logout-btn" (click)="logout()">
                <i class="nav-icon">🚪</i>
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <!-- Mobile Menu Overlay -->
      <div class="mobile-overlay" 
           [class.show]="isMobileMenuOpen" 
           (click)="closeMobileMenu()">
      </div>
    </header>
  `,
  styleUrls: ['./header-loggedin.component.css']
})
export class HeaderLoggedinComponent implements OnInit {
  currentUser: any = null;
  activeDropdown: string | null = null;
  isMobileMenuOpen = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Obtener usuario actual
    this.authService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
    });
  }

  showDropdown(dropdown: string): void {
    this.activeDropdown = dropdown;
  }

  hideDropdown(dropdown: string): void {
    // Pequeño delay para permitir hover en el menú
    setTimeout(() => {
      if (this.activeDropdown === dropdown) {
        this.activeDropdown = null;
      }
    }, 150);
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  @HostListener('document:click', ['$event'])
  closeDropdowns(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.nav-dropdown')) {
      this.activeDropdown = null;
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    if (window.innerWidth > 768) {
      this.isMobileMenuOpen = false;
    }
  }
}