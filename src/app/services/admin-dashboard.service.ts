import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DashboardStats, Order, Product } from '../models/admin.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService {
  private apiUrl = `${environment.apiUrl}/admin/dashboard`;

  constructor(private http: HttpClient) { }

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats`);
  }

  getRecentOrders(limit: number = 5): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/recent-orders?limit=${limit}`);
  }

  getTopProducts(limit: number = 5): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/top-products?limit=${limit}`);
  }

  getLowStockProducts(threshold: number = 10): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/low-stock?threshold=${threshold}`);
  }
}
