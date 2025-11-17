import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Observable, Subject, takeUntil } from 'rxjs';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-navigation-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navigation-header.component.html',
  styleUrls: ['./navigation-header.component.css']
})
export class NavigationHeaderComponent implements OnInit, OnDestroy {
  user$: Observable<User | null>;
  currentUser: User | null = null;
  isMenuOpen = false;
  isProfileMenuOpen = false;
  isScrolled = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.user$ = this.authService.user$;
  }

  ngOnInit(): void {
    this.user$.pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUser = user;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll(): void {
    this.isScrolled = window.scrollY > 50;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-menu') && !target.closest('.mobile-menu')) {
      this.isProfileMenuOpen = false;
      this.isMenuOpen = false;
    }
  }

  toggleMobileMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
    this.isProfileMenuOpen = false;
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
    this.isMenuOpen = false;
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.closeMenus();
  }

  logout(): void {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      this.authService.logout();
      this.closeMenus();
    }
  }

  closeMenus(): void {
    this.isMenuOpen = false;
    this.isProfileMenuOpen = false;
  }

  getInitials(user: User): string {
    if (!user) return 'U';
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user.firstName) {
      return user.firstName.substring(0, 2).toUpperCase();
    }
    if (user.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  }

  getUserDisplayName(user: User): string {
    if (!user) return 'Usuario';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    return user.email || 'Usuario';
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour > 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  // Métodos para navegación de tienda de música
  navigateToProducts(): void {
    this.navigateTo('/productos');
  }

  navigateToCart(): void {
    this.navigateTo('/carrito');
  }

  navigateToAccount(): void {
    this.navigateTo('/mi-cuenta');
  }

  navigateToDashboard(): void {
    this.navigateTo('/dashboard');
  }

  navigateToHome(): void {
    this.navigateTo('/home');
  }
}