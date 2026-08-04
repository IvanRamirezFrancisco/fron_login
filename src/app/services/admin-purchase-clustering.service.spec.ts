import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AdminPurchaseClusteringService } from './admin-purchase-clustering.service';
import { environment } from '../../environments/environment';

describe('AdminPurchaseClusteringService', () => {
  let service: AdminPurchaseClusteringService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/admin/analytics/purchase-clustering`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AdminPurchaseClusteringService]
    });
    service = TestBed.inject(AdminPurchaseClusteringService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call getActiveSummary', () => {
    service.getActiveSummary().subscribe();
    const req = httpMock.expectOne(`${apiUrl}/active`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should call getActiveProfiles', () => {
    service.getActiveProfiles().subscribe();
    const req = httpMock.expectOne(`${apiUrl}/active/profiles`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call getActiveProfile', () => {
    service.getActiveProfile(2).subscribe();
    const req = httpMock.expectOne(`${apiUrl}/active/profiles/2`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should call getClusterOrders with correct params', () => {
    service.getClusterOrders(2, 1, 50).subscribe();
    const req = httpMock.expectOne(request => 
      request.url === `${apiUrl}/active/profiles/2/orders` &&
      request.params.get('page') === '1' &&
      request.params.get('size') === '50'
    );
    expect(req.request.method).toBe('GET');
    req.flush({});
  });
});
