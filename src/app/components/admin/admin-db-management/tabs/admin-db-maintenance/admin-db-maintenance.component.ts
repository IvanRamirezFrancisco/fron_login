import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, takeUntil, firstValueFrom } from 'rxjs';
import {
  DbMaintenanceService,
  TableMaintenance,
  AutovacuumSetting,
  MaintenanceIndex,
  MaintenanceLogEntry,
  MaintenanceAutomationConfig,
} from '../../../../../services/db-maintenance.service';
import { DatabaseStateService } from '../../../../../services/database-state.service';
import { NotificationCenterService } from '../../../../../core/services/notification-center.service';

// ── Interfaces locales ────────────────────────────────────────────────────────

export interface ToastNotification {
  type:      'success' | 'error';
  title:     string;
  message:   string;
  operation: string;
  table:     string;
  visible:   boolean;
  closing:   boolean;
}

/** Estado de un botón de acción por fila: idle / loading / success / error */
export type RowBtnState = 'idle' | 'loading' | 'ok' | 'err';

/** Tooltip flotante global */
export interface GlobalTooltip {
  text:    string;
  x:       number;   // px desde left del viewport
  y:       number;   // px desde top del viewport
  visible: boolean;
}

/** Diálogo de confirmación individual para VACUUM */
export interface VacuumConfirmDialog {
  tableName:   string;
  deadTuples:  number;
  bloatPercent: number;
}

/** Diálogo de confirmación para toggle de automatización */
export interface AutomationToggleDialog {
  pendingEnabled: boolean;
}

