import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { map, catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { ValidationService } from '../services/validation.service';

export class CustomValidators {

  /**
   * Validador síncrono para email profesional
   */
  static emailProfessional(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Deja que el validador 'required' maneje valores vacíos
      }

      // Regex más robusta para email que acepta cualquier TLD
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      
      if (!emailRegex.test(control.value)) {
        return { 
          emailProfessional: { 
            message: 'Invalid email format',
            value: control.value 
          } 
        };
      }

      // Validaciones adicionales de dominio
      const domain = control.value.split('@')[1];
      if (!domain) {
        return { 
          emailProfessional: { 
            message: 'Invalid email domain',
            value: control.value 
          } 
        };
      }

      // Lista expandida de TLDs y dominios válidos
      const validTLDs = [
        // Institucionales
        'edu', 'edu.mx', 'edu.co', 'edu.pe', 'edu.ar', 'ac.uk', 'edu.au', 'edu.ca',
        // Gubernamentales
        'gob.mx', 'gov', 'gov.uk', 'gov.co', 'gov.pe', 'gov.ar', 'gov.au', 'gov.ca',
        // Comerciales comunes
        'com', 'org', 'net', 'biz', 'info', 'co', 'io', 'tech', 'dev', 'ai',
        'app', 'store', 'online', 'site', 'website', 'digital', 'cloud', 'world',
        // Nuevos TLDs
        'blog', 'news', 'music', 'art', 'design', 'studio', 'agency', 'consulting',
        'services', 'solutions', 'group', 'company', 'business', 'shop', 'market',
        // Regionales principales
        'mx', 'es', 'uk', 'ca', 'de', 'fr', 'it', 'br', 'ar', 'co', 'pe', 'cl',
        'us', 'au', 'jp', 'cn', 'in', 'kr', 'sg', 'hk', 'tw', 'th', 'my', 'ph'
      ];

      const isValidDomain = validTLDs.some(tld => 
        domain === tld || 
        domain.endsWith('.' + tld) ||
        // También acepta subdominios comunes
        /^[a-zA-Z0-9.-]+\.(com|org|net|edu|gov|mil|int)$/.test(domain)
      );

      if (!isValidDomain) {
        return { 
          emailProfessional: { 
            message: 'Email domain not recognized. Please use a valid institutional, governmental, or commercial domain',
            value: control.value 
          } 
        };
      }

      return null;
    };
  }

  /**
   * Validador síncrono para contraseña fuerte
   */
  static strongPassword(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Deja que el validador 'required' maneje valores vacíos
      }

      const password = control.value;
      const errors: string[] = [];

      // Validaciones obligatorias
      if (password.length < 8) {
        errors.push('At least 8 characters');
      }

      if (!/[A-Z]/.test(password)) {
        errors.push('At least 1 uppercase letter (A-Z)');
      }

      if (!/[a-z]/.test(password)) {
        errors.push('At least 1 lowercase letter (a-z)');
      }

      if (!/\d/.test(password)) {
        errors.push('At least 1 number (0-9)');
      }

      if (!/[@$!%*?&._-]/.test(password)) {
        errors.push('At least 1 special character (@$!%*?&._-)');
      }

      if (/\s/.test(password)) {
        errors.push('No spaces allowed');
      }

      // Validaciones de seguridad adicionales
      if (/(.)\1{2,}/.test(password)) {
        errors.push('No more than 2 consecutive identical characters');
      }

      if (errors.length > 0) {
        return { 
          strongPassword: { 
            message: 'Password requirements not met',
            errors: errors,
            value: control.value 
          } 
        };
      }

      return null;
    };
  }

  /**
   * Validador síncrono para formato de username
   */
  static usernameFormat(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const username = control.value;
      
      // Solo letras, números y guiones bajos, 3-30 caracteres
      if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
        return {
          usernameFormat: {
            message: 'Username must be 3-30 characters long and contain only letters, numbers, and underscores',
            value: username
          }
        };
      }

      // No puede empezar o terminar con guión bajo
      if (username.startsWith('_') || username.endsWith('_')) {
        return {
          usernameFormat: {
            message: 'Username cannot start or end with underscore',
            value: username
          }
        };
      }

      // No puede tener guiones bajos consecutivos
      if (/__/.test(username)) {
        return {
          usernameFormat: {
            message: 'Username cannot have consecutive underscores',
            value: username
          }
        };
      }

      return null;
    };
  }

  /**
   * Validador asíncrono para username único
   */
  static uniqueUsername(validationService: ValidationService): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value || control.value.length < 3) {
        return of(null);
      }

      console.log(`🔍 Iniciando validación de username: "${control.value}"`);

      return of(control.value).pipe(
        debounceTime(500), // Espera 500ms después de que el usuario deje de escribir
        distinctUntilChanged(), // Solo procesa si el valor cambió
        switchMap(username => {
          console.log(`🌐 Ejecutando petición HTTP para username: "${username}"`);
          return validationService.checkUsernameAvailability(username).pipe(
            map(available => {
              const result = available ? null : { 
                uniqueUsername: { 
                  message: 'This username is already taken',
                  value: username 
                } 
              };
              console.log(`✅ Resultado validación username "${username}":`, result ? 'NOT AVAILABLE' : 'AVAILABLE');
              return result;
            }),
            catchError((error) => {
              console.error(`❌ Error en validación username "${username}":`, error);
              return of({ 
                uniqueUsername: { 
                  message: 'Error checking username availability',
                  value: control.value 
                } 
              });
            })
          );
        })
      );
    };
  }

  /**
   * Validador para confirmar contraseña
   */
  static confirmPassword(passwordControlName: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.parent || !control.value) {
        return null;
      }

      const password = control.parent.get(passwordControlName);
      if (!password) {
        return null;
      }

      if (control.value !== password.value) {
        return {
          confirmPassword: {
            message: 'Passwords do not match',
            value: control.value
          }
        };
      }

      return null;
    };
  }

  /**
   * Validador para nombres (solo letras y espacios)
   */
  static nameFormat(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const name = control.value.trim();
      
      // Solo letras, espacios, acentos y guiones
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s-]{2,50}$/.test(name)) {
        return {
          nameFormat: {
            message: 'Name must contain only letters, spaces, and hyphens (2-50 characters)',
            value: name
          }
        };
      }

      // No puede empezar o terminar con espacio o guión
      if (name.startsWith(' ') || name.endsWith(' ') || 
          name.startsWith('-') || name.endsWith('-')) {
        return {
          nameFormat: {
            message: 'Name cannot start or end with space or hyphen',
            value: name
          }
        };
      }

      return null;
    };
  }
}