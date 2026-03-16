import { Injectable } from '@angular/core';
import {
  Router,
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

/**
 * Guard que protege rutas exclusivas para SUPER_ADMIN.
 *
 * Estrategia: lee el usuario directamente desde localStorage para evitar
 * problemas de timing con BehaviorSubjects que emiten null antes de que
 * el componente padre cargue el usuario. Esto garantiza una decisión
 * inmediata y correcta en la primera navegación.
 */
@Injectable({
  providedIn: 'root'
})
export class SuperAdminGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    // Tomar el valor actual del BehaviorSubject (snapshot sincrónico)
    return this.authService.getCurrentUser().pipe(
      take(1),
      map(user => {
        // Si el observable emite null, intentar recuperar de localStorage
        const resolvedUser = user ?? this.getUserFromStorage();

        if (!resolvedUser) {
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: state.url },
            replaceUrl: true
          });
          return false;
        }

        if (!this.checkSuperAdmin(resolvedUser.roles)) {
          // Admin normal → redirigir al dashboard con aviso silencioso
          this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
          return false;
        }

        return true;
      })
    );
  }

  /**
   * Lee el usuario guardado en localStorage como respaldo cuando el
   * BehaviorSubject todavía no ha emitido un valor válido.
   */
  private getUserFromStorage(): any | null {
    try {
      const raw = localStorage.getItem('user');
      if (!raw || raw === 'null' || raw === 'undefined') return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Comprueba SUPER_ADMIN en cualquier formato posible del backend:
   * 'ROLE_SUPER_ADMIN', 'SUPER_ADMIN', 'super_admin', etc.
   */
  private checkSuperAdmin(roles: string[] | undefined | null): boolean {
    if (!roles || roles.length === 0) return false;
    return roles.some(r => {
      const normalized = r?.toUpperCase().replace('ROLE_', '');
      return normalized === 'SUPER_ADMIN';
    });
  }
}
