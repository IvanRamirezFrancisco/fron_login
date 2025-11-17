import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { HomeHeaderComponent } from '../home-header/home-header.component';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule, HomeHeaderComponent],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showEmailVerification = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    console.log('🚀 RegisterComponent constructor iniciado - FORMULARIO SIMPLIFICADO');
    
    // SOLUCIÓN DEFINITIVA: Formulario ULTRA SIMPLE sin validadores complejos
    // NO validadores asíncronos, NO llamadas HTTP durante escritura
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required, 
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,}$/)
      ]],
      confirmPassword: ['', [Validators.required]]
    });

    console.log('✅ RegisterForm SIMPLIFICADO creado exitosamente - Sin validaciones HTTP');
  }

  // Getters para acceder fácilmente a los controles del formulario
  get username() { return this.registerForm.get('username'); }
  get firstName() { return this.registerForm.get('firstName'); }
  get lastName() { return this.registerForm.get('lastName'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }
  get confirmPassword() { return this.registerForm.get('confirmPassword'); }

  /**
   * Obtiene el mensaje de error para un campo específico
   */
  getFieldError(fieldName: string): string {
    const field = this.registerForm.get(fieldName);
    if (!field || !field.errors || !field.touched) {
      return '';
    }

    const errors = field.errors;
    
    // Mensajes específicos por campo
    switch (fieldName) {
      case 'username':
        if (errors['required']) return 'El nombre de usuario es obligatorio';
        if (errors['minlength']) return 'El nombre de usuario debe tener al menos 3 caracteres';
        break;
        
      case 'firstName':
        if (errors['required']) return 'El nombre es obligatorio';
        if (errors['minlength']) return 'El nombre debe tener al menos 2 caracteres';
        break;
        
      case 'lastName':
        if (errors['required']) return 'El apellido es obligatorio';
        if (errors['minlength']) return 'El apellido debe tener al menos 2 caracteres';
        break;
        
      case 'email':
        if (errors['required']) return 'El correo electrónico es obligatorio';
        if (errors['email']) return 'Por favor ingresa un correo electrónico válido (ejemplo: usuario@correo.com)';
        break;
        
      case 'password':
        if (errors['required']) return 'La contraseña es obligatoria';
        if (errors['minlength']) return 'La contraseña debe tener al menos 8 caracteres';
        if (errors['pattern']) return 'La contraseña debe contener: 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial (@$!%*?&._-)';
        break;
        
      case 'confirmPassword':
        if (errors['required']) return 'Por favor confirma tu contraseña';
        break;
    }
    
    // Fallback para errores genéricos
    if (errors['required']) {
      return `${this.getFieldDisplayName(fieldName)} es obligatorio`;
    }

    if (errors['minlength']) {
      const required = errors['minlength'].requiredLength;
      return `${this.getFieldDisplayName(fieldName)} debe tener al menos ${required} caracteres`;
    }

    if (errors['email']) {
      return 'Por favor ingresa un correo electrónico válido';
    }

    return 'Campo inválido';
  }

  /**
   * Obtiene los errores detallados de contraseña
   */
  getPasswordErrors(): string[] {
    const field = this.registerForm.get('password');
    if (!field || !field.errors || !field.touched) {
      return [];
    }

    if (field.errors['strongPassword']) {
      return field.errors['strongPassword'].errors || [];
    }

    return [];
  }

  /**
   * Verifica si un campo tiene un error específico
   */
  hasFieldError(fieldName: string, errorType: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.errors && field.errors[errorType] && field.touched);
  }

  /**
   * Verifica si un campo es válido y ha sido tocado
   */
  isFieldValid(fieldName: string): boolean {
    const field = this.registerForm.get(fieldName);
    return !!(field && field.valid && field.touched);
  }

  /**
   * Verifica si las contraseñas coinciden
   */
  passwordsMatch(): boolean {
    const password = this.registerForm.get('password')?.value;
    const confirmPassword = this.registerForm.get('confirmPassword')?.value;
    return password === confirmPassword;
  }

  /**
   * Obtiene mensaje de error para confirmación de contraseña
   */
  getConfirmPasswordError(): string {
    const confirmPasswordField = this.registerForm.get('confirmPassword');
    
    if (!confirmPasswordField || !confirmPasswordField.touched) {
      return '';
    }

    if (confirmPasswordField.errors?.['required']) {
      return 'Por favor confirma tu contraseña';
    }

    if (!this.passwordsMatch() && confirmPasswordField.value) {
      return 'Las contraseñas no coinciden';
    }

    return '';
  }

  /**
   * Verificar si la contraseña es fuerte (cumple todos los requisitos)
   */
  isPasswordStrong(password: string): boolean {
    if (!password) return false;
    
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[@$!%*?&._-]/.test(password);
    
    return hasMinLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChars;
  }

  /**
   * Verificar si la contraseña tiene al menos 8 caracteres
   */
  hasMinLength(password: string): boolean {
    return password.length >= 8;
  }

  /**
   * Verificar si la contraseña tiene al menos una mayúscula
   */
  hasUpperCase(password: string): boolean {
    return /[A-Z]/.test(password);
  }

  /**
   * Verificar si la contraseña tiene al menos una minúscula
   */
  hasLowerCase(password: string): boolean {
    return /[a-z]/.test(password);
  }

  /**
   * Verificar si la contraseña tiene al menos un número
   */
  hasNumbers(password: string): boolean {
    return /\d/.test(password);
  }

  /**
   * Verificar si la contraseña tiene al menos un carácter especial
   */
  hasSpecialChars(password: string): boolean {
    return /[@$!%*?&._-]/.test(password);
  }

  /**
   * Obtener fortaleza de contraseña para mostrar indicador visual
   */
  getPasswordStrength(password: string): string {
    if (!password) return '';
    
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&._-]/.test(password)) score++;
    
    if (score <= 2) return 'weak';
    if (score <= 3) return 'medium'; 
    if (score <= 4) return 'strong';
    return 'very-strong';
  }

  /**
   * Obtiene el nombre de visualización del campo
   */
  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      'username': 'El nombre de usuario',
      'firstName': 'El nombre',
      'lastName': 'El apellido', 
      'email': 'El correo electrónico',
      'password': 'La contraseña',
      'confirmPassword': 'La confirmación de contraseña'
    };
    return displayNames[fieldName] || fieldName;
  }

  onSubmit(): void {
    console.log('🚀 Enviando formulario de registro...');
    
    // Validación de contraseñas primero (sin validators complejos)
    if (this.registerForm.value.password !== this.registerForm.value.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden. Por favor verifica que ambas contraseñas sean idénticas.';
      return;
    }
    
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';

      const formData = this.registerForm.value;
      console.log('📋 Datos del formulario:', formData);

      // Preparar datos en el formato exacto que espera el backend
      const registerData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName
      };

      console.log('🌐 Enviando datos al backend:', registerData);
      
      this.authService.register(registerData).subscribe({
        next: (response) => {
          console.log('✅ Registro exitoso:', response);
          this.isLoading = false;
          this.errorMessage = '';
          this.showEmailVerification = true;
          this.successMessage = '¡Cuenta creada exitosamente! Revisa tu correo electrónico para verificar tu cuenta antes de iniciar sesión.';
        },
        error: (error) => {
          console.error('❌ Error en registro:', error);
          this.errorMessage = error.error?.message || error.message || 'Ocurrió un error al crear tu cuenta. Por favor intenta nuevamente.';
          
          if (error.error?.errors) {
            console.log('🔍 Errores de validación del servidor:', error.error.errors);
            this.errorMessage = 'Se encontraron los siguientes errores: ' + Object.values(error.error.errors).join(', ');
          }
          
          this.isLoading = false;
        },
        complete: () => {
          console.log('🏁 Proceso de registro completado');
          this.isLoading = false;
        }
      });
    } else {
      console.log('❌ Formulario inválido');
      this.errorMessage = 'Por favor completa todos los campos correctamente para continuar';
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.registerForm.controls).forEach(key => {
      const control = this.registerForm.get(key);
      control?.markAsTouched();
    });
  }
}
