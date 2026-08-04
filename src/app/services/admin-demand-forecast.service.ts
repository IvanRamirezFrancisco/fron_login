import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DemandForecastModelStatusDTO, DemandForecastListDTO, DemandForecastDetailDTO } from '../models/demand-forecast.models';
import { SpringPage } from '../models/product.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminDemandForecastService {
  private apiUrl = `${environment.apiUrl}/admin/analytics/demand-forecast`;

  constructor(private http: HttpClient) {}

  getModelStatus(): Observable<DemandForecastModelStatusDTO> {
    return this.http.get<DemandForecastModelStatusDTO>(`${this.apiUrl}/model/status`);
  }

  getForecasts(
    page: number = 0,
    size: number = 10,
    categoryId?: number,
    trend?: string,
    priority?: string,
    forecastStatus?: string,
    active?: boolean,
    search?: string,
    sortBy?: string,
    sortDirection?: string
  ): Observable<SpringPage<DemandForecastListDTO>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (categoryId != null) params = params.set('categoryId', categoryId.toString());
    if (trend) params = params.set('trend', trend);
    if (priority) params = params.set('priority', priority);
    if (forecastStatus) params = params.set('forecastStatus', forecastStatus);
    if (active != null) params = params.set('active', active.toString());
    if (search) params = params.set('search', search);

    if (sortBy && sortDirection) {
      params = params.set('sort', `${sortBy},${sortDirection}`);
    }

    return this.http.get<SpringPage<DemandForecastListDTO>>(this.apiUrl, { params });
  }

  getForecastDetail(productId: number): Observable<DemandForecastDetailDTO> {
    return this.http.get<DemandForecastDetailDTO>(`${this.apiUrl}/products/${productId}`);
  }
}
