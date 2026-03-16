import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  StaffUser,
  CreateStaffRequest,
  UpdateStaffRequest,
  StaffFilters,
  PageResponse
} from '../models/staff.model';

/** Forma exacta en que el backend devuelve la lista de staff */
interface BackendStaffResponse {
  staff: StaffUser[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class StaffService {
  private apiUrl = `${environment.apiUrl}/admin/staff`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene todos los usuarios del staff con paginación y filtros.
   *
   * - Sin filtros de texto/rol/estado → GET /api/admin/staff
   * - Con filtros activos            → GET /api/admin/staff/search
   *
   * En ambos casos normaliza la respuesta al formato PageResponse<StaffUser>
   * que usa el componente (content / totalElements / totalPages).
   */
  getAllStaff(filters?: StaffFilters): Observable<PageResponse<StaffUser>> {
    const hasFilters = !!(
      filters?.search ||
      filters?.roleId !== undefined && filters.roleId !== null ||
      filters?.enabled !== undefined && filters.enabled !== null ||
      filters?.accountNonLocked !== undefined && filters.accountNonLocked !== null
    );

    if (hasFilters) {
      // ── Endpoint con filtros ──────────────────────────────────────────────
      let params = new HttpParams();

      if (filters?.search) {
        params = params.set('searchTerm', filters.search);
      }
      if (filters?.enabled !== undefined && filters.enabled !== null) {
        params = params.set('enabled', String(filters.enabled));
      }
      if (filters?.accountNonLocked !== undefined && filters.accountNonLocked !== null) {
        params = params.set('accountNonLocked', String(filters.accountNonLocked));
      }
      if (filters?.page !== undefined) {
        params = params.set('page', String(filters.page));
      }
      if (filters?.size !== undefined) {
        params = params.set('size', String(filters.size));
      }

      return this.http
        .get<BackendStaffResponse>(`${this.apiUrl}/search`, { params })
        .pipe(map(res => this.normalizeResponse(res)));

    } else {
      // ── Endpoint base (sin filtros) ───────────────────────────────────────
      let params = new HttpParams();

      if (filters?.page !== undefined) {
        params = params.set('page', String(filters.page));
      }
      if (filters?.size !== undefined) {
        params = params.set('size', String(filters.size));
      }
      // El sort viene como "createdAt,desc" → separarlo
      if (filters?.sort) {
        const parts = filters.sort.split(',');
        params = params.set('sortBy', parts[0] || 'createdAt');
        params = params.set('sortDir', parts[1] || 'desc');
      }

      return this.http
        .get<BackendStaffResponse>(this.apiUrl, { params })
        .pipe(map(res => this.normalizeResponse(res)));
    }
  }

  /**
   * Convierte la respuesta del backend { staff, currentPage, totalItems, totalPages }
   * al formato interno PageResponse<StaffUser> { content, totalElements, totalPages, ... }
   *
   * El backend devuelve AdminUserListDTO donde:
   *  - roles es un String concatenado (ej: "ROLE_ADMIN, ROLE_SUPER_ADMIN")
   *  - failedLoginAttempts puede no existir
   * Se normaliza cada usuario para que el template funcione correctamente.
   */
  private normalizeResponse(res: BackendStaffResponse): PageResponse<StaffUser> {
    const rawStaff: any[] = res.staff ?? [];

    const content: StaffUser[] = rawStaff
      .filter(u => u != null)
      .map(u => ({
        id:                 u.id,
        firstName:          u.firstName  ?? '',
        lastName:           u.lastName   ?? '',
        email:              u.email      ?? '',
        enabled:            u.enabled    ?? false,
        accountNonLocked:   u.accountNonLocked ?? true,
        failedLoginAttempts: u.failedLoginAttempts ?? 0,
        createdAt:          u.createdAt,
        lastLogin:          u.lastLogin,
        // El backend devuelve roles como string "ROLE_A, ROLE_B" → convertir a Role[]
        roles: this.parseRoles(u.roles)
      } as StaffUser));

    return {
      content,
      totalElements: res.totalItems     ?? 0,
      totalPages:    res.totalPages     ?? 0,
      size:          content.length,
      number:        res.currentPage    ?? 0,
      first:         (res.currentPage ?? 0) === 0,
      last:          (res.currentPage ?? 0) === (res.totalPages ?? 1) - 1
    };
  }

  /**
   * Convierte el campo roles del backend al formato Role[].
   * El backend puede enviar:
   *  - string: "ROLE_ADMIN, ROLE_MODERATOR"
   *  - array de objetos Role: [{ id, name, ... }]
   *  - null/undefined
   */
  private parseRoles(roles: any): import('../models/staff.model').Role[] {
    if (!roles) return [];

    // Ya es array de objetos Role
    if (Array.isArray(roles)) {
      return roles.map(r =>
        typeof r === 'string'
          ? { id: 0, name: r, description: '', permissions: [] }
          : { id: r.id ?? 0, name: r.name ?? '', description: r.description ?? '', permissions: r.permissions ?? [] }
      );
    }

    // Es string concatenado: "ROLE_ADMIN, ROLE_MODERATOR"
    if (typeof roles === 'string' && roles.trim()) {
      return roles.split(',').map((name, i) => ({
        id: i,
        name: name.trim(),
        description: '',
        permissions: []
      }));
    }

    return [];
  }

  /**
   * Obtiene un usuario por ID
   */
  getStaffById(userId: number): Observable<StaffUser> {
    return this.http.get<StaffUser>(`${this.apiUrl}/${userId}`);
  }

  /**
   * Crea un nuevo usuario del staff
   */
  createStaff(request: CreateStaffRequest): Observable<StaffUser> {
    return this.http.post<StaffUser>(this.apiUrl, request);
  }

  /**
   * Actualiza un usuario del staff
   */
  updateStaff(userId: number, request: UpdateStaffRequest): Observable<StaffUser> {
    return this.http.put<StaffUser>(`${this.apiUrl}/${userId}`, request);
  }

  /**
   * Elimina un usuario del staff
   */
  deleteStaff(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${userId}`);
  }

  /**
   * Activa un usuario (toggle — el backend hace el toggle internamente)
   */
  enableUser(userId: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${userId}/toggle-enabled`, {});
  }

  /**
   * Desactiva un usuario (toggle — el backend hace el toggle internamente)
   */
  disableUser(userId: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${userId}/toggle-enabled`, {});
  }

  /**
   * Bloquea la cuenta de un usuario (toggle)
   */
  lockAccount(userId: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${userId}/toggle-locked`, {});
  }

