import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
// FASE 0 - Seguridad - 2026-05-15
// Import comentado junto con la ruta register-debug para evitar error de compilación
// por import no usado. No eliminar el componente del disco.
// import { RegisterDebugComponent } from './components/register/register-debug.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { VerifyAccountComponent } from './components/verify-account/verify-account.component';
import { GoogleAuthSetupComponent } from './google-auth-setup/google-auth-setup.component';
import { AuthGuard } from './auth.guard';
import { ProfileLayoutComponent } from './components/profile-layout/profile-layout.component';
import { ProfileSecurityComponent } from './components/profile-security/profile-security.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { CatalogoComponent } from './components/catalogo/catalogo.component';
import { ProductDetailComponent } from './components/product-detail/product-detail.component';
import { SearchResultsComponent } from './components/search-results/search-results.component';
import { HelpCenterComponent } from './components/help-center/help-center.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { ServerErrorComponent } from './components/server-error/server-error.component';
import { SiteMapComponent } from './components/site-map/site-map.component';
import { AdminGuard } from './guards/admin.guard';
import { PermissionGuard } from './guards/permission.guard';
import { AdminLayoutComponent } from './components/admin/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './components/admin/admin-dashboard/admin-dashboard.component';
import { AdminCouponsComponent } from './components/admin/admin-coupons/admin-coupons.component';
import { AdminAbandonedCartsComponent } from './components/admin/admin-abandoned-carts/admin-abandoned-carts.component';
import { AdminBrandsComponent } from './components/admin/admin-brands/admin-brands.component';
import { AdminCategoriesComponent } from './components/admin/admin-categories/admin-categories.component';
import { AdminStaffComponent } from './components/admin/admin-staff/admin-staff.component';
import { AdminRolesComponent } from './components/admin/admin-roles/admin-roles.component';
import { AdminBackupsComponent } from './components/admin/admin-backups/admin-backups.component';
import { AdminDbManagementComponent } from './components/admin/admin-db-management/admin-db-management.component';
import { guestGuard } from './guards/guest.guard';
import { AcceptInvitationComponent } from './components/accept-invitation/accept-invitation.component';
import { WishlistComponent } from './components/wishlist/wishlist.component';
import { CheckoutComponent } from './components/checkout/checkout.component';
import { OrderListComponent } from './components/order-list/order-list.component';
import { OrderDetailComponent } from './components/order-detail/order-detail.component';
import { AdminPaymentSettingsComponent } from './components/admin/admin-payment-settings/admin-payment-settings.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  
  // Rutas de autenticación (solo para usuarios NO logueados)
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },
  // FASE 0 - Seguridad - 2026-05-15
  // DEBUG - solo para desarrollo local. No habilitar en producción.
  // { path: 'register-debug', component: RegisterDebugComponent, canActivate: [guestGuard] },
  { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [guestGuard] },
  { path: 'reset-password', component: ResetPasswordComponent, canActivate: [guestGuard] },
  { path: 'verify-account', component: VerifyAccountComponent },
  
  // Ruta pública de aceptación de invitación (sin auth guard)
  { path: 'auth/accept-invitation/:token', component: AcceptInvitationComponent },
  
  // Rutas públicas
  { path: 'catalogo', component: CatalogoComponent },
  { path: 'busqueda', component: SearchResultsComponent },
  { path: 'ayuda', component: HelpCenterComponent },
  { path: 'mapa-sitio', component: SiteMapComponent },
  
  // Nueva arquitectura: /dashboard con rutas anidadas
  { 
    path: 'dashboard', 
    component: ProfileLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'seguridad', pathMatch: 'full' },
      { path: 'seguridad', component: ProfileSecurityComponent }
      // TODO: Agregar más rutas anidadas cuando se creen los componentes
    ]
  },
  // {
  //   path: 'catalogo',
  //   loadComponent: () =>
  //     import('./components/product-catalog/product-catalog.component').then(m => m.ProductCatalogComponent)
  // },
  // Rutas de navegación temporal (placeholder)
  { path: 'catalog', component: HomeComponent }, // Temporal redirect
  { path: 'services', component: HomeComponent }, // Temporal redirect
  { path: 'product-details', component: HomeComponent }, // Temporal redirect
  // Ruta para detalle de producto
  { path: 'producto/:id', component: ProductDetailComponent },
  {
    path: 'carrito',
    loadComponent: () =>
      import('./components/cart/cart.component').then(m => m.CartComponent),
    canActivate: [AuthGuard]
  },
  // {
  //   path: 'checkout',
  //   loadComponent: () =>
  //     import('./components/checkout/checkout.component').then(m => m.CheckoutComponent),
  //   canActivate: [AuthGuard]
  // },
  // {
  //   path: 'perfil',
  //   loadComponent: () =>
  //     import('./components/profile/profile.component').then(m => m.ProfileComponent),
  //   canActivate: [AuthGuard]
  // },
  // {
  //   path: 'pedidos',
  //   loadComponent: () =>
  //     import('./components/orders/orders.component').then(m => m.OrdersComponent),
  //   canActivate: [AuthGuard]
  // },
  // FASE 2 — Wishlist / Favoritos
  {
    path: 'wishlist',
    component: WishlistComponent,
    canActivate: [AuthGuard]
  },
  // FASE 4 — Checkout y Pedidos del Cliente
  {
    path: 'checkout',
    component: CheckoutComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'orders/my',
    component: OrderListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'orders/my/:id',
    component: OrderDetailComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'google-auth-setup',
    loadComponent: () =>
      import('./google-auth-setup/google-auth-setup.component').then(m => m.GoogleAuthSetupComponent)
  },
  
  // FASE 7B — Retorno UX de Mercado Pago
  {
    path: 'payment/mercado-pago/success',
    loadComponent: () => import('./components/mercado-pago-return/mercado-pago-return.component').then(m => m.MercadoPagoReturnComponent)
  },
  {
    path: 'payment/mercado-pago/failure',
    loadComponent: () => import('./components/mercado-pago-return/mercado-pago-return.component').then(m => m.MercadoPagoReturnComponent)
  },
  {
    path: 'payment/mercado-pago/pending',
    loadComponent: () => import('./components/mercado-pago-return/mercado-pago-return.component').then(m => m.MercadoPagoReturnComponent)
  },
  
  // Rutas de Administración (protegidas con AdminGuard)
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [AdminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        component: AdminDashboardComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'DASHBOARD_VIEW' }
      },
      {
        path: 'brands',
        component: AdminBrandsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'BRAND_MANAGE' }
      },
      {
        path: 'categories',
        component: AdminCategoriesComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'CATEGORY_MANAGE' }
      },
      {
        path: 'products',
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'PRODUCT_READ' },
        loadComponent: () => import('./components/admin/admin-products/admin-products.component')
          .then(m => m.AdminProductsComponent)
      },
      {
        path: 'orders',
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'ORDER_READ' },
        loadComponent: () => import('./components/admin/admin-orders/admin-orders.component')
          .then(m => m.AdminOrdersComponent)
      },
      {
        path: 'coupons',
        component: AdminCouponsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'PRODUCT_READ' }
      },
      {
        path: 'abandoned-carts',
        component: AdminAbandonedCartsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'ORDER_READ' }
      },
      {
        path: 'staff',
        component: AdminStaffComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'USER_READ' }
      },
      {
        path: 'roles',
        component: AdminRolesComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'ROLE_READ' }
      },
      {
        path: 'backups',
        component: AdminBackupsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'DATABASE_BACKUP' }
      },
      {
        path: 'gestion-db',
        component: AdminDbManagementComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'DATABASE_VIEW' }
      },
      {
        path: 'customers',
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'CUSTOMER_READ' },
        loadComponent: () => import('./components/admin/admin-customers/admin-customers.component')
          .then(m => m.AdminCustomersComponent)
      },
      {
        path: 'payment-settings',
        component: AdminPaymentSettingsComponent,
        canActivate: [PermissionGuard],
        data: { requiredPermission: 'SYSTEM_SETTINGS' }
      }
    ]
  },
  
  // Páginas de error
  { path: 'not-found', component: NotFoundComponent },
  { path: 'server-error', component: ServerErrorComponent },
  
  // Wildcard - debe ser la última ruta
  { path: '**', component: NotFoundComponent }
];