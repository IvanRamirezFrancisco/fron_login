import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CategoryService } from '../../../services/category.service';
import { Category, CreateCategoryRequest, UpdateCategoryRequest } from '../../../models/category.model';

/**
 * Componente para gestión completa de categorías (CRUD)
 */
@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-categories.component.html',
  styleUrls: ['./admin-categories.component.css']
})
export class AdminCategoriesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Lista de categorías
  categories: Category[] = [];
  filteredCategories: Category[] = [];

  // Estados de UI
  loading = false;
  successMessage = '';
  errorMessage = '';

  // Filtros y búsqueda
  searchTerm = '';
  filterActive: boolean | null = null;
  
  // Vista (tabla o tarjetas)
  viewMode: 'table' | 'cards' = 'table';

  // Paginación
  currentPage = 0;
  pageSize = 10;
  totalPages = 0;
  totalCategories = 0;

  // Modales
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;

  // Formulario de categoría
  categoryForm: CreateCategoryRequest = {
    name: '',
    description: '',
    imageUrl: '',
    active: true,
    parentId: null
  };

  // Categoría seleccionada
  selectedCategory: Category | null = null;

  // Estadísticas
  activeCategoriesCount = 0;
  totalProductsCount = 0;

  constructor(
    private categoryService: CategoryService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    console.log('🎨 Iniciando AdminCategoriesComponent');
    this.loadCategories();

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['action'] === 'create' && !this.showCreateModal) {
          this.openCreateModal();
          this.clearActionParam();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== CARGA DE DATOS ====================

  loadCategories(): void {
    this.loading = true;
    this.errorMessage = '';

    console.log('📂 Cargando todas las categorías...');

    this.categoryService.getAllCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          console.log('✅ Categorías cargadas:', categories);
          this.categories = categories;
          // Ordenar jerárquicamente: primero padres, luego hijas
          this.filteredCategories = this.sortCategoriesHierarchically(categories);
          this.totalCategories = categories.length;
          this.calculateStatistics();
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error al cargar categorías:', error);
          console.error('📊 Detalles del error:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            errorBody: error.error
          });
          this.errorMessage = `Error al cargar categorías: ${error.error?.message || error.message}`;
          this.loading = false;
        }
      });
  }

  calculateStatistics(): void {
    this.activeCategoriesCount = this.categories.filter(c => c.active).length;
    this.totalProductsCount = this.categories.reduce((sum, c) => sum + (c.productCount || 0), 0);
  }

  // ==================== BÚSQUEDA Y FILTROS ====================

  onSearch(): void {
    this.applyFilters();
  }

  applyFilters(): void {
    console.log('🔍 Aplicando filtros...');
    
    this.filteredCategories = this.categories.filter(category => {
      // Filtro de búsqueda
      const matchesSearch = !this.searchTerm || 
        category.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (category.description && category.description.toLowerCase().includes(this.searchTerm.toLowerCase()));

      // Filtro de estado
      const matchesActive = this.filterActive === null || category.active === this.filterActive;

      return matchesSearch && matchesActive;
    });

    console.log(`✅ Categorías filtradas: ${this.filteredCategories.length} de ${this.categories.length}`);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterActive = null;
    this.filteredCategories = this.categories;
  }

  private clearActionParam(): void {
    this.router.navigate([], {
      queryParams: { action: null },
      queryParamsHandling: 'merge'
    });
  }

  // ==================== CRUD OPERATIONS ====================

  openCreateModal(): void {
    console.log('➕ Abriendo modal de crear categoría');
    this.resetForm();
    this.showCreateModal = true;
    this.errorMessage = '';
  }

  openEditModal(category: Category): void {
    console.log('✏️ Abriendo modal de editar categoría:', category.name);
    this.selectedCategory = category;
    this.categoryForm = {
      name: category.name,
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      active: category.active
    };
    this.showEditModal = true;
    this.errorMessage = '';
  }

  openDeleteModal(category: Category): void {
    console.log('🗑️ Abriendo modal de confirmar eliminación:', category.name);
    this.selectedCategory = category;
    this.showDeleteModal = true;
    this.errorMessage = '';
  }

  saveCategory(): void {
    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    if (this.showCreateModal) {
      // Crear nueva categoría
      this.categoryService.createCategory(this.categoryForm)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.successMessage = 'Categoría creada exitosamente';
            this.showCreateModal = false;
            this.resetForm();
            this.loadCategories();
            setTimeout(() => this.successMessage = '', 3000);
          },
          error: (error) => {
            console.error('Error al crear categoría:', error);
            this.errorMessage = error.error?.message || 'Error al crear la categoría';
            this.loading = false;
          }
        });
    } else if (this.showEditModal && this.selectedCategory) {
      // Actualizar categoría existente
      this.categoryService.updateCategory(this.selectedCategory.id, this.categoryForm)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.successMessage = 'Categoría actualizada exitosamente';
            this.showEditModal = false;
            this.selectedCategory = null;
            this.resetForm();
            this.loadCategories();
            setTimeout(() => this.successMessage = '', 3000);
          },
          error: (error) => {
            console.error('Error al actualizar categoría:', error);
            this.errorMessage = error.error?.message || 'Error al actualizar la categoría';
            this.loading = false;
          }
        });
    }
  }

  confirmDelete(category: Category): void {
    this.selectedCategory = category;
    this.showDeleteModal = true;
    this.errorMessage = '';
  }

  deleteCategory(): void {
    if (!this.selectedCategory) return;

    this.loading = true;
    this.errorMessage = '';

    this.categoryService.deleteCategory(this.selectedCategory.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = '🗑️ Categoría eliminada permanentemente de la base de datos';
          this.showDeleteModal = false;
          this.selectedCategory = null;
          this.loadCategories();
          setTimeout(() => this.successMessage = '', 4000);
        },
        error: (error) => {
          console.error('Error al eliminar categoría:', error);
          // El backend devuelve mensajes claros de validación
          this.errorMessage = error.error?.message || error.error || 'Error al eliminar la categoría';
          this.loading = false;
          // NO cerramos el modal para que el usuario vea el mensaje de error
        }
      });
  }

  toggleStatus(category: Category): void {
    const updateRequest: UpdateCategoryRequest = {
      active: !category.active
    };

    this.categoryService.updateCategory(category.id, updateRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = `Categoría ${updateRequest.active ? 'activada' : 'desactivada'} exitosamente`;
          this.loadCategories();
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error al cambiar estado:', error);
          this.errorMessage = error.error?.message || 'Error al cambiar el estado';
        }
      });
  }

  // ==================== VALIDACIÓN ====================

  validateForm(): boolean {
    if (!this.categoryForm.name || this.categoryForm.name.trim().length < 2) {
      this.errorMessage = 'El nombre de la categoría debe tener al menos 2 caracteres';
      return false;
    }

    if (this.categoryForm.name.length > 100) {
      this.errorMessage = 'El nombre no puede exceder los 100 caracteres';
      return false;
    }

    return true;
  }

  // ==================== UTILIDADES ====================

  resetForm(): void {
    this.categoryForm = {
      name: '',
      description: '',
      imageUrl: '',
      active: true,
      parentId: null
    };
    this.selectedCategory = null;
  }

  closeModal(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedCategory = null;
    this.errorMessage = '';
  }

  navigateToProducts(categoryId: number): void {
    this.router.navigate(['/admin/products'], { 
      queryParams: { categoryId } 
    });
  }

  // ==================== PAGINACIÓN ====================

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadCategories();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadCategories();
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadCategories();
  }
  
  // ==================== CAMBIO DE VISTA ====================
  
  /**
   * Cambiar entre vista de tabla y tarjetas
   */
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'table' ? 'cards' : 'table';
    console.log('👁️ Vista cambiada a:', this.viewMode);
  }

  // ==================== JERARQUÍA ====================

  /**
   * Obtener solo las categorías raíz (sin padre)
   */
  getRootCategories(): Category[] {
    return this.categories.filter(cat => !cat.parentId);
  }
  
  /**
   * Obtener categorías raíz ACTIVAS para el selector (excluye inactivas)
   */
  getRootCategoriesForSelect(): Category[] {
    return this.categories.filter(cat => !cat.parentId && cat.active);
  }

  /**
   * Obtener subcategorías de una categoría padre
   */
  getSubcategories(parentId: number): Category[] {
    return this.categories.filter(cat => cat.parentId === parentId);
  }

  /**
   * Obtener el nombre de la categoría padre por ID
   */
  getParentCategoryName(parentId: number | null | undefined): string {
    if (!parentId) return '';
    const parent = this.categories.find(cat => cat.id === parentId);
    return parent ? parent.name : '';
  }

  /**
   * Verificar si una categoría tiene subcategorías
   */
  hasSubcategories(categoryId: number): boolean {
    return this.categories.some(cat => cat.parentId === categoryId);
  }

  /**
   * Ordenar categorías para mostrar padres primero, luego hijas
   */
  sortCategoriesHierarchically(categories: Category[]): Category[] {
    const sorted: Category[] = [];
    
    // Primero las categorías raíz
    const roots = categories.filter(cat => !cat.parentId);
    roots.forEach(root => {
      sorted.push(root);
      // Luego sus subcategorías
      const children = categories.filter(cat => cat.parentId === root.id);
      sorted.push(...children);
    });
    
    return sorted;
  }
}
