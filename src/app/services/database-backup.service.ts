import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ── Modelos ──────────────────────────────────────────────────────────────────

/** Registro de un respaldo en la base de datos */
export interface BackupLog {
  id: number;
  filename: string;
  /** Ruta del objeto en Supabase Storage (ej. backup_postgres_20260306_030000.dump) */
  filePath: string | null;
  fileSizeBytes: number | null;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  errorMessage: string | null;
  executionTimeMs: number | null;
  createdAt: string;        // ISO 8601
  triggeredBy: string;
  deleted: boolean;
}

/** Página paginada de BackupLog (Spring Data Page<T>) */
export interface BackupPage {
  content: BackupLog[];
  totalElements: number;
  totalPages: number;
  number: number;          // página actual (0-based)
  size: number;
  first: boolean;
  last: boolean;
}

/** Respuesta del endpoint POST /trigger */
export interface TriggerResponse {
  message: string;
  status: 'PENDING';
  triggeredBy: string;
  timestamp: string;
}

/** Respuesta del endpoint GET /{id}/download-url */
export interface DownloadUrlResponse {
  signedUrl: string;
  filename: string;
  expiresIn: string;
}

// ── Servicio ──────────────────────────────────────────────────────────────────

/**
 * Servicio de respaldos de base de datos.
 *
 * El interceptor JWT (auth.interceptor.ts) inyecta automáticamente el header
 * Authorization: Bearer <token> en todas las peticiones, por lo que aquí
 * NO se añaden headers manuales.
 */
@Injectable({
  providedIn: 'root'
})
export class DatabaseBackupService {

  /** URL base del módulo de backups */
  private readonly API = `${environment.apiUrl}/admin/backups`;

  constructor(private http: HttpClient) {}

  /**
   * Dispara un respaldo manual en segundo plano.
   * El servidor responde 202 Accepted de inmediato.
   */
  triggerBackup(): Observable<TriggerResponse> {
    return this.http.post<TriggerResponse>(`${this.API}/trigger`, {});
  }

  /**
   * Obtiene el historial de respaldos paginado.
   * @param page Número de página (0-based)
   * @param size Registros por página
   */
  getBackupHistory(page = 0, size = 10): Observable<BackupPage> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<BackupPage>(this.API, { params });
  }

  /**
   * Solicita al backend una URL firmada de Supabase Storage para
   * descargar el archivo del respaldo indicado.
   * La URL tiene una validez de 1 hora.
   *
   * @param id ID del registro en backup_logs
   */
  getDownloadUrl(id: number): Observable<DownloadUrlResponse> {
    return this.http.get<DownloadUrlResponse>(`${this.API}/${id}/download-url`);
  }
}

