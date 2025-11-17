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
    '/auth/check-username',        // Validación username - variante 1
    '/api/auth/check-username',    // Validación username - variante 2
    '/login',                      // Login de usuario
    '/register',                   // Registro de usuario
    '/check-username',             // Validación username - variante 3
    '/forgot-password',            // Recuperación de contraseña
    '/reset-password',             // Reset de contraseña
    '/verify-email',               // Verificación de email
    '/auth/login',                 // Login alternativo
    '/auth/register'               // Registro alternativo
  ];
  
  const isPublicUrl = publicUrls.some(url => req.url.includes(url));
  
  // También detectar peticiones marcadas como públicas por headers
  const isMarkedAsPublic = req.headers.has('X-Public-Request');
  
  const isPublicRequest = isPublicUrl || isMarkedAsPublic;

  console.log(`🔍 Interceptor: ${req.method} ${req.url}`, {
    originalUrl: req.url,
    isPublicUrl,
    isMarkedAsPublic, 
    isPublicRequest
  });

  // No agregar token a las rutas públicas de autenticación
  if (isPublicRequest) {
    console.log(`🌐 Interceptor: Petición pública, sin agregar token`);
    return next(req);
  }

  // Obtener el token del localStorage
  const token = localStorage.getItem('token');

  // Clonar la request y agregar el token si existe
  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log(`🔐 Interceptor: Token agregado a petición protegida`);
  }

  return next(authReq).pipe(
    catchError(error => {
      console.log(`❌ Interceptor: Error ${error.status} en ${req.url}`, {
        isPublicRequest,
        willRedirect: error.status === 401 && !isPublicRequest
      });
      
      // SOLO redirigir a login si es un 401 en rutas protegidas
      // NO redirigir en rutas públicas o validaciones
      if (error.status === 401 && !isPublicRequest) {
        console.warn('🚨 Token inválido detectado en ruta protegida, redirigiendo a login');
        authService.logout();
        router.navigate(['/login']);
      } else if (error.status === 401 && isPublicRequest) {
        console.log('ℹ️ Error 401 en petición pública, NO redirigiendo');
      }
      
      return throwError(() => error);
    })
  );
};
