import { Component, OnInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil, switchMap } from 'rxjs';
import { SearchService, SearchResult } from '../../services/search.service';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-global-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './global-search.component.html',
  styleUrls: ['./global-search.component.css']
})
export class GlobalSearchComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  
  searchQuery = '';
  showDropdown = false;
  isSearching = false;
  searchResults: Product[] = [];
  searchSuggestions: string[] = [];
  totalResults = 0;
  executionTime = 0;
  
  // Subject para implementar debounce
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  
  // Estados
  hasSearched = false;
  noResults = false;

  constructor(
    private searchService: SearchService,
    private router: Router,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    // Configurar búsqueda con debounce
    this.searchSubject.pipe(
      debounceTime(400), // Esperar 400ms después de que el usuario deje de escribir
      distinctUntilChanged(), // Solo buscar si el texto cambió
      takeUntil(this.destroy$),
      switchMap(query => {
        if (query.trim().length >= 2) {
          this.isSearching = true;
          return this.searchService.search(query);
        } else {
          this.isSearching = false;
          this.searchResults = [];
          this.showDropdown = false;
          return [];
        }
      })
    ).subscribe({
      next: (result: SearchResult | any[]) => {
        this.isSearching = false;
        this.hasSearched = true;
        
        if (Array.isArray(result)) {
          // Caso cuando devuelve array vacío
          this.searchResults = [];
          this.totalResults = 0;
          this.noResults = true;
        } else {
          // Caso cuando devuelve SearchResult
          this.searchResults = result.products;
          this.totalResults = result.totalResults;
          this.executionTime = result.executionTime;
          this.noResults = this.searchResults.length === 0;
        }
        
        this.showDropdown = this.hasSearched;
      },
      error: (err) => {
        console.error('Error en búsqueda:', err);
        this.isSearching = false;
        this.searchResults = [];
        this.noResults = true;
        this.showDropdown = true;
      }
    });

    // Cargar sugerencias cuando el input recibe foco
    this.loadSearchSuggestions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Método llamado cuando el usuario escribe
  onSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery = query;
    this.searchSubject.next(query);
    
    // Si el query está vacío, ocultar dropdown
    if (query.trim().length === 0) {
      this.showDropdown = false;
      this.hasSearched = false;
    }
  }

  // Cargar sugerencias de búsqueda
  loadSearchSuggestions(): void {
    this.searchService.getSearchHistory().pipe(
      takeUntil(this.destroy$)
    ).subscribe(history => {
      this.searchSuggestions = history;
    });
  }

  // Seleccionar una sugerencia
  selectSuggestion(suggestion: string): void {
    this.searchQuery = suggestion;
    this.searchSubject.next(suggestion);
  }

  // Navegar a detalle de producto
  viewProductDetail(product: Product): void {
    this.closeDropdown();
    this.router.navigate(['/producto', product.id]);
  }

  // Ver todos los resultados
  viewAllResults(): void {
    if (this.searchQuery.trim()) {
      this.closeDropdown();
      this.router.navigate(['/busqueda'], {
        queryParams: { q: this.searchQuery }
      });
    }
  }

  // Cerrar dropdown
  closeDropdown(): void {
    this.showDropdown = false;
  }

  // Abrir dropdown
  openDropdown(): void {
    if (this.hasSearched || this.searchSuggestions.length > 0) {
      this.showDropdown = true;
    }
  }

  // Limpiar búsqueda
  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.showDropdown = false;
    this.hasSearched = false;
    this.noResults = false;
    this.searchInput?.nativeElement.focus();
  }

  // Detectar clic fuera del componente
  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeDropdown();
    }
  }

  // Manejar tecla Enter
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.searchQuery.trim()) {
      this.viewAllResults();
    }
    
    if (event.key === 'Escape') {
      this.closeDropdown();
    }
  }

  // Obtener texto destacado (highlight)
  highlightMatch(text: string): string {
    if (!this.searchQuery.trim()) return text;
    
    const query = this.searchQuery.trim();
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }
}
