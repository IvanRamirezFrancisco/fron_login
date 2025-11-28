import { Directive, ElementRef, Input, OnInit } from '@angular/core';
import { SanitizationService } from '../services/sanitization.service';

/**
 * Directiva para sanitización automática de contenido
 */
@Directive({
  selector: '[appSanitize]',
  standalone: true
})
export class SanitizeDirective implements OnInit {
  @Input() appSanitize: 'text' | 'html' | 'url' = 'text';
  @Input() content: string = '';

  constructor(
    private el: ElementRef,
    private sanitizationService: SanitizationService
  ) { }

  ngOnInit() {
    this.sanitizeContent();
  }

  private sanitizeContent() {
    if (!this.content) return;

    let sanitized: string;

    switch (this.appSanitize) {
      case 'html':
        sanitized = this.sanitizationService.sanitizeHtml(this.content) as string;
        this.el.nativeElement.innerHTML = sanitized;
        break;
      
      case 'url':
        if (this.sanitizationService.isSafeString(this.content)) {
          this.el.nativeElement.href = this.content;
        } else {
          this.el.nativeElement.href = '#';
          console.warn('URL no segura detectada:', this.content);
        }
        break;
      
      case 'text':
      default:
        sanitized = this.sanitizationService.sanitizeText(this.content);
        this.el.nativeElement.textContent = sanitized;
        break;
    }
  }
}

/**
 * Directiva para validación segura de formularios
 */
@Directive({
  selector: '[appSecureInput]',
  standalone: true
})
export class SecureInputDirective implements OnInit {
  @Input() inputType: 'email' | 'phone' | 'text' | 'password' = 'text';

  constructor(
    private el: ElementRef,
    private sanitizationService: SanitizationService
  ) { }

  ngOnInit() {
    this.setupValidation();
  }

  private setupValidation() {
    const input = this.el.nativeElement;

    input.addEventListener('input', (event: any) => {
      const value = event.target.value;

      // Sanitizar entrada en tiempo real
      const sanitized = this.sanitizationService.sanitizeUserInput(value);
      
      if (sanitized !== value) {
        event.target.value = sanitized;
        console.warn('Contenido peligroso removido del input');
      }

      // Validaciones específicas por tipo
      this.validateByType(sanitized, input);
    });

    input.addEventListener('paste', (event: ClipboardEvent) => {
      setTimeout(() => {
        const value = input.value;
        const sanitized = this.sanitizationService.sanitizeUserInput(value);
        
        if (sanitized !== value) {
          input.value = sanitized;
          console.warn('Contenido peligroso removido del clipboard');
        }
      }, 0);
    });
  }

  private validateByType(value: string, input: HTMLInputElement) {
    let isValid = true;

    switch (this.inputType) {
      case 'email':
        isValid = this.sanitizationService.isValidEmail(value);
        break;
      case 'phone':
        isValid = this.sanitizationService.isValidPhone(value);
        break;
      case 'text':
      case 'password':
        isValid = this.sanitizationService.isSafeString(value);
        break;
    }

    // Aplicar estilos visuales para indicar validez
    input.classList.toggle('invalid-input', !isValid);
    input.classList.toggle('valid-input', isValid && value.length > 0);
  }
}