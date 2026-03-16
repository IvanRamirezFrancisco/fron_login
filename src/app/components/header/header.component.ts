import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { User } from '../../models/user.model';

interface Sugerencia {
  texto: string;
  icono: string;
  ruta?: string;
  categoria?: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef;

  currentUser$: Observable<User | null>;
  isLoggedIn$: Observable<boolean>;
  cartCount$: Observable<number>;

  usuarioLogueado = false;
  nombreUsuario = '';
  cantidadCarrito = 0;
  cartTotal = 0;
  menuUsuarioAbierto = false;
  menuMovilAbierto = false;
  searchExpanded = false;
  terminoBusqueda = '';
  scrolled = false;

  sugerencias: Sugerencia[] = [
    { texto: 'Guitarras Acusticas',     icono: 'music_note',  categoria: 'guitarras'       },
    { texto: 'Pianos Digitales',         icono: 'piano',       categoria: 'pianos'          },
    { texto: 'Baterias Completas',       icono: 'radio',       categoria: 'baterias'        },
    { texto: 'Bajos Electricos',         icono: 'queue_music', categoria: 'bajos'           },
    { texto: 'Instrumentos de Viento',   icono: 'wind_power',  categoria: 'vientos'         },
    { texto: 'Amplificadores',           icono: 'speaker',     categoria: 'amplificadores'  },
  ];

  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private authService: AuthService,
    private cartService: CartService
  ) {
    this.currentUser$ = this.authService.user$;
    this.isLoggedIn$ = this.authService.isLoggedIn$;
    this.cartCount$ = this.cartService.cartCount$;
  }

  ngOnInit(): void {
    this.subscribeToServices();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    document.body.style.overflow = '';
  }

  private subscribeToServices(): void {
    this.subscriptions.push(
      this.isLoggedIn$.subscribe(v => { this.usuarioLogueado = v; }),
      this.currentUser$.subscribe(u => { this.nombreUsuario = u ? (u.firstName || u.email) : ''; }),
      this.cartCount$.subscribe(n  => { this.cantidadCarrito = n; }),
      this.cartService.cartTotal$.subscribe(t => { this.cartTotal = t; })
    );
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled = window.scrollY > 50;
  }

  toggleSearch(): void {
    this.searchExpanded = !this.searchExpanded;
    if (this.searchExpanded) {
      setTimeout(() => this.searchInput?.nativeElement.focus(), 150);
    } else {
      this.terminoBusqueda = '';
    }
  }

  buscar(): void {
    if (this.terminoBusqueda.trim()) {
      this.router.navigate(['/catalogo'], { queryParams: { busqueda: this.terminoBusqueda.trim() } });
      this.searchExpanded = false;
      this.terminoBusqueda = '';
    }
  }

  seleccionarSugerencia(sug: Sugerencia): void {
    if (sug.ruta) {
      this.router.navigate([sug.ruta]);
    } else if (sug.categoria) {
      this.router.navigate(['/catalogo'], { queryParams: { categoria: sug.categoria } });
    }
    this.searchExpanded = false;
    this.terminoBusqueda = '';
  }

  getSugerenciasFiltradas(): Sugerencia[] {
    if (!this.terminoBusqueda) return this.sugerencias.slice(0, 5);
    return this.sugerencias
      .filter(s => s.texto.toLowerCase().includes(this.terminoBusqueda.toLowerCase()))
      .slice(0, 5);
  }

  toggleMenuUsuario(): void  { this.menuUsuarioAbierto = !this.menuUsuarioAbierto; }
  cerrarMenuUsuario(): void  { this.menuUsuarioAbierto = false; }

  toggleMenuMovil(): void {
    this.menuMovilAbierto = !this.menuMovilAbierto;
    document.body.style.overflow = this.menuMovilAbierto ? 'hidden' : '';
  }

  cerrarMenuMovil(): void {
    this.menuMovilAbierto = false;
    document.body.style.overflow = '';
  }

  cerrarSesion(): void {
    this.authService.logout();
    this.cerrarMenuUsuario();
    this.router.navigate(['/']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const t = event.target as HTMLElement;
    if (this.menuUsuarioAbierto && !t.closest('.usuario-menu-wrapper')) this.cerrarMenuUsuario();
    if (this.searchExpanded  && !t.closest('.search-wrapper'))         { this.searchExpanded = false; this.terminoBusqueda = ''; }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.cerrarMenuUsuario();
    this.cerrarMenuMovil();
    this.searchExpanded = false;
    this.terminoBusqueda = '';
  }

  @HostListener('window:resize', ['$event'])
  onResize(e: Event): void {
    if ((e.target as Window).innerWidth > 768) this.cerrarMenuMovil();
  }
}