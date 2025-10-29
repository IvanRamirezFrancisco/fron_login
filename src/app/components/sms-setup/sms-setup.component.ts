import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SmsService } from '../../services/sms.service';
import { SmsSetupResponse } from '../../models/sms.model';

@Component({
  selector: 'app-sms-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sms-setup.component.html',
  styleUrls: ['./sms-setup.component.css']
})
export class SmsSetupComponent implements OnInit {
  // Estados del componente
  currentStep: 'phone' | 'verification' | 'success' = 'phone';
  isLoading = false;
  
  // Datos del formulario
  phoneNumber = '';
  verificationCode = '';
  
  // Mensajes
  errorMessage = '';
  successMessage = '';
  
  // Validaciones
  phoneError = '';
  codeError = '';

  constructor(
    private smsService: SmsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Verificar que el usuario esté autenticado
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }
  }

  /**
   * Validar y enviar código al número de teléfono
   */
  sendVerificationCode(): void {
    if (!this.validatePhone()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.phoneError = '';

    this.smsService.setupSmsAndSendCode(this.phoneNumber).subscribe({
      next: (response: SmsSetupResponse) => {
        this.isLoading = false;
        if (response.success) {
          this.currentStep = 'verification';
          this.successMessage = `Código enviado a ${this.smsService.formatPhoneNumber(this.phoneNumber)}`;
        } else {
          this.errorMessage = response.message || 'Error enviando código SMS';
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.errorMessage = this.getErrorMessage(error);
      }
    });
  }

  /**
   * Verificar código ingresado y activar SMS 2FA
   */
  verifyCode(): void {
    if (!this.validateCode()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.codeError = '';

    this.smsService.verifySmsSetup(this.verificationCode).subscribe({
      next: (response: SmsSetupResponse) => {
        this.isLoading = false;
        if (response.success) {
          this.currentStep = 'success';
          this.successMessage = '¡SMS 2FA activado correctamente!';
          // Actualizar información del usuario en localStorage si es necesario
          this.updateUserInfo();
        } else {
          this.errorMessage = response.message || 'Código inválido';
        }
      },
      error: (error: any) => {
        this.isLoading = false;
        this.errorMessage = this.getErrorMessage(error);
      }
    });
  }

  /**
   * Reenviar código de verificación
   */
  resendCode(): void {
    this.sendVerificationCode();
  }

  /**
   * Volver al paso anterior
   */
  goBack(): void {
    if (this.currentStep === 'verification') {
      this.currentStep = 'phone';
      this.verificationCode = '';
      this.errorMessage = '';
      this.successMessage = '';
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  /**
   * Ir al dashboard
   */
  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Cancelar configuración
   */
  cancel(): void {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Validar número de teléfono
   */
  private validatePhone(): boolean {
    this.phoneError = '';

    if (!this.phoneNumber.trim()) {
      this.phoneError = 'El número de teléfono es requerido';
      return false;
    }

    if (!this.smsService.isValidPhoneNumber(this.phoneNumber)) {
      this.phoneError = 'Formato inválido. Use formato internacional: +1234567890';
      return false;
    }

    return true;
  }

  /**
   * Validar código de verificación
   */
  private validateCode(): boolean {
    this.codeError = '';

    if (!this.verificationCode.trim()) {
      this.codeError = 'El código es requerido';
      return false;
    }

    if (!/^\d{6}$/.test(this.verificationCode)) {
      this.codeError = 'El código debe tener 6 dígitos';
      return false;
    }

    return true;
  }

  /**
   * Actualizar información del usuario
   */
  private updateUserInfo(): void {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        user.smsEnabled = true;
        user.twoFactorEnabled = true;
        user.phone = this.phoneNumber;
        localStorage.setItem('user', JSON.stringify(user));
      } catch (error) {
        console.error('Error actualizando información del usuario:', error);
      }
    }
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
   * Formatear número para mostrar
   */
  getFormattedPhone(): string {
    return this.smsService.formatPhoneNumber(this.phoneNumber);
  }

  /**
   * Limpiar mensajes al cambiar input
   */
  onPhoneChange(): void {
    this.phoneError = '';
    this.errorMessage = '';
  }

  onCodeChange(): void {
    this.codeError = '';
    this.errorMessage = '';
  }
}