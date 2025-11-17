import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ApiResponse } from '../../models/api-response.model';

@Component({
  selector: 'app-verify-account',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './verify-account.component.html',
  styleUrls: ['./verify-account.component.css']
})
export class VerifyAccountComponent implements OnInit {
  loading = true;
  verified = false;
  error = '';
  message = '';
  token = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Obtener el token de la URL
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
      if (this.token) {
        this.verifyToken();
      } else {
        this.loading = false;
        this.error = 'Token de verificación no válido';
      }
    });
  }

  verifyToken(): void {
    this.loading = true;
    this.authService.verifyEmail(this.token).subscribe({
      next: (response: ApiResponse<any>) => {
        this.loading = false;
        if (response.success) {
          this.verified = true;
          this.message = response.message || '¡Cuenta verificada exitosamente!';
          
          // Redirigir al login después de 3 segundos
          setTimeout(() => {
            this.router.navigate(['/login'], { 
              queryParams: { message: 'Cuenta verificada. Ya puedes iniciar sesión' }
            });
          }, 3000);
        } else {
          this.error = response.message || 'Error al verificar la cuenta';
        }
      },
      error: (err: any) => {
        this.loading = false;
        console.error('Error verifying account:', err);
        
        if (err.error?.message) {
          this.error = err.error.message;
        } else if (err.status === 400) {
          this.error = 'El enlace de verificación ha expirado o es inválido';
        } else if (err.status === 404) {
          this.error = 'El token de verificación no existe';
        } else {
          this.error = 'Error del servidor. Intenta nuevamente más tarde';
        }
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  resendVerification(): void {
    // Implementar reenvío de verificación si es necesario
    console.log('Reenvío de verificación solicitado');
  }
}