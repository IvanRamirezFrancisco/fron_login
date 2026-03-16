import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, interval, takeUntil } from 'rxjs';
import {
  DatabaseBackupService,
  BackupLog,
  BackupPage
} from '../../../services/database-backup.service';

// ── Componente ────────────────────────────────────────────────────────────────

/**
 * Panel de administración de respaldos de base de datos.
 *
 * Funcionalidades:
 *  - Disparar respaldo manual → 202 Accepted → recarga historial a los 3 s
 *  - Historial paginado con estados PENDING/COMPLETED/FAILED
 *  - Auto-polling cada 8 s cuando hay respaldos PENDING en la página actual
 *  - Descarga de respaldo via URL firmada de Supabase Storage (window.open)
 *  - Modal para ver el mensaje de error de un respaldo FAILED
 *  - Notificaciones toast no intrusivas con auto-dismiss
 */
@Component({
  selector: 'app-admin-backups',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-backups.component.html',
  styleUrl: './admin-backups.component.css'
})
export class AdminBackupsComponent implements OnInit, OnDestroy {

  // ── Estado de la tabla ───────────────────────────────────────────────────
  backupPage: BackupPage | null = null;
  historyLoading  = false;
  currentPage     = 0;
  readonly PAGE_SIZE = 10;

  // ── Estado de acciones ───────────────────────────────────────────────────
  /** true mientras se espera el 202 del POST /trigger */
  isTriggering    = false;
  /** ID de fila cuya URL firmada se está cargando */
  loadingUrlId: number | null = null;

  // ── Notificación toast ───────────────────────────────────────────────────
  notification: {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  } | null = null;

  // ── Modal de confirmación de respaldo exitoso ────────────────────────────
  showSuccessModal = false;
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Modal de error ───────────────────────────────────────────────────────
  errorModal: { filename: string; message: string } | null = null;

