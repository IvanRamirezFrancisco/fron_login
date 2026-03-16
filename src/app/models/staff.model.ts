/**
 * Interfaces para gestión de Staff/Usuarios del sistema
 */

export interface Permission {
  id: number;
  name: string;
  description: string;
  category: string;
  resource: string;
  action: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: Permission[];
  userCount?: number;
  /** true si es un rol base del sistema (no eliminable ni modificable) */
  immutable?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  enabled: boolean;
  accountNonLocked: boolean;
  roles: Role[];
  createdAt?: string;
  lastLogin?: string;
  failedLoginAttempts?: number;
}

export interface CreateStaffRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleIds: number[];
}

export interface UpdateStaffRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  roleIds?: number[];
}

export interface CreateRoleRequest {
  name: string;
  description: string;
  permissionIds: number[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissionIds?: number[];
}

export interface StaffFilters {
  search?: string;
  roleId?: number;
  enabled?: boolean;
  accountNonLocked?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface PermissionsByCategory {
  [category: string]: Permission[];
}

/** Usuario simplificado devuelto por GET /api/admin/roles/{id}/users */
export interface RoleUserDTO {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  enabled: boolean;
  accountNonLocked: boolean;
  roles: string;        // nombres concatenados ("ROLE_ADMIN, ROLE_STAFF")
  createdAt?: string;
}

/** Fila del modal de auditoría "Usuarios por Rol" */
export interface RoleUserDTO {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  enabled: boolean;
  accountNonLocked: boolean;
  roles: string;          // roles concatenados: "ROLE_ADMIN, ROLE_STAFF"
  createdAt?: string;
}
