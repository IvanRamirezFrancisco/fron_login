import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return this.authService.getCurrentUser().pipe(
      take(1),
      map(user => {
        if (!user) {
          this.router.navigate(['/login'], { 
            queryParams: { returnUrl: state.url },
            replaceUrl: true
          });
          return false;
        }

        const isAdmin = user.roles && user.roles.some((role: string) => 
          role === 'ROLE_ADMIN' || role === 'ADMIN'
        );

        if (!isAdmin) {
          this.router.navigate(['/home'], { replaceUrl: true });
          alert('No tienes permisos para acceder al panel de administración');
          return false;
        }

        return true;
      })
    );
  }
}
