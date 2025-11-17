import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HomeHeaderComponent } from '../home-header/home-header.component';

@Component({
  selector: 'app-register-debug',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HomeHeaderComponent],
  template: `
    <!-- Header de navegación -->
    <app-home-header></app-home-header>

    <!-- Contenedor principal Casa de Música -->
    <div class="registro-container">
      <div class="registro-contenido">
        
        <!-- Card principal de registro Casa de Música -->
        <div class="card-registro">
          
          <!-- Header del card Casa de Música -->
          <div class="card-header">
            <!-- Logo Casa de Música -->
            <div class="logo-container">
              <div class="logo-icon">
                <span class="material-symbols-outlined">music_note</span>
              </div>
              <div class="logo-text">
                <h1 class="marca-titulo">Casa de Música</h1>
                <span class="marca-subtitulo">CASTILLO</span>
              </div>
            </div>
            <h2 class="titulo-principal">Crear Cuenta (DEBUG MODE)</h2>
            <p class="subtitulo">Modo de prueba sin validaciones automáticas</p>
          </div>

          <!-- Body del card Casa de Música -->
          <div class="card-body">
            
            <!-- Mensaje de error global -->
            <div *ngIf="errorMessage" class="mensaje-error">
              <span class="material-symbols-outlined">warning</span>
              <span>{{ errorMessage }}</span>
            </div>

            <!-- Formulario simple HTML -->
            <form (submit)="onSubmit($event)" class="formulario-registro">
              
              <!-- Campo Nombre de Usuario -->
              <div class="campo-completo">
                <label for="username" class="etiqueta">
                  <span class="material-symbols-outlined">person</span>
                  Nombre de usuario
                </label>
                <input 
                  type="text" 
                  id="username" 
                  [(ngModel)]="formData.username"
                  class="input-campo"
                  placeholder="Nombre de usuario único"
                  autocomplete="username"
                  (input)="onInputChange('username')"
                >
              </div>

              <!-- Campo Nombre -->
              <div class="campo-mitad">
                <label for="firstName" class="etiqueta">
                  <span class="material-symbols-outlined">badge</span>
                  Nombre
                </label>
                <input 
                  type="text" 
                  id="firstName" 
                  [(ngModel)]="formData.firstName"
                  class="input-campo"
                  placeholder="Tu nombre"
                  autocomplete="given-name"
                  (input)="onInputChange('firstName')"
                >
              </div>

              <!-- Campo Apellido -->
              <div class="campo-mitad">
                <label for="lastName" class="etiqueta">
                  <span class="material-symbols-outlined">badge</span>
                  Apellido
                </label>
                <input 
                  type="text" 
                  id="lastName" 
                  [(ngModel)]="formData.lastName"
                  class="input-campo"
                  placeholder="Tu apellido"
                  autocomplete="family-name"
                  (input)="onInputChange('lastName')"
                >
              </div>

              <!-- Campo Email -->
              <div class="campo-completo">
                <label for="email" class="etiqueta">
                  <span class="material-symbols-outlined">email</span>
                  Email
                </label>
                <input 
                  type="email" 
                  id="email" 
                  [(ngModel)]="formData.email"
                  class="input-campo"
                  placeholder="ejemplo@correo.com"
                  autocomplete="email"
                  (input)="onInputChange('email')"
                >
              </div>

              <!-- Campo Contraseña -->
              <div class="campo-completo">
                <label for="password" class="etiqueta">
                  <span class="material-symbols-outlined">lock</span>
                  Contraseña
                </label>
                <input 
                  type="password" 
                  id="password" 
                  [(ngModel)]="formData.password"
                  class="input-campo"
                  placeholder="Mínimo 6 caracteres"
                  autocomplete="new-password"
                  (input)="onInputChange('password')"
                >
              </div>

              <!-- Campo Confirmar Contraseña -->
              <div class="campo-completo">
                <label for="confirmPassword" class="etiqueta">
                  <span class="material-symbols-outlined">lock_reset</span>
                  Confirmar contraseña
                </label>
                <input 
                  type="password" 
                  id="confirmPassword" 
                  [(ngModel)]="formData.confirmPassword"
                  class="input-campo"
                  placeholder="Repite tu contraseña"
                  autocomplete="new-password"
                  (input)="onInputChange('confirmPassword')"
                >
              </div>

              <!-- Botón de registro -->
              <button 
                type="submit" 
                [disabled]="isLoading"
                class="boton-registro"
              >
                <span *ngIf="isLoading" class="material-symbols-outlined loading">sync</span>
                <span *ngIf="!isLoading" class="material-symbols-outlined">person_add</span>
                <span *ngIf="isLoading">Creando cuenta...</span>
                <span *ngIf="!isLoading">Crear Cuenta (DEBUG)</span>
              </button>
            </form>

            <!-- Debug Info -->
            <div class="debug-info" style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
              <h4>🔍 DEBUG INFO:</h4>
              <p><strong>Username:</strong> {{ formData.username }}</p>
              <p><strong>First Name:</strong> {{ formData.firstName }}</p>
              <p><strong>Last Name:</strong> {{ formData.lastName }}</p>
              <p><strong>Email:</strong> {{ formData.email }}</p>
              <p><strong>Input Events:</strong> {{ inputEvents.join(', ') }}</p>
            </div>

            <!-- Enlaces adicionales -->
            <div class="enlaces-adicionales">
              <div class="separador"></div>
              <div class="enlace-login">
                <span class="texto-enlace">¿Ya tienes cuenta?</span>
                <a routerLink="/login" class="enlace-accion">
                  <span class="material-symbols-outlined">login</span>
                  Inicia sesión
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./register.component.css']
})
export class RegisterDebugComponent {
  formData = {
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  isLoading = false;
  errorMessage = '';
  inputEvents: string[] = [];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    console.log('🔧 RegisterDebugComponent constructor iniciado');
  }

  onInputChange(fieldName: string) {
    console.log(`🔍 Input change detected in field: ${fieldName}, value: ${this.formData[fieldName as keyof typeof this.formData]}`);
    this.inputEvents.push(`${fieldName}: ${new Date().getTime()}`);
    
    // Mantener solo los últimos 10 eventos
    if (this.inputEvents.length > 10) {
      this.inputEvents = this.inputEvents.slice(-10);
    }
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    console.log('🚀 Form submitted:', this.formData);
    
    this.isLoading = true;
    this.errorMessage = '';

    const registerData = {
      username: this.formData.username,
      email: this.formData.email,
      password: this.formData.password,
      firstName: this.formData.firstName,
      lastName: this.formData.lastName
    };

    console.log('📤 Sending registration data:', registerData);
    
    this.authService.register(registerData).subscribe({
      next: (response) => {
        console.log('✅ Registro exitoso:', response);
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        console.error('❌ Error en registro:', error);
        this.errorMessage = error.error?.message || error.message || 'Error al registrarse';
        this.isLoading = false;
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
}