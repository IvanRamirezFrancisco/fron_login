import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { MainHeaderComponent } from './components/main-header/main-header.component';
import { MainFooterComponent } from './components/main-footer/main-footer.component';
import { CartToastComponent } from './components/cart-toast/cart-toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, MainHeaderComponent, MainFooterComponent, CartToastComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Login Project';
  showHeaderFooter = true;

  // Rutas donde NO queremos mostrar header/footer
  private routesWithoutLayout = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-account'];

  constructor(private router: Router) {
    // Escuchar cambios de ruta para ocultar/mostrar header/footer
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.showHeaderFooter = !this.routesWithoutLayout.some(route => 
        event.url.startsWith(route)
      );
    });
  }
}
