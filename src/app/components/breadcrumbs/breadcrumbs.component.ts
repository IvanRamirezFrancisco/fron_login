import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, ActivatedRoute, RouterModule } from '@angular/router';
import { filter, distinctUntilChanged, map } from 'rxjs/operators';

export interface Breadcrumb {
  label: string;
  url: string;
  icon?: string;
}

@Component({
  selector: 'app-breadcrumbs',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './breadcrumbs.component.html',
  styleUrls: ['./breadcrumbs.component.css']
})
export class BreadcrumbsComponent implements OnInit {
  breadcrumbs: Breadcrumb[] = [];

  // Mapeo de rutas a nombres legibles
  private routeLabels: { [key: string]: { label: string, icon?: string } } = {
    'home': { label: 'Inicio', icon: 'home' },
    'catalogo': { label: 'Catálogo', icon: 'library_music' },
    'ofertas': { label: 'Ofertas', icon: 'local_offer' },
    'busqueda': { label: 'Resultados de Búsqueda', icon: 'search' },
    'login': { label: 'Iniciar Sesión', icon: 'login' },
    'register': { label: 'Registrarse', icon: 'person_add' },
    'forgot-password': { label: 'Recuperar Contraseña', icon: 'lock_reset' },
    'reset-password': { label: 'Restablecer Contraseña', icon: 'lock' },
    'verify-account': { label: 'Verificar Cuenta', icon: 'verified_user' },
    'dashboard': { label: 'Mi Panel', icon: 'dashboard' },
    'seguridad': { label: 'Seguridad', icon: 'security' },
    'perfil': { label: 'Mi Perfil', icon: 'account_circle' },
    'pedidos': { label: 'Mis Pedidos', icon: 'shopping_bag' },
    'ayuda': { label: 'Centro de Ayuda', icon: 'help' },
    'mapa-sitio': { label: 'Mapa del Sitio', icon: 'map' },
    'contacto': { label: 'Contáctanos', icon: 'email' },
    'chat': { label: 'Chat de Soporte', icon: 'chat' },
    'cart': { label: 'Carrito', icon: 'shopping_cart' },
    'wishlist': { label: 'Lista de Deseos', icon: 'favorite' },
    'not-found': { label: 'Página No Encontrada', icon: 'error' },
    'server-error': { label: 'Error del Servidor', icon: 'warning' }
  };

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Generar breadcrumbs en la carga inicial
    this.breadcrumbs = this.createBreadcrumbs(this.activatedRoute.root);

    // Actualizar breadcrumbs en cada cambio de ruta
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        distinctUntilChanged(),
        map(() => this.createBreadcrumbs(this.activatedRoute.root))
      )
      .subscribe(breadcrumbs => {
        this.breadcrumbs = breadcrumbs;
      });
  }

  private createBreadcrumbs(
    route: ActivatedRoute,
    url: string = '',
    breadcrumbs: Breadcrumb[] = []
  ): Breadcrumb[] {
    const children: ActivatedRoute[] = route.children;

    if (children.length === 0) {
      return breadcrumbs;
    }

    for (const child of children) {
      const routeURL: string = child.snapshot.url
        .map(segment => segment.path)
        .join('/');

      if (routeURL !== '') {
        url += `/${routeURL}`;

        // Obtener el label del mapeo o usar el path
        const routeKey = routeURL.toLowerCase();
        const routeData = this.routeLabels[routeKey] || { label: this.formatLabel(routeURL) };

        // Evitar duplicados
        const exists = breadcrumbs.find(b => b.url === url);
        if (!exists) {
          breadcrumbs.push({
            label: routeData.label,
            url: url,
            icon: routeData.icon
          });
        }
      }

      return this.createBreadcrumbs(child, url, breadcrumbs);
    }

    return breadcrumbs;
  }

  private formatLabel(path: string): string {
    // Convertir "mi-perfil" a "Mi Perfil"
    return path
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  isLastBreadcrumb(index: number): boolean {
    return index === this.breadcrumbs.length - 1;
  }
}
