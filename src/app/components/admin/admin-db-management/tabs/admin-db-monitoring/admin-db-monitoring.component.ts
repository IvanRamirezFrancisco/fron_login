import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { DbMonitoringService, DatabaseMetrics } from '../../../../../services/db-monitoring.service';

@Component({
  selector: 'app-admin-db-monitoring',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-db-monitoring.component.html',
  styleUrls: ['../shared-tab.css'],
})
export class AdminDbMonitoringComponent implements OnInit, OnDestroy {

  metrics: DatabaseMetrics | null = null;
  loading  = false;
  error: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(private monitoringService: DbMonitoringService) {}

  ngOnInit(): void {
    this.loadMetrics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMetrics(): void {
    this.loading = true;
    this.error   = null;
    this.monitoringService.getMetrics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  (data) => { this.metrics = data; this.loading = false; },
        error: (err)  => {
          this.error   = err?.error?.message ?? 'No se pudo conectar al servidor.';
          this.loading = false;
        }
      });
  }

  /** Convierte bytes a MB con 2 decimales (ej. "12.34 MB"). */
  toMB(bytes: number | null | undefined): string {
    if (bytes == null) return '—';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  /** Solo la parte numérica en MB (ej. "12.34"). Usar en template para separar la unidad. */
  toMBValue(bytes: number | null | undefined): string {
    if (bytes == null) return '—';
    return (bytes / (1024 * 1024)).toFixed(2);
  }

  /** Formatea número de filas con separadores de miles. */
  formatRows(n: number | null | undefined): string {
    if (n == null) return '—';
    return n.toLocaleString('es-MX');
  }
}
