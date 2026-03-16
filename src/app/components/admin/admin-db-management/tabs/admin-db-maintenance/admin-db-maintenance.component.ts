import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import {
  DbMaintenanceService,
  TableMaintenance,
} from '../../../../../services/db-maintenance.service';

export interface ToastNotification {
  type:      'success' | 'error';
  title:     string;
  message:   string;
  operation: string;
  table:     string;
  visible:   boolean;
  closing:   boolean;   // true mientras se aplica la animación de salida
}

@Component({
  selector: 'app-admin-db-maintenance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-db-maintenance.component.html',
  styleUrls: ['../shared-tab.css'],
})
export class AdminDbMaintenanceComponent implements OnInit, OnDestroy {

  stats:   TableMaintenance[] = [];
  loading  = false;
  error:   string | null = null;

  toast: ToastNotification | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  /** Spinner por tabla: true mientras esa tabla está siendo procesada */
  isVacuuming:  Record<string, boolean> = {};
  isReindexing: Record<string, boolean> = {};

  private destroy$ = new Subject<void>();

  constructor(private maintenanceService: DbMaintenanceService) {}

  ngOnInit(): void {
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.toastTimer) clearTimeout(this.toastTimer);
  }

  /** Muestra el toast y lo cierra automáticamente después de `ms` milisegundos */
  private showToast(type: 'success' | 'error', title: string, message: string,
                    operation: string, table: string, ms = 5000): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { type, title, message, operation, table, visible: true, closing: false };

    // Al llegar al tiempo, lanzar animación de salida (400 ms) y luego ocultar
    this.toastTimer = setTimeout(() => {
      this.dismissToast();
    }, ms);
  }

  /** Cierra el toast con animación de salida */
  dismissToast(): void {
    if (!this.toast) return;
    this.toast = { ...this.toast, closing: true };
    setTimeout(() => { this.toast = null; }, 400);
  }

  /** Carga estadísticas de dead tuples desde el backend */
  loadStats(): void {
    this.loading = true;
    this.error   = null;
    this.maintenanceService.getStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  (data) => { this.stats = data; this.loading = false; },
        error: (err)  => {
          this.error   = err?.error?.message ?? 'No se pudo conectar al servidor.';
          this.loading = false;
        }
      });
  }

  /** Ejecuta VACUUM ANALYZE en la tabla indicada y refresca estadísticas */
  runVacuum(tableName: string): void {
    this.isVacuuming  = { ...this.isVacuuming,  [tableName]: true };
    this.error        = null;
    this.maintenanceService.runVacuum(tableName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.isVacuuming = { ...this.isVacuuming, [tableName]: false };
          this.showToast('success', 'Operación completada', result.message,
                         'VACUUM ANALYZE', tableName);
          this.loadStats();
        },
        error: (err) => {
          this.isVacuuming = { ...this.isVacuuming, [tableName]: false };
          const msg = err?.error?.message ?? `Error al ejecutar VACUUM en '${tableName}'.`;
          this.showToast('error', 'Error en VACUUM', msg, 'VACUUM ANALYZE', tableName, 8000);
        }
      });
  }

  /** Ejecuta REINDEX TABLE en la tabla indicada y refresca estadísticas */
  runReindex(tableName: string): void {
    this.isReindexing  = { ...this.isReindexing,  [tableName]: true };
    this.error         = null;
    this.maintenanceService.runReindex(tableName)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.isReindexing = { ...this.isReindexing, [tableName]: false };
          this.showToast('success', 'Operación completada', result.message,
                         'REINDEX TABLE', tableName);
          this.loadStats();
        },
        error: (err) => {
          this.isReindexing = { ...this.isReindexing, [tableName]: false };
          const msg = err?.error?.message ?? `Error al ejecutar REINDEX en '${tableName}'.`;
          this.showToast('error', 'Error en REINDEX', msg, 'REINDEX TABLE', tableName, 8000);
        }
      });
  }

  /** Devuelve true si cualquier operación está en curso (para deshabilitar Actualizar) */
  get anyOperationRunning(): boolean {
    return Object.values(this.isVacuuming).some(v => v) ||
           Object.values(this.isReindexing).some(v => v);
  }

  /** Formatea número de tuplas con separador de miles */
  formatTuples(n: number): string {
    return n.toLocaleString('es-GT');
  }
}
