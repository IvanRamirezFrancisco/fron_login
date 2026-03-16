import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ── Interfaces (match exacto con los Java Records del backend) ────────────────

/** Métricas de una tabla individual de PostgreSQL */
export interface TableMetric {
  tableName:     string;
  totalBytes:    number;
  indexBytes:    number;
  estimatedRows: number;
}

/** Métricas generales de la base de datos — respuesta del endpoint */
export interface DatabaseMetrics {
  totalDatabaseSizeBytes: number;
  activeConnections:      number;
  cacheHitRatio:          number;
  topTables:              TableMetric[];
}

// ── Servicio ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class DbMonitoringService {

  private readonly baseUrl = `${environment.apiUrl}/admin/database`;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene las métricas actuales de la base de datos PostgreSQL.
   * Endpoint: GET /api/admin/database/metrics
   */
  getMetrics(): Observable<DatabaseMetrics> {
    return this.http.get<DatabaseMetrics>(`${this.baseUrl}/metrics`);
  }
}
