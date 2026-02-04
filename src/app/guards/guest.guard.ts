import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * GuestGuard: Guard para rutas de invitados (login, register)
 * 
 * Impide el acceso a usuarios ya autenticados.
 * Si el usuario está logueado, lo redirige al dashboard.
 * Si NO está logueado, permite el acceso (return true).
 * 
 * Uso: Aplicar a rutas como /login y /register
 */
export const guestGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const isAdmin = user?.roles?.some((role: string) => 
          role === 'ROLE_ADMIN' || role === 'ADMIN'
        );
        
        if (isAdmin) {
          router.navigate(['/admin/dashboard'], { replaceUrl: true });
        } else {
          router.navigate(['/home'], { replaceUrl: true });
        }
      } catch (e) {
        router.navigate(['/home'], { replaceUrl: true });
      }
    } else {
      router.navigate(['/home'], { replaceUrl: true });
    }
    return false;
  }

  return true;
};
