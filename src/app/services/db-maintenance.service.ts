import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ── Interfaces (match con TableMaintenanceDto Java Record) ────────────────────

export interface TableMaintenance {
  tableName:      string;
  deadTuples:     number;
  liveTuples:     number;
  lastAutovacuum: string;
  lastVacuum:     string;
  bloatPercent:   number;
  status:         'ok' | 'warning' | 'critical';
}

export interface MaintenanceOperationResult {
  success:     boolean;
  operation:   string;
  message:     string;
  executedAt:  string;
}

export interface AutovacuumSetting {
  name:    string;
  setting: string;
  unit:    string | null;
}

/**
 * Índice con baja eficiencia que necesita REINDEX.
 * Campos en snake_case porque provienen de un Map<String,Object> en Java
 * (Spring no aplica conversión camelCase a mapas genéricos).
 */
export interface MaintenanceIndex {
  index_name:     string;
  table_name:     string;
  idx_scan:       number;
  seq_scan:       number;
  efficiency_pct: number;
  n_live_tup:     number;
}

/** Registro del historial de operaciones de mantenimiento */
export interface MaintenanceLogEntry {
  id:                 number;
  operation:          string;        // VACUUM_ANALYZE | REINDEX | ANALYZE
  targetName:         string;
  targetType:         string;        // TABLE | INDEX | DATABASE
  executedBy:         string;
  executedAt:         string;        // ISO datetime
  executedAtRelative: string;        // "hace 5 minutos"
  rowsBefore:         number | null;
  rowsAfter:          number | null;
  rowsAffected:       number | null;
  durationMs:         number;
  status:             'SUCCESS' | 'ERROR' | 'IN_PROGRESS';
  errorMessage:       string | null;
}

/** Configuración del programador de mantenimiento automático */
export interface MaintenanceAutomationConfig {
  enabled:                     boolean;
  frequencyHours:              number;
  preferredHour:               number;
  vacuumThresholdDeadTuples:   number;
  vacuumThresholdBloatPct:     number;
  lastAutoExecution:           string | null;  // ISO datetime
  nextScheduledExecution:      string | null;  // ISO datetime
  nextExecutionFormatted:      string;         // "en 3h 42min"
  lastExecutionFormatted:      string;         // "hace 2 horas"
}

// ── Servicio ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class DbMaintenanceService {

  private readonly baseUrl = `${environment.apiUrl}/admin/database/maintenance`;

  constructor(private http: HttpClient) {}

  /** Obtiene estadísticas de dead tuples, bloat y último autovacuum por tabla */
  getStats(): Observable<TableMaintenance[]> {
    return this.http.get<TableMaintenance[]>(`${this.baseUrl}/stats`);
  }

  /** Ejecuta VACUUM ANALYZE sobre una tabla específica */
  runVacuum(tableName: string): Observable<MaintenanceOperationResult> {
    return this.http.post<MaintenanceOperationResult>(`${this.baseUrl}/vacuum/${tableName}`, {});
  }

  /** Ejecuta solo ANALYZE sobre una tabla específica (con log en historial) */
  runAnalyze(tableName: string): Observable<MaintenanceOperationResult> {
    return this.http.post<MaintenanceOperationResult>(`${this.baseUrl}/analyze/${tableName}`, {});
  }

  /** Ejecuta ANALYZE global en todas las tablas */
  runAnalyzeAll(): Observable<MaintenanceOperationResult> {
    return this.http.post<MaintenanceOperationResult>(`${this.baseUrl}/analyze-all`, {});
  }

  /** Ejecuta REINDEX TABLE sobre una tabla específica */
  runReindex(tableName: string): Observable<MaintenanceOperationResult> {
    return this.http.post<MaintenanceOperationResult>(`${this.baseUrl}/reindex/${tableName}`, {});
  }

  /** Obtiene los parámetros de autovacuum configurados en PostgreSQL */
  getAutovacuumSettings(): Observable<AutovacuumSetting[]> {
    return this.http.get<AutovacuumSetting[]>(`${this.baseUrl}/autovacuum-settings`);
  }

  /**
   * Obtiene los índices que necesitan reconstrucción (filtro estricto backend).
   */
  getProblematicIndexes(): Observable<MaintenanceIndex[]> {
    return this.http.get<MaintenanceIndex[]>(`${this.baseUrl}/problematic-indexes`);
  }

  /** Obtiene los últimos 20 registros del historial de operaciones. */
  getHistory(): Observable<MaintenanceLogEntry[]> {
    return this.http.get<MaintenanceLogEntry[]>(`${this.baseUrl}/history`);
  }

  // ── Automatización ─────────────────────────────────────────────────────────

  /** Obtiene la configuración actual del programador automático */
  getAutomationConfig(): Observable<MaintenanceAutomationConfig> {
    return this.http.get<MaintenanceAutomationConfig>(`${this.baseUrl}/automation`);
  }

  /** Actualiza la configuración del programador automático */
  updateAutomationConfig(config: MaintenanceAutomationConfig): Observable<MaintenanceAutomationConfig> {
    return this.http.put<MaintenanceAutomationConfig>(`${this.baseUrl}/automation`, config);
  }

  /** Ejecuta el ciclo de mantenimiento automático de forma inmediata */
  runAutomationNow(): Observable<{ success: boolean; message: string; executedAt: string }> {
    return this.http.post<{ success: boolean; message: string; executedAt: string }>(
      `${this.baseUrl}/automation/run-now`, {}
    );
  }
}
