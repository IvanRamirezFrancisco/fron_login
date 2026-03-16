import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  CustomerUser,
  CustomerFilters,
  CustomerPageResponse
} from '../models/customer.model';
import { PageResponse } from '../models/staff.model';

/** Forma exacta en que el backend devuelve la lista de clientes */
interface BackendCustomerResponse {
  customers: CustomerUser[];
  currentPage: number;
  totalItems: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private apiUrl = `${environment.apiUrl}/admin/customers`;

  constructor(private http: HttpClient) { }

  /**
   * Obtiene todos los clientes con paginación y filtros.
   *
   * - Sin filtros activos → GET /api/admin/customers
   * - Con filtros         → GET /api/admin/customers/search
   *
   * Normaliza la respuesta al formato PageResponse<CustomerUser>.
   */
  getAllCustomers(filters?: CustomerFilters): Observable<PageResponse<CustomerUser>> {
    const hasFilters = !!(
      filters?.search ||
      (filters?.enabled !== undefined && filters.enabled !== null) ||
      (filters?.accountNonLocked !== undefined && filters.accountNonLocked !== null)
    );

    if (hasFilters) {
      // ── Endpoint con filtros ─────────────────────────────────────────────
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
        .get<BackendCustomerResponse>(`${this.apiUrl}/search`, { params })
        .pipe(map(res => this.normalizeResponse(res)));

    } else {
      // ── Endpoint base (sin filtros) ──────────────────────────────────────
      let params = new HttpParams();

      if (filters?.page !== undefined) {
        params = params.set('page', String(filters.page));
      }
      if (filters?.size !== undefined) {
        params = params.set('size', String(filters.size));
      }
      if (filters?.sortBy) {
        params = params.set('sortBy', filters.sortBy);
      }
      if (filters?.sortDir) {
        params = params.set('sortDir', filters.sortDir);
      }

      return this.http
        .get<BackendCustomerResponse>(this.apiUrl, { params })
        .pipe(map(res => this.normalizeResponse(res)));
    }
  }

  /**
   * Normaliza la respuesta del backend al formato interno PageResponse<CustomerUser>.
   */
  private normalizeResponse(res: BackendCustomerResponse): PageResponse<CustomerUser> {
    const rawCustomers: any[] = res.customers ?? [];

    const content: CustomerUser[] = rawCustomers
      .filter(u => u != null)
      .map(u => ({
        id: u.id,
        firstName: u.firstName ?? '',
        lastName: u.lastName ?? '',
        email: u.email ?? '',
        phone: u.phone ?? '',
        totalOrders: u.totalOrders ?? 0,
        totalSpent: u.totalSpent ?? 0,
        enabled: u.enabled ?? false,
        accountNonLocked: u.accountNonLocked ?? true,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin
      } as CustomerUser));

    return {
      content,
      totalElements: res.totalItems ?? 0,
      totalPages: res.totalPages ?? 0,
      size: content.length,
      number: res.currentPage ?? 0,
      first: (res.currentPage ?? 0) === 0,
      last: (res.currentPage ?? 0) === (res.totalPages ?? 1) - 1
    };
  }

  /**
   * Activar / Desactivar cuenta de un cliente (toggle).
   */
  toggleEnabled(customerId: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${customerId}/toggle-enabled`, {});
  }

  /**
   * Bloquear / Desbloquear cuenta de un cliente (toggle).
   */
  toggleLocked(customerId: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${customerId}/toggle-locked`, {});
  }

  /**
   * Resetear intentos fallidos de login y desbloquear la cuenta.
   */
  resetFailedAttempts(customerId: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/${customerId}/reset-failed-attempts`, {});
  }

  /**
   * Envía un correo de recuperación de contraseña al email indicado.
   * Utiliza el endpoint público de forgot-password.
   */
  sendPasswordReset(email: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/auth/forgot-password`, { email });
  }

  /**
   * Exportar lista de clientes a CSV.
   */
  exportToCsv(search?: string): Observable<Blob> {
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get(`${this.apiUrl}/export/csv`, {
      params,
      responseType: 'blob'
    });
  }
}
