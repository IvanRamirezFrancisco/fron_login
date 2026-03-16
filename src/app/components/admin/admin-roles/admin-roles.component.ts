import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RoleService } from '../../../services/role.service';
import { AuthService } from '../../../services/auth.service';
import { Role, Permission, PermissionsByCategory, RoleUserDTO, PageResponse } from '../../../models/staff.model';
import { User } from '../../../models/user.model';

declare const Swal: any;

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-roles.component.html',
  styleUrls: ['./admin-roles.component.css']
})
export class AdminRolesComponent implements OnInit, OnDestroy {

  roles: Role[] = [];
  allPermissions: Permission[] = [];
  permissionsByCategory: PermissionsByCategory = {};
  loading = false;
  currentUser: User | null = null;
  private destroy$ = new Subject<void>();

  // â”€â”€ Permissions Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  showPermissionsModal = false;
  selectedRole: Role | null = null;
  selectedPermissions: Set<number> = new Set();
  savingPermissions = false;
  /** When true, the permissions modal is read-only (system roles) */
  permissionsModalReadOnly = false;

  // â”€â”€ Create Role Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  showRoleModal = false;
  savingRole = false;
  roleFormData = { name: '', description: '' };

  // â”€â”€ Role Users Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  showUsersModal = false;
  usersModalRole: Role | null = null;
  usersModalLoading = false;
  usersPage: PageResponse<RoleUserDTO> | null = null;
  usersCurrentPage = 0;
  readonly usersPageSize = 8;

  constructor(
    private roleService: RoleService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.authService.getCurrentUser().pipe(takeUntil(this.destroy$)).subscribe(user => {
      this.currentUser = user;
    });
    this.loadRoles();
    this.loadPermissionsByCategory();

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        if (params['action'] === 'create' && this.isSuperAdmin() && !this.showRoleModal) {
          this.openCreateRoleModal();
          this.clearActionParam();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== SEGURIDAD ====================

  isSuperAdmin(): boolean {
    const roles = this.currentUser?.roles;
    if (!roles || roles.length === 0) return false;
    return roles.some(r => {
      const normalized = r?.toUpperCase().replace('ROLE_', '');
      return normalized === 'SUPER_ADMIN';
    });
  }

  isImmutableRole(role: Role): boolean {
    return role.immutable === true;
  }

  canEditPermissions(role: Role): boolean {
    return !this.isImmutableRole(role) && this.isSuperAdmin();
  }

  canDelete(role: Role): boolean {
    return !this.isImmutableRole(role) && this.isSuperAdmin();
  }

  // ==================== CARGA DE DATOS ====================

  loadRoles(): void {
    this.loading = true;
    this.roleService.getAllRoles().pipe(takeUntil(this.destroy$)).subscribe({
      next: (roles) => { this.roles = roles; this.loading = false; },
      error: (err: any) => { console.error('loadRoles error:', err); this.loading = false; }
    });
  }

  loadPermissionsByCategory(): void {
    this.roleService.getPermissionsByCategory().pipe(takeUntil(this.destroy$)).subscribe({
      next: (permissions) => {
        this.permissionsByCategory = permissions;
        this.allPermissions = Object.values(permissions).flat();
      },
      error: (err: any) => { console.error('loadPermissionsByCategory error:', err); }
    });
  }

  // ==================== MODAL DE PERMISOS ====================

  /** Abre el modal de permisos en modo ediciÃ³n (solo para roles no inmutables) */
  openPermissionsModal(role: Role): void {
    this.selectedRole = { ...role };
    this.selectedPermissions = new Set(role.permissions?.map(p => p.id) ?? []);
    this.permissionsModalReadOnly = false;
    this.showPermissionsModal = true;
  }

  /** Abre el modal de permisos en modo solo-lectura (para roles del sistema) */
  openPermissionsModalReadOnly(role: Role): void {
    this.selectedRole = { ...role };
    this.selectedPermissions = new Set(role.permissions?.map(p => p.id) ?? []);
    this.permissionsModalReadOnly = true;
    this.showPermissionsModal = true;
  }

  closePermissionsModal(): void {
    this.showPermissionsModal = false;
    this.selectedRole = null;
    this.selectedPermissions.clear();
    this.permissionsModalReadOnly = false;
  }

  togglePermission(permissionId: number): void {
    if (this.permissionsModalReadOnly) return;
    if (this.selectedPermissions.has(permissionId)) {
      this.selectedPermissions.delete(permissionId);
    } else {
      this.selectedPermissions.add(permissionId);
    }
  }

  isPermissionSelected(permissionId: number): boolean {
    return this.selectedPermissions.has(permissionId);
  }

  toggleCategory(category: string, selected: boolean): void {
    if (this.permissionsModalReadOnly) return;
    const perms = this.permissionsByCategory[category] ?? [];
    perms.forEach(p => {
      if (selected) { this.selectedPermissions.add(p.id); }
      else { this.selectedPermissions.delete(p.id); }
    });
  }

  isCategoryFullySelected(category: string): boolean {
    const perms = this.permissionsByCategory[category] ?? [];
    return perms.length > 0 && perms.every(p => this.selectedPermissions.has(p.id));
  }

  isCategoryPartiallySelected(category: string): boolean {
    const perms = this.permissionsByCategory[category] ?? [];
    const count = perms.filter(p => this.selectedPermissions.has(p.id)).length;
    return count > 0 && count < perms.length;
  }

  savePermissions(): void {
    if (!this.selectedRole || this.permissionsModalReadOnly) return;
    this.savingPermissions = true;
    this.roleService.updateRolePermissions(
      this.selectedRole.id,
      Array.from(this.selectedPermissions)
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.savingPermissions = false;
        this.closePermissionsModal();
        const idx = this.roles.findIndex(r => r.id === response.role.id);
        if (idx !== -1) { this.roles[idx] = response.role; }
        Swal.fire({
          title: 'Permisos actualizados',
          text: `Los permisos del rol "${response.role.name}" fueron guardados correctamente.`,
          icon: 'success',
          confirmButtonColor: '#800020',
          timer: 3000,
          timerProgressBar: true
        });
      },
      error: (err: any) => {
        this.savingPermissions = false;
        Swal.fire({
          title: 'Error',
          text: err.error?.message ?? 'No se pudieron guardar los permisos.',
          icon: 'error',
          confirmButtonColor: '#800020'
        });
      }
    });
  }

