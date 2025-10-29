import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model'



import { Observable } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  currentUser$: Observable<User | null>;
  isLoggedIn$: Observable<boolean>;

  constructor(private authService: AuthService) {
    this.currentUser$ = this.authService.user$; // Cambiar de currentUser$ a user$
    this.isLoggedIn$ = this.authService.isLoggedIn$;
  }

  ngOnInit(): void {}

  logout(): void {
    this.authService.logout();
  }
}