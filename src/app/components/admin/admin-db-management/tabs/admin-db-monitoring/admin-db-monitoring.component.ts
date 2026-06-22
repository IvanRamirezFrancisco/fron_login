import {
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component, ElementRef, EventEmitter,
  OnInit, OnDestroy, AfterViewInit,
  Output, ViewChild, NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';
import { Chart } from 'chart.js/auto';
import {
  DbMonitoringService,
  DatabaseMetrics,
  TableHealth,
  IndexUsage,
  DbAlert,
  UserSession,
} from '../../../../../services/db-monitoring.service';
import {
  DbMaintenanceService,
  MaintenanceIndex,
} from '../../../../../services/db-maintenance.service';
import { DatabaseStateService } from '../../../../../services/database-state.service';
import { NotificationCenterService } from '../../../../../core/services/notification-center.service';

/** Snapshot anterior para calcular indicadores de tendencia */
interface PreviousSnapshot {
  cacheHitRatio:  number;
  tps:            number;
  avgQueryTimeMs: number;
  totalConns:     number;
}

/** Dirección de tendencia de una métrica */
export type TrendDir = 'up' | 'down' | 'neutral';

/** Vista activa en las secciones con toggle */
export type SectionView = 'table' | 'chart';

/** Segmento de la dona de conexiones */
export interface DonutSegment {
  label:  string;
  value:  number;
  color:  string;
  offset: number;  // stroke-dashoffset para el SVG
  dash:   number;  // stroke-dasharray length
}

@Component({
  selector: 'app-admin-db-monitoring',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-db-monitoring.component.html',
  styleUrls: ['../shared-tab.css', './admin-db-monitoring.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-in', style({ opacity: 1 })),
      ]),
    ]),
  ],
})
export class AdminDbMonitoringComponent implements OnInit, OnDestroy, AfterViewInit {

  /** Emite cuando el usuario hace clic en un badge de advertencia/atención */
  @Output() navigateToMaintenance = new EventEmitter<void>();

  @ViewChild('tableChartCanvas') tableChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('indexChartCanvas') indexChartCanvas!: ElementRef<HTMLCanvasElement>;

  private tableChartInstance: Chart | null = null;
  private indexChartInstance: Chart | null = null;
  /** Indica que los datos ya cargaron y hay que (re)construir la gráfica activa */
  private pendingChartRebuild = false;

  metrics:     DatabaseMetrics | null = null;
  weakIndexes: MaintenanceIndex[] = [];
  loading      = false;
  error:       string | null = null;
  lastUpdated: Date | null = null;

  /** Tooltip visible */
  activeTooltip: string | null = null;
  /** Posición del tooltip en viewport (position: fixed) */
  tooltipX = 0;
  tooltipY = 0;
  /** Dirección de apertura calculada dinámicamente */
  tooltipDir: 'up' | 'down' = 'up';

  /** Sección de conexiones expandida (click en dona) */
  connExpanded = false;

  /** Vistas activas: tabla por defecto, persiste en localStorage */
  tableView: SectionView;
  indexView: SectionView;

  /** Tab activa en la gráfica de índices: 'used' = más utilizados | 'attention' = requieren atención */
  indexChartTab: 'used' | 'attention' = 'used';

  // ── Selector de tablas para la gráfica ───────────────────────────────
  tableSelectionOpen  = false;
  selectedTableNames: string[] = [];
  tempTableSelection: string[] = [];
  tableSelectionLimitMsg = false;   // muestra aviso "Máximo 8"
  tablePanelSearch    = '';         // buscador dentro del panel
  private readonly TABLE_SELECTION_KEY = 'mon_tablas_sel';
  readonly TABLE_MAX_SEL = 8;

  // ── Selector de índices para la gráfica ──────────────────────────────
  indexSelectionOpen  = false;
  selectedIndexNames: string[] = [];
  tempIndexSelection: string[] = [];
  indexSelectionLimitMsg = false;   // muestra aviso "Máximo 8"
  indexPanelSearch    = '';         // buscador dentro del panel
  collapsedGroups     = new Set<string>(); // nombres de tabla colapsados
  private readonly INDEX_SELECTION_KEY = 'mon_indices_sel';
  readonly INDEX_MAX_SEL = 8;

  // ── Tooltip global para chips bloqueados ─────────────────────────────
  chipTooltip: { text: string; x: number; y: number } | null = null;

