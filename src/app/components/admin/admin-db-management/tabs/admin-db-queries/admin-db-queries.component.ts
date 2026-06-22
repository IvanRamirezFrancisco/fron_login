import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Subject, Subscription, interval, switchMap, takeUntil, finalize } from 'rxjs';
import {
  SlowQueriesService,
  ActiveQuery,
  ExpensiveQuery,
  TopExpensiveResponse,
  ActiveLock,
  TableStats,
  PgSetting,
} from '../../../../../services/slow-queries.service';
import { HeavySeqScanPipe } from '../../../../../pipes/heavy-seq-scan.pipe';

type SlqTab = 'realtime' | 'history' | 'tables';

interface TabDef {
  value: SlqTab;
  label: string;
  icon:  string;
}

interface QueryInsight {
  severity: 'critical' | 'warning' | 'info' | 'ok';
  issues:   string[];
  actions:  string[];
  message?: string;
}

interface SettingStatus {
  status:  'ok' | 'warning' | 'info';
  message: string;
}

@Component({
  selector: 'app-admin-db-queries',
  standalone: true,
  imports: [CommonModule, DecimalPipe, HeavySeqScanPipe],
  templateUrl: './admin-db-queries.component.html',
  styleUrls: ['../shared-tab.css', './admin-db-queries.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDbQueriesComponent implements OnInit, OnDestroy {

  // ── Sub-tabs internos ──────────────────────────────────────────────────
  activeSlqTab: SlqTab = 'realtime';
  readonly slqTabs: TabDef[] = [
    { value: 'realtime', label: 'En tiempo real', icon: 'sensors'          },
    { value: 'history',  label: 'Historial',      icon: 'query_stats'     },
    { value: 'tables',   label: 'Tablas con carga', icon: 'table_chart'   },
  ];

  // ── Tab A: Tiempo real ─────────────────────────────────────────────────
  activeQueries: ActiveQuery[] = [];
  activeLocks: ActiveLock[] = [];
  lastUpdated: Date | null = null;
  loadingRealtime = false;
  realtimeError: string | null = null;
  private pollingSubscription: Subscription | null = null;
  private readonly POLL_INTERVAL_MS = 10_000;

  // ── Tab B: Historial ───────────────────────────────────────────────────
  topQueries: TopExpensiveResponse = { available: false, message: null, data: [] };
  loadingHistory = false;
  historyLoaded = false;

  // ── Modal de detalle de query ──────────────────────────────────────────
  selectedQuery: ExpensiveQuery | null = null;
  copyFeedback = false;
  private copyFeedbackTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Tab C: Tablas con carga ────────────────────────────────────────────
  tableStats: TableStats[] = [];
  loadingTables = false;
  tablesLoaded = false;

  // ── Modal de sugerencia de tabla (Tab C) ───────────────────────────────
  selectedTableSuggestion: TableStats | null = null;

  // ── Config ─────────────────────────────────────────────────────────────
  pgConfig: PgSetting[] = [];
  loadingConfig = false;
  showConfig = false;

  // ── Lifecycle ──────────────────────────────────────────────────────────
  private destroy$ = new Subject<void>();

  @ViewChild('locksSection') locksSectionRef!: ElementRef;

  constructor(
    private service: SlowQueriesService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.startPolling();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopPolling();
    if (this.copyFeedbackTimer) clearTimeout(this.copyFeedbackTimer);
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  TAB NAVIGATION
  // ═════════════════════════════════════════════════════════════════════════

  changeSlqTab(tab: SlqTab): void {
    this.activeSlqTab = tab;

    if (tab === 'realtime') {
      this.startPolling();
    } else {
      this.stopPolling();
    }

    if (tab === 'history' && !this.historyLoaded) {
      this.loadHistory();
    }

    if (tab === 'tables' && !this.tablesLoaded) {
      this.loadTableStats();
    }

    this.cdr.markForCheck();
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  TAB A — TIEMPO REAL (polling cada 10s)
  // ═════════════════════════════════════════════════════════════════════════

  private startPolling(): void {
    if (this.pollingSubscription) return;

    // Carga inmediata
    this.fetchRealtime();

    this.pollingSubscription = interval(this.POLL_INTERVAL_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.fetchRealtime());
  }

  private stopPolling(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
      this.pollingSubscription = null;
    }
  }

  private fetchRealtime(): void {
    this.loadingRealtime = true;
    this.realtimeError = null;
    this.cdr.markForCheck();

    // Fetch queries and locks in parallel
    this.service.getActiveQueries().subscribe({
      next: queries => {
        this.activeQueries = queries;
        this.lastUpdated = new Date();
        this.loadingRealtime = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.realtimeError = 'Error al obtener queries activas';
        this.loadingRealtime = false;
        this.cdr.markForCheck();
      },
    });

    this.service.getActiveLocks().subscribe({
      next: locks => {
        this.activeLocks = locks;
        this.cdr.markForCheck();
      },
      error: () => {
        // No bloquear la UI si falla locks
        this.activeLocks = [];
        this.cdr.markForCheck();
      },
    });
  }

  refreshRealtime(): void {
    this.fetchRealtime();
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  TAB B — HISTORIAL
  // ═════════════════════════════════════════════════════════════════════════

  loadHistory(): void {
    this.loadingHistory = true;
    this.cdr.markForCheck();

    this.service.getTopExpensive()
      .pipe(finalize(() => {
        this.loadingHistory = false;
        this.historyLoaded = true;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: res => {
          this.topQueries = res;
        },
        error: () => {
          this.topQueries = { available: false, message: 'Error al cargar datos del historial.', data: [] };
        },
      });
  }

  refreshHistory(): void {
    this.historyLoaded = false;
    this.loadHistory();
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  TAB C — TABLAS CON CARGA
  // ═════════════════════════════════════════════════════════════════════════

  loadTableStats(): void {
    this.loadingTables = true;
    this.cdr.markForCheck();

    this.service.getTableStats()
      .pipe(finalize(() => {
        this.loadingTables = false;
        this.tablesLoaded = true;
        this.cdr.markForCheck();
      }))
      .subscribe({
        next: stats => {
          this.tableStats = stats;
        },
        error: () => {
          this.tableStats = [];
        },
      });
  }

  refreshTableStats(): void {
    this.tablesLoaded = false;
    this.loadTableStats();
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  CONFIG PANEL
  // ═════════════════════════════════════════════════════════════════════════

  toggleConfig(): void {
    this.showConfig = !this.showConfig;
    if (this.showConfig && this.pgConfig.length === 0) {
      this.loadingConfig = true;
      this.cdr.markForCheck();
      this.service.getPgConfig()
        .pipe(finalize(() => {
          this.loadingConfig = false;
          this.cdr.markForCheck();
        }))
        .subscribe({
          next: config => { this.pgConfig = config; },
          error: () => { this.pgConfig = []; },
        });
    }
    this.cdr.markForCheck();
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  MODAL — DETALLE DE QUERY COSTOSA
  // ═════════════════════════════════════════════════════════════════════════

  openQueryDetails(query: ExpensiveQuery): void {
    this.selectedQuery = query;
    this.copyFeedback = false;
    this.cdr.markForCheck();
  }

  closeQueryDetails(): void {
    this.selectedQuery = null;
    this.cdr.markForCheck();
  }

  copyToClipboard(text: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      if (this.copyFeedbackTimer) clearTimeout(this.copyFeedbackTimer);
      this.copyFeedback = true;
      this.cdr.markForCheck();
      this.copyFeedbackTimer = setTimeout(() => {
        this.copyFeedback = false;
        this.cdr.markForCheck();
      }, 2000);
    }).catch(() => {
      // Fallback para navegadores sin Clipboard API
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      this.copyFeedback = true;
      this.cdr.markForCheck();
      this.copyFeedbackTimer = setTimeout(() => {
        this.copyFeedback = false;
        this.cdr.markForCheck();
      }, 2000);
    });
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  UTILIDADES DE PRESENTACIÓN
  // ═════════════════════════════════════════════════════════════════════════

  /** Formato de duración legible: "5s", "1m 30s", "2h 15m" */
  formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
  }

  /** Tiempo relativo desde la última actualización */
  getTimeAgo(): string {
    if (!this.lastUpdated) return '';
    const seconds = Math.floor((Date.now() - this.lastUpdated.getTime()) / 1000);
    if (seconds < 5) return 'ahora';
    if (seconds < 60) return `hace ${seconds}s`;
    return `hace ${Math.floor(seconds / 60)}m`;
  }

  /** Etiqueta del badge de clasificación */
  getBadgeLabel(classification: string): string {
    switch (classification) {
      case 'BLOCKED': return 'Bloqueada';
      case 'IDLE_TX': return 'TX Inactiva';
      case 'SLOW':    return 'Lenta';
      case 'WATCH':   return 'Vigilar';
      case 'NORMAL':  return 'Normal';
      default:        return classification;
    }
  }

  /** Porcentaje de impacto normalizado al máximo totalMs */
  getImpactPct(totalMs: number): number {
    if (!this.topQueries.data || this.topQueries.data.length === 0) return 0;
    const max = Math.max(...this.topQueries.data.map(q => q.totalMs));
    return max > 0 ? Math.round((totalMs / max) * 100) : 0;
  }

  /** Nombre legible de un parámetro de configuración */
  getConfigLabel(name: string): string {
    const labels: Record<string, string> = {
      'log_min_duration_statement': 'Umbral de log de queries lentas',
      'log_statement': 'Nivel de log de sentencias',
      'track_activity_query_size': 'Tamaño máximo de query en pg_stat_activity',
      'pg_stat_statements.max': 'Máx. queries rastreadas por pg_stat_statements',
      'pg_stat_statements.track': 'Nivel de rastreo de pg_stat_statements',
    };
    return labels[name] || name;
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  INSIGHT CONTEXTUAL INTELIGENTE (Modal de query)
  // ═════════════════════════════════════════════════════════════════════════

  /** Analiza una query y produce un diagnóstico multi-issue */
  getQueryInsight(q: ExpensiveQuery): QueryInsight {

    // Regla 0: Detectar queries de catálogo del sistema
    // Estas queries tienen cache hit = 0% por diseño, no es un problema real
    const lc = q.queryPreview.toLowerCase();
    const isCatalogQuery =
      lc.includes('pg_catalog') ||
      lc.includes('pg_get_keywords') ||
      lc.includes('information_schema') ||
      lc.includes('pg_namespace') ||
      (lc.includes('pg_class') && lc.includes('pg_attribute'));

    if (isCatalogQuery) {
      return {
        severity: 'info',
        issues: [],
        actions: [],
        message: 'Esta es una query interna del driver JDBC o de una ' +
                 'herramienta de administración (pgAdmin/DBeaver). ' +
                 'El cache hit de 0% es esperado para funciones del ' +
                 'catálogo del sistema — no requiere acción.',
      };
    }

    const issues: string[] = [];
    const actions: string[] = [];
    let severity: 'critical' | 'warning' | 'ok' = 'ok';

    // Caso 1: Query lenta con muchas ejecuciones → alto impacto acumulado
    if (q.avgMs > 500 && q.calls > 50) {
      severity = 'critical';
      issues.push(
        `Esta query tarda ${q.avgMs.toFixed(0)} ms en promedio y se ejecuta ${q.calls.toLocaleString()} veces. Impacto total acumulado: ${(q.totalMs / 1000).toFixed(1)}s de CPU de base de datos.`
      );
      actions.push('Revisar si la columna del filtro WHERE tiene índice.');
      actions.push('Ejecutar EXPLAIN (ANALYZE, BUFFERS) para ver el plan de ejecución.');
    }

    // Caso 2: Cache hit bajo → leyendo mucho del disco
    if (q.cacheHitPct !== null && q.cacheHitPct < 90) {
      severity = severity === 'critical' ? 'critical' : 'warning';
      issues.push(
        `Cache hit de ${q.cacheHitPct.toFixed(1)}% — PostgreSQL lee ${(100 - q.cacheHitPct).toFixed(1)}% de datos desde disco físico en lugar de memoria RAM.`
      );
      actions.push('Ejecutar VACUUM ANALYZE en las tablas involucradas.');
      actions.push('Considerar aumentar shared_buffers si ocurre en múltiples queries.');
    }

    // Caso 3: Máximo muy superior al promedio → picos esporádicos
    if (q.maxMs > q.avgMs * 5 && q.avgMs > 0) {
      severity = severity === 'ok' ? 'warning' : severity;
      issues.push(
        `El tiempo máximo (${q.maxMs.toFixed(0)} ms) es ${Math.round(q.maxMs / q.avgMs)}x mayor que el promedio. Indica bloqueos o picos de carga esporádicos.`
      );
      actions.push('Revisar la sección "En tiempo real" durante horas de mayor tráfico.');
    }

    // Caso 4: Query rápida con muchísimas ejecuciones → patrón N+1
    if (q.avgMs < 10 && q.calls > 500) {
      severity = severity === 'ok' ? 'warning' : severity;
      issues.push(
        `La query es rápida individualmente pero se ejecuta ${q.calls.toLocaleString()} veces. Patrón típico de problema N+1 — una operación que debería ser 1 query se hace en bucle.`
      );
      actions.push('Revisar si esta query se puede reemplazar con un JOIN en la consulta padre.');
    }

    // Caso 5: Sin problemas detectados
    if (issues.length === 0) {
      return {
        severity: 'ok',
        issues: [],
        actions: ['Continúa monitoreando si aumenta el volumen de ejecuciones.'],
        message: 'Esta query tiene un perfil de rendimiento saludable.',
      };
    }

    return { severity, issues, actions };
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  SUGERENCIA DE ÍNDICE (Tab C — Tablas con carga)
  // ═════════════════════════════════════════════════════════════════════════

  /** Tablas con uso de índice extremadamente bajo — candidatas a crear índice */
  getLowIndexTables(): TableStats[] {
    return this.tableStats.filter(t => t.idxUsagePct < 40 && t.seqScan > 100);
  }

  /** Abre el modal de sugerencia para una tabla específica */
  openTableSuggestion(table: TableStats): void {
    this.selectedTableSuggestion = table;
    this.cdr.markForCheck();
  }

  /** Cierra el modal de sugerencia de tabla */
  closeTableSuggestion(): void {
    this.selectedTableSuggestion = null;
    this.cdr.markForCheck();
  }

  // ═════════════════════════════════════════════════════════════════════════
  //  ESTADO DE CONFIGURACIÓN PG (indicadores de salud)
  // ═════════════════════════════════════════════════════════════════════════

  /** Evalúa un parámetro PG y devuelve su estado + mensaje en español */
  getSettingStatus(setting: PgSetting): SettingStatus {
    switch (setting.name) {
      case 'log_min_duration_statement': {
        const val = parseInt(setting.setting, 10);
        if (val === -1) return {
          status: 'warning',
          message: 'Desactivado — las queries lentas no se registran en logs.',
        };
        if (val === 0) return {
          status: 'warning',
          message: 'Registra todas las queries — muy verboso para producción.',
        };
        if (val <= 2000) return {
          status: 'ok',
          message: `Registra queries que tarden más de ${val} ms.`,
        };
        return {
          status: 'info',
          message: `Umbral alto (${val} ms) — queries medianas no se registran.`,
        };
      }

      case 'log_statement':
        if (setting.setting === 'all') return {
          status: 'ok',
          message: 'Registra todas las sentencias SQL.',
        };
        if (setting.setting === 'ddl') return {
          status: 'info',
          message: 'Solo registra sentencias DDL (CREATE, ALTER, DROP).',
        };
        if (setting.setting === 'mod') return {
          status: 'info',
          message: 'Registra sentencias que modifican datos (INSERT, UPDATE, DELETE, DDL).',
        };
        return {
          status: 'warning',
          message: 'No registra ninguna sentencia — desactivado.',
        };

      case 'pg_stat_statements.track':
        if (setting.setting === 'all') return {
          status: 'ok',
          message: 'Rastrea todas las queries (recomendado para diagnóstico completo).',
        };
        if (setting.setting === 'top') return {
          status: 'info',
          message: 'Rastrea solo queries top-level (sin funciones internas).',
        };
        return {
          status: 'warning',
          message: 'Rastreo desactivado — historial no disponible.',
        };

      case 'pg_stat_statements.max': {
        const max = parseInt(setting.setting, 10);
        if (max >= 5000) return {
          status: 'ok',
          message: `Rastrea hasta ${max.toLocaleString()} queries diferentes.`,
        };
        if (max >= 1000) return {
          status: 'info',
          message: `Rastrea hasta ${max.toLocaleString()} queries. Suficiente para la mayoría de sistemas.`,
        };
        return {
          status: 'warning',
          message: `Solo rastrea ${max.toLocaleString()} queries — puede perder estadísticas en sistemas con muchas queries distintas.`,
        };
      }

      case 'track_activity_query_size': {
        const size = parseInt(setting.setting, 10);
        if (size >= 4096) return {
          status: 'ok',
          message: `Guarda hasta ${size.toLocaleString()} caracteres por query.`,
        };
        if (size >= 1024) return {
          status: 'info',
          message: `Guarda hasta ${size.toLocaleString()} caracteres por query. Queries largas pueden truncarse.`,
        };
        return {
          status: 'warning',
          message: `Solo guarda ${size.toLocaleString()} caracteres — queries largas se truncan severamente.`,
        };
      }

      default:
        return { status: 'info', message: setting.shortDesc };
    }
  }

  /**
   * Detecta si AMBOS parámetros de logging están desactivados:
   * - log_min_duration_statement = -1  (desactivado)
   * - log_statement = none            (desactivado)
   * Esto significa que PostgreSQL no registra ninguna query en los logs del servidor.
   */
  isLoggingDisabled(): boolean {
    const logDuration = this.pgConfig.find(s => s.name === 'log_min_duration_statement');
    const logStatement = this.pgConfig.find(s => s.name === 'log_statement');
    return logDuration?.setting === '-1' && logStatement?.setting === 'none';
  }

  /** ScrollTo bloqueos */
  scrollToLocks(): void {
    this.locksSectionRef?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** trackBy para listas */
  trackByPid(_: number, q: ActiveQuery): number {
    return q.pid;
  }

  trackByIndex(index: number): number {
    return index;
  }

  trackByTableName(_: number, t: TableStats): string {
    return t.tableName;
  }
}

