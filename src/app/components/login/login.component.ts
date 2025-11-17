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
import { HomeHeaderComponent } from '../home-header/home-header.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule,ReactiveFormsModule, CommonModule, RouterModule, HomeHeaderComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showTwoFactorForm = false;
  pendingUser: any = null;
  twoFactorCode: string = ''; // CRITICAL: Inicializar explícitamente como string
  showPassword = false; // Nueva propiedad para controlar visibilidad de contraseña
  
  // Estados para SMS 2FA
  selectedMethod: string = '';
  codeSent = false;
  availableMethods: TwoFactorMethod[] = [];



  // Estados para códigos de respaldo
  useBackupCode = false;
  backupCode = '';

  cancelTwoFactor(): void {
    this.showTwoFactorForm = false;
    this.twoFactorCode = ''; // Reset como string vacío
    this.pendingUser = null;
    this.selectedMethod = '';
    this.codeSent = false;
    this.useBackupCode = false; // Reset backup code mode
    this.backupCode = ''; // Reset backup code input
    this.errorMessage = '';
  }

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
          name: 'SMS',
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
   * MÉTODO EXTREMO: Verificar código 2FA con FORZADO de strings
   */
  verifyTwoFactor(): void {
    console.log('�💥 MÉTODO EXTREMO INICIADO 💥🚀');
    console.log('Initial twoFactorCode:', this.twoFactorCode, 'Type:', typeof this.twoFactorCode);
    
    if (!this.twoFactorCode || !this.pendingUser || !this.selectedMethod) {
      console.log('❌ Faltan datos requeridos');
      return;
    }
    
    // QUINTUPLE conversión de string para garantía absoluta
    let codeString = String(this.twoFactorCode).trim();
    codeString = `${codeString}`;  // Template literal
    codeString = codeString.toString();  // Explicit toString
    codeString = JSON.parse(JSON.stringify(codeString)); // JSON roundtrip
    codeString = new String(codeString).valueOf(); // String object conversion
    
    console.log('QUINTUPLE converted code:', codeString, 'Type:', typeof codeString);
    
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
    
    console.log('Final normalized code:', codeString, 'Type:', typeof codeString);
    
    this.isLoading = true;
    this.errorMessage = '';

    // CREAR REQUEST CON FORZADO EXTREMO DE STRINGS
    const emailString = String(this.pendingUser.email);
    const methodString = String(this.selectedMethod);
    
    // Usar Object.create para garantizar tipos primitivos
    const requestData = Object.create(null);
    requestData.email = emailString;
    requestData.code = codeString;  // GUARANTEED STRING
    requestData.method = methodString;
    
    // Verificar que todo sean strings
    console.log('🔍 REQUEST VALIDATION:');
    console.log('  email:', requestData.email, 'Type:', typeof requestData.email);
    console.log('  code:', requestData.code, 'Type:', typeof requestData.code);
    console.log('  method:', requestData.method, 'Type:', typeof requestData.method);
    console.log('🚀 Sending request with EXTREME string forcing:', requestData);
    
    // JSON stringify manual para inspección
    const jsonString = JSON.stringify(requestData);
    console.log('📤 JSON que se enviará:', jsonString);
    
    this.smsService.verifyLoginCode(
      emailString,
      codeString,
      methodString as 'SMS' | 'EMAIL' | 'GOOGLE_AUTHENTICATOR'
    ).subscribe({
      next: (response: any) => {
        console.log('✅ Respuesta exitosa:', response);
        this.isLoading = false;
        const token = response.data?.accessToken || response.accessToken;
        const user = response.data?.user || response.user;
        
        if (token && user) {
          this.authService.completeLogin(token, user);
          this.router.navigate(['/']);
        } else {
          this.errorMessage = 'Código inválido o respuesta inválida';
        }
      },
      error: (err: any) => {
        console.error('💥 Error en verificación EXTREMA:', err);
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



  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }
}
