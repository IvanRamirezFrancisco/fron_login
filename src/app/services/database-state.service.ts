import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { DatabaseMetrics } from './db-monitoring.service';
import { MaintenanceOperationResult } from './db-maintenance.service';

/** Snapshot of the last maintenance operation, kept in memory for cross-tab display */
export interface MaintenanceSnapshot {
  operation:  string;
  targetName: string;
  status:     'SUCCESS' | 'ERROR';
  executedAt: Date;
}

/**
 * In-memory shared state between the Monitoring and Maintenance tabs.
 *
 * Design constraints (enforced here):
 * - No localStorage / sessionStorage — state is purely in-memory.
 * - Components are consumers only; they push via the public API, not via direct
 *   subject access.
 * - Hysteresis, refresh cycles and threshold constants remain the exclusive
 *   responsibility of their original components / services.
 */
@Injectable({ providedIn: 'root' })
export class DatabaseStateService {

  // ── Private state ────────────────────────────────────────────────────────

  private readonly _metrics$ = new BehaviorSubject<DatabaseMetrics | null>(null);
  private readonly _maintenanceSnapshot$ = new BehaviorSubject<MaintenanceSnapshot | null>(null);

  // ── Public observables ───────────────────────────────────────────────────

  /** Full latest metrics snapshot. */
  readonly metrics$: Observable<DatabaseMetrics | null> = this._metrics$.asObservable();

  /** Last maintenance operation snapshot. */
  readonly maintenanceSnapshot$: Observable<MaintenanceSnapshot | null> =
    this._maintenanceSnapshot$.asObservable();

  /**
   * Number of indices with insufficient data (idx_scan + seq_scan < threshold
   * or liveRows < threshold) as reported by the backend.
   * Emits only when the value actually changes.
   */
  readonly insufficientDataIndexCount$: Observable<number> = this._metrics$.pipe(
    map(m => m?.insufficientDataIndexCount ?? 0),
    distinctUntilChanged(),
  );

  /** Health score (0-100). Emits only on change. */
  readonly healthScore$: Observable<number> = this._metrics$.pipe(
    map(m => m?.healthScore ?? 0),
    distinctUntilChanged(),
  );

  /** Cache hit ratio (0-100). Emits only on change. */
  readonly cacheHitRatio$: Observable<number> = this._metrics$.pipe(
    map(m => m?.performance?.cacheHitRatio ?? m?.cacheHitRatio ?? 0),
    distinctUntilChanged(),
  );

  /**
   * ISO-formatted string of the latest vacuum among all tables, or null.
   * Derived from the `lastVacuumAny` field returned by the backend.
   */
  readonly lastVacuumAny$: Observable<string | null> = this._metrics$.pipe(
    map(m => m?.lastVacuumAny ?? null),
    distinctUntilChanged(),
  );

  // ── Synchronous snapshot accessors ──────────────────────────────────────

  /** Current insufficientDataIndexCount synchronously (for template expressions). */
  get insufficientDataIndexCount(): number {
    return this._metrics$.getValue()?.insufficientDataIndexCount ?? 0;
  }

  /** Current healthScore synchronously. */
  get healthScore(): number {
    return this._metrics$.getValue()?.healthScore ?? 0;
  }

  // ── Push API (called by components after a successful data fetch) ─────────

  /**
   * Called by AdminDbMonitoringComponent after each successful metrics refresh.
   * Updates the shared metrics state for all subscribers.
   */
  pushMetrics(data: DatabaseMetrics): void {
    this._metrics$.next(data);
  }

  /**
   * Called by AdminDbMaintenanceComponent after a successful VACUUM / REINDEX /
   * ANALYZE to let the monitoring tab reflect that maintenance has run.
   */
  pushMaintenanceSnapshot(
    result: MaintenanceOperationResult,
    operation: string,
    targetName: string,
  ): void {
    if (!result.success) return;
    this._maintenanceSnapshot$.next({
      operation,
      targetName,
      status: 'SUCCESS',
      executedAt: new Date(),
    });
  }
}
