import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * Interceptor para manejar errores de navegador y mejorar compatibilidad
 */
export const browserCompatibilityInterceptor: HttpInterceptorFn = (req, next) => {
  
  // Agregar headers para mejor compatibilidad cross-browser
  const compatibleReq = req.clone({
    setHeaders: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      // No forzar Content-Type si ya está presente
      ...(req.headers.has('Content-Type') ? {} : { 'Content-Type': 'application/json' })
    }
  });

  return next(compatibleReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Manejar errores de CORS de manera más amigable
      if (error.status === 0 || error.status === -1) {
        console.warn('Network error detected - possibly CORS or connectivity issue');
        // Transformar en error más amigable para el usuario
        const friendlyError = new HttpErrorResponse({
          error: { 
            message: 'Problema de conectividad. Verifica tu conexión a internet.',
            originalStatus: error.status 
          },
          status: 0,
          statusText: 'Network Error'
        });
        return throwError(() => friendlyError);
      }

      // Manejar errores 403/401 de manera más suave
      if (error.status === 403 || error.status === 401) {
        console.warn('Authentication/Authorization error - handling gracefully');
      }

      // Pasar otros errores sin modificar
      return throwError(() => error);
    }),
    finalize(() => {
      // Log opcional para debugging (solo en desarrollo)
      if (typeof window !== 'undefined' && (window as any)['debug']) {
        console.debug('HTTP Request completed:', compatibleReq.url);
      }
    })
  );
};