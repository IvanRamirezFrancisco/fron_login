import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, throwError, map, of } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

import { AuthResponse, User } from '../models/user.model';
import { ApiResponse } from '../models/api-response.model';
// En auth.service.ts, asegúrate de importar User desde models

// export interface User {
//   id: string;
//   email: string;
//   name: string;
// }



// // REEMPLAZAR POR:
// export interface User {
//   id: number;
//   firstName: string;
//   lastName: string;
//   email: string;
//   phone?: string;
//   enabled: boolean;
//   twoFactorEnabled: boolean;
//   roles: string[];
//   createdAt: string;
//   updatedAt: string;
// }

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

// Interfaz para la respuesta de Spring Boot
export interface SpringBootAuthResponse {
  success: boolean;
  message: string;
  data?: {
    // ✅ AGREGADO: Estructura para respuesta con jwtResponse
    jwtResponse?: {
      accessToken?: string;
      tokenType?: string;
      expiresIn?: number;
      user?: User;
    };
    sessionManagement?: {
      activeSessions?: number;
      maxSessions?: number;
      sessionInfo?: string;
    };
    // Estructura anterior para compatibilidad
    accessToken?: string;
    tokenType?: string;
    expiresIn?: number;
    expiresAt?: string | null;
    user?: User;
    twoFactorRequired?: boolean;
    pendingUser?: User;
  };
  // Soporta todos los formatos posibles en la raíz:
  accessToken?: string;
  tokenType?: string;
  token?: string; // <-- AGREGA ESTA LÍNEA
  user?: User;
  twoFactorRequired?: boolean;
  pendingUser?: User;
}

// Interfaz que usará internamente el frontend
// export interface AuthResponse {
//   token?: string;
//   user?: User;
//   twoFactorRequired?: boolean;
//   pendingUser?: User;
//   message?: string;
//   // Si tu backend responde con un objeto "data", puedes agregarlo así:
//   data?: {
//     twoFactorRequired?: boolean;
//     user?: User;
//     [key: string]: any;
//   };
// }
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = `${environment.apiUrl}/auth`;
  private tokenSubject = new BehaviorSubject<string | null>(this.getStoredToken());
  private userSubject = new BehaviorSubject<User | null>(this.getStoredUser());

  public token$ = this.tokenSubject.asObservable();
  public user$ = this.userSubject.asObservable();
  public isLoggedIn$ = new BehaviorSubject<boolean>(this.isAuthenticated());

  constructor(private http: HttpClient, private router: Router) {
    console.log('AuthService API URL:', this.API_URL);
  }






  



