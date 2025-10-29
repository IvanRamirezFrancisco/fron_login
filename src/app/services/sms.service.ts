import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { 
  SmsSetupRequest, 
  SmsVerificationRequest, 
  SmsSetupResponse,
  SendCodeRequest,
  VerifyCodeRequest 
} from '../models/sms.model';

@Injectable({
  providedIn: 'root'
})
export class SmsService {
  private readonly API_URL = `${environment.apiUrl}/2fa`;

  constructor(private http: HttpClient) {}

  /**
   * Configurar SMS 2FA - Envía código al número proporcionado
   */
  setupSmsAndSendCode(phoneNumber: string): Observable<SmsSetupResponse> {
    const request: SmsSetupRequest = { phoneNumber };
    return this.http.post<SmsSetupResponse>(`${this.API_URL}/sms/setup/send-code`, request);
  }

  /**
   * Verificar código de setup y activar SMS 2FA
   */
  verifySmsSetup(code: string): Observable<SmsSetupResponse> {
    const request: SmsVerificationRequest = { code };
    return this.http.post<SmsSetupResponse>(`${this.API_URL}/sms/setup/verify-code`, request);
  }

  /**
   * Enviar código SMS para usuario autenticado
   */
  sendSmsCode(): Observable<SmsSetupResponse> {
    return this.http.post<SmsSetupResponse>(`${this.API_URL}/sms/send`, {});
  }

  /**
   * Verificar código SMS para usuario autenticado
   */
  verifySmsCode(code: string): Observable<SmsSetupResponse> {
    const request: SmsVerificationRequest = { code };
    return this.http.post<SmsSetupResponse>(`${this.API_URL}/sms/verify`, request);
  }

  /**
   * Enviar código durante el proceso de login
   */
  sendLoginCode(email: string, method: 'SMS' | 'EMAIL'): Observable<SmsSetupResponse> {
    const request: SendCodeRequest = { email, method };
    return this.http.post<SmsSetupResponse>(`${this.API_URL}/send-login-code`, request);
  }

  /**
   * Verificar código durante el proceso de login
   */
  verifyLoginCode(email: string, code: string, method: 'SMS' | 'EMAIL' | 'GOOGLE_AUTHENTICATOR'): Observable<any> {
    const request: VerifyCodeRequest = { email, code, method };
    return this.http.post<any>(`${this.API_URL}/verify`, request);
  }

  /**
   * Deshabilitar 2FA
   */
  disableTwoFactor(): Observable<SmsSetupResponse> {
    return this.http.post<SmsSetupResponse>(`${this.API_URL}/disable`, {});
  }

  /**
   * Validar formato de número de teléfono
   */
  isValidPhoneNumber(phoneNumber: string): boolean {
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      return false;
    }
    
    // Formato internacional: +1234567890 (10-15 dígitos después del +)
    const phoneRegex = /^\+[1-9]\d{9,14}$/;
    return phoneRegex.test(phoneNumber.trim());
  }

  /**
   * Formatear número de teléfono para mostrar
   */
  formatPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return '';
    
    // Si es un número de US/CA (+1XXXXXXXXXX), formatear como +1 (XXX) XXX-XXXX
    if (phoneNumber.startsWith('+1') && phoneNumber.length === 12) {
      const digits = phoneNumber.slice(2);
      return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    
    return phoneNumber;
  }

  /**
   * Obtener headers con autorización
   */
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
}