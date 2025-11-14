import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { ForgotPasswordComponent } from './components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { GoogleAuthSetupComponent } from './google-auth-setup/google-auth-setup.component';
import { AuthGuard } from './auth.guard';
import { DashboardComponent } from './components/dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
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
    path: 'dashboard',
    loadComponent: () =>
      import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'sms-setup',
    loadComponent: () =>
      import('./components/sms-setup/sms-setup.component').then(m => m.SmsSetupComponent),
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '' }
];