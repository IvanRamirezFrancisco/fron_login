import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ── Interfaces (match con CsvImportResultDto / CsvRowErrorDto Java Records) ───

export interface CsvRowError {
  rowNumber: number;
  rawValue:  string;
  reason:    string;
}

export interface CsvImportResult {
  totalRows:     number;
  successCount:  number;
  insertedCount: number;
  updatedCount:  number;
  errorCount:    number;
  errors:        CsvRowError[];
}

/** Estrategia de colisión al encontrar un SKU ya existente */
export type CollisionRule = 'UPDATE' | 'SKIP';

/** Tipos de módulo soportados por la API de CSV */
export type CsvModuleType = 'products' | 'users';

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class CsvImportExportService {

  private readonly base = `${environment.apiUrl}/admin/csv`;

  constructor(private http: HttpClient) {}

  /**
   * Descarga el CSV del módulo indicado.
   */
  exportData(module: CsvModuleType): Observable<Blob> {
    return this.http.get(`${this.base}/export/${module}`, {
      responseType: 'blob'
    });
  }

  /**
   * Sube un archivo CSV para importar datos del módulo indicado.
   *
   * @param module  'products' | 'users'
   * @param file    Archivo CSV seleccionado por el usuario
   * @param rule    'UPDATE' (default) | 'SKIP' — solo aplica para products
   */
  importData(module: CsvModuleType, file: File, rule: CollisionRule = 'UPDATE'): Observable<CsvImportResult> {
    const form = new FormData();
    form.append('file', file, file.name);
    if (module === 'products') {
      form.append('rule', rule);
    }
    return this.http.post<CsvImportResult>(`${this.base}/import/${module}`, form);
  }
}
