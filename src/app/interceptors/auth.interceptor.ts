import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Rutas públicas que NO deben redirigir a login en caso de 401
  const publicUrls = [
    '/api/public/',                // ← STOREFRONT: todas las rutas públicas del catálogo
    '/auth/check-username',        // Validación username - variante 1
    '/api/auth/check-username',    // Validación username - variante 2
    '/login',                      // Login de usuario
    '/register',                   // Registro de usuario
    '/check-username',             // Validación username - variante 3
    '/forgot-password',            // Recuperación de contraseña
    '/reset-password',             // Reset de contraseña (frontend route)
    '/validate-reset-token',       // Validación del token de reset (backend endpoint)
    '/api/auth/validate-reset-token', // Validación (ruta completa) - coincidencia adicional
    '/verify-email',               // Verificación de email
    '/auth/login',                 // Login alternativo
    '/auth/register',              // Registro alternativo
    '/api/coupons/active',         // Cupones activos (público)
    '/api/coupons/check',          // Verificar disponibilidad de cupón (público)
    '/api/coupons/validate',       // Validar cupón (público)
    '/api/reviews/product',        // Ver reseñas de producto (público)
    '/api/reviews/statistics'      // Estadísticas de reseñas (público)
  ];
  
  const isPublicUrl = publicUrls.some(url => req.url.includes(url));
  
  // También detectar peticiones marcadas como públicas por headers
  const isMarkedAsPublic = req.headers.has('X-Public-Request');
  
  const isPublicRequest = isPublicUrl || isMarkedAsPublic;

  if (isPublicRequest) {
    return next(req);
  }

  const token = localStorage.getItem('token');

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError(error => {
      if (error.status === 401 && !isPublicRequest) {
        authService.logout();
        router.navigate(['/login']);
      }
      
      return throwError(() => error);
    })
  );
};
