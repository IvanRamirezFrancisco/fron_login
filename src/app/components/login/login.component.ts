import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SmsService } from '../../services/sms.service';
import { CommonModule } from '@angular/common';
import { AuthResponse, User } from '../../models/user.model';
import { TwoFactorMethod } from '../../models/sms.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule,ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showTwoFactorForm = false;
  pendingUser: any = null;
  twoFactorCode = '';
  showPassword = false; // Nueva propiedad para controlar visibilidad de contraseña
  
  // Estados para SMS 2FA
  selectedMethod: string = '';
  codeSent = false;
  availableMethods: TwoFactorMethod[] = [];

  cancelTwoFactor(): void {
    this.showTwoFactorForm = false;
    this.twoFactorCode = '';
    this.pendingUser = null;
    this.selectedMethod = '';
    this.codeSent = false;
    this.errorMessage = '';
  }

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private smsService: SmsService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // onSubmit(): void {
  //   if (this.loginForm.valid) {
  //     this.isLoading = true;
  //     this.errorMessage = '';

  //     console.log('Formulario válido, enviando datos...');
  //     console.log('Datos del formulario:', this.loginForm.value);

  //     this.authService.login(this.loginForm.value).subscribe({
  //       next: (response) => {
  //         console.log('Login exitoso:', response);
  //         console.log('Redirigiendo a dashboard...');
  //         // Esperar un poco para asegurar que la sesión se guarde
  //         setTimeout(() => {
  //           this.router.navigate(['/dashboard']).then(
  //             (success) => console.log('Navegación exitosa:', success)
  //           ).catch(
  //             (error) => console.error('Error en navegación:', error)
  //           );
  //         }, 100);
  //       },
  //       error: (error) => {
  //         console.error('Error en login:', error);
  //         this.errorMessage = error.error?.message || error.message || 'Error al iniciar sesión';
  //         this.isLoading = false;
  //       },
  //       complete: () => {
  //         console.log('Login completado');
  //         this.isLoading = false;
  //       }
  //     });
 onSubmit(): void {
  if (this.loginForm.invalid) {
    this.errorMessage = 'Completa los campos correctamente';
    return;
  }
  this.isLoading = true;
  this.errorMessage = '';

  this.authService.login(this.loginForm.value).subscribe({
    next: (response) => {
      this.isLoading = false;
      // Si el backend indica que se requiere 2FA
      if (response.data?.twoFactorRequired || response.twoFactorRequired) {
        this.showTwoFactorForm = true;
        // Busca el usuario en todas las posibles ubicaciones
        this.pendingUser = response.data?.user ?? response.user ?? response.pendingUser ?? null;
        this.setupTwoFactorMethods();
        console.log('Respuesta de login:', response);
        console.log('Usuario para 2FA:', this.pendingUser);
        return;
      }
      // Login normal: guardar token y navegar
      const token = response.data?.accessToken ?? response.accessToken ?? response.token;
      const user = response.data?.user ?? response.user;
      if (token && user) {
        this.authService.completeLogin(token, user);
        this.router.navigate(['/dashboard']);
      } else {
        // Solo muestra el error si NO hay 2FA y NO hay token
        this.errorMessage = 'Respuesta de login inválida';
      }
    },
    error: (error) => {
      this.errorMessage = error.error?.message || error.message || 'Error al iniciar sesión';
      this.isLoading = false;
    }
  });
}
  /**
   * Configurar métodos de 2FA disponibles basado en el usuario
   */
  setupTwoFactorMethods(): void {
    this.availableMethods = [];
    
    if (this.pendingUser) {
      // Google Authenticator siempre disponible si está habilitado
      if (this.pendingUser.googleAuthEnabled) {
        this.availableMethods.push({
          id: 'GOOGLE_AUTHENTICATOR',
          name: 'Google Authenticator',
          description: 'Usa la aplicación Google Authenticator',
          icon: 'fas fa-mobile-alt',
          enabled: true
        });
      }

      // SMS disponible si está habilitado - PRIORIDAD ALTA
      if (this.pendingUser.smsEnabled) {
        this.availableMethods.push({
          id: 'SMS',
          name: 'SMS (Recomendado)',
          description: `Enviar código a ${this.formatPhone(this.pendingUser.phone)}`,
          icon: 'fas fa-sms',
          enabled: true
        });
      }

      // Email como alternativa - nota sobre limitaciones
      this.availableMethods.push({
        id: 'EMAIL',
        name: 'Email',
        description: `Enviar código a ${this.pendingUser.email} (puede fallar en producción)`,
        icon: 'fas fa-envelope',
        enabled: true
      });
    }
  }

  /**
   * Seleccionar método de verificación
   */
  selectMethod(methodId: string): void {
    this.selectedMethod = methodId;
    this.errorMessage = '';
    this.codeSent = false;

    // Si es Google Authenticator, no necesita envío de código
    if (methodId === 'GOOGLE_AUTHENTICATOR') {
      this.codeSent = true;
      return;
    }

    // Para SMS y Email, enviar código automáticamente
    this.sendVerificationCode();
  }

  /**
   * Enviar código de verificación
   */
  sendVerificationCode(): void {
    if (!this.selectedMethod || !this.pendingUser) return;

    this.isLoading = true;
    this.errorMessage = '';

    const method = this.selectedMethod as 'SMS' | 'EMAIL';
    
    this.smsService.sendLoginCode(this.pendingUser.email, method).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          this.codeSent = true;
          // Mensaje específico según el método
          const target = method === 'SMS' 
            ? this.formatPhone(this.pendingUser.phone)
            : this.pendingUser.email;
          this.errorMessage = ''; // Limpiar errores
        } else {
          this.errorMessage = response.message || 'Error enviando código';
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.errorMessage = this.getErrorMessage(error);
      }
    });
  }

  /**
   * Verificar código 2FA
   */
  verifyTwoFactor(): void {
    console.log('Verificando código 2FA:', this.twoFactorCode, this.pendingUser);
    if (!this.twoFactorCode || !this.pendingUser || !this.selectedMethod) return;
    
    this.isLoading = true;
    this.errorMessage = '';

    this.smsService.verifyLoginCode(
      this.pendingUser.email,
      this.twoFactorCode,
      this.selectedMethod as 'SMS' | 'EMAIL' | 'GOOGLE_AUTHENTICATOR'
    ).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        const token = response.data?.accessToken || response.accessToken;
        const user = response.data?.user || response.user;
        
        if (token && user) {
          this.authService.completeLogin(token, user);
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = 'Código inválido o respuesta inválida';
        }
      },
      error: (err: any) => {
        this.errorMessage = this.getErrorMessage(err);
        this.isLoading = false;
      }
    });
  }

  /**
   * Volver a selección de método
   */
  goBackToMethodSelection(): void {
    this.selectedMethod = '';
    this.codeSent = false;
    this.twoFactorCode = '';
    this.errorMessage = '';
  }

  /**
   * Formatear número de teléfono para mostrar
   */
  public formatPhone(phone: string): string {
    if (!phone) return '';
    
    if (phone.length >= 4) {
      const hidden = '*'.repeat(phone.length - 4);
      return hidden + phone.slice(-4);
    }
    return phone;
  }

  /**
   * Obtener mensaje de error legible
   */
  private getErrorMessage(error: any): string {
    if (error?.error?.message) {
      return error.error.message;
    }
    if (error?.message) {
      return error.message;
    }
    return 'Error de conexión. Intenta nuevamente.';
  }

  /**
   * Obtener método seleccionado
   */
  getSelectedMethodInfo(): TwoFactorMethod | null {
    return this.availableMethods.find(m => m.id === this.selectedMethod) || null;
  }


  /**
   * Alternar visibilidad de contraseña
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
}