  showChipTooltip(event: MouseEvent, text: string): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.chipTooltip = {
      text,
      x: rect.left + rect.width / 2,
      y: rect.top - 12
    };
  }

  hideChipTooltip(): void {
    this.chipTooltip = null;
  }

  // ── Score desglose ────────────────────────────────────────────────────
  scoreBreakdownOpen = false;

  toggleScoreBreakdown(): void {
    this.scoreBreakdownOpen = !this.scoreBreakdownOpen;
    this.cdr.markForCheck();
  }

  /** Puntos del factor "Datos leídos desde memoria" (max 40)
   *  Replica exacta del backend: ≥99 → 40, ≥95 → 35, otro → ratio×40/100 */
  get scoreFactorCache(): number {
    const ratio = this.metrics?.performance.cacheHitRatio ?? this.metrics?.cacheHitRatio ?? 0;
    let score: number;
    if (ratio >= 99.0)      score = 40.0;
    else if (ratio >= 95.0) score = 35.0;
    else                    score = (ratio / 100.0) * 40.0;
    return Math.round(score);
  }

  /** Puntos del factor "Uso de conexiones" (max 20)
   *  Replica exacta del backend: ≤50% → 20, ≤80% → 15, otro → proporcional */
  get scoreFactorConns(): number {
    const pct = this.metrics?.connections.usagePct ?? 0;
    let score: number;
    if (pct <= 50.0)      score = 20.0;
    else if (pct <= 80.0) score = 15.0;
    else                  score = Math.max(0.0, (1.0 - pct / 100.0) * 20.0);
    return Math.round(score);
  }

  /** Puntos del factor "Alertas críticas" (max 25)
   *  Replica exacta del backend: 0→25, 1→18, ≥2 → max(0, 25 - n×8) */
  get scoreFactorAlerts(): number {
    const n = this.alertCount('critical');
    if (n === 0) return 25;
    if (n === 1) return 18;
    return Math.max(0, 25 - n * 8);
  }

  /** Puntos del factor "Estado de índices" (max 15)
   *  Replica exacta del backend: cuenta índices con status 'unused' → 15 - (unused × 3) */
  get scoreFactorIndexes(): number {
    const unusedCount = (this.metrics?.indexUsage ?? [])
      .filter(i => i.status === 'unused').length;
    return Math.max(0, 15 - unusedCount * 3);
  }

  /** Number of indexes with insufficient data (reported by backend), used for info banner */
  get insufficientDataIndexCount(): number {
    return this.metrics?.insufficientDataIndexCount ?? 0;
  }

  /** Number of indexes with no use (status 'unused') — used in the score breakdown view */
  get unusedIndexCount(): number {
    return (this.metrics?.indexUsage ?? []).filter(i => i.status === 'unused').length;
  }

  scoreBarColor(pts: number, max: number): 'green' | 'amber' | 'red' {
    const pct = pts / max;
    if (pct >= 0.875) return 'green';
    if (pct >= 0.5)   return 'amber';
    return 'red';
  }

  // ── Alertas — agrupación y estado de UI ──────────────────────────────
  showAllWarnings   = false;
  expandedAlertGroups = new Set<string>();

  toggleWarnings(): void {
    this.showAllWarnings = !this.showAllWarnings;
    this.cdr.markForCheck();
  }

  toggleAlertGroup(key: string): void {
    if (this.expandedAlertGroups.has(key)) {
      this.expandedAlertGroups.delete(key);
    } else {
      this.expandedAlertGroups.add(key);
    }
    this.cdr.markForCheck();
  }

  isAlertGroupExpanded(key: string): boolean {
    return this.expandedAlertGroups.has(key);
  }

  get criticalAlerts(): DbAlert[] {
    return (this.metrics?.alerts ?? []).filter(a => a.level === 'critical');
  }

  get warningAlerts(): DbAlert[] {
    return (this.metrics?.alerts ?? []).filter(a => a.level === 'warning');
  }

  /**
   * Agrupa las alertas de tipo warning:
   * - Si hay ≥2 alertas con la misma categoría → un grupo con subtexto de la más grave
   * - Si hay 1 → se muestra individual
   */
  get groupedWarnings(): Array<{
    key: string;
    category: string;
    count: number;
    summary: string;
    worst: string;
    items: DbAlert[];
  }> {
    const warnings = this.warningAlerts;
    const byCategory = new Map<string, DbAlert[]>();
    for (const a of warnings) {
      const list = byCategory.get(a.category) ?? [];
      list.push(a);
      byCategory.set(a.category, list);
    }
    const result: Array<{ key: string; category: string; count: number; summary: string; worst: string; items: DbAlert[] }> = [];
    byCategory.forEach((items, category) => {
      if (items.length >= 2) {
        // Grupo: la "peor" es la que tiene el mayor valor numérico (o la primera)
        const worst = items.reduce((prev, cur) => {
          const pv = parseFloat(prev.value) || 0;
          const cv = parseFloat(cur.value) || 0;
          return cv > pv ? cur : prev;
        }, items[0]);
        result.push({
          key: `group-${category}`,
          category,
          count: items.length,
          summary: category.toLowerCase(),
          worst: worst.message,
          items,
        });
      } else {
        // Individual
        result.push({
          key: `single-${items[0].id}`,
          category,
          count: 1,
          summary: items[0].message,
          worst: '',
          items,
        });
      }
    });
    return result;
  }

  get visibleGroupedWarnings() {
    const all = this.groupedWarnings;
    return this.showAllWarnings ? all : all.slice(0, 3);
  }

  get hiddenWarningCount(): number {
    return Math.max(0, this.groupedWarnings.length - 3);
  }

  /** Tendencias calculadas */
  trends: Record<string, TrendDir> = {};

  // ── Filtros y paginación — Tablas ─────────────────────────────────────
  tableSearch        = '';
  tableStatusFilter: TableHealth['status'] | 'all' = 'all';
  tableOnlyActive    = false;
  tableSortCol: keyof TableHealth | '' = '';
  tableSortAsc       = true;
  tablePage          = 0;
  readonly TABLE_PAGE_SIZE = 10;

  // ── Filtros y paginación — Índices ────────────────────────────────────
  indexSearch        = '';
  indexStatusFilter: IndexUsage['status'] | 'all' = 'all';
  indexPage          = 0;
  readonly INDEX_PAGE_SIZE = 10;

  // ── Paginación — Sesiones de usuario ─────────────────────────────────
  sessionPage          = 0;
  readonly SESSION_PAGE_SIZE = 3;

  private previous: PreviousSnapshot | null = null;
  private destroy$  = new Subject<void>();

  // ── Notificaciones: estado previo para detectar CAMBIOS ──────────────
  /** Métricas del ciclo anterior, solo para comparar con el ciclo actual */
  private previousMetrics: DatabaseMetrics | null = null;

  // ── Hysteresis: historial de estados por tabla ───────────────────────
  /**
   * Entrada del mapa de hysteresis.
   * El badge solo cambia cuando:
   *   1. Las últimas HYSTERESIS_REQUIRED_CONSECUTIVE lecturas son idénticas, Y
   *   2. Han transcurrido al menos HYSTERESIS_MIN_CHANGE_MS desde el último cambio.
   * Esto elimina los falsos positivos transitorios causados por autovacuum entre
   * ciclos de refresco.
   */
  private readonly HYSTERESIS_MIN_CHANGE_MS        = 2 * 60 * 1000; // 2 min
  private readonly HYSTERESIS_REQUIRED_CONSECUTIVE = 3;
  private hysteresisMap = new Map<string, {
    history:       TableHealth['status'][];
    currentState:  TableHealth['status'];
    lastChangedAt: number;
  }>();

  // ── Radio del donut SVG (r=54, circunferencia=339.3) ──────────────────
  private readonly DONUT_R   = 54;
  private readonly DONUT_C   = 2 * Math.PI * this.DONUT_R;

  constructor(
    private monitoringService: DbMonitoringService,
    private maintenanceService: DbMaintenanceService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private dbState: DatabaseStateService,
    private notifService: NotificationCenterService,
  ) {
    this.tableView = (localStorage.getItem('monitoreo_tablas_vista') as SectionView) ?? 'table';
    this.indexView = (localStorage.getItem('monitoreo_indices_vista') as SectionView) ?? 'table';
  }

  ngOnInit(): void {
    // Carga inicial única — sin intervalo automático
    this.loadMetrics();
    this.loadWeakIndexes();
  }

  ngAfterViewInit(): void {
    // Si el usuario tenía guardada la vista de gráfica y los datos ya llegaron,
    // construir las gráficas una vez que el DOM esté disponible.
    if (this.metrics) {
      if (this.tableView === 'chart') {
        this.zone.runOutsideAngular(() => setTimeout(() => this.buildTableChart(), 50));
      }
      if (this.indexView === 'chart') {
        this.zone.runOutsideAngular(() => setTimeout(() => this.buildIndexChart(), 50));
      }
    }
  }

  ngOnDestroy(): void {
    this.tableChartInstance?.destroy();
    this.indexChartInstance?.destroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Carga de datos ────────────────────────────────────────────────────

  loadMetrics(): void {
    this.loading = true;
    this.error   = null;
    this.cdr.markForCheck();
    this.monitoringService.getMetrics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.computeTrends(data);
          this.applyHysteresis(data);
          this.metrics     = data;
          this.lastUpdated = new Date();
          this.loading     = false;
          this.initTableSelection();
          this.initIndexSelection();
          // Share latest metrics with the state service (no localStorage)
          this.dbState.pushMetrics(data);
          // Evaluar cambios y generar notificaciones si corresponde
          this.evaluateAndNotify(data);
          this.cdr.markForCheck();
          // Si el usuario ya está en vista gráfica, reconstruir con los nuevos datos
          // El timeout da tiempo al ciclo de detección para renderizar el canvas
          this.zone.runOutsideAngular(() => {
            setTimeout(() => {
              if (this.tableView === 'chart') this.buildTableChart();
              if (this.indexView === 'chart') this.buildIndexChart();
            }, 50);
          });
        },
        error: (err) => {
          this.error   = err?.error?.message ?? 'No se pudo conectar al servidor.';
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  /** Carga los índices con baja eficiencia desde el servicio de mantenimiento */
  private loadWeakIndexes(): void {
    this.maintenanceService.getProblematicIndexes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.weakIndexes = data;
          this.cdr.markForCheck();
        },
        error: () => {
          // No critico: si falla, simplemente no mostramos la alerta
          this.weakIndexes = [];
        },
      });
  }

  /** Datos para la alerta de índices con baja eficiencia en el panel de Alertas */
  get weakIndexAlert(): { count: number; worst: MaintenanceIndex | null } {
    if (this.weakIndexes.length === 0) return { count: 0, worst: null };
    const sorted = [...this.weakIndexes].sort((a, b) => a.efficiency_pct - b.efficiency_pct);
    return { count: sorted.length, worst: sorted[0] };
  }

  /**
   * Aplica la hysteresis de doble puerta sobre todos los tables del payload.
   * Muta t.status al valor estabilizado antes de que el componente almacene
   * los datos.
   */
  private applyHysteresis(data: DatabaseMetrics): void {
    data.tableHealth.forEach(t => {
      t.status = this.getStableStatus(t.tableName, t.status);
    });
  }

  /**
   * Hysteresis de doble puerta para una tabla individual.
   *
   * Puerta 1 — Consenso: las últimas HYSTERESIS_REQUIRED_CONSECUTIVE lecturas
   *            deben coincidir todas con el nuevo estado.
   * Puerta 2 — Tiempo:   deben haber transcurrido al menos
   *            HYSTERESIS_MIN_CHANGE_MS ms desde el último cambio real.
   */
  private getStableStatus(
    tableName: string,
    newStatus: TableHealth['status'],
  ): TableHealth['status'] {
    if (!this.hysteresisMap.has(tableName)) {
      this.hysteresisMap.set(tableName, {
        history:      [newStatus],
        currentState: newStatus,
        lastChangedAt: Date.now(),
      });
      return newStatus;
    }

    const entry = this.hysteresisMap.get(tableName)!;

    // Ventana deslizante de las últimas N+1 lecturas
    entry.history.push(newStatus);
    if (entry.history.length > this.HYSTERESIS_REQUIRED_CONSECUTIVE + 1) {
      entry.history.shift();
    }

    const lastN   = entry.history.slice(-this.HYSTERESIS_REQUIRED_CONSECUTIVE);
    const allSame = lastN.length === this.HYSTERESIS_REQUIRED_CONSECUTIVE
                    && lastN.every(s => s === newStatus);

    const enoughTime =
      Date.now() - entry.lastChangedAt >= this.HYSTERESIS_MIN_CHANGE_MS;

    if (allSame && enoughTime && entry.currentState !== newStatus) {
      entry.currentState  = newStatus;
      entry.lastChangedAt = Date.now();
    }

    return entry.currentState;
  }

  /** Formatea la hora de última actualización en formato 12h */
  formatLastUpdated(): string {
    if (!this.lastUpdated) return '';
    return this.lastUpdated.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  }

  /** Navega al tab de Mantenimiento emitiendo el evento al padre */
  goToMaintenance(): void {
    this.navigateToMaintenance.emit();
  }

  // ── Toggle de secciones ───────────────────────────────────────────────

  setTableView(v: SectionView): void {
    this.tableView = v;
    localStorage.setItem('monitoreo_tablas_vista', v);
    if (v === 'chart') {
      // Esperar a que Angular renderice el @if y el canvas esté en el DOM
      this.cdr.markForCheck();
      this.zone.runOutsideAngular(() => setTimeout(() => this.buildTableChart(), 50));
    }
  }

  setIndexView(v: SectionView): void {
    this.indexView = v;
    localStorage.setItem('monitoreo_indices_vista', v);
    if (v === 'chart') {
      this.cdr.markForCheck();
      this.zone.runOutsideAngular(() => setTimeout(() => this.buildIndexChart(), 50));
    }
  }

  toggleConn(): void {
    this.connExpanded = !this.connExpanded;
  }

  // ── Tendencias ────────────────────────────────────────────────────────

  private computeTrends(next: DatabaseMetrics): void {
    if (!this.previous) {
      this.previous = {
        cacheHitRatio:  next.performance.cacheHitRatio,
        tps:            next.performance.tps,
        avgQueryTimeMs: next.performance.avgQueryTimeMs,
        totalConns:     next.connections.total,
      };
      this.trends = { cacheHit: 'neutral', tps: 'neutral', avgQuery: 'neutral', conns: 'neutral' };
      return;
    }
    const T = 0.5;
    this.trends = {
      cacheHit: this.dir(next.performance.cacheHitRatio,  this.previous.cacheHitRatio,  T),
      tps:      this.dir(next.performance.tps,            this.previous.tps,            T),
      avgQuery: this.dir(this.previous.avgQueryTimeMs,    next.performance.avgQueryTimeMs, T),
      conns:    this.dir(this.previous.totalConns,        next.connections.total,        T),
    };
    this.previous = {
      cacheHitRatio:  next.performance.cacheHitRatio,
      tps:            next.performance.tps,
      avgQueryTimeMs: next.performance.avgQueryTimeMs,
      totalConns:     next.connections.total,
    };
  }

  private dir(current: number, prev: number, threshold: number): TrendDir {
    if (current - prev >  threshold) return 'up';
    if (prev - current >  threshold) return 'down';
    return 'neutral';
  }

  // ── Notificaciones: evaluar CAMBIOS entre ciclos ─────────────────────

  /**
   * Compara el estado actual con el anterior y genera notificaciones
   * SOLO cuando algo CAMBIA o algo NUEVO aparece.
   * Se llama una vez por cada respuesta del API de métricas.
   */
  private evaluateAndNotify(current: DatabaseMetrics): void {

    // ── 1. Health Score cayó significativamente (>10 pts) ──────────
    if (
      this.previousMetrics !== null &&
      current.healthScore < this.previousMetrics.healthScore - 10
    ) {
      const drop = this.previousMetrics.healthScore - current.healthScore;
      this.notifService.push({
        level:              current.healthScore < 50 ? 'error' : 'warning',
        category:           'database',
        title:              `Health Score bajó a ${current.healthScore} pts`,
        message:            `Cayó ${drop} puntos respecto al ciclo anterior. Revisar alertas activas en Monitoreo.`,
        persistent:         false,
        actionRoute:        '/admin/gestion-db',
        actionQueryParams:  { tab: 'monitoring' },
        actionLabel:        'Ver Monitoreo',
      });
    }

    // ── 2. NUEVAS alertas críticas (no las que ya conocemos) ───────
    const newCriticals = (current.alerts ?? [])
      .filter(a => a.level === 'critical')
      .filter(a => !this.notifService.isAlertKnown(a.id));

    for (const alert of newCriticals) {
      this.notifService.push({
        level:              'error',
        category:           'database',
        title:              alert.message,
        message:            alert.hint ?? 'Revisar sección de monitoreo.',
        persistent:         true,
        actionRoute:        '/admin/gestion-db',
        actionQueryParams:  { tab: 'monitoring' },
        actionLabel:        'Inspeccionar',
      });
      this.notifService.addKnownAlert(alert.id);
    }

    // Limpiar alertas que ya no existen para permitir
    // que vuelvan a notificar si reaparecen
    const currentCriticalIds = new Set(
      (current.alerts ?? [])
        .filter(a => a.level === 'critical')
        .map(a => a.id)
    );
    this.notifService.removeStaleAlerts(currentCriticalIds);

    // ── 3. Cache hit ratio cruzó el umbral de 90% hacia abajo ─────
    const currentCache = current.performance?.cacheHitRatio ?? current.cacheHitRatio ?? 100;
    const prevCache    = this.previousMetrics?.performance?.cacheHitRatio
                         ?? this.previousMetrics?.cacheHitRatio ?? 100;
    if (
      this.previousMetrics !== null &&
      currentCache < 90 &&
      prevCache >= 90
    ) {
      this.notifService.push({
        level:              'error',
        category:           'database',
        title:              `Cache hit ratio crítico: ${currentCache.toFixed(1)}%`,
        message:            'El planificador está leyendo demasiado desde disco. Ejecutar VACUUM ANALYZE en tablas grandes.',
        persistent:         false,
        actionRoute:        '/admin/gestion-db',
        actionQueryParams:  { tab: 'monitoring' },
        actionLabel:        'Ver Monitoreo',
      });
    }

    this.previousMetrics = current;
  }

  // ── Tooltip ───────────────────────────────────────────────────────────

  /**
   * Muestra el tooltip calculando su posición en el viewport (position: fixed)
   * a partir del elemento disparador. Esto evita recorte por overflow.
   */
  showTooltip(id: string, event: MouseEvent): void {
    const trigger = event.currentTarget as HTMLElement;
    const rect    = trigger.getBoundingClientRect();
    const vw      = window.innerWidth;
    const vh      = window.innerHeight;

    // Preferir abrir hacia arriba; si no hay espacio, abrir hacia abajo
    const spaceAbove = rect.top;
    const spaceBelow = vh - rect.bottom;
    this.tooltipDir  = spaceAbove >= 130 || spaceAbove >= spaceBelow ? 'up' : 'down';

    // Centrar horizontalmente sobre el trigger, clampeando dentro del viewport
    let x = rect.left + rect.width / 2;
    const halfTooltip = 140; // mitad de max-width=280
    x = Math.max(halfTooltip + 8, Math.min(vw - halfTooltip - 8, x));
    this.tooltipX = x;

    // Posición vertical: encima o debajo del trigger con 10px de margen
    this.tooltipY = this.tooltipDir === 'up'
      ? rect.top - 10
      : rect.bottom + 10;

    this.activeTooltip = id;
  }

  hideTooltip(): void { this.activeTooltip = null; }

  // ── Score ring ────────────────────────────────────────────────────────

  get healthLabel(): string {
    const s = this.metrics?.healthScore ?? 0;
    if (s >= 90) return 'Excelente';
    if (s >= 75) return 'Bueno';
    if (s >= 50) return 'Con advertencias';
    return 'Atención requerida';
  }

  get healthStatus(): string {
    const s = this.metrics?.healthScore ?? 0;
    if (s >= 90) return 'Todo funciona perfectamente';
    if (s >= 75) return 'Funcionando bien, con advertencias menores';
    if (s >= 50) return 'Hay advertencias que requieren revisión';
    return 'Se requiere atención inmediata';
  }

  get healthColor(): 'green' | 'amber' | 'red' {
    const s = this.metrics?.healthScore ?? 0;
    if (s >= 75) return 'green';
    if (s >= 50) return 'amber';
    return 'red';
  }

  get scoreRingOffset(): number {
    const circumference = 2 * Math.PI * 42;
    return circumference * (1 - (this.metrics?.healthScore ?? 0) / 100);
  }

  // ── Niveles de alerta ─────────────────────────────────────────────────

  get connAlertLevel(): 'ok' | 'warning' | 'critical' {
    const pct = this.metrics?.connections.usagePct ?? 0;
    if (pct >= 90) return 'critical';
    if (pct >= 70) return 'warning';
    return 'ok';
  }

  get cacheAlertLevel(): 'ok' | 'warning' | 'critical' {
    const r = this.metrics?.performance.cacheHitRatio ?? 100;
    if (r < 90) return 'critical';
    if (r < 95) return 'warning';
    return 'ok';
  }

  // ── Dona SVG de conexiones ────────────────────────────────────────────

  /**
   * Calcula los segmentos de la gráfica de dona.
   * Cuatro segmentos base: Pool Spring Boot (azul), Internos PG (gris),
   * Usuarios activos (verde) y Herramientas de administración (morado).
   * Los segmentos con valor 0 se omiten automáticamente.
   * Si queda un residuo sin clasificar ("Otras"), se muestra como segmento naranja.
   */
  get donutSegments(): DonutSegment[] {
    const c = this.metrics?.connections;
    if (!c) return [];

    const total = c.total || 1;
    type SegInput = { label: string; value: number; color: string };
    const raw: SegInput[] = [];

    if (c.poolConnections > 0) {
      raw.push({ label: 'Pool Spring Boot',               value: c.poolConnections,       color: '#3b82f6' });
    }
    if (c.pgInternalConnections > 0) {
      raw.push({ label: 'Procesos internos PG',           value: c.pgInternalConnections, color: '#9ca3af' });
    }
    if (c.activeUserSessions > 0) {
      raw.push({ label: 'Sesiones de usuario',            value: c.activeUserSessions,    color: '#22c55e' });
    }
    if ((c.adminTools ?? 0) > 0) {
      raw.push({ label: 'Herramientas de administración', value: c.adminTools,             color: '#a78bfa' });
    }

    // Residuo: conexiones aún no clasificadas
    const classified = c.poolConnections + c.pgInternalConnections
                     + c.activeUserSessions + (c.adminTools ?? 0);
    const others = Math.max(0, total - classified);
    if (others > 0) {
      raw.push({ label: 'Otras conexiones', value: others, color: '#fed7aa' });
    }

    let offset = 0; // arrancamos desde las 12 del reloj (rotación -90° en SVG)
    return raw.map(seg => {
      const dash   = (seg.value / total) * this.DONUT_C;
      const result: DonutSegment = {
        ...seg,
        dash,
        offset: this.DONUT_C - offset,  // strokeDashoffset = circunferencia - posición acumulada
      };
      offset += dash;
      return result;
    });
  }

  get donutCircumference(): number { return this.DONUT_C; }
  get donutRadius(): number        { return this.DONUT_R; }

  // ── Gráfica de barras horizontales: tablas ────────────────────────────

  /** Top 10 tablas con actividad, ordenadas por registros obsoletos DESC */
  get tableChartData(): TableHealth[] {
    if (!this.metrics?.tableHealth) return [];
    return [...this.metrics.tableHealth]
      .filter(t => t.estimatedRows > 0 || t.deadTuples > 0)
      .sort((a, b) => b.deadTuples - a.deadTuples)
      .slice(0, 10);
  }

  /** Tablas con dead tuples > 3× el promedio (y al menos 20) — se muestran como tarjeta de alerta.
   *  Se excluye active_sessions porque ya tiene su propio card dedicado. */
  get outlierTables(): TableHealth[] {
    const data = this.metrics?.tableHealth ?? [];
    if (data.length < 2) return [];
    const avg = data.reduce((s, t) => s + t.deadTuples, 0) / data.length;
    const threshold = Math.max(avg * 3, 20);
    return data.filter(t => t.deadTuples > threshold && t.tableName !== 'active_sessions');
  }

  /** Datos para la gráfica, excluyendo los outliers */
  get normalChartData(): TableHealth[] {
    const outlierNames = new Set(this.outlierTables.map(t => t.tableName));
    return (this.metrics?.tableHealth ?? [])
      .filter(t => !outlierNames.has(t.tableName) && (t.estimatedRows > 0 || t.deadTuples > 0))
      .sort((a, b) => b.deadTuples - a.deadTuples)
      .slice(0, 10);
  }

  // ── Selector de tablas ────────────────────────────────────────────────

  /** TODAS las tablas (37) ordenadas para el panel selector:
   *  1º critical → 2º warning → 3º con actividad desc → 4º vacías */
  get allSelectableTables(): TableHealth[] {
    const all = [...(this.metrics?.tableHealth ?? [])];
    const order = (t: TableHealth) => {
      if (t.status === 'critical') return 0;
      if (t.status === 'warning')  return 1;
      if (t.estimatedRows > 0 || t.deadTuples > 0) return 2;
      return 3;
    };
    return all.sort((a, b) => {
      const oa = order(a), ob = order(b);
      if (oa !== ob) return oa - ob;
      // dentro del mismo grupo: actividad desc
      return (b.estimatedRows + b.deadTuples) - (a.estimatedRows + a.deadTuples);
    });
  }

  /** Tablas del panel filtradas por el buscador */
  get filteredPanelTables(): TableHealth[] {
    const q = this.tablePanelSearch.trim().toLowerCase();
    if (!q) return this.allSelectableTables;
    return this.allSelectableTables.filter(t =>
      t.tableName.toLowerCase().includes(q)
    );
  }

  /** Tablas con actividad — base de «selectableTables» (para default y gráfica) */
  get selectableTables(): TableHealth[] {
    return [...(this.metrics?.tableHealth ?? [])]
      .filter(t => t.estimatedRows > 0 || t.deadTuples > 0)
      .sort((a, b) => (b.estimatedRows + b.deadTuples) - (a.estimatedRows + a.deadTuples));
  }

  /**
   * Tablas seleccionadas para la gráfica.
   * active_sessions se incluye en la gráfica si el usuario la eligió manualmente.
   */
  get chartSelectedTables(): TableHealth[] {
    const all = this.metrics?.tableHealth ?? [];
    const sel = new Set(this.selectedTableNames);
    return all
      .filter(t => sel.has(t.tableName))
      .sort((a, b) => (b.estimatedRows + b.deadTuples) - (a.estimatedRows + a.deadTuples));
  }

  /** Entrada de active_sessions si el usuario la tiene seleccionada */
  get alertSessionsTable(): TableHealth | null {
    const sel = new Set(this.selectedTableNames);
    return this.metrics?.tableHealth?.find(
      t => t.tableName === 'active_sessions' && sel.has(t.tableName)
    ) ?? null;
  }

  initTableSelection(): void {
    const defaultSel = () =>
      this.selectableTables
        .filter(t => t.tableName !== 'active_sessions')
        .slice(0, 5)
        .map(t => t.tableName);
    try {
      const raw   = localStorage.getItem(this.TABLE_SELECTION_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      if (Array.isArray(saved) && saved.length > 0 &&
          saved.every((x: unknown) => typeof x === 'string')) {
        const allNames = new Set(this.allSelectableTables.map(t => t.tableName));
        const valid = (saved as string[]).filter(n => allNames.has(n));
        this.selectedTableNames = valid.length > 0 ? valid : defaultSel();
      } else {
        this.selectedTableNames = defaultSel();
      }
    } catch {
      this.selectedTableNames = defaultSel();
    }
  }

  applyTableSelection(): void {
    if (this.tempTableSelection.length === 0) return;
    this.selectedTableNames = [...this.tempTableSelection];
    try {
      localStorage.setItem(this.TABLE_SELECTION_KEY,
        JSON.stringify(this.selectedTableNames));
    } catch (e) {
      console.warn('No se pudo guardar selección', e);
    }
    this.tableSelectionOpen    = false;
    this.tableSelectionLimitMsg = false;
    this.zone.runOutsideAngular(() => setTimeout(() => this.buildTableChart(), 50));
    this.cdr.markForCheck();
  }

  /** Más activas: las 8 con mayor actividad */
  selectAllTables(): void {
    const top8 = this.allSelectableTables
      .filter(t => t.estimatedRows > 0 || t.deadTuples > 0)
      .slice(0, this.TABLE_MAX_SEL)
      .map(t => t.tableName);
    this.tempTableSelection    = top8;
    this.tableSelectionLimitMsg = false;
  }
  selectNoTables(): void {
    this.tempTableSelection    = [];
    this.tableSelectionLimitMsg = false;
  }
  /** Más activas: las 8 con mayor (estimatedRows + deadTuples) */
  selectMostActiveTables(): void {
    this.tempTableSelection = this.selectableTables
      .slice(0, this.TABLE_MAX_SEL)
      .map(t => t.tableName);
    this.tableSelectionLimitMsg = false;
  }
  /** Con problemas: critical/warning primero, luego rellena hasta 8 con más activas */
  selectProblemTables(): void {
    const problem = this.allSelectableTables
      .filter(t => t.status === 'critical' || t.status === 'warning');
    const problemSet = new Set(problem.map(t => t.tableName));
    const fill = this.selectableTables
      .filter(t => !problemSet.has(t.tableName));
    const combined = [...problem, ...fill]
      .slice(0, this.TABLE_MAX_SEL)
      .map(t => t.tableName);
    this.tempTableSelection    = combined;
    this.tableSelectionLimitMsg = false;
  }

  toggleTableChip(name: string): void {
    const i = this.tempTableSelection.indexOf(name);
    if (i >= 0) {
      this.tempTableSelection.splice(i, 1);
      this.tableSelectionLimitMsg = false;
    } else {
      if (this.tempTableSelection.length >= this.TABLE_MAX_SEL) {
        this.tableSelectionLimitMsg = true;
        return;
      }
      this.tempTableSelection.push(name);
      this.tableSelectionLimitMsg = false;
    }
  }

  toggleTableSelectionPanel(): void {
    this.tableSelectionOpen = !this.tableSelectionOpen;
    if (this.tableSelectionOpen) {
      this.tempTableSelection    = [...this.selectedTableNames];
      this.tableSelectionLimitMsg = false;
      this.tablePanelSearch      = '';
    }
  }

  toggleIndexSelectionPanel(): void {
    this.indexSelectionOpen = !this.indexSelectionOpen;
    if (this.indexSelectionOpen) {
      this.tempIndexSelection = [...this.selectedIndexNames];
      this.indexSelectionLimitMsg = false;
      this.indexPanelSearch = '';
      // Por defecto: expandir grupos con actividad, colapsar el resto
      this.collapsedGroups.clear();
      this.indexGroupsByTable.forEach(g => {
        const hasActivity = g.indexes.some(i => i.indexScans > 0 || i.seqScans > 0);
        if (!hasActivity) this.collapsedGroups.add(g.tableName);
      });
    }
  }

  // ── Grupos de índices por tabla ───────────────────────────────────────

  /** Índices del panel filtrados por el buscador (busca en indexName y tableName) */
  get filteredPanelIndexes(): IndexUsage[] {
    const q = this.indexPanelSearch.trim().toLowerCase();
    if (!q) return this.selectableIndexes;
    return this.selectableIndexes.filter(i =>
      i.indexName.toLowerCase().includes(q) || i.tableName.toLowerCase().includes(q)
    );
  }

  /** Índices del panel agrupados por nombre de tabla */
  get indexGroupsByTable(): { tableName: string; indexes: IndexUsage[] }[] {
    const map = new Map<string, IndexUsage[]>();
    for (const idx of this.filteredPanelIndexes) {
      if (!map.has(idx.tableName)) map.set(idx.tableName, []);
      map.get(idx.tableName)!.push(idx);
    }
    // Ordenar grupos: primero los que tienen actividad (idx_scan > 0), luego alfabético
    const groups = [...map.entries()].map(([tableName, indexes]) => ({ tableName, indexes }));
    groups.sort((a, b) => {
      const aActive = a.indexes.some(i => i.indexScans > 0) ? 0 : 1;
      const bActive = b.indexes.some(i => i.indexScans > 0) ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return a.tableName.localeCompare(b.tableName);
    });
    return groups;
  }

  toggleGroupCollapse(tableName: string): void {
    if (this.collapsedGroups.has(tableName)) {
      this.collapsedGroups.delete(tableName);
    } else {
      this.collapsedGroups.add(tableName);
    }
  }

  isGroupCollapsed(tableName: string): boolean {
    return this.collapsedGroups.has(tableName);
  }

  // ── Selector de índices ───────────────────────────────────────────────

  /** Todos los índices ordenados por búsquedas rápidas DESC — base del selector */
  get selectableIndexes(): IndexUsage[] {
    return [...(this.metrics?.indexUsage ?? [])]
      .sort((a, b) => b.indexScans - a.indexScans);
  }

  /** Índices seleccionados, excluyendo el champion, para la gráfica 'used' */
  get chartSelectedIndexes(): IndexUsage[] {
    const championName = this.indexChampion?.indexName ?? '';
    const sel = new Set(this.selectedIndexNames);
    return this.selectableIndexes.filter(
      i => sel.has(i.indexName) && i.indexName !== championName
    ).slice(0, 7);
  }

  /** Índices seleccionados que requieren atención (totalScans > 50, eff < 75%) */
  get chartSelectedLowEff(): IndexUsage[] {
    const sel = new Set(this.selectedIndexNames);
    return this.selectableIndexes.filter(
      i => sel.has(i.indexName) &&
           (i.indexScans + i.seqScans) > 50 &&
           i.efficiencyPct < 75
    ).sort((a, b) => a.efficiencyPct - b.efficiencyPct);
  }

  initIndexSelection(): void {
    const defaultSel = () => this.selectableIndexes.slice(0, 7).map(i => i.indexName);
    try {
      const raw = localStorage.getItem(this.INDEX_SELECTION_KEY);
      const saved = raw ? JSON.parse(raw) : null;
      if (Array.isArray(saved) && saved.length > 0 &&
          saved.every((x: unknown) => typeof x === 'string')) {
        const valid = saved.filter((n: string) =>
          this.selectableIndexes.some(i => i.indexName === n)
        );
        this.selectedIndexNames = valid.length > 0 ? valid : defaultSel();
      } else {
        this.selectedIndexNames = defaultSel();
      }
    } catch {
      this.selectedIndexNames = defaultSel();
    }
  }

  applyIndexSelection(): void {
    this.selectedIndexNames = [...this.tempIndexSelection];
    localStorage.setItem(this.INDEX_SELECTION_KEY, JSON.stringify(this.selectedIndexNames));
    this.indexSelectionOpen = false;
    this.indexSelectionLimitMsg = false;
    this.zone.runOutsideAngular(() => setTimeout(() => this.buildIndexChart(), 50));
    this.cdr.markForCheck();
  }

  selectAllIndexes(): void {
    this.tempIndexSelection = this.selectableIndexes
      .slice(0, this.INDEX_MAX_SEL).map(i => i.indexName);
    this.indexSelectionLimitMsg = false;
  }
  selectNoIndexes(): void {
    this.tempIndexSelection = [];
    this.indexSelectionLimitMsg = false;
  }
  selectTopIndexes(): void {
    // "Más activos": los 8 con más idx_scan
    this.tempIndexSelection = [...this.selectableIndexes]
      .sort((a, b) => b.indexScans - a.indexScans)
      .slice(0, this.INDEX_MAX_SEL)
      .map(i => i.indexName);
    this.indexSelectionLimitMsg = false;
  }
  selectProblemIndexes(): void {
    // "Con problemas": efficiencyPct < 75 y total búsquedas > 50
    const problem = [...this.selectableIndexes]
      .filter(i => i.efficiencyPct < 75 && (i.indexScans + i.seqScans) > 50)
      .sort((a, b) => a.efficiencyPct - b.efficiencyPct)
      .slice(0, this.INDEX_MAX_SEL)
      .map(i => i.indexName);
    this.tempIndexSelection = problem.length > 0 ? problem : [];
    this.indexSelectionLimitMsg = false;
  }
  toggleIndexChip(name: string): void {
    const i = this.tempIndexSelection.indexOf(name);
    if (i >= 0) {
      this.tempIndexSelection.splice(i, 1);
      this.indexSelectionLimitMsg = false;
    } else {
      if (this.tempIndexSelection.length >= this.INDEX_MAX_SEL) {
        this.indexSelectionLimitMsg = true;
        return;
      }
      this.tempIndexSelection.push(name);
      this.indexSelectionLimitMsg = false;
    }
  }

  indexEffDot(eff: number): string {
    return eff >= 80 ? 'check_circle' : eff >= 40 ? 'warning' : 'cancel';
  }

  /** Ancho de barra en % para un valor dado el máximo del dataset */
  tableBarWidth(value: number, dataKey: 'estimatedRows' | 'deadTuples'): number {
    const data = this.tableChartData;
    if (!data.length) return 0;
    const max = Math.max(...data.map(t => t[dataKey]));
    return max > 0 ? (value / max) * 100 : 0;
  }

  private buildTableChart(): void {
    const canvas = this.tableChartCanvas?.nativeElement;
    if (!canvas || !this.metrics) return;
    this.tableChartInstance?.destroy();
    const data = this.chartSelectedTables;
    if (!data.length) { this.tableChartInstance = null; return; }

    this.tableChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map(t => t.tableName),
        datasets: [
          {
            label: 'Registros activos',
            data: data.map(t => t.estimatedRows),
            backgroundColor: '#378ADD',
            borderRadius: 4,
            barPercentage: 0.6,
            categoryPercentage: 0.7,
          },
          {
            label: 'Registros obsoletos',
            data: data.map(t => t.deadTuples),
            backgroundColor: '#EF9F27',
            borderRadius: 4,
            barPercentage: 0.6,
            categoryPercentage: 0.7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 16, bottom: 4 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,0.88)',
            titleFont: { size: 12, weight: 'bold' },
            bodyFont: { size: 11 },
            padding: 12,
            callbacks: {
              title: ctx => data[ctx[0].dataIndex]?.tableName ?? '',
              label: ctx => {
                const t = data[ctx.dataIndex];
                const total = t.estimatedRows + t.deadTuples;
                const rawY = ctx.parsed.y ?? 0;
                const pct = total > 0
                  ? ((rawY / total) * 100).toFixed(1)
                  : '0.0';
                const label = ctx.datasetIndex === 0 ? 'Registros activos' : 'Registros obsoletos';
                return `  ${label}: ${(rawY as number).toLocaleString('es-MX')} (${pct}%)`;
              },
              afterBody: ctx => {
                const t = data[ctx[0].dataIndex];
                const total = t.estimatedRows + t.deadTuples;
                const wastedPct = total > 0 ? (t.deadTuples / total * 100) : 0;
                const status = wastedPct > 30 ? '⚠ Requiere limpieza'
                             : wastedPct > 10 ? '· Monitorear'
                             : '✓ Estado óptimo';
                return [
                  `  ──────────────────────`,
                  `  Espacio desperdiciado: ${wastedPct.toFixed(1)}%  ${status}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              font: { size: 10, family: "'Courier New', monospace" },
              color: '#64748b',
              maxRotation: 35,
              minRotation: 25,
            },
            grid: { display: false },
            border: { display: false },
          },
          y: {
            beginAtZero: true,
            ticks: {
              font: { size: 10 },
              color: '#94a3b8',
              maxTicksLimit: 6,
              callback: (v: any) => {
                const n = Number(v);
                if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
                if (n >= 1000) return (n / 1000).toFixed(0) + 'k';
                return Number.isInteger(n) ? n : '';
              },
            },
            grid: { color: 'rgba(0,0,0,0.05)' },
            border: { display: false },
          },
        },
      },
    });
  }


  // ── Gráfica de barras horizontales: índices ───────────────────────────

  /**
   * Índices para la gráfica según el spec:
   * - Todos los que tienen al menos 1 búsqueda rápida (indexScans >= 1)
   * - MÁS los 5 con mayor número de búsquedas secuenciales aunque tengan 0 rápidas
   * - Máximo 15 en total
   * - Ordenados por eficiencia% ASC (peor arriba)
   */
  get indexChartData(): IndexUsage[] {
    const all = this.metrics?.indexUsage ?? [];
    // Grupo 1: tienen al menos una búsqueda rápida
    const withScans = all.filter(i => i.indexScans >= 1);
    // Grupo 2: sin búsquedas rápidas, pero con secuenciales (top 5 por seqScans)
    const withoutScans = all
      .filter(i => i.indexScans < 1)
      .sort((a, b) => b.seqScans - a.seqScans)
      .slice(0, 5);
    // Unión sin duplicados, ordenada de menor a mayor eficiencia (peor arriba en la gráfica)
    const combined = [...new Map([...withScans, ...withoutScans].map(i => [i.indexName, i])).values()];
    return combined
      .sort((a, b) => a.efficiencyPct - b.efficiencyPct)
      .slice(0, 15);
  }

  indexBarColor(eff: number): string {
    if (eff >= 80) return '#1D9E75';
    if (eff >= 40) return '#EF9F27';
    return '#E24B4A';
  }

  /** El índice más utilizado de todo el sistema (puede ser el outlier dominante) */
  get indexChampion(): IndexUsage | null {
    const all = this.metrics?.indexUsage ?? [];
    if (!all.length) return null;
    return [...all].sort((a, b) => b.indexScans - a.indexScans)[0] ?? null;
  }

  /** Top 7 índices más usados, excluyendo el champion — para la gráfica principal */
  get indexTopUsedData(): IndexUsage[] {
    const championName = this.indexChampion?.indexName ?? '';
    return (this.metrics?.indexUsage ?? [])
      .filter(i => i.indexScans > 0 && i.indexName !== championName)
      .sort((a, b) => b.indexScans - a.indexScans)
      .slice(0, 7);
  }

  /**
   * Índices que requieren atención:
   * totalScans (rápidas + secuenciales) > 50 Y eficiencia < 75%
   */
  get indexLowEffData(): IndexUsage[] {
    return (this.metrics?.indexUsage ?? [])
      .filter(i => (i.indexScans + i.seqScans) > 50 && i.efficiencyPct < 75)
      .sort((a, b) => a.efficiencyPct - b.efficiencyPct);
  }

  setIndexChartTab(tab: 'used' | 'attention'): void {
    this.indexChartTab = tab;
    this.cdr.markForCheck();
    this.zone.runOutsideAngular(() => setTimeout(() => this.buildIndexChart(), 50));
  }

  private buildIndexChart(): void {
    const canvas = this.indexChartCanvas?.nativeElement;
    if (!canvas || !this.metrics) return;
    this.indexChartInstance?.destroy();

    if (this.indexChartTab === 'used') {
      // ── Tab "Más utilizados" (barras verticales) ─────────────────────
      const data = this.chartSelectedIndexes;
      if (!data.length) { this.indexChartInstance = null; return; }

      this.indexChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: data.map(i => i.indexName.length > 18 ? i.indexName.substring(0, 18) + '…' : i.indexName),
          datasets: [{
            label: 'Búsquedas rápidas',
            data: data.map(i => i.indexScans),
            backgroundColor: data.map(i => this.indexBarColor(i.efficiencyPct)),
            borderRadius: 4,
            barPercentage: 0.55,
            categoryPercentage: 0.7,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 16, bottom: 4 } },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(15,23,42,0.88)',
              titleFont: { size: 12, weight: 'bold' },
              bodyFont: { size: 11 },
              padding: 12,
              callbacks: {
                title: ctx => data[ctx[0].dataIndex]?.indexName ?? '',
                label: ctx => {
                  const idx = data[ctx.dataIndex];
                  const status = idx.efficiencyPct >= 80
                    ? '✓ Índice funcionando correctamente'
                    : idx.efficiencyPct >= 40
                    ? '· Eficiencia media, monitorear'
                    : '✗ Muchas búsquedas no usan el índice';
                  return [
                    `  Tabla: ${idx.tableName}`,
                    `  Búsquedas: ${idx.indexScans.toLocaleString('es-MX')}`,
                    `  Eficiencia: ${idx.efficiencyPct.toFixed(1)}%`,
                    `  ${status}`,
                  ];
                },
              },
            },
          },
          scales: {
            x: {
              ticks: {
                font: { size: 10, family: "'Courier New', monospace" },
                color: '#64748b',
                maxRotation: 35,
                minRotation: 25,
              },
              grid: { display: false },
              border: { display: false },
            },
            y: {
              beginAtZero: true,
              ticks: {
                font: { size: 10 },
                color: '#94a3b8',
                maxTicksLimit: 6,
                callback: (v: any) => {
                  const n = Number(v);
                  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
                  if (n >= 1000) return (n / 1000).toFixed(0) + 'k';
                  return Number.isInteger(n) ? n : '';
                },
              },
              grid: { color: 'rgba(0,0,0,0.05)' },
              border: { display: false },
            },
          },
        },
      });

    } else {
      // ── Tab "Requieren atención": stacked vertical ───────────────────
      const data = this.chartSelectedLowEff;
      if (!data.length) { this.indexChartInstance = null; return; }

      this.indexChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
          labels: data.map(i => i.indexName.length > 18 ? i.indexName.substring(0, 18) + '…' : i.indexName),
          datasets: [
            {
              label: 'Búsquedas rápidas',
              data: data.map(i => i.indexScans),
              backgroundColor: '#1D9E75',
              borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
              barPercentage: 0.55,
              categoryPercentage: 0.7,
              stack: 'attn',
            } as any,
            {
              label: 'Búsquedas lentas (secuenciales)',
              data: data.map(i => i.seqScans),
              backgroundColor: '#E24B4A',
              borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
              barPercentage: 0.55,
              categoryPercentage: 0.7,
              stack: 'attn',
            } as any,
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          layout: { padding: { top: 16, bottom: 4 } },
          plugins: {
            legend: { display: false },
            tooltip: {
              mode: 'index' as const,
              backgroundColor: 'rgba(15,23,42,0.88)',
              titleFont: { size: 12, weight: 'bold' },
              bodyFont: { size: 11 },
              padding: 12,
              callbacks: {
                title: ctx => data[ctx[0].dataIndex]?.indexName ?? '',
                label: ctx => {
                  const idx = data[ctx.dataIndex];
                  const total = idx.indexScans + idx.seqScans;
                  const usagePct = total > 0 ? Math.round(idx.indexScans / total * 100) : 0;
                  if (ctx.datasetIndex === 0) {
                    return [
                      `  Tabla: ${idx.tableName}`,
                      `  Búsquedas rápidas: ${idx.indexScans.toLocaleString('es-MX')}`,
                    ];
                  } else {
                    return [
                      `  Búsquedas lentas: ${idx.seqScans.toLocaleString('es-MX')}`,
                      `  Eficiencia real: ${idx.efficiencyPct.toFixed(1)}%`,
                      `  De cada 100 búsquedas, ${usagePct} usan el índice`,
                    ];
                  }
                },
              },
            },
          },
          scales: {
            x: {
              stacked: true,
              ticks: {
                font: { size: 10, family: "'Courier New', monospace" },
                color: '#64748b',
                maxRotation: 35,
                minRotation: 25,
              },
              grid: { display: false },
              border: { display: false },
            },
            y: {
              stacked: true,
              beginAtZero: true,
              ticks: {
                font: { size: 10 },
                color: '#94a3b8',
                maxTicksLimit: 6,
                callback: (v: any) => {
                  const n = Number(v);
                  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
                  if (n >= 1000) return (n / 1000).toFixed(0) + 'k';
                  return Number.isInteger(n) ? n : '';
                },
              },
              grid: { color: 'rgba(0,0,0,0.05)' },
              border: { display: false },
            },
          },
        },
      });
    }
  }

  /**
   * Devuelve el TPS formateado para mostrar en UI.
   * -1 significa "primera llamada, aún calculando".
   */
  formatTps(): string {
    const tps = this.metrics?.performance?.tps;
    if (tps === undefined || tps === null || tps === -1) return 'Calculando…';
    return tps.toString();
  }

  /**
   * Convierte segundos en un texto legible: "hace X min", "hace X seg", etc.
   */
  formatSecondsAgo(seconds: number): string {
    if (seconds < 60)   return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`;
  }

  // ── TrackBy helpers ───────────────────────────────────────────────────

  trackByTable(i: number, t: TableHealth): string  { return t.tableName; }
  trackByIndex(i: number, x: IndexUsage): string   { return x.indexName; }
  trackByAlert(i: number, a: DbAlert): string      { return a.id; }

  // ── Filtros, ordenamiento y paginación — TABLAS ───────────────────────

  /** Pipeline completo: filtrar → ordenar → paginar */
  get filteredTables(): TableHealth[] {
    let rows = this.metrics?.tableHealth ?? [];

    // 1. Ocultar tablas sin actividad
    if (this.tableOnlyActive) {
      rows = rows.filter(t => t.estimatedRows > 0 || t.deadTuples > 0);
    }
    // 2. Búsqueda por nombre
    const q = this.tableSearch.toLowerCase().trim();
    if (q) rows = rows.filter(t => t.tableName.toLowerCase().includes(q));
    // 3. Filtro por estado
    if (this.tableStatusFilter !== 'all') {
      rows = rows.filter(t => t.status === this.tableStatusFilter);
    }
    // 4. Ordenamiento
    if (this.tableSortCol) {
      const col = this.tableSortCol;
      const asc = this.tableSortAsc ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const va = a[col] as number | string;
        const vb = b[col] as number | string;
        return va < vb ? -asc : va > vb ? asc : 0;
      });
    }
    return rows;
  }

  get pagedTables(): TableHealth[] {
    const start = this.tablePage * this.TABLE_PAGE_SIZE;
    return this.filteredTables.slice(start, start + this.TABLE_PAGE_SIZE);
  }

  get tableTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTables.length / this.TABLE_PAGE_SIZE));
  }

  get tablePageEnd(): number {
    return Math.min((this.tablePage + 1) * this.TABLE_PAGE_SIZE, this.filteredTables.length);
  }

  get tablePageNumbers(): number[] {
    return Array.from({ length: this.tableTotalPages }, (_, i) => i);
  }

  sortTable(col: keyof TableHealth): void {
    if (this.tableSortCol === col) {
      this.tableSortAsc = !this.tableSortAsc;
    } else {
      this.tableSortCol = col;
      this.tableSortAsc = true;
    }
    this.tablePage = 0;
  }

  onTableFilterChange(): void { this.tablePage = 0; }

  // ── Filtros y paginación — ÍNDICES ────────────────────────────────────

  get filteredIndexes(): IndexUsage[] {
    let rows = this.metrics?.indexUsage ?? [];
    const q = this.indexSearch.toLowerCase().trim();
    if (q) rows = rows.filter(x =>
      x.indexName.toLowerCase().includes(q) || x.tableName.toLowerCase().includes(q)
    );
    if (this.indexStatusFilter !== 'all') {
      rows = rows.filter(x => x.status === this.indexStatusFilter);
    }
    return rows;
  }

  get pagedIndexes(): IndexUsage[] {
    const start = this.indexPage * this.INDEX_PAGE_SIZE;
    return this.filteredIndexes.slice(start, start + this.INDEX_PAGE_SIZE);
  }

  get indexTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredIndexes.length / this.INDEX_PAGE_SIZE));
  }

  get indexPageNumbers(): number[] {
    return Array.from({ length: this.indexTotalPages }, (_, i) => i);
  }

  onIndexFilterChange(): void { this.indexPage = 0; }

  // ── Paginación — Sesiones de usuario ─────────────────────────────────

  get allSessions(): UserSession[] {
    return this.metrics?.connections?.userSessions ?? [];
  }

  get pagedSessions(): UserSession[] {
    const start = this.sessionPage * this.SESSION_PAGE_SIZE;
    return this.allSessions.slice(start, start + this.SESSION_PAGE_SIZE);
  }

  get sessionTotalPages(): number {
    return Math.max(1, Math.ceil(this.allSessions.length / this.SESSION_PAGE_SIZE));
  }

  get sessionPageNumbers(): number[] {
    return Array.from({ length: this.sessionTotalPages }, (_, i) => i);
  }

  get sessionPageEnd(): number {
    return Math.min((this.sessionPage + 1) * this.SESSION_PAGE_SIZE, this.allSessions.length);
  }

  /** Trunca el nombre a máximo `max` caracteres */
  truncate(name: string, max = 35): string {
    return name.length > max ? name.substring(0, max) + '…' : name;
  }

  // ── Cálculo de bloat% corregido en frontend ───────────────────────────

  /** dead / (live + dead) × 100; devuelve 0 si total < 10 */
  calcBloat(live: number, dead: number): number {
    if (live + dead < 10) return 0;
    return Math.round((dead / (live + dead)) * 1000) / 10; // 1 decimal
  }

  /** Umbral de estado basado en dead tuples absolutos + porcentaje de bloat.
   *  Umbrales unificados con DatabaseMonitoringService.calculateTableStatus (backend):
   *  critical: dead > 20 AND bloat > 30%
   *  warning:  dead > 10 AND bloat > 20%
   *  optimal:  el resto
   */
  calcTableStatus(live: number, dead: number): TableHealth['status'] {
    if (live + dead === 0) return 'optimal';
    const bloatPct = dead / (live + dead) * 100;
    if (dead > 20 && bloatPct > 30) return 'critical';
    if (dead > 10 && bloatPct > 20) return 'warning';
    return 'optimal';
  }

  // ── Helpers visuales de datos ─────────────────────────────────────────

  /** Formatea uptime: si < 1 día, muestra horas */
  formatUptime(days: number | undefined): string {
    if (days == null) return '—';
    if (days < 1) return '< 1 día';
    return `${days} día${days !== 1 ? 's' : ''}`;
  }

  /** Formatea tiempo de respuesta con 2 decimales */
  formatMs(ms: number | undefined): string {
    if (ms == null) return '—';
    return ms.toFixed(2) + ' ms';
  }

  /** Formatea bytes como MB o GB con unidad */
  formatBytes(bytes: number | undefined): string {
    if (bytes == null) return '—';
    const gb = bytes / (1024 ** 3);
    if (gb >= 1) return gb.toFixed(2) + ' GB';
    const mb = bytes / (1024 ** 2);
    if (mb >= 1) return mb.toFixed(2) + ' MB';
    return (bytes / 1024).toFixed(1) + ' KB';
  }

  // ── Etiquetas ─────────────────────────────────────────────────────────

  tableStatusLabel(status: TableHealth['status']): string {
    return status === 'optimal' ? 'Óptimo' : status === 'warning' ? 'Advertencia' : 'Atención';
  }

  indexStatusLabel(status: IndexUsage['status']): string {
    const map: Record<IndexUsage['status'], string> = {
      'active':         'En uso',
      'unused':         'Sin uso',
      'low-efficiency': 'Eficiencia baja',
    };
    return map[status];
  }

  // ── Helpers de formato ────────────────────────────────────────────────

  toMBValue(bytes: number | null | undefined): string {
    if (bytes == null) return '—';
    const mb = bytes / (1024 * 1024);
    return mb >= 1 ? mb.toFixed(2) + ' MB' : (bytes / 1024).toFixed(1) + ' KB';
  }

  formatRows(n: number | null | undefined): string {
    if (n == null) return '—';
    return n.toLocaleString('es-MX');
  }

  formatDate(dt: string | null): string {
    if (!dt) return 'Nunca';
    try {
      return new Date(dt).toLocaleString('es-MX', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      });
    } catch { return dt; }
  }

  alertCount(level: DbAlert['level']): number {
    return this.metrics?.alerts.filter(a => a.level === level).length ?? 0;
  }
}
