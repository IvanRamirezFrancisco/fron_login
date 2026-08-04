import { Component, OnInit, OnDestroy, signal, computed, ChangeDetectionStrategy, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, finalize, map, switchMap, takeUntil } from 'rxjs/operators';
import { forkJoin, of, Subject, BehaviorSubject } from 'rxjs';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

import { AdminPurchaseClusteringService } from '../../../services/admin-purchase-clustering.service';
import { AuthService } from '../../../services/auth.service';
import { OrderService } from '../../../services/order.service';
import { OrderDetailModalComponent } from '../order-detail-modal/order-detail-modal.component';
import { AdminPurchaseClusteringPredictionComponent } from '../admin-purchase-clustering-prediction/admin-purchase-clustering-prediction.component';
import { Order } from '../../../models/order.model';
import { 
  PurchaseClusteringSummary, 
  PurchaseClusterProfile, 
  PurchaseClusterOrdersPage 
} from '../../../models/purchase-clustering.models';

Chart.register(...registerables);

@Component({
  selector: 'app-admin-purchase-clustering',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, OrderDetailModalComponent, AdminPurchaseClusteringPredictionComponent],
  templateUrl: './admin-purchase-clustering.component.html',
  styleUrl: './admin-purchase-clustering.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CurrencyPipe, DatePipe, DecimalPipe]
})
export class AdminPurchaseClusteringComponent implements OnInit, OnDestroy {
  // Estado General
  currentTab = signal<'prediction' | 'historical'>('prediction');
  summary = signal<PurchaseClusteringSummary | null>(null);
  profiles = signal<PurchaseClusterProfile[]>([]);
  isLoading = signal<boolean>(true);
  error = signal<string | null>(null);

  // KPIs calculados
  topProfile = computed(() => {
    const profs = this.profiles();
    if (profs.length === 0) return null;
    return [...profs].sort((a, b) => b.orderCount - a.orderCount)[0];
  });

  // Estado del Cluster Seleccionado
  selectedClusterNumber = signal<number | null>(null);
  selectedProfile = computed(() => {
    const clusterNumber = this.selectedClusterNumber();
    if (clusterNumber === null) return null;
    return this.profiles().find(p => p.clusterNumber === clusterNumber) || null;
  });

  // Modal y Permisos
  hasOrderReadPermission = signal<boolean>(false);
  selectedOrder = signal<Order | null>(null);
  showDetailModal = signal<boolean>(false);

  // Estado de la Tabla de Órdenes
  ordersPage = signal<PurchaseClusterOrdersPage | null>(null);
  isOrdersLoading = signal<boolean>(false);
  ordersError = signal<string | null>(null);
  
  pageIndex = signal<number>(0);
  pageSize = signal<number>(10);

  // ViewChildren para gráficas
  @ViewChild('distributionChart') distCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ticketChart') ticketCanvasRef!: ElementRef<HTMLCanvasElement>;

  // Subject para emitir solicitudes de carga de órdenes
  private loadOrders$ = new BehaviorSubject<{cluster: number, page: number, size: number} | null>(null);
  private destroy$ = new Subject<void>();

  // Gráficas
  private distributionChart: Chart | null = null;
  private ticketChart: Chart | null = null;

  constructor(
    private clusteringService: AdminPurchaseClusteringService,
    private authService: AuthService,
    private orderService: OrderService,
    private currencyPipe: CurrencyPipe,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.hasOrderReadPermission.set(this.authService.hasPermission('ORDER_READ'));

    // Efecto para redibujar gráficas de manera segura cuando `profiles` o `currentTab` cambien
    effect(() => {
      const profs = this.profiles();
      const tab = this.currentTab(); // Dependencia reactiva
      
      if (profs.length > 0 && tab === 'historical') {
        setTimeout(() => this.renderCharts(profs), 50);
      }
    });
  }

