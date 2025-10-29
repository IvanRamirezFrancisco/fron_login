import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule} from '@angular/common';
import { Observable, Subject, takeUntil, filter } from 'rxjs';
import { Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { User } from '../../models/user.model';


interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newRegistrations: number;
  lastLogin: string;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  action: () => void;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule], // <--- AGREGA RouterModule AQUÍ
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  user$: Observable<User | null>;
  currentUser: User | null = null;
  isLoading = false;
  currentTime = new Date();
  
  private destroy$ = new Subject<void>();

  // Datos simulados del dashboard
  stats: DashboardStats = {
    totalUsers: 1250,
    activeUsers: 89,
    newRegistrations: 23,
    lastLogin: new Date().toLocaleString()
  };

  quickActions: QuickAction[] = [
    {
      id: 'profile',
      title: 'Mi Perfil',
      description: 'Ver y editar información personal',
      icon: 'fas fa-user',
      color: '#667eea',
      action: () => this.navigateToProfile()
    },
    {
      id: 'settings',
      title: 'Configuración',
      description: 'Ajustar preferencias del sistema',
      icon: 'fas fa-cog',
      color: '#28a745',
      action: () => this.navigateToSettings()
    },
    {
      id: 'reports',
      title: 'Reportes',
      description: 'Ver estadísticas y análisis',
      icon: 'fas fa-chart-bar',
      color: '#17a2b8',
      action: () => this.navigateToReports()
    },
    {
      id: 'help',
      title: 'Ayuda',
      description: 'Documentación y soporte',
      icon: 'fas fa-question-circle',
      color: '#ffc107',
      action: () => this.navigateToHelp()
    }
  ];

  recentActivities = [
    {
      id: 1,
      action: 'Inicio de sesión exitoso',
      timestamp: new Date(Date.now() - 5 * 60000), // 5 minutos atrás
      type: 'success'
    },
    {
      id: 2,
      action: 'Perfil actualizado',
      timestamp: new Date(Date.now() - 2 * 60 * 60000), // 2 horas atrás
      type: 'info'
    },
    {
      id: 3,
      action: 'Configuración modificada',
      timestamp: new Date(Date.now() - 24 * 60 * 60000), // 1 día atrás
      type: 'warning'
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    this.user$ = this.authService.user$;
  }

  ngOnInit(): void {
    this.loadUserData();
    this.startTimeUpdater();
    this.loadDashboardData();
    
    // Escuchar cambios en la URL para recargar datos cuando regrese al dashboard
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      if (event.url === '/dashboard') {
        this.loadUserData();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Se ejecuta cuando el componente se vuelve visible (útil para recargar datos)
   */
  @HostListener('window:focus', ['$event'])
  onWindowFocus(): void {
    // Recargar datos cuando la ventana recibe el foco
    this.loadUserData();
  }

  private loadUserData(): void {
  if (!this.authService.isAuthenticated()) {
      console.log('Usuario no autenticado o token inválido. Redirigiendo a login.');
      this.authService.logout();
      return;
    }

    this.authService.getCurrentUserFromBackend().subscribe({
      next: (user) => {
        // getCurrentUserFromBackend puede devolver null si no hay token o hubo error
        if (user) {
          this.currentUser = user;
          this.updateLastLoginTime();
          
          // Log para debugging - mostrar estado de 2FA
          console.log('📊 Datos de usuario actualizados:', {
            googleAuth: user.googleAuthEnabled,
            sms: user.smsEnabled,
            phone: user.phone
          });
        } else {
          // Si no hay usuario válido, limpiar estado y redirigir a login
          this.authService.logout();
        }
      },
      error: (err) => {
        console.error('Error cargando datos de usuario:', err);
        this.authService.logout();
      }
    });
  }

  private startTimeUpdater(): void {
    setInterval(() => {
      this.currentTime = new Date();
    }, 1000);
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    // Simular carga de datos
    setTimeout(() => {
      this.stats.lastLogin = new Date().toLocaleString();
      this.isLoading = false;
    }, 1000);
  }

  private updateLastLoginTime(): void {
    this.stats.lastLogin = new Date().toLocaleString();
  }

  logout(): void {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      this.authService.logout();
    }
  }

  executeQuickAction(action: QuickAction): void {
    console.log(`Ejecutando acción: ${action.title}`);
    action.action();
  }

  private navigateToProfile(): void {
    // Implementar navegación al perfil
    console.log('Navegando al perfil...');
    // this.router.navigate(['/profile']);
  }

  private navigateToSettings(): void {
    // Implementar navegación a configuración
    console.log('Navegando a configuración...');
    // this.router.navigate(['/settings']);
  }

  private navigateToReports(): void {
    // Implementar navegación a reportes
    console.log('Navegando a reportes...');
    // this.router.navigate(['/reports']);
  }

  private navigateToHelp(): void {
    // Implementar navegación a ayuda
    console.log('Navegando a ayuda...');
    // this.router.navigate(['/help']);
  }

  refreshData(): void {
    this.loadDashboardData();
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
  }

  // ===== MÉTODOS PARA SEGURIDAD SMS =====

  /**
   * Formatear teléfono para mostrar en el dashboard de manera segura
   */
  formatPhoneForDisplay(phone: string): string {
    if (!phone) return '';
    
    // Si es un número mexicano (+52XXXXXXXXXX)
    if (phone.startsWith('+52') && phone.length >= 7) {
      const last4 = phone.slice(-4);
      return `+52 *** ***${last4}`;
    }
    
    // Si es un número de US/CA (+1XXXXXXXXXX)
    if (phone.startsWith('+1') && phone.length === 12) {
      const last4 = phone.slice(-4);
      return `+1 *** ***${last4}`;
    }
    
    // Para otros países internacionales
    if (phone.startsWith('+') && phone.length > 6) {
      const countryCode = phone.substring(0, phone.indexOf(' ') > 0 ? phone.indexOf(' ') : 3);
      const last4 = phone.slice(-4);
      return `${countryCode} *** ***${last4}`;
    }
    
    // Fallback: mostrar solo últimos 4 dígitos
    if (phone.length > 4) {
      return `*** ***${phone.slice(-4)}`;
    }
    
    return phone;
  }

  /**
   * Obtener nivel de seguridad actual
   */
  getSecurityLevel(): string {
    if (!this.currentUser) return 'low';
    
    const activeCount = this.getActiveTwoFactorCount();
    
    if (activeCount >= 2) return 'high';
    if (activeCount === 1) return 'medium';
    return 'low';
  }

  /**
   * Obtener icono de seguridad
   */
  getSecurityIcon(): string {
    const level = this.getSecurityLevel();
    switch (level) {
      case 'high': return 'fas fa-shield-alt';
      case 'medium': return 'fas fa-lock';
      default: return 'fas fa-exclamation-triangle';
    }
  }

  /**
   * Obtener texto de nivel de seguridad
   */
  getSecurityText(): string {
    const level = this.getSecurityLevel();
    switch (level) {
      case 'high': return 'Seguridad Alta';
      case 'medium': return 'Seguridad Media';
      default: return 'Seguridad Básica';
    }
  }

  /**
   * Obtener recomendación de seguridad
   */
  getSecurityRecommendation(): string {   
    if (!this.currentUser) return '';
    
    const activeCount = this.getActiveTwoFactorCount();
    const methods = [];
    
    if (this.currentUser.googleAuthEnabled) methods.push('Google Authenticator');
    if (this.currentUser.smsEnabled) methods.push('SMS 2FA');
    
    if (activeCount === 0) {
      return 'Se recomienda activar al menos un método de verificación en dos pasos para mayor seguridad.';
    } else if (activeCount === 1) {
      return `Tienes ${methods[0]} activado. Considera agregar SMS 2FA para máxima seguridad.`;
    } else if (activeCount === 2) {
      return `¡Excelente! Tienes ${methods.join(' y ')} activados. Tu cuenta tiene máxima protección.`;
    } else {
      return '¡Increíble! Tienes múltiples métodos 2FA activados. Máxima seguridad alcanzada.';
    }
  }

  // ===== NUEVOS MÉTODOS PARA MÚLTIPLES 2FA =====

  /**
   * Desactivar método específico de 2FA
   */
  disableTwoFactor(method: string): void {
    const methodNames: {[key: string]: string} = {
      'GOOGLE': 'Google Authenticator',
      'SMS': 'SMS 2FA',
      'EMAIL': 'Email 2FA'
    };

    const methodName = methodNames[method.toUpperCase()] || method;
    
    if (confirm(`¿Estás seguro de que deseas desactivar ${methodName}?`)) {
      this.authService.disableSpecificTwoFactor(method).subscribe({
        next: (response) => {
          if (response.success) {
            this.showMessage('success', `${methodName} desactivado correctamente`);
            this.loadUserData(); // Recargar datos del usuario
          } else {
            this.showMessage('error', response.message || 'Error al desactivar el método');
          }
        },
        error: (error) => {
          console.error('Error desactivando 2FA:', error);
          this.showMessage('error', 'Error al desactivar la verificación en dos pasos');
        }
      });
    }
  }

  /**
   * Configurar SMS 2FA
   */
  setupSms(): void {
    this.router.navigate(['/sms-setup']).then(() => {
      // Cuando regrese, recargar datos
      console.log('Navegando a SMS Setup...');
    });
  }

  /**
   * Método público para recargar datos (puede ser llamado externamente)
   */
  public refreshUserData(): void {
    console.log('Recargando datos del usuario...');
    this.loadUserData();
  }

  /**
   * Configurar Google Authenticator
   */
  setupGoogleAuth(): void {
    this.router.navigate(['/google-auth-setup']);
  }

  /**
   * Mostrar mensaje de feedback
   */
  private showMessage(type: 'success' | 'error' | 'info', message: string): void {
    // Por ahora solo console.log, se puede implementar toast/notification system
    console.log(`${type.toUpperCase()}: ${message}`);
  }

  /**
   * Obtener conteo de métodos 2FA activos
   */
  getActiveTwoFactorCount(): number {
    if (!this.currentUser) return 0;
    
    let count = 0;
    if (this.currentUser.googleAuthEnabled) count++;
    if (this.currentUser.smsEnabled) count++;
    
    return count;
  }

  /**
   * Actualizar métodos de seguridad con nuevos nombres
   */
  getSecurityLevelClass(): string {
    return `level-indicator ${this.getSecurityLevel()}`;
  }

  getSecurityLevelIcon(): string {
    const level = this.getSecurityLevel();
    switch (level) {
      case 'high': return 'fas fa-shield-alt';
      case 'medium': return 'fas fa-lock';
      case 'low': return 'fas fa-unlock';
      default: return 'fas fa-unlock';
    }
  }


}
