import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-server-error',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './server-error.component.html',
  styleUrls: ['./server-error.component.css']
})
export class ServerErrorComponent {
  
  constructor(private router: Router) {}

  goHome(): void {
    this.router.navigate(['/home']);
  }

  reloadPage(): void {
    window.location.reload();
  }

  contactSupport(): void {
    this.router.navigate(['/ayuda']);
  }

  getCurrentTime(): string {
    return new Date().toLocaleString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
