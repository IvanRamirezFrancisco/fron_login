import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeUrl, SafeResourceUrl } from '@angular/platform-browser';

/**
 * Servicio de sanitización para proteger contra XSS en Angular
 */
@Injectable({
  providedIn: 'root'
})
export class SanitizationService {

  constructor(private sanitizer: DomSanitizer) { }

  /**
   * Sanitizar HTML de manera segura
   */
  sanitizeHtml(html: string): SafeHtml {
    if (!html) return '';
    
    // Detectar patrones peligrosos antes de sanitizar
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^>]*>/gi,
      /<object\b[^>]*>/gi,
      /<embed\b[^>]*>/gi,
      /<form\b[^>]*>/gi
    ];
    
    let cleanHtml = html;
    dangerousPatterns.forEach(pattern => {
      cleanHtml = cleanHtml.replace(pattern, '');
    });
    
    return this.sanitizer.sanitize(1, cleanHtml) || '';
  }

  /**
   * Sanitizar texto plano eliminando cualquier HTML
   */
  sanitizeText(text: string): string {
    if (!text) return '';
    
    // Eliminar todos los tags HTML
    const withoutTags = text.replace(/<[^>]*>/g, '');
    
    // Escapar caracteres especiales
    const div = document.createElement('div');
    div.textContent = withoutTags;
    
    return div.innerHTML;
  }

  /**
   * Sanitizar URL
   */
  sanitizeUrl(url: string): SafeUrl {
    if (!url) return '';
    
    // Lista blanca de protocolos permitidos
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
    
    try {
      const urlObj = new URL(url);
      if (!allowedProtocols.includes(urlObj.protocol)) {
        console.warn('Protocol not allowed:', urlObj.protocol);
        return '';
      }
    } catch (e) {
      console.warn('Invalid URL:', url);
      return '';
    }
    
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }

  /**
   * Sanitizar entrada de usuario para formularios
   */
  sanitizeUserInput(input: string): string {
    if (!input) return '';
    
    let sanitized = input.trim();
    
    // Remover caracteres de control y no imprimibles
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
    
    // Escapar caracteres HTML
    sanitized = this.sanitizeText(sanitized);
    
    return sanitized;
  }

  /**
   * Validar si una cadena es segura (versión más permisiva)
   */
  isSafeString(input: string): boolean {
    if (!input) return true;
    
    // Solo bloquear patrones muy peligrosos
    const criticalPatterns = [
      /<script[^>]*>[\s\S]*?<\/script>/gi, // Scripts completos
      /javascript:\s*[^;]+/gi, // JavaScript URLs
      /vbscript:\s*[^;]+/gi, // VBScript URLs
      /data:text\/html[^;]*;/gi // Data URLs HTML
    ];
    
    return !criticalPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Limpiar profundamente un objeto de datos
   */
  deepSanitizeObject<T>(obj: any): T {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
      return this.sanitizeUserInput(obj) as any;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepSanitizeObject(item)) as any;
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      Object.keys(obj).forEach(key => {
        sanitized[key] = this.deepSanitizeObject(obj[key]);
      });
      return sanitized;
    }
    
    return obj;
  }

  /**
   * Validar email
   */
  isValidEmail(email: string): boolean {
    if (!email) return false;
    
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email) && this.isSafeString(email);
  }

  /**
   * Validar teléfono
   */
  isValidPhone(phone: string): boolean {
    if (!phone) return false;
    
    const phonePattern = /^[+]?[\d\s\-\(\)]{7,20}$/;
    return phonePattern.test(phone) && this.isSafeString(phone);
  }
}