import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { BrandService } from '../../../services/brand.service';
import { FileUploadService } from '../../../services/file-upload.service';
import {
  BrandDTO,
  CreateBrandRequest,
  BrandListResponse
} from '../../../models/brand.model';

/**
 * Componente para gestión completa de marcas (CRUD)
 * Funcionalidades: Crear, Listar, Editar, Eliminar, Búsqueda
 */
@Component({
  selector: 'app-admin-brands',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-brands.component.html',
  styleUrls: ['./admin-brands.component.css']
})
export class AdminBrandsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Estado
  brands: BrandDTO[] = [];
  loading = false;
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;

  // Paginación
  currentPage = 0;
  pageSize = 10;
  totalBrands = 0;
  totalPages = 0;
  readonly pageSizeOptions = [5, 10, 20, 50];

  get startIndex(): number {
    return this.totalBrands === 0 ? 0 : this.currentPage * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.totalBrands);
  }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(0, this.currentPage - 2);
    const end = Math.min(this.totalPages - 1, this.currentPage + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  changePageSize(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize = +select.value;
    this.currentPage = 0;
    this.loadBrands();
  }

  // Búsqueda y filtros
  searchTerm = '';
  filterActive: boolean | null = null;
  filterCountry = '';

  // Formulario
  brandForm: CreateBrandRequest = {
    name: '',
    description: '',
    logoUrl: '',
    websiteUrl: '',
    countryOrigin: '',
    active: true
  };

  logoPreviewUrl = '';
  logoUploadInProgress = false;

  selectedBrand: BrandDTO | null = null;

  // Mensajes
  successMessage = '';
  errorMessage = '';

  // Getters para el template (evitar arrow functions en HTML)
  get activeBrandsCount(): number {
    return this.brands.filter(b => b.active).length;
  }

  get totalProductsCount(): number {
    return this.brands.reduce((sum, b) => sum + b.productCount, 0);
  }

  constructor(
    private brandService: BrandService,
    private router: Router,
    private route: ActivatedRoute,
    private fileUploadService: FileUploadService
  ) {}

  ngOnInit(): void {
    this.loadBrands();

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

  // ==================== CRUD OPERATIONS ====================

  loadBrands(): void {
    this.loading = true;
    this.errorMessage = '';

    if (this.searchTerm || this.filterActive !== null || this.filterCountry) {
      // Búsqueda con filtros
      this.brandService.searchBrands(
        this.searchTerm || undefined,
        this.filterActive !== null ? this.filterActive : undefined,
        this.filterCountry || undefined,
        this.currentPage,
        this.pageSize
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: BrandListResponse) => {
          this.brands = response.brands;
          this.totalBrands = response.totalBrands;
          this.totalPages = response.totalPages;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error al buscar marcas:', error);
          this.errorMessage = 'Error al buscar marcas';
          this.loading = false;
        }
      });
    } else {
      // Carga normal
      this.brandService.getAllBrands(this.currentPage, this.pageSize)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: BrandListResponse) => {
            this.brands = response.brands;
            this.totalBrands = response.totalBrands;
            this.totalPages = response.totalPages;
            this.loading = false;
          },
          error: (error) => {
            console.error('Error al cargar marcas:', error);
            this.errorMessage = 'Error al cargar marcas';
            this.loading = false;
          }
        });
    }
  }

  openCreateModal(): void {
    this.brandForm = {
      name: '',
      description: '',
      logoUrl: '',
      websiteUrl: '',
      countryOrigin: '',
      active: true
    };
    this.logoPreviewUrl = '';
    this.logoUploadInProgress = false;
    this.showCreateModal = true;
    this.errorMessage = '';
  }

  openEditModal(brand: BrandDTO): void {
    this.selectedBrand = brand;
    this.brandForm = {
      name: brand.name,
      description: brand.description || '',
      logoUrl: brand.logoUrl || '',
      websiteUrl: brand.websiteUrl || '',
      countryOrigin: brand.countryOrigin || '',
      active: brand.active
    };
    this.logoPreviewUrl = brand.logoUrl || '';
    this.logoUploadInProgress = false;
    this.showEditModal = true;
    this.errorMessage = '';
  }

  openDeleteModal(brand: BrandDTO): void {
    this.selectedBrand = brand;
    this.showDeleteModal = true;
    this.errorMessage = '';
  }

  saveBrand(): void {
    if (!this.brandForm.name.trim()) {
      this.errorMessage = 'El nombre de la marca es obligatorio';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    if (this.showCreateModal) {
      // Crear nueva marca
      this.brandService.createBrand(this.brandForm)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.successMessage = 'Marca creada exitosamente';
            this.showCreateModal = false;
            this.loadBrands();
            setTimeout(() => this.successMessage = '', 3000);
          },
          error: (error) => {
            console.error('Error al crear marca:', error);
            this.errorMessage = error.error?.message || 'Error al crear la marca';
            this.loading = false;
          }
        });
    } else if (this.showEditModal && this.selectedBrand) {
      // Actualizar marca existente
      this.brandService.updateBrand(this.selectedBrand.id, this.brandForm)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.successMessage = 'Marca actualizada exitosamente';
            this.showEditModal = false;
            this.selectedBrand = null;
            this.loadBrands();
            setTimeout(() => this.successMessage = '', 3000);
          },
          error: (error) => {
            console.error('Error al actualizar marca:', error);
            this.errorMessage = error.error?.message || 'Error al actualizar la marca';
            this.loading = false;
          }
        });
    }
  }

  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      this.errorMessage = 'Formato no permitido. Solo PNG o JPG.';
      input.value = '';
      return;
    }

    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      this.errorMessage = 'El archivo supera el tamaño máximo de 10MB.';
      input.value = '';
      return;
    }

    this.errorMessage = '';
    this.logoUploadInProgress = true;
    this.logoPreviewUrl = URL.createObjectURL(file);

    this.fileUploadService.uploadSingle(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response?.url) {
            this.brandForm.logoUrl = response.url;
            this.logoPreviewUrl = response.url;
          }
          this.logoUploadInProgress = false;
        },
        error: (error) => {
          console.error('Error al subir logo:', error);
          this.errorMessage = error.error?.error || 'Error al subir el logo';
          this.logoUploadInProgress = false;
        }
      });
  }

  deleteBrand(): void {
    if (!this.selectedBrand) return;

    this.loading = true;
    this.errorMessage = '';

    this.brandService.deleteBrand(this.selectedBrand.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = 'Marca eliminada exitosamente';
          this.showDeleteModal = false;
          this.selectedBrand = null;
          this.loadBrands();
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error al eliminar marca:', error);
          this.errorMessage = error.error?.message || 'Error al eliminar la marca';
          this.loading = false;
        }
      });
  }

  toggleStatus(brand: BrandDTO): void {
    this.brandService.toggleBrandStatus(brand.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = `Marca ${brand.active ? 'desactivada' : 'activada'} exitosamente`;
          this.loadBrands();
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error al cambiar estado:', error);
          this.errorMessage = 'Error al cambiar el estado de la marca';
        }
      });
  }

  // ==================== BÚSQUEDA Y FILTROS ====================

  onSearch(): void {
    this.currentPage = 0;
    this.loadBrands();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterActive = null;
    this.filterCountry = '';
    this.currentPage = 0;
    this.loadBrands();
  }

  // ==================== PAGINACIÓN ====================

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadBrands();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadBrands();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadBrands();
    }
  }

  // ==================== UTILIDADES ====================

  closeModal(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedBrand = null;
    this.errorMessage = '';
    this.logoPreviewUrl = '';
    this.logoUploadInProgress = false;
  }

  private clearActionParam(): void {
    this.router.navigate([], {
      queryParams: { action: null },
      queryParamsHandling: 'merge'
    });
  }

  navigateToProducts(brandId: number): void {
    this.router.navigate(['/admin/products'], { queryParams: { brandId } });
  }
}
