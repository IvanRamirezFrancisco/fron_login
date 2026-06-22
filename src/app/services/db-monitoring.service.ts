import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../environments/environment';

// ════════════════════════════════════════════════════════════════════════════
//  INTERFACES — match exacto con Java Records del backend
// ════════════════════════════════════════════════════════════════════════════

/** Métricas de una tabla individual de PostgreSQL */
export interface TableMetric {
  tableName:     string;
  totalBytes:    number;
  indexBytes:    number;
  estimatedRows: number;
}

/** Estado de salud de una tabla (para sección 4) */
export interface TableHealth {
  tableName:       string;
  estimatedRows:   number;
  deadTuples:      number;
  bloatPercent:    number;
  lastAutoVacuum:  string | null;
  status:          'optimal' | 'warning' | 'critical';
}

/** Uso de índices (para sección 5) */
export interface IndexUsage {
  indexName:       string;
  tableName:       string;
  indexScans:      number;
  seqScans:        number;
  efficiencyPct:   number;
  status:          'active' | 'unused' | 'low-efficiency';
}

/** Alerta activa generada por el sistema */
export interface DbAlert {
  id:       string;
  level:    'warning' | 'critical';
  category: string;
  message:  string;
  value:    string;
  hint:     string;
}

/** Métricas de rendimiento en tiempo real */
export interface PerformanceMetrics {
  cacheHitRatio:    number;
  tps:              number;
  avgQueryTimeMs:   number;
}

/** Sesión real de usuario visible en el panel de conexiones */
export interface UserSession {
  usuario:          string;   // Nombre completo
  email:            string;
  ipAddress:        string;   // IP de origen
  userAgent:        string;   // Navegador abreviado
  lastActivity:     string;   // "hace X min"
  secondsInactive:  number;
  sessionCount:     number;   // Número de tokens activos para este usuario
}

/** Información de conexiones con desglose por tipo */
export interface ConnectionInfo {
  total:                  number;
  maxLimit:               number;
  usagePct:               number;
  poolConnections:        number;   // HikariCP (Spring Boot)
  pgInternalConnections:  number;   // Procesos internos PostgreSQL
  activeUserSessions:     number;   // Sesiones con actividad últimos 30 min
  adminTools:             number;   // Herramientas de admin (pgAdmin, DBeaver…)
  sessionsLastHour:       number;   // Sesiones con actividad última hora
  sessionsToday:          number;   // Sesiones con actividad hoy
  userSessions:           UserSession[];  // Lista detallada (máx. 200)
}

/** Respuesta completa del endpoint de monitoreo */
export interface DatabaseMetrics {
  // Panel salud
  healthScore:            number;
  totalDatabaseSizeBytes: number;
  uptimeDays:             number;
  postgresVersion:        string;
  // KPIs originales
  activeConnections:      number;
  cacheHitRatio:          number;
  topTables:              TableMetric[];
  // Nuevas secciones
  performance:            PerformanceMetrics;
  connections:            ConnectionInfo;
  tableHealth:            TableHealth[];
  indexUsage:             IndexUsage[];
  alerts:                 DbAlert[];
  /** Number of indexes with insufficient data to judge (shown in info banner) */
  insufficientDataIndexCount: number;
  /** ISO datetime string of the latest vacuum among all tables, or null */
  lastVacuumAny:          string | null;
}

// ════════════════════════════════════════════════════════════════════════════
//  MOCK DATA — usado mientras el backend no expone los endpoints completos
// ════════════════════════════════════════════════════════════════════════════

