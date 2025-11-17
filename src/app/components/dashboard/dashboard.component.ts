import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileLayoutComponent } from '../profile-layout/profile-layout.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ProfileLayoutComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  constructor() {}

  ngOnInit(): void {
    console.log('✅ UserDashboardComponent refactorizado - Usando ProfileLayoutComponent');
  }
}
