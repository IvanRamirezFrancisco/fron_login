import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { PasswordResetService } from '../../services/password-reset.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  resetPasswordForm: FormGroup;
  loading = false;
  submitted = false;
  message = '';
  error = '';
  token = '';
  tokenValid = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private passwordResetService: PasswordResetService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.resetPasswordForm = this.fb.group({
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      ]],
      confirmPassword: ['', [Validators.required]]
    }, { 
      validators: this.passwordMatchValidator 
    });
  }

  ngOnInit(): void {
    console.log('🔄 ResetPasswordComponent iniciado');
    
    // Obtener el token de la URL
    this.route.queryParams.subscribe(params => {
      console.log('📊 Query params recibidos:', params);
      this.token = params['token'];
      
      if (this.token) {
        console.log('✅ Token encontrado:', this.token);
        this.validateToken();
      } else {
        console.error('❌ No se encontró token en la URL');
        this.error = 'Token de reset no válido';
      }
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  validateToken(): void {
    console.log('🔍 Validando token:', this.token);
    this.loading = true;
    
    this.passwordResetService.validateResetToken(this.token).subscribe({
      next: (response) => {
        console.log('✅ Respuesta de validación:', response);
        this.loading = false;
        if (response.success) {
          console.log('✅ Token válido, mostrando formulario');
          this.tokenValid = true;
        } else {
          console.error('❌ Token inválido:', response.message);
          this.error = response.message || 'Token inválido o expirado';
        }
      },
      error: (err) => {
        console.error('❌ Error validando token:', err);
        this.loading = false;
        if (err.status === 400) {
          this.error = 'El enlace de reset ha expirado o es inválido';
        } else {
          this.error = 'Error al validar el token';
        }
      }
    });
  }

  get f() {
    return this.resetPasswordForm.controls;
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  getPasswordStrength(password: string): string {
    if (password.length === 0) return '';
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;
    
    if (strength <= 2) return 'weak';
    if (strength <= 3) return 'medium';
    return 'strong';
  }
  // Métodos de validación para el template
hasLowerCase(password: string): boolean {
    return password ? /[a-z]/.test(password) : false;
  }
  
  hasUpperCase(password: string): boolean {
    return password ? /[A-Z]/.test(password) : false;
  }
  
  hasNumbers(password: string): boolean {
    return password ? /\d/.test(password) : false;
  }
  
  hasSpecialChars(password: string): boolean {
    return password ? /[@$!%*?&]/.test(password) : false;
  }
  
  hasMinLength(password: string): boolean {
    return password ? password.length >= 8 : false;
  }


  onSubmit(): void {
    this.submitted = true;
    this.message = '';
    this.error = '';

    if (this.resetPasswordForm.invalid) {
      return;
    }

    this.loading = true;
    const newPassword = this.resetPasswordForm.get('password')?.value;

    this.passwordResetService.resetPassword(this.token, newPassword).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.message = response.message || 'Contraseña actualizada correctamente';
          this.resetPasswordForm.reset();
          this.submitted = false;
          
          // Redirigir al login después de 3 segundos
          setTimeout(() => {
            this.router.navigate(['/login'], { 
              queryParams: { message: 'Contraseña actualizada. Ya puedes iniciar sesión' }
            });
          }, 3000);
        } else {
          this.error = response.message || 'Error al actualizar la contraseña';
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Error resetting password:', err);
        
        if (err.error?.message) {
          this.error = err.error.message;
        } else if (err.status === 400) {
          this.error = 'El enlace de reset ha expirado o es inválido';
        } else {
          this.error = 'Error del servidor. Intenta nuevamente más tarde';
        }
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}