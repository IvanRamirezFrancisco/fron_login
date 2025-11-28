import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { SanitizationService } from '../../services/sanitization.service';
import { CommonModule } from '@angular/common';
import { AuthResponse, User } from '../../models/user.model';
import { environment } from '../../../environments/environment';
import { HomeHeaderComponent } from '../home-header/home-header.component';
import { SecureInputDirective } from '../../directives/security.directives';

// Interface para métodos 2FA disponibles
interface TwoFactorMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, CommonModule, RouterModule, HomeHeaderComponent, SecureInputDirective],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements AfterViewInit {
  @ViewChild('emailInput') emailInput!: ElementRef;
  @ViewChild('twoFactorInput') twoFactorInput!: ElementRef;
  
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

  // Estados para códigos de respaldo
  useBackupCode = false;
  backupCode = '';
  backupCodesAvailable = false; // Indica si el usuario tiene códigos de respaldo activos

  cancelTwoFactor(): void {
    this.showTwoFactorForm = false;
    this.twoFactorCode = ''; // Reset como string vacío
    this.pendingUser = null;
    this.selectedMethod = '';
    this.codeSent = false;
    this.useBackupCode = false; // Reset backup code mode
    this.backupCode = ''; // Reset backup code input
    this.backupCodesAvailable = false; // Reset backup codes availability
    this.errorMessage = '';
  }

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private sanitizationService: SanitizationService,
    private router: Router,
    private http: HttpClient
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngAfterViewInit(): void {
    // Enfocar automáticamente el campo de email al cargar
    setTimeout(() => {
      if (this.emailInput) {
        this.emailInput.nativeElement.focus();
      }
    }, 100);
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

  // Sanitizar datos antes de enviar
  const rawFormData = this.loginForm.value;
  const formData = {
    email: this.sanitizationService.sanitizeUserInput(rawFormData.email || ''),
    password: this.sanitizationService.sanitizeUserInput(rawFormData.password || '')
  };
  
  // Validación adicional de seguridad
  if (!this.sanitizationService.isValidEmail(formData.email)) {
    this.errorMessage = 'Email no válido';
    return;
  }

  this.isLoading = true;
  this.errorMessage = '';

  this.authService.login(formData).subscribe({
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
        this.router.navigate(['/']);
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
   * Configurar métodos de 2FA disponibles basado en los métodos ACTIVOS del usuario
   * 
   * CASOS DE USO:
   * Caso 1: Google=on, Email=off, Backup=exists → Muestra Google Auth + opción backup
   * Caso 2: Google=off, Email=on, Backup=exists → Muestra Email + opción backup
   * Caso 3: Google=off, Email=off, Backup=exists → Login normal (no llega aquí)
   * Caso 4: Google=on, Email=on, Backup=none → Muestra ambos métodos sin backup
   */
  setupTwoFactorMethods(): void {
    this.availableMethods = [];
    this.backupCodesAvailable = false;
    
    if (this.pendingUser) {
      // Google Authenticator - método principal
      if (this.pendingUser.googleAuthEnabled) {
        this.availableMethods.push({
          id: 'GOOGLE_AUTHENTICATOR',
          name: 'Google Authenticator',
          description: 'Usa la aplicación Google Authenticator',
          icon: 'smartphone',
          enabled: true
        });
      }

      // Email - método principal
      if (this.pendingUser.emailEnabled) {
        this.availableMethods.push({
          id: 'EMAIL',
          name: 'Email',
          description: `Enviar código a ${this.maskEmail(this.pendingUser.email)}`,
          icon: 'mail',
          enabled: true
        });
      }

      // Códigos de respaldo - disponibles como ALTERNATIVA solo si:
      // 1. El usuario los tiene generados Y
      // 2. Hay al menos un método principal activo (Google o Email)
      if (this.pendingUser.backupCodesEnabled && this.availableMethods.length > 0) {
        this.backupCodesAvailable = true;
      }

      // Si solo hay un método disponible, seleccionarlo automáticamente
      if (this.availableMethods.length === 1) {
        this.selectMethod(this.availableMethods[0].id);
      }
    }
  }

  /**
   * Enmascarar email para mostrar parcialmente (ej: u***@gmail.com)
   */
  private maskEmail(email: string): string {
    if (!email) return '';
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    return `${local[0]}***@${domain}`;
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
      // Enfocar automáticamente el campo de código
      setTimeout(() => {
        if (this.twoFactorInput) {
          this.twoFactorInput.nativeElement.focus();
        }
      }, 100);
      return;
    }

    // Para Email, enviar código automáticamente
    this.sendVerificationCode();
  }

  /**
   * Enviar código de verificación por Email
   */
  sendVerificationCode(): void {
    if (!this.selectedMethod || !this.pendingUser) return;

    this.isLoading = true;
    this.errorMessage = '';

    const method = this.selectedMethod as 'EMAIL';
    
    this.authService.sendTwoFactorCode(this.pendingUser.email, method).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          this.codeSent = true;
          this.errorMessage = '';
          // Enfocar automáticamente el campo de código
          setTimeout(() => {
            if (this.twoFactorInput) {
              this.twoFactorInput.nativeElement.focus();
            }
          }, 100);
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
    if (!this.twoFactorCode || !this.pendingUser || !this.selectedMethod) {
      this.errorMessage = 'Por favor ingresa el código de verificación';
      return;
    }
    
    // Limpiar y validar código
    let codeString = String(this.twoFactorCode).trim();
    
    // Validar que solo contenga dígitos
    if (!/^\d+$/.test(codeString)) {
      this.errorMessage = 'El código debe contener solo dígitos';
      return;
    }
    
    // Normalizar a 6 dígitos
    codeString = codeString.padStart(6, '0');
    if (codeString.length > 6) {
      codeString = codeString.substring(0, 6);
    }
    
    this.isLoading = true;
    this.errorMessage = '';

    const payload = {
      email: String(this.pendingUser.email),
      code: codeString,
      method: String(this.selectedMethod)
    };

    this.authService.verifyTwoFactor(payload).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        const token = response.data?.accessToken || response.accessToken;
        const user = response.data?.user || response.user;
        
        if (token && user) {
          this.authService.completeLogin(token, user);
          this.router.navigate(['/']);
        } else {
          this.errorMessage = 'Código inválido o expirado';
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
    this.twoFactorCode = ''; // Reset como string vacío
    this.useBackupCode = false; // Reset backup code state
    this.backupCode = ''; // Reset backup code input
    this.errorMessage = '';
  }

  /**
   * Alternar entre código de 6 dígitos y código de respaldo
   */
  toggleBackupCodeMode(): void {
    this.useBackupCode = !this.useBackupCode;
    this.twoFactorCode = '';
    this.backupCode = '';
    this.errorMessage = '';
  }

  /**
   * Verificar código de respaldo
   */
  verifyBackupCode(): void {
    if (!this.backupCode || !this.pendingUser) {
      this.errorMessage = 'Ingresa un código de respaldo válido';
      return;
    }

    // Limpiar el código de respaldo (solo números y guiones)
    const cleanCode = this.backupCode.replace(/[^0-9-]/g, '').trim();
    
    if (cleanCode.length < 8) {
      this.errorMessage = 'El código de respaldo debe tener al menos 8 dígitos';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Llamar al AuthService para verificar el código de respaldo
    this.authService.verifyBackupCodeForLogin(this.pendingUser.email, cleanCode).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.success) {
          const token = response.data?.accessToken || response.accessToken;
          const user = response.data?.user || response.user;
          
          if (token && user) {
            this.authService.completeLogin(token, user);
            this.router.navigate(['/']);
          } else {
            this.errorMessage = 'Respuesta de login inválida';
          }
        } else {
          this.errorMessage = response.message || 'Código de respaldo inválido';
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.errorMessage = this.getErrorMessage(error);
      }
    });
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
   * MÉTODO RADICAL para preservar strings en código 2FA
   */
  onCodeInput(event: any): void {
    console.log('🔥 RADICAL onCodeInput INICIADO 🔥');
    const rawValue = event.target.value;
    console.log('Raw input:', rawValue, 'Type:', typeof rawValue);
    
    // TRIPLE conversión para garantizar string absoluto
    let stringValue = String(rawValue || '');
    stringValue = `${stringValue}`;  // Template literal force
    stringValue = stringValue.toString();  // Explicit toString
    
    // Solo permitir dígitos
    stringValue = stringValue.replace(/[^0-9]/g, '');
    
    // Limitar a 6 dígitos
    if (stringValue.length > 6) {
      stringValue = stringValue.substring(0, 6);
    }
    
    console.log('Triple converted:', stringValue, 'Type:', typeof stringValue);
    console.log('Is string?', typeof stringValue === 'string');
    console.log('Constructor:', stringValue.constructor.name);
    
    // Asignar con Object.defineProperty para forzar tipo
    Object.defineProperty(this, 'twoFactorCode', {
      value: stringValue,
      writable: true,
      enumerable: true,
      configurable: true
    });
    
    // Actualizar DOM también
    event.target.value = stringValue;
    
    console.log('Final assignment:', this.twoFactorCode, 'Type:', typeof this.twoFactorCode);
    console.log('Property descriptor:', Object.getOwnPropertyDescriptor(this, 'twoFactorCode'));
    console.log('🔥 RADICAL onCodeInput COMPLETADO 🔥');
  }

  // Getter que siempre retorna string
  get typeof() {
    return typeof this.twoFactorCode;
  }

  /**
   * Alternar visibilidad de contraseña
   */
  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Navegar a forgot-password con el email actual
   */
  goToForgotPassword(): void {
    const currentEmail = this.loginForm.get('email')?.value || '';
    if (currentEmail && currentEmail.trim()) {
      this.router.navigate(['/forgot-password'], { queryParams: { email: currentEmail.trim() } });
    } else {
      this.router.navigate(['/forgot-password']);
    }
  }

  /**
   * Navegar a register con el email actual
   */
  goToRegister(): void {
    const currentEmail = this.loginForm.get('email')?.value || '';
    if (currentEmail && currentEmail.trim()) {
      this.router.navigate(['/register'], { queryParams: { email: currentEmail.trim() } });
    } else {
      this.router.navigate(['/register']);
    }
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
}
