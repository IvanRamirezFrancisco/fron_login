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
   * MÉTODO NUCLEAR: Verificar código con FORZADO EXTREMO de strings
   */
  verifyLoginCode(email: string, code: string, method: 'SMS' | 'EMAIL' | 'GOOGLE_AUTHENTICATOR'): Observable<any> {
    console.log('💣 MÉTODO NUCLEAR ACTIVADO 💣');
    console.log('Input code:', code, 'Type:', typeof code);
    
    // MEGA conversión de string
    let codeString = String(code);
    codeString = `${codeString}`;
    codeString = codeString.toString();
    codeString = JSON.parse(`"${codeString}"`); // Force JSON string parsing
    codeString = new String(codeString).valueOf();
    
    console.log('MEGA converted code:', codeString, 'Type:', typeof codeString);
    console.log('🚨 ANÁLISIS CRÍTICO DEL CÓDIGO 🚨');
    console.log('  Código original:', code);
    console.log('  Código procesado:', codeString);
    console.log('  ¿Empieza con 0?:', codeString.startsWith('0'));
    console.log('  Longitud:', codeString.length);
    console.log('  parseInt result:', parseInt(codeString));
    console.log('  ¿Se perdió el 0?:', codeString.startsWith('0') && parseInt(codeString).toString() !== codeString);
    console.log('  Backend recibe entero:', parseInt(codeString));
    
    // Crear objeto con descriptores de propiedad para FORZAR strings
    const requestObj = {};
    Object.defineProperty(requestObj, 'email', {
      value: String(email),
      enumerable: true
    });
    Object.defineProperty(requestObj, 'code', {
      value: codeString,
      enumerable: true
    });
    Object.defineProperty(requestObj, 'method', {
      value: String(method),
      enumerable: true
    });
    
    console.log('🔍 NUCLEAR REQUEST VALIDATION:');
    console.log('  email:', (requestObj as any).email, 'Type:', typeof (requestObj as any).email);
    console.log('  code:', (requestObj as any).code, 'Type:', typeof (requestObj as any).code);
    console.log('  method:', (requestObj as any).method, 'Type:', typeof (requestObj as any).method);
    
    // SERIALIZACIÓN MANUAL CUSTOM para garantizar strings
    const manualJson = `{"email":"${String(email)}","code":"${codeString}","method":"${String(method)}"}`;
    console.log('🚀 Manual JSON:', manualJson);
    
    // Headers especiales para FORZAR string processing
    const nuclearHeaders = new HttpHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json',
      'X-Force-String-Types': 'true',
      'X-Code-Type': 'string'
    });
    
    // Usar string body directamente en lugar de object
    return this.http.post<any>(`${this.API_URL}/verify`, manualJson, { 
      headers: nuclearHeaders 
    });
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