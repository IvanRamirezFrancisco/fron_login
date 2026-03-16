import {
  Component, Input, Output, EventEmitter, OnDestroy, ViewChild, ElementRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import * as Papa from 'papaparse';
import Swal from 'sweetalert2';

import {
  CsvImportExportService,
  CsvImportResult,
  CsvModuleType,
  CollisionRule
} from '../../../services/csv-import-export.service';

// ── Toast de error (configuración reutilizable) ───────────────────────────────
const ErrorToast = Swal.mixin({
  toast: true,
  position: 'top-end',
  icon: 'error',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

// ── Tipos internos ────────────────────────────────────────────────────────────

/** Estado del flujo de importación dentro del modal */
type ImportState = 'upload' | 'preview' | 'processing' | 'result';

interface PreviewData {
  headers: string[];
  rows:    string[][];
}

@Component({
  selector: 'app-csv-import-export',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './csv-import-export.component.html',
  styleUrls: ['./csv-import-export.component.css']
})
export class CsvImportExportComponent implements OnDestroy {

  // ── Entradas ──────────────────────────────────────────────────────────────

  /** Módulo de datos que gestiona este widget: 'products' | 'users' */
  @Input() moduleType: CsvModuleType = 'products';

  /**
   * Se emite cuando el usuario hace clic en "Cerrar y Recargar Tabla"
   * después de una importación exitosa. El componente padre debe
   * suscribirse para refrescar su tabla de datos.
   */
  @Output() importSuccess = new EventEmitter<void>();

  // ── Estado del modal ──────────────────────────────────────────────────────

  /** Controla la visibilidad del modal principal */
  isCsvModalOpen = false;

  // ── Estado de la UI interna ───────────────────────────────────────────────

  importState: ImportState = 'upload';
  isExporting = false;

  /** Regla de colisión seleccionada por el usuario (solo para products) */
  selectedRule: CollisionRule = 'UPDATE';

  // Vista previa
  selectedFile: File | null   = null;
  preview:      PreviewData | null = null;
  previewError: string | null = null;

  // Resultado de importación
  importResult: CsvImportResult | null = null;
  importError:  string | null          = null;

  // ── Ref al input oculto ───────────────────────────────────────────────────

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  constructor(private csvService: CsvImportExportService) {}

  ngOnDestroy(): void { /* nada que limpiar */ }

  // ── Getters de conveniencia ───────────────────────────────────────────────

  get moduleLabel(): string {
    return this.moduleType === 'products' ? 'Productos' : 'Usuarios';
  }

  get exportFilename(): string {
    const today = new Date().toISOString().slice(0, 10);
    return `${this.moduleType}_${today}.csv`;
  }

  get hasErrors(): boolean {
    return (this.importResult?.errorCount ?? 0) > 0;
  }

  // ── Exportar ──────────────────────────────────────────────────────────────

  onExport(): void {
    if (this.isExporting) return;
    this.isExporting = true;

    this.csvService.exportData(this.moduleType).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = this.exportFilename;
        a.click();
        URL.revokeObjectURL(url);
        this.isExporting = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('[CsvComponent] Export error:', err);
        ErrorToast.fire({ title: 'Error al exportar. Inténtalo de nuevo.' });
        this.isExporting = false;
      }
    });
  }

  // ── Importar: selección de archivo ───────────────────────────────────────

  openFilePicker(): void {
    this.fileInputRef.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    input.value = ''; // permite volver a seleccionar el mismo archivo

    if (!file.name.toLowerCase().endsWith('.csv')) {
      const msg = 'El archivo debe tener extensión .csv';
      ErrorToast.fire({ title: msg });
      this.previewError = msg;
      this.importState = 'preview';
      this.preview = null;
      this.selectedFile = null;
      return;
    }

    this.selectedFile = file;
    this.previewError = null;
    this.importState  = 'preview';
    this.parsePreview(file);
  }

  private parsePreview(file: File): void {
    Papa.parse<string[]>(file, {
      skipEmptyLines: true,
      preview: 6, // cabecera + 5 filas
      complete: (result) => {
        if (result.errors.length && result.data.length === 0) {
          this.previewError = 'No se pudo leer el archivo CSV.';
          this.preview = null;
          return;
        }
        const rows = result.data as string[][];
        if (rows.length === 0) {
          this.previewError = 'El archivo está vacío.';
          this.preview = null;
          return;
        }
        this.preview = {
          headers: rows[0],
          rows:    rows.slice(1)
        };
      },
      error: (err) => {
        this.previewError = `Error al leer el archivo: ${err.message}`;
        this.preview = null;
      }
    });
  }

  // ── Importar: confirmar envío ─────────────────────────────────────────────

  onConfirmImport(): void {
    if (!this.selectedFile) return;

    this.importState  = 'processing';
    this.importResult = null;
    this.importError  = null;

    this.csvService.importData(this.moduleType, this.selectedFile, this.selectedRule).subscribe({
      next: (result) => {
        this.importResult = result;
        this.importState  = 'result';
      },
      error: (err: HttpErrorResponse) => {
        const msg = err.error?.message
          ?? err.message
          ?? 'Error desconocido al importar.';
        ErrorToast.fire({ title: msg });
        this.importError = msg;
        this.importState = 'result';
      }
    });
  }

  // ── Reset (vuelve al estado upload dentro del modal) ─────────────────────

  onReset(): void {
    this.importState  = 'upload';
    this.selectedFile = null;
    this.preview      = null;
    this.previewError = null;
    this.importResult = null;
    this.importError  = null;
  }

  /** Cierra el modal y limpia todo el estado */
  closeModal(): void {
    this.isCsvModalOpen = false;
    this.onReset();
  }

  /**
   * Cierra el modal y emite importSuccess para que el padre recargue su tabla.
   * Llamado desde el botón "Cerrar y Recargar Tabla" en el estado 'result'.
   */
  onCloseAndReload(): void {
    this.importSuccess.emit();
    this.closeModal();
  }
}
