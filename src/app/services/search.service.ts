import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SanitizationService } from './sanitization.service';
import { ValidationService } from './validation.service';
import { PublicProduct } from '../models/product.model';
import { PublicApiService } from './public-api.service';

export interface SearchResult {
  products: PublicProduct[];
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
    private publicApiService: PublicApiService
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
      query = query.substring(0, this.MAX_SEARCH_LENGTH);
    }

    const sanitizedQuery = this.sanitizeSearchQuery(query);

    if (!this.isValidSearchQuery(sanitizedQuery)) {
      return of({
        products: [],
        query: sanitizedQuery,
        totalResults: 0,
        executionTime: Date.now() - startTime
      });
    }

    // Paso 4: Realizar búsqueda contra la API real del backend
    return this.publicApiService.getCatalog({
      keyword: sanitizedQuery,
      page: 0,
      size: 50,
      sortBy: 'featured'
    }).pipe(
      map(response => {
        const executionTime = Date.now() - startTime;
        
        // Guardar en historial si hay resultados
        if (response.content.length > 0) {
          this.addToSearchHistory(sanitizedQuery);
        }
        
        return {
          products: response.content,
          query: sanitizedQuery,
          totalResults: response.totalElements,
          executionTime
        };
      }),
      catchError(() => {
        return of({
          products: [] as PublicProduct[],
          query: sanitizedQuery,
          totalResults: 0,
          executionTime: Date.now() - startTime
        });
      })
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

    const allowedPattern = /^[a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑüÜ\-_.]+$/;
    if (!allowedPattern.test(query)) {
      return false;
    }

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
      // Error silencioso
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
      // Error silencioso
    }
  }

  /**
   * Obtener sugerencias de búsqueda basadas en el historial
   */
  getSearchSuggestions(query: string): Observable<string[]> {
    if (!query || query.length < this.MIN_SEARCH_LENGTH) {
      return of([]);
    }

    const sanitizedQuery = this.sanitizeSearchQuery(query);
    if (!this.isValidSearchQuery(sanitizedQuery)) {
      return of([]);
    }

    // Filtrar historial que coincida con el query
    const lowerQuery = sanitizedQuery.toLowerCase();
    const matchingHistory = this.searchHistorySubject.value
      .filter(h => h.toLowerCase().includes(lowerQuery))
      .slice(0, 8);

    return of(matchingHistory);
  }
}
