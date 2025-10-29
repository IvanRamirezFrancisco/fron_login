import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class GoogleAuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  constructor(private http: HttpClient) {}

  getGoogleAuthSetup(): Observable<any> {
    return this.http.get(`${this.apiUrl}/google-auth/setup`);
  }

  confirmGoogleAuth(code: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/google-auth/confirm`, { code });
  }
}