login(credentials: LoginRequest): Observable<AuthResponse> {
  return this.http.post<SpringBootAuthResponse>(`${this.API_URL}/login`, credentials)
    .pipe(
      map(response => {
        console.log('🔍 Login response received:', response);
        
        // Maneja el caso donde la respuesta indica que se requiere 2FA
        if (response.data?.twoFactorRequired || response.twoFactorRequired) {
          return {
            twoFactorRequired: true,
            pendingUser: response.data?.user ?? response.user
          } as AuthResponse;
        }
        
        // ✅ CORREGIDO: Buscar token en la estructura correcta de respuesta
        const token = response.data?.jwtResponse?.accessToken ?? 
                     response.data?.accessToken ?? 
                     response.accessToken ?? 
                     response.token;
                     
        const user = response.data?.jwtResponse?.user ?? 
                    response.data?.user ?? 
                    response.user;
        
        console.log('🔍 Extracted token:', token ? 'Found' : 'Not found');
        console.log('🔍 Extracted user:', user ? 'Found' : 'Not found');
        
        if (token && user) {
          return {
            token,
            user
          } as AuthResponse;
        }
        
        // Si no hay token ni usuario, respuesta inválida
        console.error('❌ No token or user found in response');
        return {
          message: 'Respuesta de login inválida'
        } as AuthResponse;
      }),
      tap(response => {
        if (response.token && response.user) {
          this.setSession(response);
        }
      }),
      catchError(error => throwError(() => error))
    );
}
   getCurrentUserFromBackend(): Observable<User | null> {
    const token = this.getStoredToken();

    // Si no hay token válido, no llamar al backend
    if (!token) {
      return of(null);
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get<any>(`${environment.apiUrl}/users/profile`, { headers }).pipe(
      map(response => {
        // El endpoint devuelve ApiResponse con los datos en .data
        if (response.success && response.data) {
          return response.data as User;
        }
        return null;
      }),
      // Si hay error relacionado con token, limpiar sesión y devolver null para que el UI lo maneje
      catchError(err => {
        console.error('Error al obtener usuario:', err);
        
        // SOLO hacer logout si es un 401 en una petición de usuario autenticado
        // NO hacer logout por errores en validaciones públicas o problemas de conectividad
        if (err?.status === 401) {
          console.warn('AuthService: Token inválido detectado, ejecutando logout');
          this.logout();
        } else {
          console.log('AuthService: Error no relacionado con autenticación, manteniendo sesión');
        }
        
        return of(null);
      })
    );
  }

  register(userData: RegisterRequest): Observable<AuthResponse> {
    console.log('Intentando registro con:', userData);
    
    return this.http.post<SpringBootAuthResponse>(`${this.API_URL}/register`, userData)
      .pipe(
        map(response => {
          console.log('Respuesta original del registro:', response);
          const adaptedResponse: AuthResponse = {
            token: response.accessToken,
            user: response.user
          };
          console.log('Respuesta de registro adaptada:', adaptedResponse);
          return adaptedResponse;
        }),
        tap(response => {
          console.log('Guardando sesión de registro:', response);
          this.setSession(response);
        }),
        catchError(error => {
          console.error('Error en registro:', error);
          return throwError(() => error);
        })
      );
  }

  logout(): void {
    const currentUrl = this.router.url;
    console.log('Cerrando sesión desde:', currentUrl);
    
    // Evitar logout si ya estamos en páginas públicas para prevenir loops
    if (['/login', '/register', '/'].includes(currentUrl)) {
      console.log('Ya estamos en página pública, evitando redirección');
      return;
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.tokenSubject.next(null);
    this.userSubject.next(null);
    this.isLoggedIn$.next(false);
    
    console.log('Sesión cerrada, redirigiendo a login');
    this.router.navigate(['/login']);
  }

  // ✅ MÉTODO PÚBLICO isAuthenticated() - esto es lo que faltaba
  isAuthenticated(): boolean {
    const token = this.getStoredToken();
    const isValid = !!token && !this.isTokenExpired(token);
    console.log('Verificando autenticación:', { token: !!token, isValid });
    return isValid;
  }

private setSession(authResult: AuthResponse): void {
    console.log('Guardando sesión:', authResult);
    // Guardar token solo si existe y no es vacío
    if (authResult.token && authResult.token.trim() !== '') {
      localStorage.setItem('token', authResult.token);
      this.tokenSubject.next(authResult.token);
    } else {
      localStorage.removeItem('token');
      this.tokenSubject.next(null);
    }

    // Guardar usuario solo si existe
    if (authResult.user) {
      localStorage.setItem('user', JSON.stringify(authResult.user));
      this.userSubject.next(authResult.user);
    } else {
      localStorage.removeItem('user');
      this.userSubject.next(null);
    }

    // Actualiza estado de login según token válido
    const token = this.getStoredToken();
    this.isLoggedIn$.next(!!token && !this.isTokenExpired(token));
    console.log('Sesión guardada exitosamente');
  }


  public completeLogin(token: string, user: User): void {
    if (token && token.trim() !== '') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      this.tokenSubject.next(token);
      this.userSubject.next(user);
      this.isLoggedIn$.next(true);
    }
  }

  private getStoredToken(): string | null {
    try {
      const token = localStorage.getItem('token');
      return token && token !== 'null' && token !== 'undefined' ? token : null;
    } catch (error) {
      console.error('Error getting stored token:', error);
      localStorage.removeItem('token');
      return null;
    }
  }
  

  private getStoredUser(): User | null {
    try {
      const userData = localStorage.getItem('user');
      
      // Validar que exista y no sea null/undefined
      if (!userData || userData === 'null' || userData === 'undefined') {
        return null;
      }
      
      // Intentar parsear el JSON
      return JSON.parse(userData);
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      // Limpiar datos corruptos
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return null;
    }
  }
  
  

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = payload.exp * 1000 < Date.now();
      console.log('Token expirado?', isExpired);
      return isExpired;
    } catch (error) {
      console.log('Error al verificar token:', error);
      return true;
    }
  }


  verifyTwoFactor(payload: { email: string; code: string; method: string }): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/2fa/verify`, payload);
  }

  /**
   * Enviar código 2FA por email durante el login
   */
  sendTwoFactorCode(email: string, method: 'EMAIL'): Observable<any> {
    // El endpoint en el backend es /api/2fa/send-login-code
    return this.http.post<any>(`${environment.apiUrl}/2fa/send-login-code`, {
      email: email,
      method: method
    });
  }

  // ===== NUEVOS MÉTODOS PARA MÚLTIPLES 2FA =====

  /**
   * Desactivar método específico de 2FA
   */
  disableSpecificTwoFactor(method: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/2fa/disable/${method}`, {});
  }

  /**
   * Obtener métodos 2FA disponibles
   */
  getAvailableTwoFactorMethods(): Observable<ApiResponse<{[key: string]: boolean}>> {
    return this.http.get<ApiResponse<{[key: string]: boolean}>>(`${environment.apiUrl}/2fa/methods`);
  }

  /**
   * Obtener usuario actual como observable
   */
  getCurrentUser(): Observable<User | null> {
    return this.userSubject.asObservable();
  }

  /**
   * Actualizar usuario en el BehaviorSubject y localStorage
   */
  updateCurrentUser(user: User | null): void {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      this.userSubject.next(user);
    } else {
      localStorage.removeItem('user');
      this.userSubject.next(null);
    }
  }

  /**
   * Generar códigos de respaldo
   */
  generateBackupCodes(): Observable<ApiResponse<{codes: string[]}>> {
    return this.http.post<ApiResponse<{codes: string[]}>>(`${environment.apiUrl}/2fa/backup-codes/generate`, {});
  }

  /**
   * Obtener estado de códigos de respaldo
   */
  getBackupCodesStatus(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${environment.apiUrl}/2fa/backup-codes/status`);
  }

  /**
   * Verificar código de respaldo
   */
  verifyBackupCode(payload: { email: string; code: string }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/2fa/backup-codes/verify`, payload);
  }

  /**
   * Verificar código de respaldo para login (devuelve JWT)
   */
  verifyBackupCodeForLogin(email: string, code: string): Observable<any> {
    const payload = {
      email: email,
      code: code,
      method: 'BACKUP_CODE'
    };
    
    return this.http.post<any>(`${environment.apiUrl}/2fa/verify`, payload).pipe(
      tap(response => {
        if (response.success) {
          console.log('✅ Backup code verification successful for login');
        }
      }),
      catchError(error => {
        console.error('❌ Backup code verification failed for login:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Verificar email con token
   */
  verifyEmail(token: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/auth/verify-email`, { token })
      .pipe(
        tap(response => {
          if (response.success) {
            console.log('✅ Email verification successful');
          }
        }),
        catchError(error => {
          console.error('❌ Email verification failed:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Desactivar códigos de respaldo
   */
  disableBackupCodes(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/2fa/backup-codes/disable`, {});
  }
}
