import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ── Interfaces (match con TableMaintenanceDto Java Record) ────────────────────

export interface TableMaintenance {
  tableName:      string;
  deadTuples:     number;
  liveTuples:     number;
  lastAutovacuum: string;   // ejecutado por el daemon automático de PostgreSQL
  lastVacuum:     string;   // ejecutado manualmente por el DBA
}

export interface MaintenanceOperationResult {
  success:     boolean;
  operation:   string;
  message:     string;
  executedAt:  string;
}

// ── Servicio ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class DbMaintenanceService {

  private readonly baseUrl = `${environment.apiUrl}/admin/database/maintenance`;

  constructor(private http: HttpClient) {}

  /** Obtiene estadísticas de dead tuples y último autovacuum por tabla */
  getStats(): Observable<TableMaintenance[]> {
    return this.http.get<TableMaintenance[]>(`${this.baseUrl}/stats`);
  }

  /** Ejecuta VACUUM ANALYZE sobre una tabla específica */
  runVacuum(tableName: string): Observable<MaintenanceOperationResult> {
    return this.http.post<MaintenanceOperationResult>(`${this.baseUrl}/vacuum/${tableName}`, {});
  }

  /** Ejecuta REINDEX TABLE sobre una tabla específica */
  runReindex(tableName: string): Observable<MaintenanceOperationResult> {
    return this.http.post<MaintenanceOperationResult>(`${this.baseUrl}/reindex/${tableName}`, {});
  }
}
