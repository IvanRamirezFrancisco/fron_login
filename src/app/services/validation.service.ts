import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, timer } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  private readonly baseUrl = environment.apiUrl; // 'http://localhost:8080/api'
  
  constructor(private http: HttpClient) {
    console.log('🏗️ ValidationService: baseUrl =', this.baseUrl);
    console.log('🏗️ ValidationService: environment.apiUrl =', environment.apiUrl);
  }

  /**
   * Método de depuración para ver qué URL se está generando
   */
  debugUrl(username: string): string {
    const finalUrl = `${this.baseUrl}/auth/check-username/${username}`;
    console.log('🔧 DEBUG URL CONSTRUCTION:');
    console.log('  - baseUrl:', this.baseUrl);
    console.log('  - environment.apiUrl:', environment.apiUrl);
    console.log('  - username:', username);
    console.log('  - finalUrl:', finalUrl);
    return finalUrl;
  }

  /**
   * Valida si un username está disponible
   * Incluye debounce para evitar múltiples llamadas
   * IMPORTANTE: Esta es una validación PÚBLICA que no debe requerir autenticación
   */
  checkUsernameAvailability(username: string): Observable<boolean> {
    if (!username || username.length < 3) {
      return of(false);
    }

    console.log(`🔄 ValidationService: Iniciando validación para "${username}"`);

    // Crear headers explícitos sin autorización para esta petición pública
    const publicHeaders = { 
      'Content-Type': 'application/json',
      'X-Public-Request': 'true' // Marcador para identificar peticiones públicas
    };

    return timer(500).pipe(
      switchMap(() => {
        const finalUrl = this.debugUrl(username); // Usar método de debug
        console.log(`🌐 ValidationService: Ejecutando HTTP GET para "${username}"`);
        return this.http.get<any>(finalUrl, { 
          headers: publicHeaders 
        }).pipe(
          map(response => {
            console.log(`✅ ValidationService: Username "${username}" disponible:`, response.available);
            return response.available;
          }),
          catchError((error) => {
            console.error(`❌ ValidationService: Error validating username "${username}":`, {
              status: error.status,
              message: error.message,
              url: error.url
            });
            // En caso de error, asumimos que no está disponible para ser conservadores
            // PERO no propagamos el error para evitar redirecciones
            return of(false);
          })
        );
      })
    );
  }

  /**
   * Valida formato de email profesional
   * Acepta todos los dominios existentes
   */
  validateEmailFormat(email: string): boolean {
    if (!email) return false;
    
    // Regex profesional para email que acepta cualquier TLD válido
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Valida si el email tiene un dominio válido y existente
   */
  validateEmailDomain(email: string): boolean {
    if (!this.validateEmailFormat(email)) return false;
    
    const domain = email.split('@')[1];
    if (!domain) return false;
    
    // Lista de dominios comunes válidos (se puede expandir)
    const validDomains = [
      // Institucionales
      'edu', 'edu.mx', 'edu.co', 'edu.pe', 'edu.ar', 'ac.uk', 'edu.au',
      // Gubernamentales  
      'gob.mx', 'gov', 'gov.uk', 'gov.co', 'gov.pe', 'gov.ar', 'gov.au',
      // Comerciales
      'com', 'org', 'net', 'biz', 'info', 'co', 'io', 'tech', 'dev',
      'ai', 'app', 'store', 'online', 'site', 'website', 'digital',
      // Regionales
      'mx', 'es', 'uk', 'ca', 'de', 'fr', 'it', 'br', 'ar', 'co', 'pe'
    ];
    
    // Verifica si el dominio o cualquiera de sus partes es válido
    return validDomains.some(validDomain => 
      domain === validDomain || 
      domain.endsWith('.' + validDomain)
    );
  }

  /**
   * Valida contraseña fuerte según estándares profesionales
   */
  validateStrongPassword(password: string): {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  } {
    const errors: string[] = [];
    
    if (!password) {
      return { isValid: false, errors: ['Password is required'], strength: 'weak' };
    }
    
    // Validaciones individuales
    if (password.length < 8) {
      errors.push('At least 8 characters required');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('At least 1 uppercase letter required');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('At least 1 lowercase letter required');
    }
    
    if (!/\d/.test(password)) {
      errors.push('At least 1 number required');
    }
    
    if (!/[@$!%*?&._-]/.test(password)) {
      errors.push('At least 1 special character required (@$!%*?&._-)');
    }
    
    if (/\s/.test(password)) {
      errors.push('No spaces allowed');
    }
    
    // Calcular fortaleza
    let strength: 'weak' | 'medium' | 'strong' | 'very-strong' = 'weak';
    const score = this.calculatePasswordStrength(password);
    
    if (score >= 80) strength = 'very-strong';
    else if (score >= 60) strength = 'strong';
    else if (score >= 40) strength = 'medium';
    
    return {
      isValid: errors.length === 0,
      errors,
      strength
    };
  }

  /**
   * Calcula un puntaje de fortaleza de contraseña (0-100)
   */
  private calculatePasswordStrength(password: string): number {
    let score = 0;
    
    // Longitud
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;
    
    // Variedad de caracteres
    if (/[A-Z]/.test(password)) score += 15;
    if (/[a-z]/.test(password)) score += 15;
    if (/\d/.test(password)) score += 15;
    if (/[@$!%*?&._-]/.test(password)) score += 15;
    
    // Complejidad adicional
    if (/[A-Z].*[A-Z]/.test(password)) score += 5; // Múltiples mayúsculas
    if (/\d.*\d/.test(password)) score += 5; // Múltiples números
    if (/[@$!%*?&._-].*[@$!%*?&._-]/.test(password)) score += 5; // Múltiples símbolos
    
    return Math.min(score, 100);
  }

  /**
   * Valida formato de username
   */
  validateUsernameFormat(username: string): boolean {
    if (!username) return false;
    
    // Solo letras, números y guiones bajos, 3-30 caracteres
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    return usernameRegex.test(username);
  }
}