  ngOnInit(): void {
    this.setupOrdersSubscription();
    this.loadInitialData();

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['orderId']) {
        this.currentTab.set('prediction');
      }
    });
  }

  setTab(tab: 'prediction' | 'historical'): void {
    this.currentTab.set(tab);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  loadInitialData(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.ordersPage.set(null);
    this.selectedClusterNumber.set(null);

    forkJoin({
      summary: this.clusteringService.getActiveSummary(),
      profiles: this.clusteringService.getActiveProfiles()
    }).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.isLoading.set(false))
    ).subscribe({
      next: (res) => {
        this.summary.set(res.summary);
        this.profiles.set(res.profiles);
        
        // Seleccionar inicialmente el cluster con mayor orderCount
        if (res.profiles.length > 0) {
          const topProfile = [...res.profiles].sort((a, b) => b.orderCount - a.orderCount)[0];
          this.selectCluster(topProfile.clusterNumber);
        }
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 404) {
          this.error.set('No hay ningún modelo de clustering activo en este momento.');
        } else if (err.status === 403) {
          this.error.set('No tienes permisos suficientes para acceder a esta información.');
        } else {
          const errorId = err.error?.errorId ? `(Ref: ${err.error.errorId})` : '';
          this.error.set(`No se pudo obtener la información de patrones de compra ${errorId}.`);
        }
      }
    });
  }

  private setupOrdersSubscription(): void {
    this.loadOrders$.pipe(
      takeUntil(this.destroy$),
      switchMap((request) => {
        if (!request) return of(null);
        
        this.isOrdersLoading.set(true);
        this.ordersError.set(null);
        
        return this.clusteringService.getClusterOrders(request.cluster, request.page, request.size).pipe(
          catchError((err: HttpErrorResponse) => {
            const errorId = err.error?.errorId ? `(Ref: ${err.error.errorId})` : '';
            this.ordersError.set(`No se pudieron cargar las órdenes ${errorId}.`);
            return of(null);
          }),
          finalize(() => this.isOrdersLoading.set(false))
        );
      })
    ).subscribe((page) => {
      if (page) {
        this.ordersPage.set(page);
      }
    });
  }

  selectCluster(clusterNumber: number): void {
    if (this.selectedClusterNumber() === clusterNumber) return;
    
    this.selectedClusterNumber.set(clusterNumber);
    this.pageIndex.set(0);
    this.triggerLoadOrders();
  }

  onPageChange(newPage: number): void {
    this.pageIndex.set(newPage);
    this.triggerLoadOrders();
  }

  onPageSizeChange(event: Event): void {
    const newSize = parseInt((event.target as HTMLSelectElement).value, 10);
    this.pageSize.set(newSize);
    this.pageIndex.set(0);
    this.triggerLoadOrders();
  }

  loadOrders(page: number, size: number): void {
    this.pageIndex.set(page);
    this.pageSize.set(size);
    this.triggerLoadOrders();
  }

  private triggerLoadOrders(): void {
    const cluster = this.selectedClusterNumber();
    if (cluster !== null) {
      this.loadOrders$.next({
        cluster: cluster,
        page: this.pageIndex(),
        size: this.pageSize()
      });
    }
  }

  getEndItemIndex(): number {
    const page = this.ordersPage();
    if (!page) return 0;
    return Math.min((this.pageIndex() + 1) * this.pageSize(), page.totalElements);
  }

  // --- Modal de Detalles ---
  
  openOrderDetail(orderId: number): void {
    if (!this.hasOrderReadPermission()) return;
    
    // Cargar la orden completa
    this.orderService.getOrderById(orderId).subscribe({
      next: (order) => {
        this.selectedOrder.set(order);
        this.showDetailModal.set(true);
      },
      error: (err) => {
        console.error('Error loading order', err);
        // Opcional: mostrar notificación de error
      }
    });
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedOrder.set(null);
  }
  
  onOrderUpdated(updatedOrder: Order): void {
    // Cuando la orden se actualice en el modal, refrescamos la lista actual si es necesario
    this.triggerLoadOrders();
  }

  analyzeHistoricalOrder(orderId: number): void {
    // 1. Tomar el orderId real
    // 2. Cambiar a la pestaña "Predicción Operativa"
    // 3. Actualizar el query param orderId
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { orderId: orderId.toString() },
      queryParamsHandling: 'merge'
    });
    this.setTab('prediction');
    // 4. Posicionar la página arriba
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- Utilidades Tipadas ---

  formatPaymentMethod(method: string | null | undefined): string {
    if (!method) return 'No especificado';
    
    switch (method) {
      case 'BANK_TRANSFER': return 'Transferencia bancaria';
      case 'MERCADO_PAGO': return 'Mercado Pago';
      case 'ACADEMIC_SYNTHETIC': return 'Académico sintético';
      default: return method;
    }
  }

  formatDeliveryType(type: string | null | undefined): string {
    if (!type) return 'No especificado';
    
    switch (type) {
      case 'PICKUP_STORE': return 'Recolección en tienda';
      case 'LOCAL_DELIVERY': return 'Entrega local';
      case 'EXTERNAL_SHIPPING_FIXED': return 'Envío externo';
      case 'ACADEMIC_SYNTHETIC': return 'Académico sintético';
      case 'COMPLETED': return 'Completado';
      default: return type;
    }
  }

  // --- Gráficas ---

  private destroyCharts(): void {
    if (this.distributionChart) {
      this.distributionChart.destroy();
      this.distributionChart = null;
    }
    if (this.ticketChart) {
      this.ticketChart.destroy();
      this.ticketChart = null;
    }
  }

  private renderCharts(profs: PurchaseClusterProfile[]): void {
    this.destroyCharts();

    if (!profs || profs.length === 0) return;

    const colors = [
      '#6D1331', // burdeos
      '#E07A5F', // terracota
      '#D4AF37', // dorado envejecido
      '#C75D2C', // naranja tostado
      '#8A817C'  // gris cálido
    ];

    const labels = profs.map(p => p.clusterName);
    
    // Gráfica de Distribución
    if (this.distCanvasRef && this.distCanvasRef.nativeElement) {
      const distCanvas = this.distCanvasRef.nativeElement;
      const dataValues = profs.map(p => p.orderCount);
      const dataPercentages = profs.map(p => (p.percentage).toFixed(1) + '%');

      const configDist: ChartConfiguration = {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: dataValues,
            backgroundColor: colors.slice(0, profs.length),
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right' },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const val = context.raw;
                  const pct = dataPercentages[context.dataIndex];
                  const label = context.label;
                  return `${label} — ${pct} · ${val} órdenes`;
                }
              }
            }
          }
        }
      };
      this.distributionChart = new Chart(distCanvas, configDist);
    }

    // Gráfica de Ticket Promedio
    if (this.ticketCanvasRef && this.ticketCanvasRef.nativeElement) {
      const ticketCanvas = this.ticketCanvasRef.nativeElement;
      const ticketValues = profs.map(p => p.averageTotal || 0);
      
      const configTicket: ChartConfiguration = {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Ticket Promedio (MXN)',
            data: ticketValues,
            backgroundColor: colors,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value) => this.currencyPipe.transform(value, 'MXN', 'symbol-narrow', '1.0-0', 'es-MX') || '$' + value
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const value = context.raw as number;
                  return ' ' + (this.currencyPipe.transform(value, 'MXN', 'symbol-narrow', '1.2-2', 'es-MX') || '$' + value);
                }
              }
            }
          }
        }
      };
      this.ticketChart = new Chart(ticketCanvas, configTicket);
    }
  }
}