@Component({
  selector: 'app-admin-db-maintenance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-db-maintenance.component.html',
  styleUrls: ['./admin-db-maintenance.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDbMaintenanceComponent implements OnInit, OnDestroy {

  // ── Salida: navegación a Automatizaciones ─────────────────────────────────
  @Output() navigateToAutomations = new EventEmitter<void>();

  // ── Datos ─────────────────────────────────────────────────────────────────
  stats:              TableMaintenance[]    = [];
  indexes:            MaintenanceIndex[]    = [];
  autovacuumSettings: AutovacuumSetting[]   = [];
  maintenanceHistory: MaintenanceLogEntry[] = [];

  // ── Estado de carga ───────────────────────────────────────────────────────
  loading  = false;
  error:   string | null = null;

  // ── Filtro de tablas (Sección 2) ──────────────────────────────────────────
  showOnlyProblematic = true;  // activado por defecto

  // ── Progreso global Vacuum a todas ────────────────────────────────────────
  bulkVacuumRunning   = false;
  bulkVacuumProgress  = 0;   // 0-100
  bulkVacuumTotal     = 0;
  bulkVacuumDone      = 0;

  // ── Dialog de confirmación bulk vacuum ────────────────────────────────────
  confirmDialogVisible = false;

  // ── Dialog de confirmación VACUUM individual ──────────────────────────────
  vacuumConfirmDialog: VacuumConfirmDialog | null = null;

  // ── Tooltip flotante global ───────────────────────────────────────────────
  tooltip: GlobalTooltip = { text: '', x: 0, y: 0, visible: false };
  private tooltipHideTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Estados de botones por fila ───────────────────────────────────────────
  /** key: tableName, value: estado del botón Vacuum */
  vacuumState:   Record<string, RowBtnState> = {};
  /** key: tableName, value: estado del botón Analyze */
  analyzeState:  Record<string, RowBtnState> = {};
  /** key: indexName, value: estado del botón Reindex */
  reindexState:  Record<string, RowBtnState> = {};

  // ── Automatización ────────────────────────────────────────────────────────
  automationConfig:       MaintenanceAutomationConfig | null = null;
  automationLoading      = false;
  automationSaving       = false;
  automationRunNowLoading = false;
  automationToggleDialog: AutomationToggleDialog | null = null;

  // Campos editables del formulario de automatización
  editFrequencyHours         = 6;
  editPreferredHour          = 2;
  editDeadTupleThreshold     = 20;
  editBloatThreshold         = 30;

  // Análisis masivo
  bulkAnalyzeRunning = false;

  // ── Panel de alertas colapsable ───────────────────────────────────────────
  alertsPanelOpen = true;   // abierto por defecto para que las alertas sean visibles

  // ── Toast ─────────────────────────────────────────────────────────────────
  toast: ToastNotification | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Hysteresis: debounce temporal + consenso de N lecturas consecutivas ──
  /**
   * Badge changes only when:
   *   1. The last HYSTERESIS_REQUIRED_CONSECUTIVE readings are all identical, AND
   *   2. At least HYSTERESIS_MIN_CHANGE_MS ms have passed since the last change.
   */
  private readonly HYSTERESIS_MIN_CHANGE_MS        = 2 * 60 * 1000; // 2 min
  private readonly HYSTERESIS_REQUIRED_CONSECUTIVE = 3;
  private hysteresisMap = new Map<string, {
    history:       TableMaintenance['status'][];
    currentState:  TableMaintenance['status'];
    lastChangedAt: number;
  }>();

  private destroy$ = new Subject<void>();

  /** Tablas sin VACUUM cuya notificación ya se emitió (una sola vez por sesión) */
  // ⚠️ El Set vive ahora en NotificationCenterService (singleton) para sobrevivir
  //    al destroy/recreate del componente al cambiar de pestaña.

  constructor(
    private maintenanceService: DbMaintenanceService,
    private cdr:                ChangeDetectorRef,
    private dbState:            DatabaseStateService,
    private notifService:       NotificationCenterService,
  ) {}

  ngOnInit(): void { this.loadAll(); }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.tooltipHideTimer) clearTimeout(this.tooltipHideTimer);
  }

  // ── Carga de datos ────────────────────────────────────────────────────────

  loadAll(): void {
    this.loading = true;
    this.error   = null;
    forkJoin({
      stats:      this.maintenanceService.getStats(),
      indexes:    this.maintenanceService.getProblematicIndexes(),
      avSettings: this.maintenanceService.getAutovacuumSettings(),
      history:    this.maintenanceService.getHistory(),
      automation: this.maintenanceService.getAutomationConfig(),
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ({ stats, indexes, avSettings, history, automation }) => {
        this.stats              = this.sortStats(stats).map(t => ({
          ...t,
          status: this.getStableStatus(t.tableName, t.status),
        }));
        this.indexes            = indexes;
        this.autovacuumSettings = avSettings;
        this.maintenanceHistory = history;
        this.applyAutomationConfig(automation);
        this.loading            = false;
        // Notificar tablas sin VACUUM por >7 días (una sola vez por sesión)
        this.checkOverdueTables(this.stats);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.error   = err?.error?.message ?? 'No se pudo conectar al servidor.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** Ordena: critical → warning → ok, dentro de cada grupo por deadTuples desc */
  private sortStats(data: TableMaintenance[]): TableMaintenance[] {
    const order = { critical: 0, warning: 1, ok: 2 };
    return [...data].sort((a, b) => {
      const o = order[a.status] - order[b.status];
      return o !== 0 ? o : b.deadTuples - a.deadTuples;
    });
  }

  /**
   * Evalúa tablas sin VACUUM en >7 días con dead tuples.
   * Solo notifica UNA VEZ por sesión gracias al Set de control.
   * Se llama en loadAll() (carga inicial), no en cada refresh.
   */
  private checkOverdueTables(tables: TableMaintenance[]): void {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    for (const table of tables) {
      const lastVacuum = table.lastVacuum
                         ? new Date(table.lastVacuum).getTime()
                         : 0;
      const isOverdue  = lastVacuum < sevenDaysAgo && table.deadTuples > 10;

      if (isOverdue && !this.notifService.isTableNotified(table.tableName)) {
        this.notifService.push({
          level:              'warning',
          category:           'database',
          title:              `Tabla sin mantenimiento: ${table.tableName}`,
          message:            `${table.deadTuples} registros obsoletos. Sin VACUUM en más de 7 días.`,
          persistent:         false,
          actionRoute:        '/admin/gestion-db',
          actionQueryParams:  { tab: 'maintenance' },
          actionLabel:        'Ejecutar VACUUM',
        });
        this.notifService.addNotifiedTable(table.tableName);
      }
    }
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
    newStatus: TableMaintenance['status'],
  ): TableMaintenance['status'] {
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

  // ── KPIs (Sección 1) ──────────────────────────────────────────────────────

  get criticalTablesCount(): number {
    return this.stats.filter(t => t.deadTuples > 20 && t.bloatPercent > 30).length;
  }

  get obsoleteTablesCount(): number {
    return this.stats.filter(t => t.deadTuples > 0).length;
  }

  get lowEfficiencyIndexCount(): number {
    return this.indexes.filter(i =>
      i.efficiency_pct < 75 &&
      (i.idx_scan + i.seq_scan) > 100 &&
      i.seq_scan > 10
    ).length;
  }

  get autovacuumActive(): boolean {
    const setting = this.autovacuumSettings.find(s => s.name === 'autovacuum');
    return setting?.setting === 'on';
  }

  // ── Tablas filtradas para Sección 2 ───────────────────────────────────────

  /**
   * Con el filtro activo muestra TODAS las tablas donde deadTuples > 0
   * (coincide exactamente con lo que cuenta el KPI "Tablas con obsoletos").
   * Sin filtro muestra todas las recibidas del backend.
   */
  get visibleStats(): TableMaintenance[] {
    if (this.showOnlyProblematic) {
      return this.stats.filter(t => t.deadTuples > 0);
    }
    return this.stats;
  }

  get criticalTablesBanner(): TableMaintenance[] {
    return this.stats.filter(t => t.deadTuples > 20 && t.bloatPercent > 30);
  }

  toggleProblematicFilter(): void {
    this.showOnlyProblematic = !this.showOnlyProblematic;
    this.cdr.markForCheck();
  }

  // ── Índices para Sección 3 ────────────────────────────────────────────────

  /**
   * Los índices ya vienen filtrados desde el backend con las 3 condiciones
   * estrictas. El getter simplemente expone la lista tal cual.
   */
  get problematicIndexes(): MaintenanceIndex[] {
    return this.indexes;
  }

  /** Genera el texto de "Problema detectado" para cada índice */
  indexProblemDesc(idx: MaintenanceIndex): string {
    const total  = idx.idx_scan + idx.seq_scan;
    const seqPct = total > 0 ? Math.round(idx.seq_scan / total * 100) : 0;
    if (idx.idx_scan === 0) {
      return `${this.formatNum(idx.seq_scan)} búsquedas ignoraron este índice en la última sesión`;
    }
    if (idx.efficiency_pct < 10) {
      return `${this.formatNum(idx.seq_scan)} búsquedas ignoraron este índice de ${this.formatNum(total)} totales (${seqPct}% de pérdida)`;
    }
    return `${this.formatNum(idx.seq_scan)} búsquedas lentas de ${this.formatNum(total)} totales (${seqPct}% de pérdida de rendimiento)`;
  }

  // ── Tooltip flotante global ───────────────────────────────────────────────

  showTooltip(event: MouseEvent | FocusEvent, text: string): void {
    if (this.tooltipHideTimer) { clearTimeout(this.tooltipHideTimer); this.tooltipHideTimer = null; }
    const target = event.currentTarget as HTMLElement;
    const rect   = target.getBoundingClientRect();
    this.tooltip = {
      text,
      x:       rect.left + rect.width / 2,
      y:       rect.top - 10,
      visible: true,
    };
    this.cdr.markForCheck();
  }

  hideTooltip(): void {
    this.tooltipHideTimer = setTimeout(() => {
      this.tooltip = { ...this.tooltip, visible: false };
      this.cdr.markForCheck();
    }, 120);
  }

  // ── Diálogo VACUUM individual ─────────────────────────────────────────────

  /** Nombre de tabla válido: solo letras minúsculas, números y guiones bajos */
  private isValidTableName(name: string): boolean {
    return /^[a-z_][a-z0-9_]{0,62}$/.test(name);
  }

  openVacuumConfirm(t: TableMaintenance): void {
    if (!this.isValidTableName(t.tableName)) {
      this.showToast('error', 'Nombre de tabla inválido',
        'El nombre de tabla contiene caracteres no permitidos.', 'VACUUM ANALYZE', t.tableName, 6000);
      return;
    }
    this.vacuumConfirmDialog = {
      tableName:    t.tableName,
      deadTuples:   t.deadTuples,
      bloatPercent: t.bloatPercent,
    };
    this.cdr.markForCheck();
  }

  cancelVacuumConfirm(): void {
    this.vacuumConfirmDialog = null;
    this.cdr.markForCheck();
  }

  confirmVacuum(): void {
    if (!this.vacuumConfirmDialog) return;
    const tableName = this.vacuumConfirmDialog.tableName;
    this.vacuumConfirmDialog = null;
    this.executeVacuum(tableName);
    this.cdr.markForCheck();
  }

  // ── Acciones por fila (Sección 2) ─────────────────────────────────────────

  runVacuum(tableName: string): void {
    // Solicita confirmación — la ejecución real se dispara desde confirmVacuum()
    const t = this.stats.find(s => s.tableName === tableName);
    if (t) { this.openVacuumConfirm(t); }
  }

  private executeVacuum(tableName: string): void {
    this.vacuumState = { ...this.vacuumState, [tableName]: 'loading' };
    this.cdr.markForCheck();
    this.maintenanceService.runVacuum(tableName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.vacuumState = { ...this.vacuumState, [tableName]: 'ok' };
          this.showToast('success', 'VACUUM completado', res.message, 'VACUUM ANALYZE', tableName);
          this.dbState.pushMaintenanceSnapshot(res, 'VACUUM_ANALYZE', tableName);
          // Notificar éxito de VACUUM
          this.notifService.push({
            level:             'success',
            category:          'database',
            title:             `VACUUM completado: ${tableName}`,
            message:           res.message || `Mantenimiento ejecutado exitosamente en ${tableName}.`,
            persistent:        false,
            actionRoute:       '/admin/gestion-db',
            actionQueryParams: { tab: 'maintenance' },
            actionLabel:       'Ver historial',
          });
          this.cdr.markForCheck();
          // After 2 s show "completed" then reload — row disappears if dead=0
          setTimeout(() => {
            this.vacuumState = { ...this.vacuumState, [tableName]: 'idle' };
            this.reloadStats();
            this.reloadHistory();
          }, 2000);
        },
        error: (err) => {
          this.vacuumState = { ...this.vacuumState, [tableName]: 'err' };
          this.showToast('error', 'Error en VACUUM', err?.error?.message ?? 'Error desconocido', 'VACUUM ANALYZE', tableName, 8000);
          this.cdr.markForCheck();
          setTimeout(() => {
            this.vacuumState = { ...this.vacuumState, [tableName]: 'idle' };
            this.cdr.markForCheck();
          }, 3000);
        },
      });
  }

  // runAnalyze per-row: exposed in UI with state machine
  runRowAnalyze(tableName: string): void {
    if (!this.isValidTableName(tableName)) return;
    this.analyzeState = { ...this.analyzeState, [tableName]: 'loading' };
    this.cdr.markForCheck();
    this.maintenanceService.runAnalyze(tableName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.analyzeState = { ...this.analyzeState, [tableName]: 'ok' };
          this.showToast('success', 'ANALYZE completado', res.message, 'ANALYZE', tableName);
          this.dbState.pushMaintenanceSnapshot(res, 'ANALYZE', tableName);
          this.cdr.markForCheck();
          this.scheduleResetBtn('analyze', tableName);
          this.reloadHistory();
        },
        error: (err) => {
          this.analyzeState = { ...this.analyzeState, [tableName]: 'err' };
          this.showToast('error', 'Error en ANALYZE', err?.error?.message ?? 'Error desconocido', 'ANALYZE', tableName, 8000);
          this.cdr.markForCheck();
          this.scheduleResetBtn('analyze', tableName);
        },
      });
  }

  runBulkAnalyze(): void {
    if (this.bulkAnalyzeRunning) return;
    this.bulkAnalyzeRunning = true;
    this.cdr.markForCheck();
    this.maintenanceService.runAnalyzeAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.bulkAnalyzeRunning = false;
          this.showToast('success', 'ANALYZE global completado', res.message, 'ANALYZE (todas)', '', 5000);
          this.cdr.markForCheck();
          this.reloadHistory();
        },
        error: (err) => {
          this.bulkAnalyzeRunning = false;
          this.showToast('error', 'Error en ANALYZE', err?.error?.message ?? 'Error desconocido', 'ANALYZE (todas)', '', 8000);
          this.cdr.markForCheck();
        },
      });
  }

  runReindex(indexName: string, tableName: string): void {
    this.reindexState = { ...this.reindexState, [indexName]: 'loading' };
    this.maintenanceService.runReindex(tableName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.reindexState = { ...this.reindexState, [indexName]: 'ok' };
          this.showToast('success', 'REINDEX completado', res.message, 'REINDEX TABLE', tableName);
          this.dbState.pushMaintenanceSnapshot(res, 'REINDEX', tableName);
          this.scheduleResetBtn('reindex', indexName);
          this.reloadIndexes();
          this.reloadHistory();
        },
        error: (err) => {
          this.reindexState = { ...this.reindexState, [indexName]: 'err' };
          this.showToast('error', 'Error en REINDEX', err?.error?.message ?? 'Error desconocido', 'REINDEX TABLE', tableName, 8000);
          this.scheduleResetBtn('reindex', indexName);
          this.cdr.markForCheck();
        },
      });
    this.cdr.markForCheck();
  }

  /** Resetea el estado de un botón a 'idle' después de 3 seg */
  private scheduleResetBtn(type: 'vacuum' | 'analyze' | 'reindex', key: string): void {
    setTimeout(() => {
      if (type === 'vacuum')   this.vacuumState  = { ...this.vacuumState,  [key]: 'idle' };
      if (type === 'analyze')  this.analyzeState = { ...this.analyzeState, [key]: 'idle' };
      if (type === 'reindex')  this.reindexState = { ...this.reindexState, [key]: 'idle' };
      this.cdr.markForCheck();
    }, 3000);
  }

  isRowBusy(tableName: string): boolean {
    return this.vacuumState[tableName] === 'loading';
  }

  isIndexBusy(indexName: string): boolean {
    return this.reindexState[indexName] === 'loading';
  }

  // ── Vacuum a todas (Sección 2) ────────────────────────────────────────────

  openBulkVacuumDialog(): void {
    this.confirmDialogVisible = true;
    this.cdr.markForCheck();
  }

  cancelBulkVacuum(): void {
    this.confirmDialogVisible = false;
    this.cdr.markForCheck();
  }

  async confirmBulkVacuum(): Promise<void> {
    this.confirmDialogVisible = false;
    const tables = this.visibleStats.map(t => t.tableName);
    this.bulkVacuumRunning  = true;
    this.bulkVacuumTotal    = tables.length;
    this.bulkVacuumDone     = 0;
    this.bulkVacuumProgress = 0;
    this.cdr.markForCheck();

    for (const tableName of tables) {
      this.vacuumState = { ...this.vacuumState, [tableName]: 'loading' };
      this.cdr.markForCheck();
      await firstValueFrom(this.maintenanceService.runVacuum(tableName)).catch(() => null);
      this.vacuumState = { ...this.vacuumState, [tableName]: 'ok' };
      this.bulkVacuumDone++;
      this.bulkVacuumProgress = Math.round(this.bulkVacuumDone / this.bulkVacuumTotal * 100);
      this.cdr.markForCheck();
    }

    this.bulkVacuumRunning = false;
    this.showToast('success', 'VACUUM completado', `Se ejecutó VACUUM ANALYZE en ${tables.length} tablas.`, 'VACUUM ANALYZE (todas)', '', 6000);
    setTimeout(() => {
      tables.forEach(t => { this.vacuumState = { ...this.vacuumState, [t]: 'idle' }; });
    }, 3000);
    this.reloadStats();
    this.reloadHistory();
  }

  // ── Reindex a índices con problemas (Sección 3) ───────────────────────────

  async runBulkReindex(): Promise<void> {
    const idxs = this.problematicIndexes;
    for (const idx of idxs) {
      if (this.reindexState[idx.index_name] === 'loading') continue;
      this.reindexState = { ...this.reindexState, [idx.index_name]: 'loading' };
      this.cdr.markForCheck();
      await firstValueFrom(this.maintenanceService.runReindex(idx.table_name)).catch(() => null);
      this.reindexState = { ...this.reindexState, [idx.index_name]: 'ok' };
      this.cdr.markForCheck();
    }
    this.showToast('success', 'REINDEX completado', `Se reconstruyeron ${idxs.length} índices.`, 'REINDEX (batch)', '', 5000);
    setTimeout(() => {
      idxs.forEach(i => { this.reindexState = { ...this.reindexState, [i.index_name]: 'idle' }; });
    }, 3000);
    this.reloadIndexes();
    this.reloadHistory();
  }

  // ── Recarga parcial ───────────────────────────────────────────────────────

  private reloadStats(): void {
    this.maintenanceService.getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.stats = this.sortStats(data).map(t => ({
            ...t,
            status: this.getStableStatus(t.tableName, t.status),
          }));
          this.cdr.markForCheck();
        },
        error: () => {},
      });
  }

  private reloadIndexes(): void {
    this.maintenanceService.getProblematicIndexes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.indexes = data; this.cdr.markForCheck(); },
        error: () => {},
      });
  }

  private reloadHistory(): void {
    this.maintenanceService.getHistory()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => { this.maintenanceHistory = data; this.cdr.markForCheck(); },
        error: () => {},
      });
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  private showToast(type: 'success' | 'error', title: string, message: string,
                    operation: string, table: string, ms = 5000): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { type, title, message, operation, table, visible: true, closing: false };
    this.toastTimer = setTimeout(() => this.dismissToast(), ms);
    this.cdr.markForCheck();
  }

  dismissToast(): void {
    if (!this.toast) return;
    this.toast = { ...this.toast, closing: true };
    this.cdr.markForCheck();
    setTimeout(() => { this.toast = null; this.cdr.markForCheck(); }, 400);
  }

  // ── Helpers de formato y color ────────────────────────────────────────────

  formatNum(n: number): string {
    return n.toLocaleString('es-GT');
  }

  readonly Math = Math;

  truncate(s: string, max = 32): string {
    return s.length > max ? s.slice(0, max) + '…' : s;
  }

  bloatBarColor(pct: number): 'green' | 'amber' | 'red' {
    if (pct > 30) return 'red';
    if (pct >= 10) return 'amber';
    return 'green';
  }

  effColor(pct: number): 'green' | 'amber' | 'red' {
    if (pct >= 90) return 'green';
    if (pct >= 75) return 'amber';
    return 'red';
  }

  /**
   * Etiqueta de estado específica para el módulo de Mantenimiento.
   *   critical (dead > 20 AND bloat > 30%) → "Acción urgente"
   *   warning  (dead > 5  AND bloat > 20%) → "Recomendado"
   *   ok       (cualquier otro con dead > 0) → "Puede esperar"
   */
  maintenanceStatusLabel(status: 'ok' | 'warning' | 'critical'): string {
    if (status === 'critical') return 'Acción urgente';
    if (status === 'warning')  return 'Recomendado';
    return 'Puede esperar';
  }

  /**
   * Calcula el status de mantenimiento a partir de los datos de la fila.
   * Usado tanto para el badge de estado como para el color del botón.
   */
  maintenanceStatus(t: TableMaintenance): 'critical' | 'warning' | 'ok' {
    if (t.deadTuples > 20 && t.bloatPercent > 30) return 'critical';
    if (t.deadTuples > 5  && t.bloatPercent > 20) return 'warning';
    return 'ok';
  }

  /**
   * Ancho de la mini barra de bloat en la columna OBSOLETOS (0-100, cap 100).
   */
  bloatBarWidth(t: TableMaintenance): number {
    return Math.min(Math.round(t.bloatPercent), 100);
  }

  /**
   * Urgency level of a table for coloring the VACUUM button — same thresholds
   * as maintenanceStatus().
   */
  vacuumUrgency(t: TableMaintenance): 'critical' | 'warning' | 'low' {
    if (t.deadTuples > 20 && t.bloatPercent > 30) return 'critical';
    if (t.deadTuples > 5  && t.bloatPercent > 20) return 'warning';
    return 'low';
  }

  /**
   * Converts a PostgreSQL timestamp string (or 'Nunca') to a human-readable
   * relative label such as "hace 2 días".
   * Returns 'Nunca' as-is.
   */
  relativeDate(raw: string): string {
    if (!raw || raw === 'Nunca') return 'Nunca';
    const date = new Date(raw);
    if (isNaN(date.getTime())) return raw;
    const diffMs  = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1)   return 'hace un momento';
    if (diffMin < 60)  return `hace ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24)    return `hace ${diffH} h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1)   return 'hace 1 día';
    if (diffD < 30)    return `hace ${diffD} días`;
    const diffM = Math.floor(diffD / 30);
    if (diffM === 1)   return 'hace 1 mes';
    return `hace ${diffM} meses`;
  }

  avParamLabel(name: string): string {
    const labels: Record<string, string> = {
      'autovacuum':                      'autovacuum',
      'autovacuum_vacuum_threshold':     'vacuum_threshold',
      'autovacuum_vacuum_scale_factor':  'vacuum_scale_factor',
      'autovacuum_naptime':              'naptime',
      'autovacuum_analyze_threshold':    'analyze_threshold',
      'autovacuum_max_workers':          'max_workers',
    };
    return labels[name] ?? name;
  }

  avParamDesc(name: string): string {
    const descs: Record<string, string> = {
      'autovacuum':                      'Estado del daemon de limpieza automática',
      'autovacuum_vacuum_threshold':     'Mínimo de obsoletos para activar vacuum',
      'autovacuum_vacuum_scale_factor':  '% de la tabla para activar vacuum',
      'autovacuum_naptime':              'Frecuencia de revisión del daemon',
      'autovacuum_analyze_threshold':    'Mínimo de cambios para ejecutar ANALYZE',
      'autovacuum_max_workers':          'Procesos paralelos máximos permitidos',
    };
    return descs[name] ?? '';
  }

  avParamValue(s: AutovacuumSetting): string {
    if (s.unit) return `${s.setting} ${s.unit}`;
    return s.setting;
  }

  /** Devuelve los 3 parámetros para la columna izquierda */
  get avLeft(): AutovacuumSetting[] {
    const names = ['autovacuum', 'autovacuum_vacuum_threshold', 'autovacuum_vacuum_scale_factor'];
    return names.map(n => this.autovacuumSettings.find(s => s.name === n) ?? { name: n, setting: '—', unit: null });
  }

  /** Devuelve los 3 parámetros para la columna derecha */
  get avRight(): AutovacuumSetting[] {
    const names = ['autovacuum_naptime', 'autovacuum_analyze_threshold', 'autovacuum_max_workers'];
    return names.map(n => this.autovacuumSettings.find(s => s.name === n) ?? { name: n, setting: '—', unit: null });
  }

  get anyOperationRunning(): boolean {
    return Object.values(this.vacuumState).some(v => v === 'loading') ||
           Object.values(this.analyzeState).some(v => v === 'loading') ||
           Object.values(this.reindexState).some(v => v === 'loading') ||
           this.bulkVacuumRunning ||
           this.bulkAnalyzeRunning ||
           this.automationRunNowLoading;
  }

  // ── Automatización (Sección 4.5) ──────────────────────────────────────────

  private applyAutomationConfig(cfg: MaintenanceAutomationConfig): void {
    this.automationConfig          = cfg;
    this.editFrequencyHours        = cfg.frequencyHours;
    this.editPreferredHour         = cfg.preferredHour;
    this.editDeadTupleThreshold    = cfg.vacuumThresholdDeadTuples;
    this.editBloatThreshold        = cfg.vacuumThresholdBloatPct;
  }

  /** Abre el diálogo de confirmación para activar/desactivar la automatización */
  openAutomationToggleDialog(pendingEnabled: boolean): void {
    if (!this.automationConfig) return;
    // Si el estado actual ya es el pendiente, no hay nada que confirmar
    if (this.automationConfig.enabled === pendingEnabled) return;
    this.automationToggleDialog = { pendingEnabled };
    this.cdr.markForCheck();
  }

  cancelAutomationToggle(): void {
    this.automationToggleDialog = null;
    this.cdr.markForCheck();
  }

  confirmAutomationToggle(): void {
    if (!this.automationToggleDialog || !this.automationConfig) return;
    const dto: MaintenanceAutomationConfig = {
      ...this.automationConfig,
      enabled:                   this.automationToggleDialog.pendingEnabled,
      frequencyHours:            this.editFrequencyHours,
      preferredHour:             this.editPreferredHour,
      vacuumThresholdDeadTuples: this.editDeadTupleThreshold,
      vacuumThresholdBloatPct:   this.editBloatThreshold,
    };
    this.automationToggleDialog = null;
    this.automationSaving       = true;
    this.cdr.markForCheck();
    this.maintenanceService.updateAutomationConfig(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.applyAutomationConfig(updated);
          this.automationSaving = false;
          const estado = updated.enabled ? 'activada' : 'desactivada';
          this.showToast('success', `Automatización ${estado}`,
            updated.enabled
              ? `El mantenimiento automático se ejecutará cada ${updated.frequencyHours}h a las ${updated.preferredHour}:00.`
              : 'El mantenimiento automático ha sido desactivado.',
            'CONFIG', '', 5000);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.automationSaving = false;
          this.showToast('error', 'Error al actualizar', err?.error?.message ?? 'No se pudo guardar la configuración.', 'CONFIG', '', 8000);
          this.cdr.markForCheck();
        },
      });
  }

  saveAutomationConfig(): void {
    if (!this.automationConfig) return;
    const dto: MaintenanceAutomationConfig = {
      ...this.automationConfig,
      frequencyHours:            this.editFrequencyHours,
      preferredHour:             this.editPreferredHour,
      vacuumThresholdDeadTuples: this.editDeadTupleThreshold,
      vacuumThresholdBloatPct:   this.editBloatThreshold,
    };
    this.automationSaving = true;
    this.cdr.markForCheck();
    this.maintenanceService.updateAutomationConfig(dto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.applyAutomationConfig(updated);
          this.automationSaving = false;
          this.showToast('success', 'Configuración guardada',
            `Próxima ejecución: ${updated.nextExecutionFormatted}.`, 'CONFIG', '', 5000);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.automationSaving = false;
          this.showToast('error', 'Error al guardar', err?.error?.message ?? 'No se pudo guardar.', 'CONFIG', '', 8000);
          this.cdr.markForCheck();
        },
      });
  }

  runAutomationNow(): void {
    if (this.automationRunNowLoading) return;
    this.automationRunNowLoading = true;
    this.cdr.markForCheck();
    this.maintenanceService.runAutomationNow()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.automationRunNowLoading = false;
          this.showToast('success', 'Ciclo ejecutado', res.message, 'AUTO VACUUM', '', 6000);
          // Notificar ejecución del scheduler automático
          this.notifService.push({
            level:             'info',
            category:          'database',
            title:             'Mantenimiento automático ejecutado',
            message:           res.message || 'Ciclo de mantenimiento automático completado.',
            persistent:        false,
            actionRoute:       '/admin/gestion-db',
            actionQueryParams: { tab: 'maintenance' },
            actionLabel:       'Ver historial',
          });
          this.cdr.markForCheck();
          // Recargar stats, historial y config para ver próxima ejecución actualizada
          this.reloadStats();
          this.reloadHistory();
          this.reloadAutomationConfig();
        },
        error: (err) => {
          this.automationRunNowLoading = false;
          this.showToast('error', 'Error en ejecución', err?.error?.message ?? 'Error desconocido.', 'AUTO VACUUM', '', 8000);
          this.cdr.markForCheck();
        },
      });
  }

  /** Lista de opciones de frecuencia */
  readonly freqOptions: { value: number; label: string }[] = [
    { value: 1,  label: '1 h'  },
    { value: 3,  label: '3 h'  },
    { value: 6,  label: '6 h'  },
    { value: 12, label: '12 h' },
    { value: 24, label: '24 h' },
  ];

  /** Horas del día para el select de hora preferida (00 - 23) */
  readonly hourOptions: number[] = Array.from({ length: 24 }, (_, i) => i);

  formatHour(h: number): string {
    return `${String(h).padStart(2, '0')}:00`;
  }

  private reloadAutomationConfig(): void {
    this.maintenanceService.getAutomationConfig()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cfg) => { this.applyAutomationConfig(cfg); this.cdr.markForCheck(); },
        error: () => {},
      });
  }

  // ── Helpers de historial (Sección 5) ─────────────────────────────────────

  histOpLabel(op: string): string {
    if (op === 'VACUUM_ANALYZE') return 'VACUUM';
    if (op === 'REINDEX')        return 'REINDEX';
    if (op === 'ANALYZE')        return 'ANALYZE';
    return op;
  }

  histOpClass(op: string): string {
    if (op === 'VACUUM_ANALYZE') return 'mnt-hist-op-badge--vacuum';
    if (op === 'REINDEX')        return 'mnt-hist-op-badge--reindex';
    if (op === 'ANALYZE')        return 'mnt-hist-op-badge--analyze';
    return '';
  }

  histResultText(entry: MaintenanceLogEntry): string {
    if (entry.operation === 'REINDEX') return 'Índice reconstruido';
    if (entry.operation === 'ANALYZE') return 'Estadísticas actualizadas';
    if (entry.rowsAffected != null && entry.rowsAffected > 0) {
      return `−${this.formatNum(entry.rowsAffected)} obsoletos`;
    }
    return 'Sin cambios';
  }

  histResultClass(entry: MaintenanceLogEntry): string {
    if (entry.operation === 'REINDEX') return 'mnt-hist-result--neutral';
    if (entry.operation === 'ANALYZE') return 'mnt-hist-result--analyze';
    return (entry.rowsAffected != null && entry.rowsAffected > 0)
      ? 'mnt-hist-result--positive'
      : 'mnt-hist-result--neutral';
  }

  histDurationLabel(ms: number): string {
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(1)} s`;
  }
}
