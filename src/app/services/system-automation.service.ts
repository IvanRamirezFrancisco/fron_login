import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ── Modelo ──────────────────────────────────────────────────────────────────

export interface SystemAutomation {
  id: number;
  jobName: string;
  jobGroup: string;
  displayName: string;
  description: string;
  iconName: string;
  enabled: boolean;
  cronExpression: string;
  timezone: string;
  parameters: Record<string, any>;
  lastExecution: string | null;
  nextExecution: string | null;
  lastDurationMs: number | null;
  lastStatus: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS' | 'PENDING' | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAutomationRequest {
  cronExpression: string;
  timezone: string;
  parameters: Record<string, any> | null;
}

export interface RunNowResponse {
  message: string;
  jobName: string;
  status: string;
}

export interface DbTableInfo {
  name: string;
  rowEstimate: number;
}

export interface ExecutionLog {
  id: number;
  automationId: number;
  startedAt: string;
  finishedAt: string | null;
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  triggeredBy: string;
  durationMs: number | null;
  resultSummary: string | null;
  errorMessage: string | null;
}

/** Empleado activo del sistema — destinatario válido de notificaciones. */
export interface StaffRecipient {
  id: number;
  fullName: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

// ── Servicio ────────────────────────────────────────────────────────────────

/**
 * Servicio Angular para gestionar las automatizaciones del sistema.
 *
 * Consume los endpoints de AdminAutomationController:
 * - GET    /api/admin/automations
 * - PATCH  /api/admin/automations/{id}/status
 * - PUT    /api/admin/automations/{id}
 * - POST   /api/admin/automations/{id}/run
 *
 * El interceptor JWT inyecta automáticamente Authorization: Bearer <token>.
 */
@Injectable({
  providedIn: 'root'
})
export class SystemAutomationService {

  private readonly API = `${environment.apiUrl}/admin/automations`;

  constructor(private http: HttpClient) {}

  /** Lista todas las automatizaciones. */
  getAll(): Observable<SystemAutomation[]> {
    return this.http.get<SystemAutomation[]>(this.API);
  }

  /** Activa o desactiva una automatización. */
  toggle(id: number, enabled: boolean): Observable<SystemAutomation> {
    return this.http.patch<SystemAutomation>(
      `${this.API}/${id}/status`,
      { enabled }
    );
  }

  /** Actualiza cron, timezone y parámetros. */
  update(id: number, payload: UpdateAutomationRequest): Observable<SystemAutomation> {
    return this.http.put<SystemAutomation>(`${this.API}/${id}`, payload);
  }

  /** Ejecuta un job manualmente (fuera de horario). */
  runNow(id: number): Observable<RunNowResponse> {
    return this.http.post<RunNowResponse>(`${this.API}/${id}/run`, {});
  }

  /** Obtiene la lista de tablas de la BD con estimado de filas. */
  getDatabaseTables(): Observable<DbTableInfo[]> {
    return this.http.get<DbTableInfo[]>(`${this.API}/tables`);
  }

  /** Obtiene el historial paginado de ejecuciones de una automatización. */
  getExecutionLogs(id: number, page = 0, size = 10): Observable<PageResponse<ExecutionLog>> {
    return this.http.get<PageResponse<ExecutionLog>>(
      `${this.API}/${id}/executions`,
      { params: { page: page.toString(), size: size.toString() } }
    );
  }

  /** Obtiene la lista de empleados activos para el selector de destinatarios. */
  getStaffRecipients(): Observable<StaffRecipient[]> {
    return this.http.get<StaffRecipient[]>(`${this.API}/staff-recipients`);
  }
}
