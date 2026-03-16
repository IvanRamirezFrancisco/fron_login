/**
 * Interfaces para el módulo de Gestión de Clientes (Admin)
 */

export interface CustomerUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  totalOrders: number;
  totalSpent: number;
  enabled: boolean;
  accountNonLocked: boolean;
  createdAt?: string;
  lastLogin?: string;
}

export interface CustomerFilters {
  search?: string;
  enabled?: boolean;
  accountNonLocked?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: string;
}

export interface CustomerPageResponse {
  customers: CustomerUser[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
}
