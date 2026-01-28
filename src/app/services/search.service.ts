import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { SanitizationService } from './sanitization.service';
import { ValidationService } from './validation.service';
import { Product } from '../models/product.model';
import { ProductService } from './product.service';

export interface SearchResult {
  products: Product[];
  query: string;
  totalResults: number;
  executionTime: number;
}

/**
 * Servicio de búsqueda global con protección contra XSS y SQL Injection
 */
@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private searchHistorySubject = new BehaviorSubject<string[]>([]);
  public searchHistory$ = this.searchHistorySubject.asObservable();
  
  private readonly MAX_HISTORY_ITEMS = 10;
  private readonly MAX_SEARCH_LENGTH = 100;
  private readonly MIN_SEARCH_LENGTH = 2;

  constructor(
    private sanitizationService: SanitizationService,
    private validationService: ValidationService,
    private productService: ProductService
  ) {
    this.loadSearchHistory();
  }

  /**
   * Realizar búsqueda con sanitización y validación completa
   */
  search(query: string): Observable<SearchResult> {
    const startTime = Date.now();
    
    // Paso 1: Validar longitud
    if (!query || query.trim().length < this.MIN_SEARCH_LENGTH) {
      return of({
        products: [],
        query: '',
        totalResults: 0,
        executionTime: 0
      });
    }

    if (query.length > this.MAX_SEARCH_LENGTH) {
      console.warn('Search query too long, truncating');
      query = query.substring(0, this.MAX_SEARCH_LENGTH);
    }

    // Paso 2: Sanitizar entrada para prevenir XSS
    const sanitizedQuery = this.sanitizeSearchQuery(query);

    // Paso 3: Validar que no contenga patrones peligrosos
    if (!this.isValidSearchQuery(sanitizedQuery)) {
      console.error('Invalid search query detected:', query);
      return of({
        products: [],
        query: sanitizedQuery,
        totalResults: 0,
        executionTime: Date.now() - startTime
      });
    }

    // Paso 4: Realizar búsqueda segura
    return this.productService.searchProducts({
      search: sanitizedQuery
    }, { field: 'name', direction: 'asc' }, 1, 50).pipe(
      map(response => {
        const executionTime = Date.now() - startTime;
        
        // Guardar en historial si hay resultados
        if (response.products.length > 0) {
          this.addToSearchHistory(sanitizedQuery);
        }
        
        return {
          products: response.products,
          query: sanitizedQuery,
          totalResults: response.total,
          executionTime
        };
      }),
      delay(300) // Simular latencia de red
    );
  }

  /**
   * Sanitizar consulta de búsqueda
   */
  private sanitizeSearchQuery(query: string): string {
    // Usar el servicio de sanitización
    let sanitized = this.sanitizationService.sanitizeUserInput(query);
    
    // Remover caracteres SQL peligrosos
    sanitized = this.removeSqlInjectionPatterns(sanitized);
    
    // Normalizar espacios
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    
    return sanitized;
  }

  /**
   * Remover patrones de SQL Injection (aunque Angular no hace SQL directo,
   * es una capa extra de seguridad para cuando los datos lleguen al backend)
   */
  private removeSqlInjectionPatterns(input: string): string {
    // Patrones comunes de SQL injection
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
      /--/g,  // Comentarios SQL
      /;/g,   // Separador de comandos
      /'/g,   // Comillas simples
      /"/g,   // Comillas dobles
      /\\/g,  // Backslash
      /\|/g,  // Pipe
      /%/g,   // Wildcard SQL
      /\*/g,  // Wildcard o comentario
    ];
    
    let sanitized = input;
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    return sanitized;
  }

  /**
   * Validar que la consulta sea segura
   */
  private isValidSearchQuery(query: string): boolean {
    // Verificar que no esté vacío después de la sanitización
    if (!query || query.trim().length === 0) {
      return false;
    }

    // Verificar que solo contenga caracteres alfanuméricos y espacios permitidos
    const allowedPattern = /^[a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑüÜ\-_.]+$/;
    if (!allowedPattern.test(query)) {
      console.warn('Query contains invalid characters:', query);
      return false;
    }

    // Verificar patrones de ataque comunes
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /onerror/i,
      /onload/i,
      /eval\(/i,
      /expression\(/i,
      /vbscript:/i,
      /data:text\/html/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        console.error('Dangerous pattern detected in search query');
        return false;
      }
    }

    return true;
  }

  /**
   * Agregar a historial de búsqueda
   */
  private addToSearchHistory(query: string): void {
    const currentHistory = this.searchHistorySubject.value;
    
    // No agregar duplicados
    const filtered = currentHistory.filter(q => q.toLowerCase() !== query.toLowerCase());
    
    // Agregar al inicio y limitar tamaño
    const newHistory = [query, ...filtered].slice(0, this.MAX_HISTORY_ITEMS);
    
    this.searchHistorySubject.next(newHistory);
    this.saveSearchHistory(newHistory);
  }

  /**
   * Obtener historial de búsqueda
   */
  getSearchHistory(): Observable<string[]> {
    return this.searchHistory$;
  }

  /**
   * Limpiar historial de búsqueda
   */
  clearSearchHistory(): void {
    this.searchHistorySubject.next([]);
    localStorage.removeItem('search_history');
  }

  /**
   * Guardar historial en localStorage
   */
  private saveSearchHistory(history: string[]): void {
    try {
      localStorage.setItem('search_history', JSON.stringify(history));
    } catch (e) {
      console.warn('Could not save search history to localStorage', e);
    }
  }

  /**
   * Cargar historial desde localStorage
   */
  private loadSearchHistory(): void {
    try {
      const saved = localStorage.getItem('search_history');
      if (saved) {
        const history = JSON.parse(saved);
        if (Array.isArray(history)) {
          // Sanitizar cada elemento del historial por seguridad
          const sanitizedHistory = history
            .map(q => this.sanitizeSearchQuery(q))
            .filter(q => this.isValidSearchQuery(q))
            .slice(0, this.MAX_HISTORY_ITEMS);
          
          this.searchHistorySubject.next(sanitizedHistory);
        }
      }
    } catch (e) {
      console.warn('Could not load search history from localStorage', e);
    }
  }

  /**
   * Obtener sugerencias de búsqueda
   */
  getSearchSuggestions(query: string): Observable<string[]> {
    if (!query || query.length < this.MIN_SEARCH_LENGTH) {
      return of([]);
    }

    const sanitizedQuery = this.sanitizeSearchQuery(query);
    if (!this.isValidSearchQuery(sanitizedQuery)) {
      return of([]);
    }

    // Obtener productos que coincidan y extraer sugerencias
    return this.productService.getProducts().pipe(
      map(products => {
        const suggestions = new Set<string>();
        const lowerQuery = sanitizedQuery.toLowerCase();

        products.forEach(product => {
          // Agregar nombre del producto si coincide
          if (product.name.toLowerCase().includes(lowerQuery)) {
            suggestions.add(product.name);
          }
          
          // Agregar marca si coincide
          if (product.brand.toLowerCase().includes(lowerQuery)) {
            suggestions.add(product.brand);
          }
          
          // Agregar categoría si coincide
          if (product.category.name.toLowerCase().includes(lowerQuery)) {
            suggestions.add(product.category.name);
          }
          
          // Agregar tags si coinciden
          product.tags.forEach(tag => {
            if (tag.toLowerCase().includes(lowerQuery)) {
              suggestions.add(tag);
            }
          });
        });

        return Array.from(suggestions).slice(0, 8);
      }),
      delay(200)
    );
  }
}
