import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { StaffService } from '../../../services/staff.service';
import { RoleService } from '../../../services/role.service';
import { StaffUser, Role, StaffFilters, PageResponse } from '../../../models/staff.model';
import Swal from 'sweetalert2';
import { StaffFormModalComponent } from './staff-form-modal.component';

@Component({
  selector: 'app-admin-staff',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, StaffFormModalComponent],
  templateUrl: './admin-staff.component.html',
  styleUrls: ['./admin-staff.component.css']
})
export class AdminStaffComponent implements OnInit {
  // Exponer Math al template
  Math = Math;
  
  private _staffList: StaffUser[] = [];
  get staffList(): StaffUser[] {
    return this._staffList || [];
  }
  set staffList(value: StaffUser[]) {
    this._staffList = value || [];
  }
  
  private _roles: Role[] = [];
  get roles(): Role[] {
    return this._roles || [];
  }
  set roles(value: Role[]) {
    this._roles = value || [];
  }
  
  loading = false;
  
  // Paginación
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  // Filtros
  searchTerm = '';
  selectedRoleId: number | null = null;
  filterEnabled: boolean | null = null;
  filterLocked: boolean | null = null;

  // Modal
  showModal = false;
  isEditMode = false;
  selectedUser: StaffUser | null = null;

  constructor(
    private staffService: StaffService,
    private roleService: RoleService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.loadStaff();
    this.loadRoles();

    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'create' && !this.showModal) {
        this.openCreateModal();
        this.clearActionParam();
      }
      if (params['action'] === 'export') {
        this.exportToCsv();
        this.clearActionParam();
      }
    });
  }

  /**
   * Carga la lista de staff con filtros
   */
  loadStaff(): void {
    this.loading = true;
    
    const filters: StaffFilters = {
      search: this.searchTerm || undefined,
      roleId: this.selectedRoleId || undefined,
      enabled: this.filterEnabled !== null ? this.filterEnabled : undefined,
      accountNonLocked: this.filterLocked !== null ? !this.filterLocked : undefined,
      page: this.currentPage,
      size: this.pageSize,
      sort: 'createdAt,desc'
    };

    this.staffService.getAllStaff(filters).subscribe({
      next: (response: PageResponse<StaffUser>) => {
        this.staffList = response.content || [];
        this.totalElements = response.totalElements || 0;
        this.totalPages = response.totalPages || 0;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar staff:', error);
        this.staffList = []; // Asegurar que siempre sea un array
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar la lista de usuarios',
          confirmButtonColor: '#800020'
        });
      }
    });
  }

  /**
   * Carga todos los roles disponibles
   */
  loadRoles(): void {
    this.roleService.getAllRoles().subscribe({
      next: (roles) => {
        this.roles = roles || [];
      },
      error: (error) => {
        console.error('Error al cargar roles:', error);
        this.roles = []; // Asegurar que siempre sea un array
        Swal.fire({
          icon: 'warning',
          title: 'Advertencia',
          text: 'No se pudieron cargar los roles disponibles'
        });
      }
    });
  }

  /**
   * Buscar staff
   */
  onSearch(): void {
    this.currentPage = 0;
    this.loadStaff();
  }

  /**
   * Cambiar página
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadStaff();
  }

  /**
   * Cambiar tamaño de página
   */
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 0;
    this.loadStaff();
  }

  /**
   * Aplicar filtros
   */
  applyFilters(): void {
    this.currentPage = 0;
    this.loadStaff();
  }

  /**
   * Limpiar filtros
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedRoleId = null;
    this.filterEnabled = null;
    this.filterLocked = null;
    this.currentPage = 0;
    this.loadStaff();
  }

  /**
   * Abrir modal para crear nuevo usuario
   */
  openCreateModal(): void {
    console.log('Abriendo modal de creación...');
    this.isEditMode = false;
    this.selectedUser = null;
    this.showModal = true;
    console.log('showModal:', this.showModal);
  }

  /**
   * Abrir modal para editar usuario
   */
  openEditModal(user: StaffUser): void {
    this.isEditMode = true;
    this.selectedUser = { ...user };
    this.showModal = true;
  }

  /**
   * Cerrar modal
   */
  closeModal(): void {
    this.showModal = false;
    this.selectedUser = null;
    this.isEditMode = false;
  }

  private clearActionParam(): void {
    this.router.navigate([], {
      queryParams: { action: null },
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Cuando se guarda desde el modal
   */
  onUserSaved(): void {
    this.closeModal();
    this.loadStaff();
  }

  /**
   * Toggle estado activo/inactivo
   */
  toggleEnabled(user: StaffUser): void {
    const action = user.enabled ? 'desactivar' : 'activar';
    
    Swal.fire({
      title: `¿${action.charAt(0).toUpperCase() + action.slice(1)} usuario?`,
      text: `¿Estás seguro de que deseas ${action} a ${user.firstName} ${user.lastName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#800020',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Sí, ${action}`,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.staffService.enableUser(user.id).subscribe({
          next: () => {
            user.enabled = !user.enabled;
            Swal.fire({
              icon: 'success',
              title: '¡Actualizado!',
              text: `Usuario ${user.enabled ? 'activado' : 'desactivado'} correctamente`,
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            console.error('Error al cambiar estado:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error?.error?.message || 'No se pudo cambiar el estado del usuario',
              confirmButtonColor: '#800020'
            });
          }
        });
      }
    });
  }

  /**
   * Toggle bloqueo de cuenta
   */
  toggleLock(user: StaffUser): void {
    const action = user.accountNonLocked ? 'bloquear' : 'desbloquear';
    
    Swal.fire({
      title: `¿${action.charAt(0).toUpperCase() + action.slice(1)} cuenta?`,
      text: `¿Estás seguro de que deseas ${action} la cuenta de ${user.firstName} ${user.lastName}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#800020',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Sí, ${action}`,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.staffService.lockAccount(user.id).subscribe({
          next: () => {
            user.accountNonLocked = !user.accountNonLocked;
            Swal.fire({
              icon: 'success',
              title: '¡Actualizado!',
              text: `Cuenta ${user.accountNonLocked ? 'desbloqueada' : 'bloqueada'} correctamente`,
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            console.error('Error al cambiar bloqueo:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error?.error?.message || 'No se pudo cambiar el estado de bloqueo',
              confirmButtonColor: '#800020'
            });
          }
        });
      }
    });
  }

  /**
   * Eliminar usuario
   */
  deleteUser(user: StaffUser): void {
    Swal.fire({
      title: '¿Eliminar usuario?',
      html: `¿Estás seguro de que deseas eliminar a <strong>${user.firstName} ${user.lastName}</strong>?<br><small class="text-danger">Esta acción no se puede deshacer</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.staffService.deleteStaff(user.id).subscribe({
          next: () => {
            this.loadStaff();
            Swal.fire({
              icon: 'success',
              title: '¡Eliminado!',
              text: 'Usuario eliminado correctamente',
              timer: 2000,
              showConfirmButton: false
            });
          },
          error: (error) => {
            console.error('Error al eliminar usuario:', error);
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.error?.message || 'No se pudo eliminar el usuario',
              confirmButtonColor: '#800020'
            });
          }
        });
      }
    });
  }

  /**
   * Resetear intentos fallidos
   */
  resetFailedAttempts(user: StaffUser): void {
    this.staffService.resetFailedAttempts(user.id).subscribe({
      next: () => {
        user.failedLoginAttempts = 0;
        Swal.fire({
          icon: 'success',
          title: '¡Reseteado!',
          text: 'Intentos fallidos reseteados correctamente',
          timer: 2000,
          showConfirmButton: false
        });
      },
      error: (error) => {
        console.error('Error al resetear intentos:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo resetear los intentos fallidos',
          confirmButtonColor: '#800020'
        });
      }
    });
  }

  /**
   * Exportar a CSV
   */
  exportToCsv(): void {
    const filters: StaffFilters = {
      search: this.searchTerm || undefined,
      roleId: this.selectedRoleId || undefined
    };

    this.staffService.exportStaffToCsv(filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `staff-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error al exportar:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo exportar la lista',
          confirmButtonColor: '#800020'
        });
      }
    });
  }

  /**
   * Obtener nombre completo
   */
  getFullName(user: StaffUser): string {
    const first = user.firstName || '';
    const last  = user.lastName  || '';
    return (first + ' ' + last).trim() || user.email || `Usuario #${user.id}`;
  }

  /**
   * TrackBy para *ngFor — evita re-renderizar filas existentes
   */
  trackByUserId(_index: number, user: StaffUser): number {
    return user.id;
  }

  /**
   * Generar array de páginas para el paginador
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(0, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages - 1, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(0, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }
}
