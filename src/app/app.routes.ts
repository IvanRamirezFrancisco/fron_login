import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { RegisterDebugComponent } from './components/register/register-debug.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { VerifyAccountComponent } from './components/verify-account/verify-account.component';
import { GoogleAuthSetupComponent } from './google-auth-setup/google-auth-setup.component';
import { AuthGuard } from './auth.guard';
import { ProfileLayoutComponent } from './components/profile-layout/profile-layout.component';
import { ProfileSecurityComponent } from './components/profile-security/profile-security.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'register-debug', component: RegisterDebugComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'verify-account', component: VerifyAccountComponent },
  
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
  // {
  //   path: 'producto/:id',
  //   loadComponent: () =>
  //     import('./components/product-detail/product-detail.component').then(m => m.ProductDetailComponent)
  // },
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
  // {
  //   path: 'favoritos',
  //   loadComponent: () =>
  //     import('./components/favorites/favorites.component').then(m => m.FavoritesComponent),
  //   canActivate: [AuthGuard]
  // },
  {
    path: 'google-auth-setup',
    loadComponent: () =>
      import('./google-auth-setup/google-auth-setup.component').then(m => m.GoogleAuthSetupComponent)
  },
  {
    path: 'sms-setup',
    loadComponent: () =>
      import('./components/sms-setup/sms-setup.component').then(m => m.SmsSetupComponent),
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '' }
];