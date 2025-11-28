import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { PasswordResetService } from '../../services/password-reset.service';
import { HomeHeaderComponent } from '../home-header/home-header.component';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HomeHeaderComponent],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnInit, AfterViewInit {
  @ViewChild('emailInput') emailInput!: ElementRef;
  
  forgotPasswordForm: FormGroup;
  loading = false;
  submitted = false;
  message = '';
  error = '';

  constructor(
    private fb: FormBuilder,
    private passwordResetService: PasswordResetService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    // Leer email del query param si existe
    this.route.queryParams.subscribe(params => {
      if (params['email']) {
        this.forgotPasswordForm.patchValue({ email: params['email'] });
      }
    });
  }

  ngAfterViewInit(): void {
    // Enfocar el campo de email
    setTimeout(() => {
      if (this.emailInput) {
        this.emailInput.nativeElement.focus();
      }
    }, 100);
  }

  get f() {
    return this.forgotPasswordForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.message = '';
    this.error = '';

    if (this.forgotPasswordForm.invalid) {
      return;
    }

    this.loading = true;
    const email = this.forgotPasswordForm.get('email')?.value;

    this.passwordResetService.forgotPassword(email).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.message = response.message || 'Se ha enviado un enlace de recuperación a tu email.';
          this.forgotPasswordForm.reset();
          this.submitted = false;
          
          // Redirigir al login después de 3 segundos
          setTimeout(() => {
            this.router.navigate(['/login'], { 
              queryParams: { message: 'Revisa tu email para restablecer tu contraseña' }
            });
          }, 3000);
        } else {
          this.error = response.message || 'Error al procesar la solicitud';
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Error in forgot password:', err);
        
        if (err.error?.message) {
          this.error = err.error.message;
        } else if (err.status === 404) {
          this.error = 'No se encontró una cuenta con ese email';
        } else if (err.status === 429) {
          this.error = 'Demasiadas solicitudes. Intenta nuevamente más tarde';
        } else {
          this.error = 'Error del servidor. Intenta nuevamente más tarde';
        }
      }
    });
  }

  goBack(): void {
    const currentEmail = this.forgotPasswordForm.get('email')?.value || '';
    if (currentEmail && currentEmail.trim()) {
      this.router.navigate(['/login'], { queryParams: { email: currentEmail.trim() } });
    } else {
      this.router.navigate(['/login']);
    }
  }
}