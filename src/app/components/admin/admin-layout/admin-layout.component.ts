import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent implements OnInit {
  isSidebarCollapsed = false;
  currentUser: any = null;
  activeRoute = '';

  menuItems = [
    {
      title: 'Dashboard',
      icon: 'dashboard',
      route: '/admin/dashboard',
      badge: null
    },
    {
      title: 'Productos',
      icon: 'inventory_2',
      route: '/admin/productos',
      badge: null
    },
    {
      title: 'Categorías',
      icon: 'category',
      route: '/admin/categorias',
      badge: null
    },
    {
      title: 'Órdenes',
      icon: 'shopping_bag',
      route: '/admin/ordenes',
      badge: '5'
    },
    {
      title: 'Clientes',
      icon: 'people',
      route: '/admin/clientes',
      badge: null
    },
    {
      title: 'Reportes',
      icon: 'analytics',
      route: '/admin/reportes',
      badge: null
    }
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe(user => {
      this.currentUser = user;
    });

    this.activeRoute = this.router.url;
    
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.activeRoute = event.url;
      });
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  logout(): void {
    this.authService.logout();
  }

  isActive(route: string): boolean {
    return this.activeRoute.startsWith(route);
  }

  goToStore(): void {
    this.router.navigate(['/home']);
  }
}
