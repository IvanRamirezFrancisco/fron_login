import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { Subject, Subscription, interval, takeUntil, finalize, switchMap } from 'rxjs';
import {
  SystemAutomationService,
  SystemAutomation,
  UpdateAutomationRequest,
  DbTableInfo,
  ExecutionLog,
  StaffRecipient,
} from '../../../../../services/system-automation.service';

// ===========================================================================
// CONSTANTES
// ===========================================================================

const ICON_MAP: Record<string, string> = {
  backup:            'backup',
  build_circle:      'build_circle',
  cleaning_services: 'cleaning_services',
  delete_sweep:      'delete_sweep',
  token:             'generating_tokens',
  shield:            'verified_user',
  schedule:          'schedule',
  auto_fix_high:     'auto_fix_high',
  storage:           'storage',
  // DB_MAINTENANCE_JOB — ícono de servidor/base de datos
  database:          'dns',
  dns:               'dns',
};

type JobStatus = 'SUCCESS' | 'FAILED' | 'IN_PROGRESS' | 'PENDING' | null;

const GROUP_COLORS: Record<string, { bg: string; text: string; iconBg: string; iconColor: string }> = {
  SECURITY:    { bg: 'bg-amber-50',    text: 'text-amber-600',   iconBg: 'rgba(114,47,55,0.1)',  iconColor: '#722f37' },
  MAINTENANCE: { bg: 'bg-blue-50',     text: 'text-blue-600',    iconBg: 'rgba(197,160,89,0.1)', iconColor: '#C5A059' },
  ALERTS:      { bg: 'bg-red-50',      text: 'text-red-600',     iconBg: 'rgba(220,53,69,0.1)',  iconColor: '#dc3545' },
  DEFAULT:     { bg: 'bg-stone-100',   text: 'text-stone-600',   iconBg: 'rgba(107,114,128,0.1)', iconColor: '#6b7280' },
};

/** Zonas horarias mas comunes para el selector */
const TIMEZONES: { value: string; label: string }[] = [
  { value: 'America/Mexico_City', label: 'Ciudad de Mexico (CST/CDT)' },
  { value: 'America/Monterrey',   label: 'Monterrey (CST/CDT)'       },
  { value: 'America/Cancun',      label: 'Cancun (EST)'              },
  { value: 'America/Tijuana',     label: 'Tijuana (PST/PDT)'         },
  { value: 'America/Bogota',      label: 'Bogota (COT)'              },
  { value: 'America/Lima',        label: 'Lima (PET)'                },
  { value: 'America/Santiago',    label: 'Santiago (CLT/CLST)'       },
  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (ART)' },
  { value: 'America/New_York',    label: 'Nueva York (EST/EDT)'      },
  { value: 'America/Chicago',     label: 'Chicago (CST/CDT)'         },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)'     },
  { value: 'Europe/Madrid',       label: 'Madrid (CET/CEST)'         },
  { value: 'Europe/London',       label: 'Londres (GMT/BST)'         },
  { value: 'UTC',                 label: 'UTC (Coordenado Universal)' },
];

const DAYS_OF_WEEK: { value: string; label: string }[] = [
  { value: '1', label: 'Lunes'     },
  { value: '2', label: 'Martes'    },
  { value: '3', label: 'Miercoles' },
  { value: '4', label: 'Jueves'    },
  { value: '5', label: 'Viernes'   },
  { value: '6', label: 'Sabado'    },
  { value: '0', label: 'Domingo'   },
];

/** Tablas principales con mas datos (mostradas inicialmente) */
const PRIMARY_TABLES: string[] = [
  'users', 'roles', 'products', 'orders', 'order_items',
  'audit_logs', 'login_attempts', 'categories', 'shopping_carts',
  'cart_items', 'product_images', 'addresses', 'product_reviews',
  'inventory', 'coupons', 'active_sessions', 'brands',
];

// ===========================================================================
// COMPONENTE
// ===========================================================================