  // ── Limpieza de observables ──────────────────────────────────────────────
  private destroy$   = new Subject<void>();
  private notifTimer: ReturnType<typeof setTimeout> | null = null;
  private reloadTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private backupService: DatabaseBackupService) {}

  // ── Ciclo de vida ─────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadHistory();
    // Auto-polling: cada 8 s refresca si hay PENDING en la página actual
    interval(8_000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.hasPending) { this.loadHistory(false); }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.notifTimer)   clearTimeout(this.notifTimer);
    if (this.reloadTimer)  clearTimeout(this.reloadTimer);
    if (this.successTimer) clearTimeout(this.successTimer);
  }

  // ── Helpers de estado ─────────────────────────────────────────────────────

  /** true si algún backup de la página actual está en PENDING */
  get hasPending(): boolean {
    return !!this.backupPage?.content.some(b => b.status === 'PENDING');
  }

  /** Acceso rápido al contenido de la página actual */
  get rows(): BackupLog[] {
    return this.backupPage?.content ?? [];
  }

  // ── Carga del historial ───────────────────────────────────────────────────

  /**
   * Carga la página indicada del historial.
   * @param showSpinner muestra el skeleton loader cuando es true (por defecto true)
   */
  loadHistory(showSpinner = true): void {
    if (showSpinner) this.historyLoading = true;

    this.backupService.getBackupHistory(this.currentPage, this.PAGE_SIZE)
      .subscribe({
        next: page => {
          this.backupPage   = page;
          this.historyLoading = false;
        },
        error: err => {
          this.historyLoading = false;
          if (err.status !== 403) {
            this.showNotification('error',
              'Error al cargar historial',
              'No se pudo obtener el historial de respaldos del servidor.');
          }
        }
      });
  }

  // ── Paginación ────────────────────────────────────────────────────────────

  goToPage(page: number): void {
    if (page < 0) return;
    if (this.backupPage && page >= this.backupPage.totalPages) return;
    this.currentPage = page;
    this.loadHistory();
  }

  // ── Disparar respaldo ─────────────────────────────────────────────────────

  /**
   * Envía POST /trigger al backend.
   * Deshabilita el botón durante la petición y recarga el historial a los 3 s
   * para mostrar el registro PENDING/COMPLETED.
   */
  triggerBackup(): void {
    if (this.isTriggering) return;
    this.isTriggering = true;
    this.clearNotification();

    this.backupService.triggerBackup().subscribe({
      next: res => {
        this.isTriggering = false;
        // Mostrar modal de éxito con auto-cierre a los 3.5 s
        this.showSuccessModal = true;
        if (this.successTimer) clearTimeout(this.successTimer);
        this.successTimer = setTimeout(() => { this.showSuccessModal = false; }, 3500);
        // Recarga a los 3 s para mostrar el registro PENDING
        this.reloadTimer = setTimeout(() => {
          this.currentPage = 0;
          this.loadHistory();
        }, 3_000);
      },
      error: err => {
        this.isTriggering = false;
        if (err.status === 403) {
          this.showNotification('warning', 'Acceso denegado',
            'Solo los usuarios con rol SUPER_ADMIN pueden generar respaldos.');
        } else {
          this.showNotification('error', 'Error al iniciar respaldo',
            err.error?.message ?? 'El servidor no pudo aceptar la solicitud.');
        }
      }
    });
  }

  // ── Descarga via URL firmada ──────────────────────────────────────────────

  /**
   * Solicita al backend una URL firmada de Supabase Storage y abre
   * la descarga en una nueva pestaña. La URL expira en 1 hora.
   */
  downloadBackup(id: number): void {
    if (this.loadingUrlId !== null) return;
    this.loadingUrlId = id;

    this.backupService.getDownloadUrl(id).subscribe({
      next: res => {
        this.loadingUrlId = null;
        // Abrir en nueva pestaña — el navegador gestiona la descarga
        window.open(res.signedUrl, '_blank', 'noopener,noreferrer');
        this.showNotification('info', 'Enlace generado',
          `El enlace expira en ${res.expiresIn}. La descarga se abrió en una nueva pestaña.`);
      },
      error: err => {
        this.loadingUrlId = null;
        const msg = err.error?.message ?? 'No se pudo obtener el enlace de descarga.';
        this.showNotification('error', 'Error al obtener enlace', msg);
      }
    });
  }

  // ── Modal de confirmación ─────────────────────────────────────────────────

  closeSuccessModal(): void {
    if (this.successTimer) clearTimeout(this.successTimer);
    this.showSuccessModal = false;
  }

  // ── Modal de error ────────────────────────────────────────────────────────

  /** Abre el modal mostrando el mensaje de error del respaldo FAILED */
  openErrorModal(log: BackupLog): void {
    this.errorModal = {
      filename: log.filename,
      message:  (log.errorMessage !== null && log.errorMessage !== undefined && log.errorMessage.trim() !== '')
                  ? log.errorMessage
                  : 'No hay detalles del error disponibles para este respaldo.\n\nPosibles causas:\n• pg_dump no encontrado en la ruta configurada.\n• Credenciales de base de datos incorrectas.\n• El proceso fue interrumpido antes de registrar el error.'
    };
  }

  /** Cierra el modal de error */
  closeErrorModal(): void {
    this.errorModal = null;
  }

  // ── Expiración de enlace ──────────────────────────────────────────────────

  /**
   * Devuelve true si han pasado más de 1 hora desde la creación del backup.
   * Las URLs firmadas de Supabase Storage expiran a los 3600 s (1 hora).
   * @param createdAt fecha ISO 8601 del campo BackupLog.createdAt
   */
  isExpired(createdAt: string | Date): boolean {
    const created  = new Date(createdAt).getTime();
    const expireAt = created + 60 * 60 * 1000;   // +1 hora en ms
    return Date.now() > expireAt;
  }

  // ── Formatters ────────────────────────────────────────────────────────────

  /** Convierte bytes a string legible (B / KB / MB) */
  formatFileSize(bytes: number | null): string {
    if (bytes === null || bytes === undefined) return '—';
    if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(2)} MB`;
    if (bytes >= 1_024)     return `${(bytes / 1_024).toFixed(1)} KB`;
    return `${bytes} B`;
  }

  /** Convierte milisegundos a string legible (ms / s / min) */
  formatMs(ms: number | null): string {
    if (ms === null || ms === undefined) return '—';
    if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)} min`;
    if (ms >= 1_000)  return `${(ms / 1_000).toFixed(1)} s`;
    return `${ms} ms`;
  }

  // ── Notificaciones ────────────────────────────────────────────────────────

  /** Muestra un toast con auto-dismiss */
  showNotification(
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string
  ): void {
    if (this.notifTimer) clearTimeout(this.notifTimer);
    this.notification = { type, title, message };
    const ms = type === 'error' ? 10_000 : type === 'warning' ? 8_000 : 6_000;
    this.notifTimer = setTimeout(() => { this.notification = null; }, ms);
  }

  clearNotification(): void {
    if (this.notifTimer) clearTimeout(this.notifTimer);
    this.notification = null;
  }

  // ── TrackBy para ngFor ────────────────────────────────────────────────────
  trackById(_: number, item: BackupLog): number { return item.id; }
}
