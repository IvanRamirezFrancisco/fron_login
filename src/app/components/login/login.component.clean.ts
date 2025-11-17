import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { SmsService } from '../../services/sms.service';
import { CommonModule } from '@angular/common';
import { AuthResponse, User } from '../../models/user.model';
import { TwoFactorMethod } from '../../models/sms.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showTwoFactorForm = false;
  pendingUser: any = null;
  twoFactorCode: string = '';
  showPassword = false;
  
  // Estados para 2FA
  selectedMethod: string = '';
  codeSent = false;
  availableMethods: TwoFactorMethod[] = [];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private smsService: SmsService,
    private router: Router,
    private http: HttpClient
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

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
          this.pendingUser = response.data?.user ?? response.user ?? response.pendingUser ?? null;
          this.setupTwoFactorMethods();
          console.log('2FA required for user:', this.pendingUser);
          return;
        }
        
        // Login normal: guardar token y navegar
        const token = response.data?.accessToken ?? response.accessToken ?? response.token;
        const user = response.data?.user ?? response.user;
        
        if (token && user) {
          this.authService.completeLogin(token, user);
          this.router.navigate(['/']);
        } else {
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
      // Google Authenticator
      if (this.pendingUser.googleAuthEnabled) {
        this.availableMethods.push({
          id: 'GOOGLE_AUTHENTICATOR',
          name: 'Google Authenticator',
          description: 'Usa la aplicación Google Authenticator',
          icon: 'fas fa-mobile-alt',
          enabled: true
        });
      }

      // SMS
      if (this.pendingUser.smsEnabled) {
        this.availableMethods.push({
          id: 'SMS',
          name: 'SMS',
          description: `Enviar código a ${this.formatPhone(this.pendingUser.phone)}`,
          icon: 'fas fa-sms',
          enabled: true
        });
      }

      // Email
      this.availableMethods.push({
        id: 'EMAIL',
        name: 'Email',
        description: `Enviar código a ${this.pendingUser.email}`,
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
          this.errorMessage = '';
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
   * Verificar código 2FA - SOLUCIONADO
   */
  verifyTwoFactor(): void {
    console.log('=== VERIFY TWO FACTOR ===');
    console.log('Code:', this.twoFactorCode, 'Type:', typeof this.twoFactorCode);
    
    if (!this.twoFactorCode || !this.pendingUser || !this.selectedMethod) {
      this.errorMessage = 'Por favor, ingresa el código de verificación';
      return;
    }
    
    // Limpiar y validar el código
    const cleanCode = String(this.twoFactorCode).trim().replace(/[^0-9]/g, '');
    
    if (cleanCode.length !== 6) {
      this.errorMessage = 'El código debe tener exactamente 6 dígitos';
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    
    console.log('Sending verification request:', {
      email: this.pendingUser.email,
      code: cleanCode,
      method: this.selectedMethod
    });
    
    this.smsService.verifyLoginCode(
      this.pendingUser.email,
      cleanCode,
      this.selectedMethod as 'SMS' | 'EMAIL' | 'GOOGLE_AUTHENTICATOR'
    ).subscribe({
      next: (response: any) => {
        console.log('Verification response:', response);
        this.isLoading = false;
        
        if (response.success) {
          const token = response.data?.accessToken || response.accessToken;
          const user = response.data?.user || response.user;
          
          if (token && user) {
            this.authService.completeLogin(token, user);
            this.router.navigate(['/']);
          } else {
            this.errorMessage = 'Respuesta de autenticación inválida';
          }
        } else {
          this.errorMessage = response.message || 'Código inválido';
        }
      },
      error: (err: any) => {
        console.error('Verification error:', err);
        this.errorMessage = this.getErrorMessage(err);
        this.isLoading = false;
      }
    });
  }

  /**
   * Cancelar 2FA y volver al login
   */
  cancelTwoFactor(): void {
    this.showTwoFactorForm = false;
    this.twoFactorCode = '';
    this.pendingUser = null;
    this.selectedMethod = '';
    this.codeSent = false;
    this.errorMessage = '';
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
   * Manejar input del código 2FA
   */
  onCodeInput(event: any): void {
    const value = event.target.value.replace(/[^0-9]/g, '');
    if (value.length <= 6) {
      this.twoFactorCode = value;
      event.target.value = value;
    }
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