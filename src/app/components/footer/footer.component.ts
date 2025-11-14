import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {
  
  // Propiedades del componente
  anioActual: number = new Date().getFullYear();
  emailNewsletter: string = '';
  enviandoNewsletter: boolean = false;
  mensajeNewsletter: string = '';
  newsletterExito: boolean = false;

  constructor() {}

  ngOnInit(): void {
    // Inicialización del componente
  }

  /**
   * Maneja la suscripción al newsletter
   */
  async suscribirNewsletter(): Promise<void> {
    if (!this.emailNewsletter || this.enviandoNewsletter) {
      return;
    }

    this.enviandoNewsletter = true;
    this.mensajeNewsletter = '';

    try {
      // Validación básica del email
      if (!this.validarEmail(this.emailNewsletter)) {
        throw new Error('Por favor, ingresa un email válido');
      }

      // Simular llamada a la API
      await this.enviarSuscripcionNewsletter(this.emailNewsletter);

      // Éxito
      this.newsletterExito = true;
      this.mensajeNewsletter = '¡Te has suscrito exitosamente! Revisa tu email para confirmar.';
      this.emailNewsletter = '';

      // Limpiar mensaje después de 5 segundos
      setTimeout(() => {
        this.mensajeNewsletter = '';
      }, 5000);

    } catch (error) {
      // Error
      this.newsletterExito = false;
      this.mensajeNewsletter = error instanceof Error ? error.message : 'Ocurrió un error. Inténtalo nuevamente.';

      // Limpiar mensaje de error después de 5 segundos
      setTimeout(() => {
        this.mensajeNewsletter = '';
      }, 5000);
    } finally {
      this.enviandoNewsletter = false;
    }
  }

  /**
   * Valida el formato del email
   */
  private validarEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Simula el envío de la suscripción al newsletter
   * En un proyecto real, aquí harías la llamada a tu API
   */
  private enviarSuscripcionNewsletter(email: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Simular delay de red
      setTimeout(() => {
        // Simular respuesta del servidor
        const existeEmail = localStorage.getItem('newsletter_' + email);
        
        if (existeEmail) {
          reject(new Error('Este email ya está suscrito a nuestro newsletter'));
        } else {
          // Guardar suscripción en localStorage (simulando base de datos)
          localStorage.setItem('newsletter_' + email, JSON.stringify({
            email: email,
            fechaSuscripcion: new Date().toISOString(),
            activo: true
          }));
          
          resolve();
        }
      }, 1500); // Simular 1.5 segundos de delay
    });
  }

  /**
   * Maneja clics en enlaces de redes sociales
   * En un proyecto real, estos serían enlaces reales
   */
  abrirRedSocial(red: string, event: Event): void {
    event.preventDefault();
    
    // URLs de ejemplo - en un proyecto real serían las URLs reales
    const redesUrls: { [key: string]: string } = {
      facebook: 'https://facebook.com/casamusicacastillo',
      instagram: 'https://instagram.com/casamusicacastillo',
      youtube: 'https://youtube.com/@casamusicacastillo',
      whatsapp: 'https://wa.me/5255123456789'
    };

    if (redesUrls[red]) {
      window.open(redesUrls[red], '_blank', 'noopener,noreferrer');
    }
  }

  /**
   * Scroll suave hacia arriba
   */
  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  /**
   * Obtiene información de la empresa para mostrar en el footer
   */
  obtenerInfoEmpresa() {
    return {
      nombre: 'Casa de Música Castillo',
      eslogan: 'Instrumentos de Tradición',
      fundacion: 1985,
      direccion: 'Av. Música 123, Centro, Ciudad Musical, CP 12345',
      telefono: '+52 55 1234-5678',
      email: 'info@musicacastillo.com',
      horarios: {
        lunesASabado: '9:00 - 19:00',
        domingo: '10:00 - 16:00'
      }
    };
  }
}