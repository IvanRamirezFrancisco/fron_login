import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.css']
})
export class NotFoundComponent {
  
  constructor(private router: Router) {}

  goHome(): void {
    this.router.navigate(['/home']);
  }

  goBack(): void {
    window.history.back();
  }
}