  /**
   * Desbloquea la cuenta de un usuario (toggle)
   */
  unlockAccount(userId: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${userId}/toggle-locked`, {});
  }

  /**
   * Asigna roles a un usuario
   */
  assignRoles(userId: number, roleIds: number[]): Observable<StaffUser> {
    return this.http.put<StaffUser>(`${this.apiUrl}/${userId}/roles`, { roleIds });
  }

  /**
   * Remueve roles de un usuario
   */
  removeRoles(userId: number, roleIds: number[]): Observable<StaffUser> {
    return this.http.delete<StaffUser>(`${this.apiUrl}/${userId}/roles`, {
      body: { roleIds }
    });
  }

  /**
   * Resetea los intentos de login fallidos
   */
  resetFailedAttempts(userId: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${userId}/reset-failed-attempts`, {});
  }

  /**
   * Exporta la lista de staff a CSV
   */
  exportStaffToCsv(filters?: StaffFilters): Observable<Blob> {
    let params = new HttpParams();
    
    if (filters?.search) {
      params = params.set('search', filters.search);
    }
    if (filters?.roleId !== undefined) {
      params = params.set('roleId', filters.roleId.toString());
    }

    return this.http.get(`${this.apiUrl}/export/csv`, {
      params,
      responseType: 'blob'
    });
  }
}
