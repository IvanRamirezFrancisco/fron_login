import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  PurchaseClusteringSummary, 
  PurchaseClusterProfile, 
  PurchaseClusterOrdersPage,
  PurchaseClusteringModelStatus,
  PurchaseOrderClusteringPrediction
} from '../models/purchase-clustering.models';

@Injectable({
  providedIn: 'root'
})
export class AdminPurchaseClusteringService {
  private apiUrl = `${environment.apiUrl}/admin/analytics/purchase-clustering`;

  constructor(private http: HttpClient) {}

  getActiveSummary(): Observable<PurchaseClusteringSummary> {
    return this.http.get<PurchaseClusteringSummary>(`${this.apiUrl}/active`);
  }

  getActiveProfiles(): Observable<PurchaseClusterProfile[]> {
    return this.http.get<PurchaseClusterProfile[]>(`${this.apiUrl}/active/profiles`);
  }

  getActiveProfile(clusterNumber: number): Observable<PurchaseClusterProfile> {
    return this.http.get<PurchaseClusterProfile>(`${this.apiUrl}/active/profiles/${clusterNumber}`);
  }

  getClusterOrders(clusterNumber: number, page: number, size: number): Observable<PurchaseClusterOrdersPage> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
      
    return this.http.get<PurchaseClusterOrdersPage>(
      `${this.apiUrl}/active/profiles/${clusterNumber}/orders`,
      { params }
    );
  }

  getModelStatus(): Observable<PurchaseClusteringModelStatus> {
    return this.http.get<PurchaseClusteringModelStatus>(`${this.apiUrl}/model/status`);
  }

  predictOrder(orderId: number): Observable<PurchaseOrderClusteringPrediction> {
    return this.http.get<PurchaseOrderClusteringPrediction>(`${this.apiUrl}/orders/${orderId}/prediction`);
  }
}
