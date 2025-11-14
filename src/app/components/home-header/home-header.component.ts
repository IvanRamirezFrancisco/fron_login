import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home-header.component.html',
  styleUrls: ['./home-header.component.css']
})
export class HomeHeaderComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  
  isAuthenticated = false;
  currentUser: any = null;
  mostrarMenuUsuario = false;
  
  private authSubscription?: Subscription;

  ngOnInit() {
    // Suscripción al estado de autenticación
    this.authSubscription = this.authService.isLoggedIn$.subscribe(
      (isAuth: boolean) => {
        this.isAuthenticated = isAuth;
      }
    );

    // Suscripción a los datos del usuario
    this.authService.user$.subscribe(
      (user: any) => {
        this.currentUser = user;
      }
    );
  }

  ngOnDestroy() {
    this.authSubscription?.unsubscribe();
  }

  toggleMenuUsuario() {
    this.mostrarMenuUsuario = !this.mostrarMenuUsuario;
  }

  cerrarMenuUsuario() {
    this.mostrarMenuUsuario = false;
  }

  logout() {
    this.authService.logout();
    this.cerrarMenuUsuario();
    this.router.navigate(['/']);
  }

  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  navigateToRegister() {
    this.router.navigate(['/register']);
  }

  navigateToCatalog() {
    this.router.navigate(['/catalog']);
  }

  navigateToCart() {
    this.router.navigate(['/cart']);
  }

  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }
}