@Component({
  selector: 'app-admin-automations',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DatePipe],
  templateUrl: './admin-automations.component.html',
  styleUrls: [
    '../shared-tab.css',
    './admin-automations.component.css',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAutomationsComponent implements OnInit, OnDestroy {

  // -- Estado general -------------------------------------------------------
  automations: SystemAutomation[] = [];
  loading = true;
  error: string | null = null;

  togglingId: number | null = null;
  runningId: number | null = null;

  // -- Confirmación antes de ejecutar ▶ ------------------------------------
  confirmRunId: number | null = null;

  // -- Toast ----------------------------------------------------------------
  toast: { type: 'success' | 'error'; message: string; visible: boolean; closing: boolean } | null = null;
  private toastTimer: any;

  // -- Modal de edicion -----------------------------------------------------
  editingAutomation: SystemAutomation | null = null;
  saving = false;

  // Formulario de horario (visual cron builder)
  scheduleForm!: FormGroup;
  // Formulario de zona horaria
  timezoneControl!: FormControl;

  // -- Parametros condicionales por job -------------------------------------
  // BACKUP_DATABASE_JOB
  backupType: 'FULL' | 'PARTIAL' = 'FULL';
  selectedTables: string[] = [];
  retentionDays = 30;
  compressionLevel = 9;
  showAllTables = false;
  allDbTables: DbTableInfo[] = [];
  loadingTables = false;

  // DB_MAINTENANCE_JOB
  runAnalyze = true;
  deadTupleThreshold = 20;

  // INVENTORY_AUDIT_JOB
  stockThreshold = 10;
  // Staff selector (reemplaza email chips libre)
  allStaff: StaffRecipient[] = [];
  filteredStaff: StaffRecipient[] = [];
  selectedRecipients: StaffRecipient[] = [];
  staffSearchQuery = '';
  showStaffDropdown = false;
  loadingStaff = false;

  // -- Alertas genéricas (aplica a TODOS los jobs) --------------------------
  alertOnFailure = false;
  // Staff selector for failure alert recipients
  allFailureStaff: StaffRecipient[] = [];
  filteredFailureStaff: StaffRecipient[] = [];
  selectedFailureRecipients: StaffRecipient[] = [];
  failureStaffSearchQuery = '';
  showFailureStaffDropdown = false;
  loadingFailureStaff = false;

  // -- Preview de próximas ejecuciones ------------------------------------
  nextRuns: Date[] = [];

  // -- Historial de ejecuciones -------------------------------------------
  historyAutomation: SystemAutomation | null = null;
  historyLogs: ExecutionLog[] = [];
  historyLoading = false;
  historyError: string | null = null;

  // -- Polling reactivo (auto-refresh mientras haya tareas en curso) ------
  private pollingSub: Subscription | null = null;
  private pollingErrors = 0;
  private readonly MAX_POLLING_ERRORS = 3;
  isPolling = false;

  // -- Constantes expuestas al template ------------------------------------
  readonly TIMEZONES = TIMEZONES;
  readonly DAYS_OF_WEEK = DAYS_OF_WEEK;

  private destroy$ = new Subject<void>();

  constructor(
    private automationService: SystemAutomationService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {}

  // =========================================================================
  // LIFECYCLE
  // =========================================================================

  ngOnInit(): void {
    this.scheduleForm = this.fb.group({
      frequency: ['daily', Validators.required],
      dayOfWeek: ['1'],
      dayOfMonth: [1, [Validators.required, Validators.min(1), Validators.max(28)]],
      hour: [3, [Validators.required, Validators.min(0), Validators.max(23)]],
    });
    this.timezoneControl = new FormControl('America/Mexico_City', Validators.required);

    // Recalcular próximas ejecuciones cada vez que cambie el horario
    this.scheduleForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.updateNextRuns());

    this.loadAutomations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopPolling();
    clearTimeout(this.toastTimer);
  }

  // =========================================================================
  // DATA
  // =========================================================================

  loadAutomations(): void {
    this.loading = true;
    this.error = null;
    this.automationService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.automations = data;
          this.loading = false;
          this.evaluatePolling();
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = 'No se pudieron cargar las automatizaciones.';
          this.loading = false;
          console.error('[Automations] load error', err);
          this.cdr.markForCheck();
        },
      });
  }

  // =========================================================================
  // POLLING REACTIVO — Auto-refresh mientras haya tareas en curso
  // =========================================================================

  /** Evalúa si hay tareas IN_PROGRESS o PENDING y activa/desactiva el polling */
  private evaluatePolling(): void {
    const hasActive = this.automations.some(a =>
      a.lastStatus === 'IN_PROGRESS' || a.lastStatus === 'PENDING'
    );

    if (hasActive && !this.pollingSub) {
      this.startPolling();
    } else if (!hasActive && this.pollingSub) {
      this.stopPolling();
    }
  }

  /** Inicia polling silencioso cada 3 segundos */
  private startPolling(): void {
    if (this.pollingSub) return;
    this.isPolling = true;
    this.pollingErrors = 0;
    this.cdr.markForCheck();

    this.pollingSub = interval(3000)
      .pipe(
        takeUntil(this.destroy$),
        switchMap(() => this.automationService.getAll()),
      )
      .subscribe({
        next: (data) => {
          this.automations = data;
          this.pollingErrors = 0; // Reset on success
          this.cdr.markForCheck();

          // Detener si ya no hay tareas activas
          const stillActive = data.some(a =>
            a.lastStatus === 'IN_PROGRESS' || a.lastStatus === 'PENDING'
          );
          if (!stillActive) {
            this.stopPolling();
          }
        },
        error: () => {
          this.pollingErrors++;
          if (this.pollingErrors >= this.MAX_POLLING_ERRORS) {
            this.stopPolling();
          }
          // Otherwise, the interval will retry on the next tick
        },
      });
  }

  /** Detiene el polling */
  private stopPolling(): void {
    if (this.pollingSub) {
      this.pollingSub.unsubscribe();
      this.pollingSub = null;
    }
    this.isPolling = false;
    this.cdr.markForCheck();
  }

  // =========================================================================
  // TOGGLE
  // =========================================================================

  onToggle(auto: SystemAutomation): void {
    this.togglingId = auto.id;
    this.cdr.markForCheck();

    this.automationService.toggle(auto.id, !auto.enabled)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.togglingId = null; this.cdr.markForCheck(); }),
      )
      .subscribe({
        next: (updated) => {
          this.replaceInList(updated);
          this.showToast('success', `${updated.displayName} ${updated.enabled ? 'activada' : 'desactivada'}`);
        },
        error: () => this.showToast('error', 'Error al cambiar el estado'),
      });
  }

  // =========================================================================
  // RUN NOW
  // =========================================================================

  onRunNow(auto: SystemAutomation): void {
    this.runningId = auto.id;
    this.cdr.markForCheck();

    this.automationService.runNow(auto.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.runningId = null; this.cdr.markForCheck(); }),
      )
      .subscribe({
        next: () => {
          this.showToast('success', `${auto.displayName} ejecutada manualmente`);
          // Reload once and let polling handle the rest
          setTimeout(() => this.loadAutomations(), 1000);
        },
        error: () => this.showToast('error', `Error al ejecutar ${auto.displayName}`),
      });
  }

  // =========================================================================
  // EDIT MODAL — Open / Close
  // =========================================================================

  openEditModal(auto: SystemAutomation): void {
    this.editingAutomation = auto;
    this.saving = false;

    // --- Parsear cron existente para los selectores visuales ---
    this.parseCronToForm(auto.cronExpression);

    // --- Zona horaria ---
    this.timezoneControl.setValue(auto.timezone || 'America/Mexico_City');

    // --- Parametros condicionales ---
    const params = auto.parameters || {};

    // Alertas genéricas (aplica a todos los jobs)
    this.alertOnFailure = params['alert_on_failure'] === true;
    // Cargar empleados para el selector de alertas de fallo
    this.selectedFailureRecipients = [];
    this.failureStaffSearchQuery = '';
    this.showFailureStaffDropdown = false;
    if (this.alertOnFailure) {
      this.loadFailureStaffRecipients(params);
    }

    if (auto.jobName === 'BACKUP_DATABASE_JOB') {
      this.backupType = (params['backup_type'] as string) === 'PARTIAL' ? 'PARTIAL' : 'FULL';
      this.selectedTables = Array.isArray(params['tables']) ? [...params['tables']] : [];
      this.retentionDays = typeof params['retention_days'] === 'number' ? params['retention_days'] : 30;
      this.compressionLevel = typeof params['compression_level'] === 'number' ? params['compression_level'] : 9;
      this.showAllTables = false;
      // Asegurar minimo 1 tabla seleccionada si es PARTIAL
      if (this.backupType === 'PARTIAL' && this.selectedTables.length === 0) {
        this.selectedTables = ['users'];
      }
    }

    if (auto.jobName === 'DB_MAINTENANCE_JOB') {
      this.runAnalyze = params['run_analyze'] !== false;
      this.deadTupleThreshold = typeof params['dead_tuple_threshold'] === 'number'
        ? params['dead_tuple_threshold'] : 20;
    }

    if (auto.jobName === 'INVENTORY_AUDIT_JOB') {
      this.stockThreshold = typeof params['stock_threshold'] === 'number' ? params['stock_threshold'] : 10;
      // Cargar empleados activos para el selector de destinatarios
      this.selectedRecipients = [];
      this.staffSearchQuery = '';
      this.showStaffDropdown = false;
      this.loadStaffRecipients(params);
    }

    this.cdr.markForCheck();
  }

  closeEditModal(): void {
    this.editingAutomation = null;
    this.showAllTables = false;
    this.confirmRunId = null;
    this.cdr.markForCheck();
  }

  // =========================================================================
  // CRON BUILDER — visual selectors -> cron expression
  // =========================================================================

  /** Parsea un cron de Spring (6 campos) y llena los selectores */
  private parseCronToForm(cron: string): void {
    // formato: sec min hour dayOfMonth month dayOfWeek
    const parts = cron.split(/\s+/);
    if (parts.length < 6) {
      this.scheduleForm.patchValue({ frequency: 'daily', hour: 3, dayOfWeek: '1', dayOfMonth: 1 });
      this.updateNextRuns();
      return;
    }

    const hour = parseInt(parts[2], 10) || 0;
    const dayOfMonth = parts[3];
    const dayOfWeek = parts[5];

    if (dayOfMonth !== '*' && dayOfMonth !== '?') {
      // Mensual: "0 0 3 15 * ?"
      this.scheduleForm.patchValue({
        frequency: 'monthly',
        hour,
        dayOfMonth: parseInt(dayOfMonth, 10) || 1,
        dayOfWeek: '1',
      });
    } else if (dayOfWeek !== '*' && dayOfWeek !== '?') {
      // Semanal: "0 0 3 ? * 0" o "0 0 8 * * 1-5" o "0 0 3 ? * SUN"
      // Extraer primer valor del día de la semana (puede ser rango como 1-5 o lista como 1,3,5)
      const dayNames: Record<string, string> = {
        SUN: '0', MON: '1', TUE: '2', WED: '3', THU: '4', FRI: '5', SAT: '6',
      };
      let dayVal = dayOfWeek;
      // Convertir nombres a números si aplica
      for (const [name, num] of Object.entries(dayNames)) {
        dayVal = dayVal.replace(new RegExp(name, 'gi'), num);
      }
      // Para rangos (1-5) o listas (1,3,5), tomar el primer valor
      const firstDay = dayVal.split(/[-,]/)[0];
      this.scheduleForm.patchValue({
        frequency: 'weekly',
        hour,
        dayOfWeek: firstDay,
        dayOfMonth: 1,
      });
    } else {
      // Diario: "0 0 3 * * ?"
      this.scheduleForm.patchValue({
        frequency: 'daily',
        hour,
        dayOfWeek: '1',
        dayOfMonth: 1,
      });
    }
    this.updateNextRuns();
  }

  /** Genera la expresion cron de Spring a partir de los selectores visuales */
  buildCronExpression(): string {
    const f = this.scheduleForm.value;
    const h = f.hour ?? 3;

    switch (f.frequency) {
      case 'weekly':
        return `0 0 ${h} ? * ${f.dayOfWeek}`;
      case 'monthly':
        return `0 0 ${h} ${f.dayOfMonth} * ?`;
      default: // daily
        return `0 0 ${h} * * ?`;
    }
  }

  /** Retorna la descripcion legible del horario actual */
  getSchedulePreview(): string {
    const cron = this.buildCronExpression();
    const parsed = this.parseCronToText(cron);
    return parsed !== cron ? parsed : this.describeSchedule();
  }

  private describeSchedule(): string {
    const f = this.scheduleForm.value;
    const hStr = String(f.hour).padStart(2, '0') + ':00';
    switch (f.frequency) {
      case 'weekly': {
        const dayLabel = DAYS_OF_WEEK.find(d => d.value === f.dayOfWeek)?.label || '';
        return `Cada ${dayLabel} a las ${hStr}`;
      }
      case 'monthly':
        return `El dia ${f.dayOfMonth} de cada mes a las ${hStr}`;
      default:
        return `Todos los dias a las ${hStr}`;
    }
  }

  // =========================================================================
  // TABLE SELECTOR (BACKUP_DATABASE_JOB)
  // =========================================================================

  get primaryTables(): string[] {
    return PRIMARY_TABLES;
  }

  isTableSelected(table: string): boolean {
    return this.selectedTables.includes(table);
  }

  toggleTable(table: string): void {
    const idx = this.selectedTables.indexOf(table);
    if (idx > -1) {
      // No permitir quitar si es la ultima
      if (this.selectedTables.length <= 1) {
        this.showToast('error', 'Debes seleccionar al menos una tabla');
        return;
      }
      this.selectedTables.splice(idx, 1);
    } else {
      this.selectedTables.push(table);
    }
    this.cdr.markForCheck();
  }

  removeTable(table: string): void {
    if (this.selectedTables.length <= 1) {
      this.showToast('error', 'Debes seleccionar al menos una tabla');
      return;
    }
    const idx = this.selectedTables.indexOf(table);
    if (idx > -1) {
      this.selectedTables.splice(idx, 1);
      this.cdr.markForCheck();
    }
  }

  loadAllTables(): void {
    if (this.allDbTables.length > 0) {
      this.showAllTables = true;
      this.cdr.markForCheck();
      return;
    }
    this.loadingTables = true;
    this.cdr.markForCheck();

    this.automationService.getDatabaseTables()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.loadingTables = false; this.cdr.markForCheck(); }),
      )
      .subscribe({
        next: (tables) => {
          this.allDbTables = tables;
          this.showAllTables = true;
          this.cdr.markForCheck();
        },
        error: () => this.showToast('error', 'Error al cargar las tablas de la base de datos'),
      });
  }

  hideAllTables(): void {
    this.showAllTables = false;
    this.cdr.markForCheck();
  }

  formatRowCount(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  }

  onBackupTypeChange(type: 'FULL' | 'PARTIAL'): void {
    this.backupType = type;
    if (type === 'PARTIAL' && this.selectedTables.length === 0) {
      this.selectedTables = ['users'];
    }
    this.cdr.markForCheck();
  }

  // =========================================================================
  // STAFF SELECTOR (INVENTORY_AUDIT_JOB) — Solo empleados activos del sistema
  // =========================================================================

  /**
   * Carga empleados activos y pre-selecciona los que ya estaban configurados
   * según los emails almacenados en parámetros.
   */
  private loadStaffRecipients(params: Record<string, any>): void {
    this.loadingStaff = true;
    this.cdr.markForCheck();

    this.automationService.getStaffRecipients()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.loadingStaff = false; this.cdr.markForCheck(); }),
      )
      .subscribe({
        next: (staff) => {
          this.allStaff = staff;
          this.filteredStaff = [...staff];

          // Pre-seleccionar empleados cuyos emails coincidan con los guardados
          const savedEmails: string[] = [];
          const raw = params['notify_emails'];
          if (Array.isArray(raw)) {
            raw.forEach(e => { if (typeof e === 'string' && e.trim()) savedEmails.push(e.trim().toLowerCase()); });
          } else if (typeof raw === 'string' && raw.trim()) {
            raw.split(',').forEach(e => { if (e.trim()) savedEmails.push(e.trim().toLowerCase()); });
          }

          this.selectedRecipients = staff.filter(s =>
            savedEmails.includes(s.email.toLowerCase())
          );
          this.filterStaff();
          this.cdr.markForCheck();
        },
        error: () => {
          this.allStaff = [];
          this.filteredStaff = [];
          this.cdr.markForCheck();
        },
      });
  }

  /** Filtra la lista de empleados según el texto de búsqueda */
  filterStaff(): void {
    const q = this.staffSearchQuery.toLowerCase().trim();
    const selectedIds = new Set(this.selectedRecipients.map(r => r.id));

    this.filteredStaff = this.allStaff.filter(s =>
      !selectedIds.has(s.id) && (
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q)
      )
    );
    this.cdr.markForCheck();
  }

  /** Selecciona un empleado del dropdown */
  selectRecipient(staff: StaffRecipient): void {
    if (this.selectedRecipients.some(r => r.id === staff.id)) return;
    this.selectedRecipients = [...this.selectedRecipients, staff];
    this.staffSearchQuery = '';
    this.showStaffDropdown = false;
    this.filterStaff();
    this.cdr.markForCheck();
  }

  /** Elimina un empleado seleccionado */
  removeRecipient(staffId: number): void {
    this.selectedRecipients = this.selectedRecipients.filter(r => r.id !== staffId);
    this.filterStaff();
    this.cdr.markForCheck();
  }

  /** Abre el dropdown y filtra */
  onStaffSearchFocus(): void {
    this.showStaffDropdown = true;
    this.filterStaff();
  }

  /** Cierra el dropdown con un pequeño delay para permitir click */
  onStaffSearchBlur(): void {
    setTimeout(() => {
      this.showStaffDropdown = false;
      this.cdr.markForCheck();
    }, 200);
  }

  /** Maneja el input de búsqueda */
  onStaffSearchInput(): void {
    this.showStaffDropdown = true;
    this.filterStaff();
  }

  /** Obtiene las iniciales de un nombre para el avatar */
  getInitials(fullName: string): string {
    if (!fullName) return '?';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  /** Formatea el nombre del rol para mostrar */
  formatRoleName(role: string): string {
    if (!role) return 'Sin rol';
    return role.replace('ROLE_', '').replace(/_/g, ' ');
  }

  // =========================================================================
  // FAILURE ALERT — Staff Selector (selector de empleados para alertas de fallo)
  // =========================================================================

  /**
   * Carga empleados activos y pre-selecciona los que ya estaban configurados
   * según los emails almacenados en failure_notify_emails.
   */
  private loadFailureStaffRecipients(params: Record<string, any>): void {
    this.loadingFailureStaff = true;
    this.cdr.markForCheck();

    this.automationService.getStaffRecipients()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.loadingFailureStaff = false; this.cdr.markForCheck(); }),
      )
      .subscribe({
        next: (staff) => {
          this.allFailureStaff = staff;
          this.filteredFailureStaff = [...staff];

          // Pre-seleccionar empleados cuyos emails coincidan con los guardados
          const savedEmails: string[] = [];
          const raw = params['failure_notify_emails'];
          if (Array.isArray(raw)) {
            raw.forEach((e: any) => { if (typeof e === 'string' && e.trim()) savedEmails.push(e.trim().toLowerCase()); });
          } else if (typeof raw === 'string' && raw.trim()) {
            raw.split(',').forEach((e: string) => { if (e.trim()) savedEmails.push(e.trim().toLowerCase()); });
          }

          this.selectedFailureRecipients = staff.filter(s =>
            savedEmails.includes(s.email.toLowerCase())
          );
          this.filterFailureStaff();
          this.cdr.markForCheck();
        },
        error: () => {
          this.allFailureStaff = [];
          this.filteredFailureStaff = [];
          this.cdr.markForCheck();
        },
      });
  }

  /** Filtra la lista de empleados para alertas de fallo */
  filterFailureStaff(): void {
    const q = this.failureStaffSearchQuery.toLowerCase().trim();
    const selectedIds = new Set(this.selectedFailureRecipients.map(r => r.id));

    this.filteredFailureStaff = this.allFailureStaff.filter(s =>
      !selectedIds.has(s.id) && (
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.role.toLowerCase().includes(q)
      )
    );
    this.cdr.markForCheck();
  }

  /** Selecciona un empleado para alertas de fallo */
  selectFailureRecipient(staff: StaffRecipient): void {
    if (this.selectedFailureRecipients.some(r => r.id === staff.id)) return;
    this.selectedFailureRecipients = [...this.selectedFailureRecipients, staff];
    this.failureStaffSearchQuery = '';
    this.showFailureStaffDropdown = false;
    this.filterFailureStaff();
    this.cdr.markForCheck();
  }

  /** Elimina un empleado de alertas de fallo */
  removeFailureRecipient(staffId: number): void {
    this.selectedFailureRecipients = this.selectedFailureRecipients.filter(r => r.id !== staffId);
    this.filterFailureStaff();
    this.cdr.markForCheck();
  }

  /** Abre el dropdown de alertas de fallo */
  onFailureStaffSearchFocus(): void {
    this.showFailureStaffDropdown = true;
    this.filterFailureStaff();
  }

  /** Cierra el dropdown de alertas de fallo */
  onFailureStaffSearchBlur(): void {
    setTimeout(() => {
      this.showFailureStaffDropdown = false;
      this.cdr.markForCheck();
    }, 200);
  }

  /** Maneja el input de búsqueda de alertas de fallo */
  onFailureStaffSearchInput(): void {
    this.showFailureStaffDropdown = true;
    this.filterFailureStaff();
  }

  /** Al activar alertOnFailure, cargar empleados si aún no se han cargado */
  onAlertOnFailureToggle(): void {
    this.alertOnFailure = !this.alertOnFailure;
    if (this.alertOnFailure && this.allFailureStaff.length === 0) {
      this.loadFailureStaffRecipients(this.editingAutomation?.parameters || {});
    }
  }

  // =========================================================================
  // SAVE
  // =========================================================================

  isFormValid(): boolean {
    if (!this.editingAutomation) return false;
    if (this.scheduleForm.invalid || this.timezoneControl.invalid) return false;

    const job = this.editingAutomation.jobName;

    if (job === 'BACKUP_DATABASE_JOB') {
      if (this.backupType === 'PARTIAL' && this.selectedTables.length === 0) return false;
      if (this.retentionDays < 1) return false;
      if (this.compressionLevel < 0 || this.compressionLevel > 9) return false;
    }

    if (job === 'INVENTORY_AUDIT_JOB') {
      if (this.stockThreshold < 0) return false;
    }

    // Si las alertas de fallo están activadas, se requiere al menos un destinatario
    if (this.alertOnFailure && this.selectedFailureRecipients.length === 0) return false;

    return true;
  }

  saveEdit(): void {
    if (!this.editingAutomation || !this.isFormValid()) return;

    this.saving = true;
    this.cdr.markForCheck();

    const cronExpression = this.buildCronExpression();
    const timezone = this.timezoneControl.value.trim();
    const params = this.buildParameters();

    const payload: UpdateAutomationRequest = {
      cronExpression,
      timezone,
      parameters: params,
    };

    this.automationService.update(this.editingAutomation.id, payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.saving = false; this.cdr.markForCheck(); }),
      )
      .subscribe({
        next: (updated) => {
          this.replaceInList(updated);
          this.closeEditModal();
          this.showToast('success', `${updated.displayName} actualizada correctamente`);
        },
        error: () => this.showToast('error', 'Error al guardar los cambios'),
      });
  }

  /** Construye el objeto de parametros segun el jobName */
  private buildParameters(): Record<string, any> | null {
    if (!this.editingAutomation) return null;
    const job = this.editingAutomation.jobName;

    // Base: alertas genéricas (aplican a todos los jobs)
    const alertParams: Record<string, any> = {
      alert_on_failure: this.alertOnFailure,
    };
    if (this.alertOnFailure && this.selectedFailureRecipients.length > 0) {
      alertParams['failure_notify_emails'] = this.selectedFailureRecipients.map(r => r.email);
    }

    if (job === 'BACKUP_DATABASE_JOB') {
      const params: Record<string, any> = {
        backup_type: this.backupType,
        retention_days: this.retentionDays,
        compression_level: this.compressionLevel,
        ...alertParams,
      };
      if (this.backupType === 'PARTIAL') {
        params['tables'] = [...this.selectedTables];
      }
      return params;
    }

    if (job === 'DB_MAINTENANCE_JOB') {
      return {
        run_analyze: this.runAnalyze,
        dead_tuple_threshold: this.deadTupleThreshold,
        ...alertParams,
      };
    }

    if (job === 'INVENTORY_AUDIT_JOB') {
      return {
        stock_threshold: this.stockThreshold,
        notify_emails: this.selectedRecipients.map(r => r.email),
        ...alertParams,
      };
    }

    // Jobs sin parametros especificos — solo alertas
    return {
      ...(this.editingAutomation.parameters || {}),
      ...alertParams,
    };
  }

  // =========================================================================
  // PRÓXIMAS EJECUCIONES (calculadas en tiempo real)
  // =========================================================================

  /** Calcula las próximas 3 ejecuciones a partir del cron visual actual */
  updateNextRuns(): void {
    const f = this.scheduleForm.value;
    const h = f.hour ?? 3;
    const freq = f.frequency;
    const now = new Date();
    const runs: Date[] = [];

    if (freq === 'monthly') {
      const targetDay = f.dayOfMonth ?? 1;
      for (let m = 0; runs.length < 3 && m < 36; m++) {
        const candidate = new Date(now.getFullYear(), now.getMonth() + m, targetDay, h, 0, 0, 0);
        // Verifica que el dia no se desbordó (ej. 31 de febrero -> marzo)
        if (candidate.getDate() === targetDay && candidate > now) {
          runs.push(candidate);
        }
      }
    } else {
      for (let i = 1; runs.length < 3 && i <= 60; i++) {
        const candidate = new Date(now);
        candidate.setHours(h, 0, 0, 0);
        candidate.setDate(now.getDate() + i);

        if (freq === 'weekly') {
          const targetDay = parseInt(f.dayOfWeek ?? '1', 10);
          if (candidate.getDay() !== targetDay) continue;
        }
        runs.push(new Date(candidate));
      }
    }

    this.nextRuns = runs;
    this.cdr.markForCheck();
  }

  // =========================================================================
  // HISTORIAL DE EJECUCIONES (panel modal)
  // =========================================================================

  openHistory(auto: SystemAutomation): void {
    this.historyAutomation = auto;
    this.historyLogs = [];
    this.historyLoading = true;
    this.historyError = null;
    this.cdr.markForCheck();

    this.automationService.getExecutionLogs(auto.id, 0, 10)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.historyLoading = false; this.cdr.markForCheck(); }),
      )
      .subscribe({
        next: (page) => {
          this.historyLogs = page.content;
          this.cdr.markForCheck();
        },
        error: () => {
          this.historyError = 'No se pudo cargar el historial.';
          this.cdr.markForCheck();
        },
      });
  }

  closeHistory(): void {
    this.historyAutomation = null;
    this.historyLogs = [];
    this.historyError = null;
    this.cdr.markForCheck();
  }

  getTriggeredByLabel(triggeredBy: string): string {
    if (!triggeredBy) return '—';
    if (triggeredBy === 'SCHEDULER') return 'Automático';
    if (triggeredBy === 'MANUAL') return 'Manual';
    // Si es un email, devolver el email
    return triggeredBy;
  }

  // =========================================================================
  // CARD HELPERS (no cambian)
  // =========================================================================

  getIcon(iconName: string): string {
    return ICON_MAP[iconName] || iconName || 'settings';
  }

  getGroupColor(group: string): { bg: string; text: string; iconBg: string; iconColor: string } {
    return GROUP_COLORS[group] || GROUP_COLORS['DEFAULT'];
  }

  getCronLabel(cron: string): string {
    return this.parseCronToText(cron);
  }

  /**
   * Traduce una expresión cron de Spring (6 campos) a texto legible en español.
   * Formato Spring: SEC MIN HOUR DAY_OF_MONTH MONTH DAY_OF_WEEK
   * Ejemplos:
   *   "0 0 19 * * ?"       -> "Todos los días a las 07:00 PM"
   *   "0 0 4 * * ?"        -> "Todos los días a las 04:00 AM"
   *   "0 0 2 * * SUN"      -> "Todos los domingos a las 02:00 AM"
   *   "0 0 3 15 * ?"       -> "El día 15 de cada mes a las 03:00 AM"
   *   cada 30 min cron     -> "Cada 30 minutos"
   *   "0 0 * * * ?"        -> "Cada hora en punto"
   */
  parseCronToText(cron: string): string {
    if (!cron) return cron;
    const parts = cron.trim().split(/\s+/);
    if (parts.length < 6) return cron;

    const [_sec, min, hour, dayOfMonth, _month, dayOfWeek] = parts;

    // Nombres de días
    const dayNameMap: Record<string, string> = {
      '0': 'domingo', '1': 'lunes', '2': 'martes', '3': 'miércoles',
      '4': 'jueves', '5': 'viernes', '6': 'sábado', '7': 'domingo',
      SUN: 'domingo', MON: 'lunes', TUE: 'martes', WED: 'miércoles',
      THU: 'jueves', FRI: 'viernes', SAT: 'sábado',
    };

    // Formateador de hora en formato 12h
    const formatHour = (h: number, m: number): string => {
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
    };

    // ── Intervalo de minutos: "*/30" → "Cada 30 minutos"
    if (min.startsWith('*/')) {
      const interval = parseInt(min.substring(2), 10);
      if (hour === '*') {
        return `Cada ${interval} minutos`;
      }
    }

    // ── Cada hora: min=0, hour=* → "Cada hora en punto"
    if (min === '0' && hour === '*') {
      return 'Cada hora en punto';
    }

    // ── Hora específica
    const h = parseInt(hour, 10);
    const m = parseInt(min, 10);
    if (isNaN(h)) return cron;
    const timeStr = formatHour(h, isNaN(m) ? 0 : m);

    // ── Día específico del mes: "0 0 3 15 * ?"
    if (dayOfMonth !== '*' && dayOfMonth !== '?') {
      const day = parseInt(dayOfMonth, 10);
      if (!isNaN(day)) {
        return `El día ${day} de cada mes a las ${timeStr}`;
      }
    }

    // ── Día de la semana: "0 0 2 ? * SUN" o "0 0 2 * * 0"
    if (dayOfWeek !== '*' && dayOfWeek !== '?') {
      // Rango lun-vie: "1-5" o "MON-FRI"
      if (dayOfWeek.includes('-')) {
        const rangeParts = dayOfWeek.split('-');
        const from = dayNameMap[rangeParts[0].toUpperCase()] || dayNameMap[rangeParts[0]];
        const to = dayNameMap[rangeParts[1].toUpperCase()] || dayNameMap[rangeParts[1]];
        if (from && to) {
          return `De ${from} a ${to} a las ${timeStr}`;
        }
      }
      // Lista: "1,3,5"
      if (dayOfWeek.includes(',')) {
        const days = dayOfWeek.split(',').map(d => dayNameMap[d.toUpperCase()] || dayNameMap[d]).filter(Boolean);
        if (days.length > 0) {
          return `Los ${days.join(', ')} a las ${timeStr}`;
        }
      }
      // Día único
      const dayName = dayNameMap[dayOfWeek.toUpperCase()] || dayNameMap[dayOfWeek];
      if (dayName) {
        // En español los días que terminan en "s" no cambian en plural:
        // "lunes" → "los lunes", "miércoles" → "los miércoles", "sábado" → "los sábados"
        const plural = dayName.endsWith('s') ? dayName : dayName + 's';
        return `Todos los ${plural} a las ${timeStr}`;
      }
    }

    // ── Diario: "0 0 3 * * ?"
    return `Todos los días a las ${timeStr}`;
  }

  getStatusDot(status: JobStatus): string {
    switch (status) {
      case 'SUCCESS':     return 'aut-dot--success';
      case 'FAILED':      return 'aut-dot--error';
      case 'IN_PROGRESS': return 'aut-dot--running';
      case 'PENDING':     return 'aut-dot--pending';
      default:            return 'aut-dot--idle';
    }
  }

  getStatusLabel(status: JobStatus): string {
    switch (status) {
      case 'SUCCESS':     return 'Exitosa';
      case 'FAILED':      return 'Fallida';
      case 'IN_PROGRESS': return 'En curso';
      case 'PENDING':     return 'Pendiente';
      default:            return 'Sin ejecutar';
    }
  }

  formatDate(iso: string | null): string {
    if (!iso) return '\u2014';
    const d = new Date(iso);
    return d.toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  formatDuration(ms: number | null): string {
    if (!ms && ms !== 0) return '\u2014';
    if (ms === 0) return '0 milisegundos';

    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const millis = ms % 1000;

    if (minutes > 0) {
      const parts: string[] = [];
      parts.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`);
      if (seconds > 0) {
        parts.push(`${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`);
      }
      return parts.join(' y ');
    }

    if (seconds > 0) {
      const parts: string[] = [];
      parts.push(`${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`);
      if (millis > 0) {
        parts.push(`${millis} ms`);
      }
      return parts.join(' y ');
    }

    return `${millis} milisegundos`;
  }

  trackById(_: number, auto: SystemAutomation): number {
    return auto.id;
  }

  trackByLogId(_: number, log: ExecutionLog): number {
    return log.id;
  }

  /**
   * Genera un resumen por defecto cuando el log no incluye resultSummary.
   * Útil para ejecuciones antiguas que no tenían resumen específico.
   */
  getDefaultSummary(log: ExecutionLog): string {
    const jobName = this.historyAutomation?.jobName || '';
    const duration = log.durationMs != null ? this.formatDuration(log.durationMs) : '';

    if (log.status === 'FAILED') {
      return `Ejecución fallida${duration ? ' tras ' + duration : ''}`;
    }

    switch (jobName) {
      case 'BACKUP_DATABASE_JOB':
        return `Respaldo completado${duration ? ' en ' + duration : ''}`;
      case 'DB_MAINTENANCE_JOB':
        return `Mantenimiento ejecutado${duration ? ' en ' + duration : ''}`;
      case 'SESSION_CLEANUP_JOB':
        return `Limpieza de sesiones completada${duration ? ' en ' + duration : ''}`;
      case 'INVENTORY_AUDIT_JOB':
        return `Auditoría de inventario completada${duration ? ' en ' + duration : ''}`;
      default:
        return `Ejecutado${duration ? ' en ' + duration : ''} correctamente`;
    }
  }

  // =========================================================================
  // PRIVADOS
  // =========================================================================

  private replaceInList(updated: SystemAutomation): void {
    const idx = this.automations.findIndex(a => a.id === updated.id);
    if (idx > -1) {
      this.automations = [...this.automations.slice(0, idx), updated, ...this.automations.slice(idx + 1)];
      this.cdr.markForCheck();
    }
  }

  private showToast(type: 'success' | 'error', message: string): void {
    clearTimeout(this.toastTimer);
    this.toast = { type, message, visible: true, closing: false };
    this.cdr.markForCheck();

    this.toastTimer = setTimeout(() => {
      if (this.toast) {
        this.toast.closing = true;
        this.cdr.markForCheck();
        setTimeout(() => { this.toast = null; this.cdr.markForCheck(); }, 300);
      }
    }, 3500);
  }
}
