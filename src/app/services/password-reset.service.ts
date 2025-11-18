import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class PasswordResetService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  /**
   * Solicitar reset de contraseña por email
   */
  forgotPassword(email: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/forgot-password`, null, {
      params: { email }
    });
  }

  /**
   * Resetear contraseña con token
   */
  resetPassword(token: string, newPassword: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/reset-password`, {
      token: token,
      newPassword: newPassword
    });
  }

  /**
   * Validar si el token de reset es válido
   */
  validateResetToken(token: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/validate-reset-token`, {
      params: { token }
    });
  }

  /**
   * Cambiar contraseña para usuarios autenticados
   */
  changePassword(currentPassword: string, newPassword: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${environment.apiUrl}/users/change-password`, {
      currentPassword: currentPassword,
      newPassword: newPassword
    });
  }
}