import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  isOpen?: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

@Component({
  selector: 'app-help-center',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './help-center.component.html',
  styleUrls: ['./help-center.component.css']
})
export class HelpCenterComponent {
  searchQuery = '';
  selectedCategory = 'all';
  
  categories: Category[] = [
    { id: 'all', name: 'Todas', icon: 'apps', count: 15 },
    { id: 'envios', name: 'Envíos y Entregas', icon: 'local_shipping', count: 5 },
    { id: 'pagos', name: 'Pagos y Facturación', icon: 'payment', count: 4 },
    { id: 'garantias', name: 'Garantías y Devoluciones', icon: 'verified_user', count: 3 },
    { id: 'cuenta', name: 'Mi Cuenta', icon: 'account_circle', count: 3 }
  ];

  faqs: FAQ[] = [
    // Envíos y Entregas
    {
      id: 1,
      category: 'envios',
      question: '¿Cuánto tiempo tarda la entrega?',
      answer: 'El tiempo de entrega depende de tu ubicación. En la Ciudad de México y área metropolitana, la entrega es de 24-48 horas hábiles. Para otras ciudades de la República Mexicana, el tiempo estimado es de 3-7 días hábiles. Recibirás un correo con el número de rastreo una vez que tu pedido sea enviado.',
      isOpen: false
    },
    {
      id: 2,
      category: 'envios',
      question: '¿Tienen envío gratis?',
      answer: 'Sí, ofrecemos envío gratis en compras superiores a $1,500 MXN en toda la República Mexicana. Para montos menores, el costo de envío se calcula automáticamente según tu código postal al momento del checkout.',
      isOpen: false
    },
    {
      id: 3,
      category: 'envios',
      question: '¿Puedo rastrear mi pedido?',
      answer: 'Por supuesto. Una vez que tu pedido sea enviado, recibirás un correo electrónico con tu número de guía de rastreo. También puedes consultar el estado de tu pedido en la sección "Mis Pedidos" de tu cuenta.',
      isOpen: false
    },
    {
      id: 4,
      category: 'envios',
      question: '¿Realizan entregas internacionales?',
      answer: 'Actualmente solo realizamos entregas dentro de la República Mexicana. Estamos trabajando para expandir nuestros servicios internacionalmente en el futuro.',
      isOpen: false
    },
    {
      id: 5,
      category: 'envios',
      question: '¿Qué hago si no estoy en casa al momento de la entrega?',
      answer: 'La paquetería dejará un aviso de intento de entrega. Puedes coordinar una segunda entrega o recoger tu paquete en la sucursal más cercana. También puedes agregar instrucciones especiales de entrega en tu pedido.',
      isOpen: false
    },

    // Pagos y Facturación
    {
      id: 6,
      category: 'pagos',
      question: '¿Qué métodos de pago aceptan?',
      answer: 'Aceptamos tarjetas de crédito y débito (Visa, MasterCard, American Express), PayPal, transferencia bancaria, y pago en OXXO. También ofrecemos meses sin intereses con tarjetas participantes.',
      isOpen: false
    },
    {
      id: 7,
      category: 'pagos',
      question: '¿Puedo pagar a meses sin intereses?',
      answer: 'Sí, ofrecemos planes de 3, 6, 9, 12 y 18 meses sin intereses con tarjetas de crédito participantes. Las opciones disponibles se muestran al momento del pago según el monto de tu compra.',
      isOpen: false
    },
    {
      id: 8,
      category: 'pagos',
      question: '¿Cómo solicito mi factura?',
      answer: 'Puedes solicitar tu factura dentro de las primeras 48 horas después de tu compra. Ingresa a "Mis Pedidos", selecciona el pedido correspondiente y haz clic en "Solicitar Factura". Ingresa tus datos fiscales y la recibirás por correo electrónico en formato PDF.',
      isOpen: false
    },
    {
      id: 9,
      category: 'pagos',
      question: '¿Es seguro comprar en su sitio?',
      answer: 'Absolutamente. Utilizamos encriptación SSL de 256 bits y cumplimos con los estándares PCI DSS. Tus datos de pago están completamente protegidos y nunca almacenamos información completa de tarjetas.',
      isOpen: false
    },

    // Garantías y Devoluciones
    {
      id: 10,
      category: 'garantias',
      question: '¿Qué garantía tienen los productos?',
      answer: 'Todos nuestros instrumentos tienen garantía del fabricante que varía según la marca (generalmente 1-2 años). Además, ofrecemos 30 días de garantía de satisfacción: si no estás completamente satisfecho, puedes devolver el producto.',
      isOpen: false
    },
    {
      id: 11,
      category: 'garantias',
      question: '¿Cómo hago una devolución?',
      answer: 'Tienes 30 días para devolver un producto. Contacta a nuestro equipo de soporte, proporciona tu número de pedido, y te enviaremos una guía de devolución prepagada. El producto debe estar en su empaque original y en perfectas condiciones.',
      isOpen: false
    },
    {
      id: 12,
      category: 'garantias',
      question: '¿Cuándo recibo mi reembolso?',
      answer: 'Una vez que recibamos y verifiquemos el producto devuelto, procesaremos tu reembolso en un plazo de 5-7 días hábiles. El reembolso se realizará al método de pago original utilizado en tu compra.',
      isOpen: false
    },

    // Mi Cuenta
    {
      id: 13,
      category: 'cuenta',
      question: '¿Cómo creo una cuenta?',
      answer: 'Haz clic en "Registrarse" en la parte superior derecha. Completa el formulario con tu información personal, verifica tu correo electrónico, y ¡listo! Podrás disfrutar de beneficios exclusivos como seguimiento de pedidos y ofertas especiales.',
      isOpen: false
    },
    {
      id: 14,
      category: 'cuenta',
      question: '¿Olvidé mi contraseña, qué hago?',
      answer: 'En la página de inicio de sesión, haz clic en "¿Olvidaste tu contraseña?". Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña. El enlace es válido por 24 horas.',
      isOpen: false
    },
    {
      id: 15,
      category: 'cuenta',
      question: '¿Cómo actualizo mi información personal?',
      answer: 'Inicia sesión en tu cuenta y ve a "Mi Perfil". Allí podrás actualizar tu información personal, direcciones de envío, y preferencias de notificación. No olvides guardar los cambios.',
      isOpen: false
    }
  ];

  constructor(private router: Router) {}

  get filteredFAQs(): FAQ[] {
    let filtered = this.faqs;
    
    // Filtrar por categoría
    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(faq => faq.category === this.selectedCategory);
    }
    
    // Filtrar por búsqueda
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(faq => 
        faq.question.toLowerCase().includes(query) || 
        faq.answer.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }

  selectCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
  }

  toggleFAQ(faq: FAQ): void {
    faq.isOpen = !faq.isOpen;
  }

  contactSupport(): void {
    // Aquí puedes implementar un modal o redirigir a una página de contacto
    alert('Próximamente: Formulario de contacto directo con nuestro equipo de soporte');
  }

  navigateToHome(): void {
    this.router.navigate(['/']);
  }
}
