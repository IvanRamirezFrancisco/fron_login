import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../models/user.model';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { CsvImportExportComponent } from '../csv-import-export/csv-import-export.component';

interface MenuItem {
  title: string;
  icon: string;
  route: string;
  badge: string | null;
  /** Si es true, solo se muestra para SUPER_ADMIN */
  superAdminOnly?: boolean;
}

interface ModuleHeader {
  route: string;
  title: string;
  subtitle: string;
  icon: string;
  actionLabel?: string;
  actionIcon?: string;
  actionQuery?: string;
  actionRequiresSuperAdmin?: boolean;
  secondaryActionLabel?: string;
  secondaryActionIcon?: string;
  secondaryActionQuery?: string;
  secondaryActionRequiresSuperAdmin?: boolean;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, CsvImportExportComponent],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  isSidebarCollapsed = false;
  currentUser: User | null = null;
  activeRoute = '';
  private destroy$ = new Subject<void>();

  private readonly MODULE_HEADERS: ModuleHeader[] = [
    {
      route: '/admin/brands',
      title: 'Gestión de Marcas',
      subtitle: 'Administra las marcas de instrumentos musicales',
      icon: 'local_offer',
      actionLabel: 'Nueva Marca',
      actionIcon: 'add_circle'
    },
    {
      route: '/admin/categories',
      title: 'Gestión de Categorías',
      subtitle: 'Administra las categorías de productos',
      icon: 'category',
      actionLabel: 'Nueva Categoría',
      actionIcon: 'add_circle'
    },
    {
      route: '/admin/products',
      title: 'Gestión de Productos',
      subtitle: 'Administra tu catálogo de productos',
      icon: 'inventory_2',
      actionLabel: 'Nuevo Producto',
      actionIcon: 'add_circle'
    },
    {
      route: '/admin/orders',
      title: 'Gestión de Órdenes',
      subtitle: 'Seguimiento y control de pedidos',
      icon: 'shopping_cart',
      actionLabel: 'Exportar CSV',
      actionIcon: 'download',
      actionQuery: 'export'
    },
    {
      route: '/admin/customers',
      title: 'Gestión de Clientes',
      subtitle: 'Administra la base de clientes',
      icon: 'people',
      actionLabel: 'Exportar CSV',
      actionIcon: 'download',
      actionQuery: 'export',
      secondaryActionLabel: 'Actualizar',
      secondaryActionIcon: 'refresh',
      secondaryActionQuery: 'refresh'
    },
    {
      route: '/admin/dashboard',
      title: 'Panel de Administración',
      subtitle: 'Resumen general del sistema',
      icon: 'dashboard'
    },
    {
      route: '/admin/staff',
      title: 'Gestión de Empleados',
      subtitle: 'Administra el equipo de trabajo',
      icon: 'admin_panel_settings',
      actionLabel: 'Nuevo Empleado',
      actionIcon: 'person_add',
      secondaryActionLabel: 'Exportar CSV',
      secondaryActionIcon: 'download',
      secondaryActionQuery: 'export'
    },
    {
      route: '/admin/roles',
      title: 'Gestión de Roles',
      subtitle: 'Administra roles y permisos',
      icon: 'security',
      actionLabel: 'Nuevo Rol',
      actionIcon: 'add_circle',
      actionRequiresSuperAdmin: true
    },
    {
      route: '/admin/gestion-db',
      title: 'Gestión de Base de Datos',
      subtitle: 'Respaldos · Monitoreo · Mantenimiento · Consultas lentas',
      icon: 'dns'
    },
    {
      route: '/admin/backups',
      title: 'Centro de Seguridad y Respaldos',
      subtitle: 'Exportación y gestión de la base de datos · Solo Super Admin',
      icon: 'backup'
    }
  ];

  private readonly ALL_MENU_ITEMS: MenuItem[] = [
    { title: 'Dashboard',    icon: 'dashboard',            route: '/admin/dashboard',       badge: null },
    { title: 'Productos',    icon: 'inventory_2',          route: '/admin/products',        badge: null },
    { title: 'Marcas',       icon: 'label',                route: '/admin/brands',          badge: null },
    { title: 'Categorías',   icon: 'category',             route: '/admin/categories',      badge: null },
    { title: 'Órdenes',      icon: 'shopping_bag',         route: '/admin/orders',          badge: null },
    { title: 'Clientes',     icon: 'people',               route: '/admin/customers',       badge: null },
    { title: 'Reseñas',      icon: 'rate_review',          route: '/admin/reviews',         badge: null },
    { title: 'Empleados',    icon: 'admin_panel_settings', route: '/admin/staff',           badge: null },
    { title: 'Roles',        icon: 'security',             route: '/admin/roles',           badge: null, superAdminOnly: true },
    { title: 'Gestión DB',   icon: 'dns',                  route: '/admin/gestion-db',      badge: null, superAdminOnly: true }
  ];

  /** Ítems filtrados según el rol del usuario actual */
  get menuItems(): MenuItem[] {
    return this.ALL_MENU_ITEMS.filter(item =>
      !item.superAdminOnly || this.isSuperAdmin()
    );
  }

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.getCurrentUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
      });

    this.activeRoute = this.router.url;

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((event: any) => {
        this.activeRoute = event.url;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  /**
   * Verifica si el usuario actual es SUPER_ADMIN.
   * Soporta los formatos: ROLE_SUPER_ADMIN y SUPER_ADMIN.
   */
  isSuperAdmin(): boolean {
    return !!this.currentUser?.roles?.some(r =>
      r?.toUpperCase() === 'ROLE_SUPER_ADMIN' || r?.toUpperCase() === 'SUPER_ADMIN'
    );
  }

  /** Etiqueta de rol para mostrar en el sidebar */
  get userRoleLabel(): string {
    if (this.isSuperAdmin()) return 'Super Administrador';
    return 'Administrador';
  }

  get currentModuleHeader(): ModuleHeader {
    const match = this.MODULE_HEADERS.find(item => this.activeRoute.startsWith(item.route));
    return match ?? {
      route: this.activeRoute,
      title: 'Panel de Administración',
      subtitle: '',
      icon: 'dashboard'
    };
  }

  get canShowModuleAction(): boolean {
    if (!this.currentModuleHeader.actionLabel) return false;
    if (this.currentModuleHeader.actionRequiresSuperAdmin) {
      return this.isSuperAdmin();
    }
    return true;
  }

  get canShowSecondaryModuleAction(): boolean {
    if (!this.currentModuleHeader.secondaryActionLabel) return false;
    if (this.currentModuleHeader.secondaryActionRequiresSuperAdmin) {
      return this.isSuperAdmin();
    }
    return true;
  }

  get canShowAnyModuleAction(): boolean {
    return this.canShowModuleAction || this.canShowSecondaryModuleAction;
  }

  triggerModuleAction(): void {
    const action = this.currentModuleHeader.actionQuery || 'create';
    if (!this.currentModuleHeader.route) return;
    this.router.navigate([this.currentModuleHeader.route], {
      queryParams: { action },
      queryParamsHandling: 'merge'
    });
  }

  triggerSecondaryModuleAction(): void {
    const action = this.currentModuleHeader.secondaryActionQuery || 'refresh';
    if (!this.currentModuleHeader.route) return;
    this.router.navigate([this.currentModuleHeader.route], {
      queryParams: { action },
      queryParamsHandling: 'merge'
    });
  }
}
