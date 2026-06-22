import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ════════════════════════════════════════════════════════════════════════════
//  INTERFACES — match exacto con Java Records del backend
// ════════════════════════════════════════════════════════════════════════════

/** Query activa detectada en pg_stat_activity */
export interface ActiveQuery {
  pid:              number;
  username:         string;
  applicationName:  string;
  clientIp:         string;
  state:            string;
  waitEventType:    string | null;
  waitEvent:        string | null;
  durationSeconds:  number;
  queryPreview:     string;
  queryStart:       string | null;
  classification:   'NORMAL' | 'WATCH' | 'SLOW' | 'BLOCKED' | 'IDLE_TX';
}

/** Query costosa del historial (pg_stat_statements) */
export interface ExpensiveQuery {
  avgMs:          number;
  maxMs:          number;
  totalMs:        number;
  calls:          number;
  rows:           number;
  cacheHitPct:    number;
  queryPreview:   string;
}

/** Respuesta del endpoint de queries costosas */
export interface TopExpensiveResponse {
  available: boolean;
  message:   string | null;
  data:      ExpensiveQuery[];
}

/** Bloqueo activo entre sesiones */
export interface ActiveLock {
  blockedPid:           number;
  blockedUser:          string;
  blockedApp:           string;
  blockingPid:          number;
  blockingUser:         string;
  waitSeconds:          number;
  blockedQueryPreview:  string;
  blockingQueryPreview: string;
}

/** Estadísticas de acceso de una tabla */
export interface TableStats {
  tableName:     string;
  seqScan:       number;
  seqTupRead:    number;
  idxScan:       number;
  idxTupFetch:   number;
  totalWrites:   number;
  idxUsagePct:   number;
  liveRows:      number;
  deadRows:      number;
}

/** Parámetro de configuración de PostgreSQL */
export interface PgSetting {
  name:      string;
  setting:   string;
  unit:      string | null;
  shortDesc: string;
}

// ════════════════════════════════════════════════════════════════════════════
//  SERVICIO
// ════════════════════════════════════════════════════════════════════════════

@Injectable({ providedIn: 'root' })
export class SlowQueriesService {

  private readonly baseUrl = `${environment.apiUrl}/admin/slow-queries`;

  constructor(private http: HttpClient) {}

  /** Queries activas en tiempo real (pg_stat_activity) */
  getActiveQueries(): Observable<ActiveQuery[]> {
    return this.http.get<ActiveQuery[]>(`${this.baseUrl}/active`);
  }

  /** Top 10 queries más costosas (pg_stat_statements) */
  getTopExpensive(): Observable<TopExpensiveResponse> {
    return this.http.get<TopExpensiveResponse>(`${this.baseUrl}/top-expensive`);
  }

  /** Bloqueos activos entre sesiones */
  getActiveLocks(): Observable<ActiveLock[]> {
    return this.http.get<ActiveLock[]>(`${this.baseUrl}/locks`);
  }

  /** Estadísticas de tablas con más carga */
  getTableStats(): Observable<TableStats[]> {
    return this.http.get<TableStats[]>(`${this.baseUrl}/table-stats`);
  }

  /** Configuración relevante de PostgreSQL (solo lectura) */
  getPgConfig(): Observable<PgSetting[]> {
    return this.http.get<PgSetting[]>(`${this.baseUrl}/config`);
  }
}