  // ==================== MODAL CREAR ROL ====================

  openCreateRoleModal(): void {
    this.roleFormData = { name: '', description: '' };
    this.selectedPermissions.clear();
    this.showRoleModal = true;
  }

  closeRoleModal(): void {
    this.showRoleModal = false;
    this.roleFormData = { name: '', description: '' };
    this.selectedPermissions.clear();
  }

  private clearActionParam(): void {
    this.router.navigate([], {
      queryParams: { action: null },
      queryParamsHandling: 'merge'
    });
  }

  saveRole(): void {
    let rawName = this.roleFormData.name.trim().toUpperCase();
    if (!rawName) {
      Swal.fire({
        title: 'Campo obligatorio',
        text: 'El nombre del rol es requerido.',
        icon: 'warning',
        confirmButtonColor: '#800020'
      });
      return;
    }

    if (!rawName.startsWith('ROLE_')) {
      rawName = 'ROLE_' + rawName;
    }

    if (this.selectedPermissions.size === 0) {
      Swal.fire({
        title: 'Selecciona al menos un permiso',
        text: 'El rol debe tener al menos un permiso asignado para ser creado.',
        icon: 'warning',
        confirmButtonColor: '#800020'
      });
      return;
    }

    this.savingRole = true;
    this.roleService.createRole({
      name: rawName,
      description: this.roleFormData.description.trim(),
      permissionIds: Array.from(this.selectedPermissions)
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.savingRole = false;
        this.closeRoleModal();
        this.roles.push(response.role);
        Swal.fire({
          title: 'Rol creado',
          text: `El rol "${response.role.name}" fue creado correctamente.`,
          icon: 'success',
          confirmButtonColor: '#800020',
          timer: 3000,
          timerProgressBar: true
        });
      },
      error: (err: any) => {
        this.savingRole = false;
        Swal.fire({
          title: 'Error',
          text: err.error?.message ?? 'No se pudo crear el rol.',
          icon: 'error',
          confirmButtonColor: '#800020'
        });
      }
    });
  }

  // ==================== MODAL USUARIOS POR ROL ====================

  openRoleUsersModal(role: Role): void {
    this.usersModalRole = role;
    this.usersCurrentPage = 0;
    this.usersPage = null;
    this.showUsersModal = true;
    this.loadRoleUsers();
  }

  closeUsersModal(): void {
    this.showUsersModal = false;
    this.usersModalRole = null;
    this.usersPage = null;
    this.usersCurrentPage = 0;
  }

  loadRoleUsers(): void {
    if (!this.usersModalRole) return;
    this.usersModalLoading = true;
    this.roleService.getUsersByRole(
      this.usersModalRole.id,
      this.usersCurrentPage,
      this.usersPageSize
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (page) => { this.usersPage = page; this.usersModalLoading = false; },
      error: (err: any) => {
        this.usersModalLoading = false;
        Swal.fire({
          title: 'Error',
          text: err.error?.message ?? 'No se pudieron cargar los usuarios.',
          icon: 'error',
          confirmButtonColor: '#800020'
        });
      }
    });
  }

  goToUsersPage(page: number): void {
    if (!this.usersPage) return;
    if (page < 0 || page >= this.usersPage.totalPages) return;
    this.usersCurrentPage = page;
    this.loadRoleUsers();
  }

  getUsersPageNumbers(): number[] {
    if (!this.usersPage) return [];
    return Array.from({ length: this.usersPage.totalPages }, (_, i) => i);
  }

  // ==================== ELIMINAR ROL ====================

  deleteRole(role: Role): void {
    this.roleService.getUsersCountForRole(role.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: { roleId: number; userCount: number }) => {
        const userCount = response.userCount;

        if (userCount > 0) {
          Swal.fire({
            title: 'No se puede eliminar',
            html: `El rol <strong>${role.name}</strong> tiene <strong>${userCount}</strong> usuario(s) asignado(s).<br><br>
                   Primero reasigna a estos <strong>${userCount}</strong> usuarios a otro rol antes de eliminar.`,
            icon: 'warning',
            confirmButtonColor: '#800020'
          });
          return;
        }

        Swal.fire({
          title: 'Eliminar Rol',
          html: `
            <p style="color:#555; margin-bottom:.5rem;">
              EstÃ¡ por eliminar el rol <strong>${role.name}</strong>.
            </p>
            <p style="color:#800020; font-size:.875rem;">
              Esta acciÃ³n no se puede deshacer.
            </p>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'SÃ­, eliminar',
          cancelButtonText: 'Cancelar',
          confirmButtonColor: '#800020',
          cancelButtonColor: '#6c757d'
        }).then((result: any) => {
          if (!result.isConfirmed) return;
          this.roleService.deleteRole(role.id).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
              this.roles = this.roles.filter(r => r.id !== role.id);
              Swal.fire({
                title: 'Rol eliminado',
                text: `El rol "${role.name}" fue eliminado correctamente.`,
                icon: 'success',
                confirmButtonColor: '#800020',
                timer: 3000,
                timerProgressBar: true
              });
            },
            error: (err: any) => {
              Swal.fire({
                title: 'No se puede eliminar',
                text: err.error?.message ?? 'No se pudo eliminar el rol.',
                icon: 'error',
                confirmButtonColor: '#800020'
              });
            }
          });
        });
      },
      error: (err: any) => {
        Swal.fire({
          title: 'Error al verificar usuarios',
          text: err.error?.message ?? 'No se pudo verificar el nÃºmero de usuarios asignados al rol.',
          icon: 'error',
          confirmButtonColor: '#800020'
        });
      }
    });
  }

  // ==================== HELPERS ====================

  getCategories(): string[] {
    return Object.keys(this.permissionsByCategory).sort();
  }

  displayName(roleName: string): string {
    return roleName?.replace(/^ROLE_/, '') ?? roleName;
  }

  translateCategory(category: string): string {
    const map: { [k: string]: string } = {
      USER_MANAGEMENT: 'Usuarios',
      PRODUCT_MANAGEMENT: 'Productos',
      ORDER_MANAGEMENT: 'Pedidos',
      CONTENT_MANAGEMENT: 'Contenido',
      ANALYTICS: 'AnalÃ­tica',
      SYSTEM: 'Sistema',
      SECURITY: 'Seguridad'
    };
    return map[category] ?? category;
  }

  getCategoryAbbr(category: string): string {
    const map: { [k: string]: string } = {
      USER_MANAGEMENT: 'US',
      PRODUCT_MANAGEMENT: 'PR',
      ORDER_MANAGEMENT: 'OR',
      CONTENT_MANAGEMENT: 'CN',
      ANALYTICS: 'AN',
      SYSTEM: 'SY',
      SECURITY: 'SE'
    };
    return map[category] ?? category.slice(0, 2);
  }
}