const MOCK_METRICS: DatabaseMetrics = {
  healthScore: 87,
  totalDatabaseSizeBytes: 48_234_496,
  uptimeDays: 12,
  postgresVersion: '16.2',
  activeConnections: 3,
  cacheHitRatio: 97.4,
  topTables: [
    { tableName: 'products',     totalBytes: 12_582_912, indexBytes: 4_096_000, estimatedRows: 3200 },
    { tableName: 'orders',       totalBytes:  8_388_608, indexBytes: 2_048_000, estimatedRows: 1850 },
    { tableName: 'users',        totalBytes:  5_242_880, indexBytes: 1_536_000, estimatedRows:  420 },
    { tableName: 'order_items',  totalBytes:  4_194_304, indexBytes: 1_024_000, estimatedRows: 5600 },
    { tableName: 'cart_items',   totalBytes:  2_097_152, indexBytes:   512_000, estimatedRows:  280 },
  ],
  performance: {
    cacheHitRatio:  97.4,
    tps:            24,
    avgQueryTimeMs: 3.2,
  },
  connections: {
    total:                 3,
    maxLimit:            100,
    usagePct:              3,
    poolConnections:       2,
    pgInternalConnections: 1,
    activeUserSessions:    0,
    adminTools:            0,
    sessionsLastHour:      0,
    sessionsToday:         0,
    userSessions:          [],
  },
  tableHealth: [
    { tableName: 'products',       estimatedRows: 3200, deadTuples:   8, bloatPercent: 1.2, lastAutoVacuum: '2026-03-17 04:12', status: 'optimal'  },
    { tableName: 'orders',         estimatedRows: 1850, deadTuples: 145, bloatPercent: 6.8, lastAutoVacuum: '2026-03-15 22:00', status: 'warning'  },
    { tableName: 'users',          estimatedRows:  420, deadTuples:   2, bloatPercent: 0.4, lastAutoVacuum: '2026-03-17 04:10', status: 'optimal'  },
    { tableName: 'order_items',    estimatedRows: 5600, deadTuples: 612, bloatPercent:11.3, lastAutoVacuum: '2026-03-12 03:00', status: 'critical' },
    { tableName: 'sessions',       estimatedRows:  115, deadTuples:  38, bloatPercent: 3.1, lastAutoVacuum: '2026-03-16 18:45', status: 'warning'  },
    { tableName: 'cart_items',     estimatedRows:  280, deadTuples:   1, bloatPercent: 0.2, lastAutoVacuum: '2026-03-17 04:11', status: 'optimal'  },
    { tableName: 'categories',     estimatedRows:   42, deadTuples:   0, bloatPercent: 0.0, lastAutoVacuum: '2026-03-17 04:09', status: 'optimal'  },
  ],
  indexUsage: [
    { indexName: 'idx_products_name',      tableName: 'products',    indexScans: 4820, seqScans:  12, efficiencyPct: 99.8, status: 'active'          },
    { indexName: 'idx_orders_user_id',     tableName: 'orders',      indexScans: 3100, seqScans:  45, efficiencyPct: 98.6, status: 'active'          },
    { indexName: 'idx_users_email',        tableName: 'users',       indexScans: 2950, seqScans:   8, efficiencyPct: 99.7, status: 'active'          },
    { indexName: 'idx_sessions_token',     tableName: 'sessions',    indexScans:  890, seqScans: 210, efficiencyPct: 80.9, status: 'low-efficiency'  },
    { indexName: 'idx_cart_user',          tableName: 'cart_items',  indexScans:  740, seqScans:  18, efficiencyPct: 97.6, status: 'active'          },
    { indexName: 'idx_products_category',  tableName: 'products',    indexScans:   12, seqScans:  88, efficiencyPct: 12.0, status: 'low-efficiency'  },
    { indexName: 'idx_old_promotions',     tableName: 'products',    indexScans:    0, seqScans:   0, efficiencyPct:  0.0, status: 'unused'          },
  ],
  alerts: [
    {
      id: 'a1', level: 'warning', category: 'Tablas',
      message: 'La tabla "order_items" tiene 612 registros obsoletos',
      value: '612 registros', hint: 'Ve al módulo de Mantenimiento y ejecuta VACUUM ANALYZE en "order_items".',
    },
    {
      id: 'a2', level: 'warning', category: 'Tablas',
      message: 'La tabla "orders" tiene espacio desperdiciado del 6.8%',
      value: '6.8% bloat', hint: 'Ejecuta VACUUM ANALYZE para recuperar el espacio.',
    },
    {
      id: 'a3', level: 'warning', category: 'Índices',
      message: 'El índice "idx_sessions_token" tiene eficiencia baja (80.9%)',
      value: '80.9%', hint: 'Ejecuta REINDEX TABLE sessions para reconstruir los índices.',
    },
    {
      id: 'a4', level: 'critical', category: 'Índices',
      message: 'El índice "idx_old_promotions" no se ha utilizado nunca',
      value: '0 búsquedas', hint: 'Considera eliminar este índice para liberar espacio.',
    },
  ],
  insufficientDataIndexCount: 1,
  lastVacuumAny: '2026-03-17 04:12',
};

// ════════════════════════════════════════════════════════════════════════════
//  SERVICIO
// ════════════════════════════════════════════════════════════════════════════

@Injectable({ providedIn: 'root' })
export class DbMonitoringService {

  private readonly baseUrl = `${environment.apiUrl}/admin/database`;

  /** Activar para usar datos reales del backend */
  private readonly useMock = false;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene las métricas actuales de la base de datos PostgreSQL.
   * Endpoint: GET /api/admin/database/metrics
   * Mientras useMock=true devuelve MOCK_METRICS sin hacer llamada HTTP.
   */
  getMetrics(): Observable<DatabaseMetrics> {
    if (this.useMock) {
      return of(MOCK_METRICS);
    }
    return this.http.get<DatabaseMetrics>(`${this.baseUrl}/metrics`);
  }
}
