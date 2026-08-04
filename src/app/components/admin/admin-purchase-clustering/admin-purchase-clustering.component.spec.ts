import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { AdminPurchaseClusteringComponent } from './admin-purchase-clustering.component';
import { AdminPurchaseClusteringService } from '../../../services/admin-purchase-clustering.service';
import { AuthService } from '../../../services/auth.service';
import { OrderService } from '../../../services/order.service';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';

describe('AdminPurchaseClusteringComponent', () => {
  let component: AdminPurchaseClusteringComponent;
  let fixture: ComponentFixture<AdminPurchaseClusteringComponent>;
  let clusteringServiceSpy: jasmine.SpyObj<AdminPurchaseClusteringService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let orderServiceSpy: jasmine.SpyObj<OrderService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockSummary = {
    runId: 1,
    modelVersion: '1.0',
    algorithm: 'K-Means',
    selectedK: 2,
    ordersAnalyzed: 100,
    featureCount: 5,
    datasetView: 'view',
    dataOrigin: 'origin',
    periodStart: '2023-01-01',
    periodEnd: '2023-12-31',
    inertia: 100,
    silhouetteScore: 0.5,
    daviesBouldinScore: 0.5,
    calinskiHarabaszScore: 0.5,
    featureNames: [],
    preprocessingConfig: {},
    notebookName: 'notebook',
    status: 'COMPLETED',
    active: true,
    executedAt: '2023-12-31T00:00:00Z',
    academicData: true,
    dataDisclaimer: 'Disclaimer',
    integrity: {
      expectedClusters: 2,
      actualProfiles: 2,
      expectedOrders: 100,
      assignedOrders: 100,
      profileOrdersSum: 100,
      profilePercentageSum: 1,
      consistent: true
    }
  };

  const mockProfiles = [
    { clusterNumber: 1, clusterName: 'Cluster 1', orderCount: 40, percentage: 0.4 },
    { clusterNumber: 2, clusterName: 'Cluster 2', orderCount: 60, percentage: 0.6 } // Mayor orderCount
  ] as any[];

  beforeEach(async () => {
    clusteringServiceSpy = jasmine.createSpyObj('AdminPurchaseClusteringService', [
      'getActiveSummary', 'getActiveProfiles', 'getActiveProfile', 'getClusterOrders',
      'getModelStatus', 'predictOrder'
    ]);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['hasPermission']);
    orderServiceSpy = jasmine.createSpyObj('OrderService', ['getOrderById', 'getAllOrders']);
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    authServiceSpy.hasPermission.and.returnValue(true);

    clusteringServiceSpy.getModelStatus.and.returnValue(of({} as any));
    clusteringServiceSpy.predictOrder.and.returnValue(of({} as any));
    orderServiceSpy.getAllOrders.and.returnValue(of({ content: [] } as any));

    await TestBed.configureTestingModule({
      imports: [AdminPurchaseClusteringComponent],
      providers: [
        { provide: AdminPurchaseClusteringService, useValue: clusteringServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminPurchaseClusteringComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load initial data and select profile with highest orderCount', fakeAsync(() => {
    clusteringServiceSpy.getActiveSummary.and.returnValue(of(mockSummary as any));
    clusteringServiceSpy.getActiveProfiles.and.returnValue(of(mockProfiles));
    clusteringServiceSpy.getClusterOrders.and.returnValue(of({ content: [], totalElements: 0 } as any));
    
    fixture.detectChanges();
    tick();

    expect(component.summary()).toEqual(mockSummary as any);
    expect(component.selectedClusterNumber()).toBe(2); // Profile 2 has 60 orders
  }));

  it('should change cluster and reset page index', fakeAsync(() => {
    clusteringServiceSpy.getActiveSummary.and.returnValue(of(mockSummary as any));
    clusteringServiceSpy.getActiveProfiles.and.returnValue(of(mockProfiles));
    clusteringServiceSpy.getClusterOrders.and.returnValue(of({ content: [], totalElements: 0 } as any));
    
    fixture.detectChanges();
    tick();

    component.pageIndex.set(2);
    component.selectCluster(1);
    
    expect(component.selectedClusterNumber()).toBe(1);
    expect(component.pageIndex()).toBe(0);
  }));

  it('should change page', () => {
    component.selectedClusterNumber.set(1);
    clusteringServiceSpy.getClusterOrders.and.returnValue(of({ content: [], totalElements: 0 } as any));
    component.onPageChange(2);
    expect(component.pageIndex()).toBe(2);
  });

  it('should change size and reset page index', () => {
    component.selectedClusterNumber.set(1);
    component.pageIndex.set(2);
    clusteringServiceSpy.getClusterOrders.and.returnValue(of({ content: [], totalElements: 0 } as any));
    
    component.onPageSizeChange({ target: { value: '50' } } as any);
    
    expect(component.pageSize()).toBe(50);
    expect(component.pageIndex()).toBe(0);
  });

  it('should show academic data disclaimer if true', fakeAsync(() => {
    clusteringServiceSpy.getActiveSummary.and.returnValue(of(mockSummary as any));
    clusteringServiceSpy.getActiveProfiles.and.returnValue(of(mockProfiles));
    clusteringServiceSpy.getClusterOrders.and.returnValue(of({ content: [], totalElements: 0 } as any));
    
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.tech-alert')).toBeTruthy();
  }));

  it('should show integrity warning if inconsistent', fakeAsync(() => {
    const inconsistentSummary = { ...mockSummary, integrity: { ...mockSummary.integrity, consistent: false } };
    clusteringServiceSpy.getActiveSummary.and.returnValue(of(inconsistentSummary as any));
    clusteringServiceSpy.getActiveProfiles.and.returnValue(of(mockProfiles));
    clusteringServiceSpy.getClusterOrders.and.returnValue(of({ content: [], totalElements: 0 } as any));
    
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.tech-alert')).toBeTruthy();
  }));

  it('should handle empty profiles without selecting', fakeAsync(() => {
    clusteringServiceSpy.getActiveSummary.and.returnValue(of(mockSummary as any));
    clusteringServiceSpy.getActiveProfiles.and.returnValue(of([]));
    
    fixture.detectChanges();
    tick();
    
    expect(component.selectedClusterNumber()).toBeNull();
  }));

  it('should handle errors correctly', fakeAsync(() => {
    clusteringServiceSpy.getActiveSummary.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    clusteringServiceSpy.getActiveProfiles.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    
    fixture.detectChanges();
    tick();
    
    expect(component.error()).toContain('No hay ningún modelo de clustering activo en este momento.');
  }));

  it('should analyze historical order and navigate to prediction', () => {
    spyOn(window, 'scrollTo');
    component.analyzeHistoricalOrder(123);
    
    expect(routerSpy.navigate).toHaveBeenCalledWith([], {
      relativeTo: jasmine.anything(),
      queryParams: { orderId: '123' },
      queryParamsHandling: 'merge'
    });
    expect(component.currentTab()).toBe('prediction');
    expect(window.scrollTo).toHaveBeenCalled();
  });
});
