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
  @ViewChild('inputBusqueda') inputBusqueda!: ElementRef;

  // Observables del estado
  currentUser$: Observable<User | null>;
  isLoggedIn$: Observable<boolean>;
  cartCount$: Observable<number>;

  // Estados del componente
  usuarioLogueado = false;
  nombreUsuario = '';
  cantidadCarrito = 0;
  cartTotal = 0;
  menuUsuarioAbierto = false;
  menuMovilAbierto = false;
  busquedaAbierta = false;
  terminoBusqueda = '';
  mostrarSugerenciasInline = false;
  mostrarCategorias = false;

  private subscriptions: Subscription[] = [];

  // Categorías para el mega menú
  categoriasPrincipales = [
    {
      nombre: 'Cuerdas',
      icono: 'music_note',
      subcategorias: [
        { id: 'guitarras-electricas', nombre: 'Guitarras Eléctricas' },
        { id: 'guitarras-acusticas', nombre: 'Guitarras Acústicas' },
        { id: 'bajos', nombre: 'Bajos' },
        { id: 'violines', nombre: 'Violines' },
        { id: 'cellos', nombre: 'Cellos' }
      ]
    },
    {
      nombre: 'Teclados',
      icono: 'piano',
      subcategorias: [
        { id: 'pianos-digitales', nombre: 'Pianos Digitales' },
        { id: 'sintetizadores', nombre: 'Sintetizadores' },
        { id: 'teclados', nombre: 'Teclados' },
        { id: 'organos', nombre: 'Órganos' }
      ]
    },
    {
      nombre: 'Percusión',
      icono: 'radio',
      subcategorias: [
        { id: 'baterias-acusticas', nombre: 'Baterías Acústicas' },
        { id: 'baterias-electronicas', nombre: 'Baterías Electrónicas' },
        { id: 'percusion-latina', nombre: 'Percusión Latina' },
        { id: 'accesorios-bateria', nombre: 'Accesorios' }
      ]
    },
    {
      nombre: 'Vientos',
      icono: 'wind_power',
      subcategorias: [
        { id: 'saxofones', nombre: 'Saxofones' },
        { id: 'trompetas', nombre: 'Trompetas' },
        { id: 'flautas', nombre: 'Flautas' },
        { id: 'clarinetes', nombre: 'Clarinetes' }
      ]
    }
  ];

  // Sugerencias de búsqueda
  sugerencias: Sugerencia[] = [
    { texto: 'Guitarras Acústicas', icono: 'music_note', categoria: 'guitars' },
    { texto: 'Pianos Digitales', icono: 'piano', categoria: 'pianos' },
    { texto: 'Baterías Completas', icono: 'radio', categoria: 'drums' },
    { texto: 'Bajos Eléctricos', icono: 'queue_music', categoria: 'bass' },
    { texto: 'Instrumentos de Viento', icono: 'wind_power', categoria: 'wind' },
    { texto: 'Accesorios', icono: 'settings', categoria: 'accessories' }
  ];

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
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private subscribeToServices(): void {
    // Suscribirse al estado de autenticación
    const authSub = this.isLoggedIn$.subscribe(isLoggedIn => {
      this.usuarioLogueado = isLoggedIn;
    });

    // Suscribirse al usuario actual
    const userSub = this.currentUser$.subscribe(user => {
      this.nombreUsuario = user ? (user.firstName || user.email) : '';
    });

    // Suscribirse al contador del carrito
    const cartSub = this.cartCount$.subscribe(count => {
      this.cantidadCarrito = count;
    });

    // Suscribirse al total del carrito
    const totalSub = this.cartService.cartTotal$.subscribe(total => {
      this.cartTotal = total;
    });

    this.subscriptions.push(authSub, userSub, cartSub, totalSub);
  }

  /**
   * Toggle del menú de usuario
   */
  toggleMenuUsuario(): void {
    this.menuUsuarioAbierto = !this.menuUsuarioAbierto;
  }

  /**
   * Cierra el menú de usuario
   */
  cerrarMenuUsuario(): void {
    this.menuUsuarioAbierto = false;
  }

  /**
   * Toggle del menú móvil
   */
  toggleMenuMovil(): void {
    this.menuMovilAbierto = !this.menuMovilAbierto;
  }

  /**
   * Cierra el menú móvil
   */
  cerrarMenuMovil(): void {
    this.menuMovilAbierto = false;
  }

  /**
   * Abre el modal de búsqueda
   */
  abrirBusqueda(): void {
    this.busquedaAbierta = true;
    // Enfocar el input después de que se abra el modal
    setTimeout(() => {
      if (this.inputBusqueda) {
        this.inputBusqueda.nativeElement.focus();
      }
    }, 100);
  }

  /**
   * Cierra el modal de búsqueda
   */
  cerrarBusqueda(): void {
    this.busquedaAbierta = false;
    this.terminoBusqueda = '';
  }

  /**
   * Ejecuta la búsqueda
   */
  buscar(): void {
    if (this.terminoBusqueda.trim()) {
      this.router.navigate(['/catalogo'], { 
        queryParams: { busqueda: this.terminoBusqueda.trim() } 
      });
      this.cerrarBusqueda();
    }
  }

  /**
   * Selecciona una sugerencia de búsqueda
   */
  seleccionarSugerencia(sugerencia: Sugerencia): void {
    if (sugerencia.ruta) {
      this.router.navigate([sugerencia.ruta]);
    } else if (sugerencia.categoria) {
      this.router.navigate(['/catalogo'], { 
        queryParams: { categoria: sugerencia.categoria } 
      });
    }
    this.cerrarBusqueda();
  }

  /**
   * Cierra la sesión del usuario
   */
  cerrarSesion(): void {
    this.authService.logout();
    this.cerrarMenuUsuario();
    this.router.navigate(['/']);
  }

  /**
   * Escucha clicks fuera del menú para cerrarlo
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    
    // Cerrar menú de usuario si se hace click fuera
    if (this.menuUsuarioAbierto && !target.closest('.usuario-seccion')) {
      this.cerrarMenuUsuario();
    }
  }

  /**
   * Escucha la tecla Escape para cerrar modales
   */
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.busquedaAbierta) {
      this.cerrarBusqueda();
    }
    if (this.menuUsuarioAbierto) {
      this.cerrarMenuUsuario();
    }
    if (this.menuMovilAbierto) {
      this.cerrarMenuMovil();
    }
  }

  /**
   * Maneja el resize de la ventana para cerrar menús en móvil
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    const window = event.target as Window;
    if (window.innerWidth > 768) {
      this.cerrarMenuMovil();
    }
  }

  /**
   * Obtiene sugerencias filtradas basadas en el término de búsqueda
   */
  getSugerenciasFiltradas(): Sugerencia[] {
    if (!this.terminoBusqueda) return this.sugerencias.slice(0, 4);
    
    return this.sugerencias
      .filter(s => s.texto.toLowerCase().includes(this.terminoBusqueda.toLowerCase()))
      .slice(0, 4);
  }

  /**
   * Oculta las sugerencias inline con delay para permitir clicks
   */
  ocultarSugerenciasInline(): void {
    setTimeout(() => {
      this.mostrarSugerenciasInline = false;
    }, 200);
  }
}