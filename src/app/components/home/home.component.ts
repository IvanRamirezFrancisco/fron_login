import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../services/product.service';
import { Product, ProductCategory } from '../../models/product.model';
import { ProductCardComponent } from '../product-card/product-card.component';
import { HomeHeaderComponent } from '../home-header/home-header.component';

interface Brand {
  name: string;
  logo: string;
}

interface Testimonial {
  name: string;
  role: string;
  content: string;
  rating: number;
  avatar: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ProductCardComponent, HomeHeaderComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  categories: ProductCategory[] = [];
  featuredProducts: Product[] = [];
  loadingFeatured = true;
  newsletterEmail = '';
  subscribing = false;

  brands: Brand[] = [
    { name: 'Fender', logo: 'fender-logo.png' },
    { name: 'Gibson', logo: 'gibson-logo.png' },
    { name: 'Yamaha', logo: 'yamaha-logo.png' },
    { name: 'Taylor', logo: 'taylor-logo.png' },
    { name: 'Pearl', logo: 'pearl-logo.png' },
    { name: 'Roland', logo: 'roland-logo.png' }
  ];

  testimonials: Testimonial[] = [
    {
      name: 'Carlos Mendoza',
      role: 'Músico Profesional',
      content: 'Excelente servicio y productos de alta calidad. Encontré exactamente lo que buscaba para mi estudio de grabación.',
      rating: 5,
      avatar: '/assets/logoP.png'
    },
    {
      name: 'Ana García',
      role: 'Profesora de Piano',
      content: 'El piano que compré aquí superó mis expectativas. La atención al cliente es excepcional y los precios son muy competitivos.',
      rating: 5,
      avatar: '/assets/logoP.png'
    },
    {
      name: 'Miguel Rodríguez',
      role: 'Guitarrista de Banda',
      content: 'Llevo años comprando mis instrumentos aquí. Siempre tienen las últimas novedades y el personal es muy conocedor.',
      rating: 4,
      avatar: '/assets/logoP.png'
    }
  ];

  constructor(
    private productService: ProductService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadFeaturedProducts();
  }

  // Cargar categorías
  loadCategories(): void {
    this.productService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  // Cargar productos destacados
  loadFeaturedProducts(): void {
    this.loadingFeatured = true;
    this.productService.getFeaturedProducts().subscribe({
      next: (products) => {
        this.featuredProducts = products;
        this.loadingFeatured = false;
      },
      error: (error) => {
        console.error('Error loading featured products:', error);
        this.loadingFeatured = false;
      }
    });
  }

  // Obtener descripción de categoría
  getCategoryDescription(categoryId: string): string {
    const descriptions: { [key: string]: string } = {
      'guitars': 'Guitarras eléctricas y acústicas de las mejores marcas',
      'pianos': 'Pianos digitales y acústicos para todos los niveles',
      'drums': 'Baterías completas y percusión profesional',
      'bass': 'Bajos eléctricos y acústicos de alta calidad',
      'wind': 'Instrumentos de viento para orquesta y banda',
      'accessories': 'Accesorios y equipos para músicos'
    };
    return descriptions[categoryId] || 'Instrumentos musicales de calidad';
  }

  // Ver catálogo completo
  viewCatalog(): void {
    this.router.navigate(['/catalogo']);
  }

  // Ver ofertas
  viewOffers(): void {
    this.router.navigate(['/catalogo'], { queryParams: { filter: 'ofertas' } });
  }

  // Ver categoría específica
  viewCategory(category: ProductCategory): void {
    this.router.navigate(['/catalogo'], { 
      queryParams: { category: category.id } 
    });
  }

  // Ver producto individual
  viewProduct(product: Product): void {
    this.router.navigate(['/producto', product.id]);
  }

  // Abrir vista rápida del producto
  openQuickView(product: Product): void {
    // Implementar modal de vista rápida
    console.log('Quick view for product:', product.name);
    // Por ahora, redirigir al producto
    this.viewProduct(product);
  }

  // Manejar toggle de favorito
  onFavoriteToggle(event: { product: Product, isFavorite: boolean }): void {
    console.log(
      `Product ${event.product.name} ${event.isFavorite ? 'added to' : 'removed from'} favorites`
    );
    // Aquí podrías integrar con un servicio de favoritos
  }

  // Suscribirse al newsletter
  subscribeNewsletter(): void {
    if (!this.newsletterEmail) return;

    this.subscribing = true;
    
    // Simular llamada a API
    setTimeout(() => {
      console.log('Newsletter subscription for:', this.newsletterEmail);
      alert('¡Gracias por suscribirte! Recibirás nuestras últimas novedades.');
      this.newsletterEmail = '';
      this.subscribing = false;
    }, 1000);
  }

  // Obtener estrellas para testimonios
  getTestimonialStars(rating: number): boolean[] {
    const stars: boolean[] = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= rating);
    }
    return stars;
  }
}