import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, forkJoin, debounceTime } from 'rxjs';
import { ProductService } from '../../../services/product.service';
import { BrandService } from '../../../services/brand.service';
import { CategoryService } from '../../../services/category.service';
import { FileUploadService } from '../../../services/file-upload.service';
import { BrandBasicInfo } from '../../../models/brand.model';

/**
 * Componente para gestión completa de productos (CRUD)
 * Integrado con sistema de marcas
 */
@Component({
  selector: 'app-admin-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-products.component.html',
  styleUrls: ['./admin-products.component.css']
})
export class AdminProductsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>(); // 🔍 Subject para debounce de búsqueda

  // Estado
  products: any[] = [];
  brands: BrandBasicInfo[] = [];
  categories: any[] = [];
  loading = false;
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;

  // Paginación
  currentPage = 0;
  pageSize = 5;
  totalProducts = 0;
  totalPages = 0;
  readonly pageSizeOptions: number[] = [5, 10, 20, 50, 100];

  // Búsqueda y filtros (SERVER-SIDE)
  searchTerm = '';
  filterBrandId: number | null = null;
  filterCategoryId: number | null = null;
  filterActive: boolean | null = null;
  
  // Ordenamiento
  sortBy = 'id';
  sortDir = 'DESC';

  // Formulario de producto con especificaciones técnicas
  productForm: any = {
    name: '',
    description: '',
    price: null,
    discountPrice: null,
    stock: 0,
    imageUrl: '',
    sku: '',
    categoryId: null,
    brandId: null,
    model: '',
    weight: null,
    dimensions: '',
    active: true,
    featured: false,
    // NUEVO: Sistema híbrido de especificaciones
    customAttributes: [],      // Atributos dinámicos clave-valor
    detailedDescription: '',   // Descripción rica con HTML
    // Especificaciones técnicas adicionales (mantener compatibilidad)
    specifications: {
      material: '',
      color: '',
      brand: '',
      warranty: '',
      includes: '',
      features: []
    }
  };

  // Validación del formulario con mensajes específicos
  formErrors: any = {
    name: '',
    sku: '',
    price: '',
    stock: '',
    categoryId: '',
    brandId: '',
    imageUrl: '',
    model: ''
  };

  // 📊 Contador de caracteres para descripción corta
  descriptionCharCount: number = 0;

  // Tooltips y ayudas para cada campo
  fieldHelp: any = {
    name: 'Nombre descriptivo del producto (ej: Guitarra Eléctrica Stratocaster)',
    sku: 'Código único de identificación (ej: GUIT-STRAT-001)',
    price: 'Precio de venta en pesos (solo números)',
    discountPrice: 'Precio con descuento (opcional, debe ser menor al precio regular)',
    stock: 'Cantidad disponible en inventario',
    categoryId: 'Categoría principal del producto',
    brandId: 'Marca del fabricante',
    model: 'Modelo o versión específica del producto',
    weight: 'Peso en kilogramos (ej: 3.5)',
    dimensions: 'Medidas en cm: Largo x Ancho x Alto',
    imageUrl: 'URL de la imagen del producto o selecciona un archivo'
  };

  // Control del editor de texto enriquecido
  showDescriptionEditor = false;
  descriptionPreview = '';

  selectedProduct: any = null;

  // Mensajes (legacy — se mantienen para compatibilidad interna)
  successMessage = '';
  errorMessage = '';

  // ── Sistema de notificaciones toast ────────────────────────────────────
  toast: {
    visible: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    progress: number;       // 0–100, controla la barra de progreso visual
  } = { visible: false, type: 'info', title: '', message: '', progress: 100 };

  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private toastProgressInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Muestra un toast no intrusivo dentro del contexto del componente.
   * Se cierra automáticamente después de `duration` ms.
   */
  showToast(
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    duration = 5000
  ): void {
    // Cancelar toast anterior si había uno activo
    if (this.toastTimer)            clearTimeout(this.toastTimer);
    if (this.toastProgressInterval) clearInterval(this.toastProgressInterval);

    this.toast = { visible: true, type, title, message, progress: 100 };

    // Animación de barra de progreso
    const step = 100 / (duration / 50);
    this.toastProgressInterval = setInterval(() => {
      this.toast.progress = Math.max(0, this.toast.progress - step);
    }, 50);

    // Auto-cierre
    this.toastTimer = setTimeout(() => {
      this.dismissToast();
    }, duration);
  }

  dismissToast(): void {
    if (this.toastTimer)            clearTimeout(this.toastTimer);
    if (this.toastProgressInterval) clearInterval(this.toastProgressInterval);
    this.toast.visible = false;
  }

  // Upload de imágenes - Sistema de galería múltiple
  selectedImageFile: File | null = null;
  imagePreview: string | null = null;
  uploadingImage = false;
  
  // Galería de imágenes del producto
  productImages: Array<{
    id?: number; // ID de product_images (si ya existe en BD)
    url: string;
    file?: File;
    isPrimary: boolean;
    preview?: string;
    displayOrder: number; // Orden de visualización
    altText?: string;
  }> = [];
  
  maxImages = 6; // Máximo de imágenes permitidas
  
  // Control de tabs profesional
  currentTab: 'general' | 'pricing' | 'media' | 'details' = 'general';
  
  // Control de modo de subida de imagen
  imageUploadMode: 'file' | 'url' = 'file'; // Por defecto archivo local

  // Bandera para validación profesional (solo mostrar errores después de submit)
  isSubmitted = false;

  // Getters para el template
  get filteredProducts(): any[] {
    return this.products;
  }

  get activeProductsCount(): number {
    return this.products.filter(p => p.active).length;
  }

  get lowStockCount(): number {
    return this.products.filter(p => p.stock <= 10).length;
  }

  constructor(
    private productService: ProductService,
    private brandService: BrandService,
    private categoryService: CategoryService,
    private fileUploadService: FileUploadService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    
    // 🔍 Configurar debounce para búsqueda (esperar 500ms después de que el usuario deje de escribir)
    this.searchSubject$
      .pipe(
        debounceTime(500), // Esperar 500ms sin cambios
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        console.log('🔍 Ejecutando búsqueda con debounce:', this.searchTerm);
        this.currentPage = 0;
        this.loadProducts();
      });
    
    // Aplicar filtros desde query params (navegación desde otros módulos)
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      let needsReload = false;

      if (params['brandId']) {
        this.filterBrandId = +params['brandId'];
        needsReload = true;
      }

      if (params['categoryId']) {
        this.filterCategoryId = +params['categoryId'];
        needsReload = true;
      }

      if (needsReload) {
        this.currentPage = 0;
        this.loadProducts();
      }

      if (params['action'] === 'create' && !this.showCreateModal) {
        this.openCreateModal();
        this.clearActionParam();
      }

      // Recarga disparada por el CSV import (emite importSuccess → layout navega con action=refresh)
      if (params['action'] === 'refresh') {
        this.currentPage = 0;
        this.loadProducts();
        this.clearActionParam();
      }
    });

    // Verificar si hay scroll horizontal después de cargar datos
    setTimeout(() => this.checkTableScroll(), 500);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.toastTimer)            clearTimeout(this.toastTimer);
    if (this.toastProgressInterval) clearInterval(this.toastProgressInterval);
  }

  private clearActionParam(): void {
    this.router.navigate([], {
      queryParams: { action: null },
      queryParamsHandling: 'merge'
    });
  }

  // ==================== LISTENER DE RESIZE DE VENTANA ====================
  
  @HostListener('window:resize')
  onWindowResize(): void {
    // Re-verificar si hay scroll cuando cambia el tamaño de la ventana
    this.checkTableScroll();
  }

  // ==================== DETECCIÓN AUTOMÁTICA DE SCROLL ====================
  
  checkTableScroll(): void {
    const tableWrapper = document.querySelector('.table-wrapper') as HTMLElement;
    const tableContainer = document.querySelector('.table-container') as HTMLElement;
    
    if (!tableWrapper || !tableContainer) return;

    // Verificar si el contenido de la tabla es más ancho que el contenedor
    const hasHorizontalScroll = tableWrapper.scrollWidth > tableWrapper.clientWidth;
    
    if (hasHorizontalScroll) {
      tableContainer.classList.add('has-scroll');
    } else {
      tableContainer.classList.remove('has-scroll');
    }
  }

  // ==================== MANEJO DE SCROLL EN TABLA ====================
  
  onTableScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const container = element.closest('.table-container');
    
    if (!container) return;

    // Detectar si hizo scroll (ocultar hint después de primer scroll)
    if (element.scrollLeft > 10) {
      container.classList.add('scrolled');
    }

    // Detectar si llegó al final del scroll (ocultar sombra derecha)
    const isAtEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 10;
    if (isAtEnd) {
      element.classList.add('scrolled-end');
    } else {
      element.classList.remove('scrolled-end');
    }
  }

  // ==================== CARGA INICIAL ====================

  loadInitialData(): void {
    this.loading = true;
    this.errorMessage = '';
    
    console.log('🔄 Iniciando carga de datos...');
    
    // Cargar marcas de forma independiente
    this.brandService.getActiveBrands()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (brands) => {
          console.log('✅ Marcas cargadas exitosamente:', brands);
          this.brands = brands || [];
          console.log('🏷️ Total de marcas:', this.brands.length);
          
          if (this.brands.length === 0) {
            console.warn('⚠️ No se encontraron marcas activas');
          }
        },
        error: (error) => {
          console.error('❌ Error al cargar marcas:', error);
          this.brands = [];
        }
      });
    
    // Cargar categorías de forma independiente
    this.categoryService.getAllCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories: any) => {
          console.log('✅ Categorías cargadas exitosamente:', categories);
          this.categories = categories || [];
          console.log('📂 Total de categorías:', this.categories.length);
          
          if (this.categories.length === 0) {
            console.warn('⚠️ No se encontraron categorías');
          }
        },
        error: (error: any) => {
          console.error('❌ Error al cargar categorías:', error);
          console.error('📍 URL del error:', error.url);
          console.error('📊 Status:', error.status);
          console.error('💬 Mensaje:', error.error?.message || error.message);
          
          this.categories = [];
          this.errorMessage = `Advertencia: No se pudieron cargar las categorías. ${error.error?.message || error.message}`;
        }
      });
    
    // Cargar productos siempre
    this.loadProducts();
  }

  // ==================== CRUD OPERATIONS ====================

  /**
   * 🔍 CARGAR PRODUCTOS CON BÚSQUEDA Y FILTROS DEL SERVIDOR
   * Server-Side: El backend procesa búsqueda, filtros, paginación y ordenamiento
   */
  loadProducts(): void {
    this.loading = true;
    this.errorMessage = '';

    console.log('🔄 Cargando productos con filtros del servidor...');
    console.log('📄 Página:', this.currentPage, '| Tamaño:', this.pageSize);
    console.log('🔍 Búsqueda:', this.searchTerm || 'N/A');
    console.log('🏷️ Marca:', this.filterBrandId || 'N/A');
    console.log('📂 Categoría:', this.filterCategoryId || 'N/A');
    console.log('✅ Estado:', this.filterActive !== null ? (this.filterActive ? 'Activo' : 'Inactivo') : 'Todos');

    this.productService.getAllProducts(
      this.currentPage,
      this.pageSize,
      this.searchTerm,
      this.filterBrandId,
      this.filterCategoryId,
      this.filterActive,
      this.sortBy,
      this.sortDir
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('✅ Respuesta del servidor:', response);
          
          this.products = response.content || [];
          this.totalProducts = response.totalElements || 0;
          this.totalPages = response.totalPages || 1;
          
          console.log('📊 Productos cargados:', this.products.length, '| Total:', this.totalProducts);
          
          this.loading = false;
          
          // Verificar scroll horizontal después de cargar
          setTimeout(() => this.checkTableScroll(), 100);
        },
        error: (error) => {
          console.error('❌ Error al cargar productos:', error);
          this.errorMessage = 'Error al cargar productos. Por favor, intenta de nuevo.';
          this.loading = false;
          this.products = [];
          this.totalProducts = 0;
        }
      });
  }

  /**
   * 🔍 Aplicar filtros (reinicia a página 0 y recarga desde el servidor)
   */
  applyFilters(): void {
    console.log('🎯 Aplicando filtros...');
    this.currentPage = 0; // Reiniciar a la primera página
    this.loadProducts();
  }

  /**
   * 🔄 Limpiar todos los filtros
   */
  clearFilters(): void {
    console.log('🧹 Limpiando filtros...');
    this.searchTerm = '';
    this.filterBrandId = null;
    this.filterCategoryId = null;
    this.filterActive = null;
    this.applyFilters();
  }

  /**
   * 🔽 Cambiar ordenamiento
   */
  changeSorting(field: string): void {
    if (this.sortBy === field) {
      // Alternar dirección si es el mismo campo
      this.sortDir = this.sortDir === 'ASC' ? 'DESC' : 'ASC';
    } else {
      // Nuevo campo, ordenar descendente por defecto
      this.sortBy = field;
      this.sortDir = 'DESC';
    }
    
    console.log(`🔽 Ordenando por: ${this.sortBy} ${this.sortDir}`);
    this.applyFilters(); // Recargar con nuevo ordenamiento
  }

  /**
   * 📊 Contar filtros activos
   */
  getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchTerm && this.searchTerm.trim() !== '') count++;
    if (this.filterBrandId !== null) count++;
    if (this.filterCategoryId !== null) count++;
    if (this.filterActive !== null) count++;
    return count;
  }

  openCreateModal(): void {
    console.log('🆕 Abriendo modal de crear producto');
    console.log('🏷️ Marcas disponibles:', this.brands.length, this.brands);
    console.log('📂 Categorías disponibles:', this.categories.length, this.categories);
    
    this.resetForm();
    this.isSubmitted = false; // Resetear validación
    this.showCreateModal = true;
    this.currentTab = 'general'; // Empezar en la primera pestaña
    this.imageUploadMode = 'file'; // Modo por defecto: archivo local
    this.errorMessage = '';
    this.clearFormErrors();
    
    // 📊 Inicializar contador de caracteres
    this.updateDescriptionCharCount();
    
    if (this.brands.length === 0 || this.categories.length === 0) {
      console.warn('⚠️ ADVERTENCIA: Faltan datos. Recargando...');
      this.loadInitialData();
    }
  }

  // ==================== CONTROL DE TABS ====================
  
  setTab(tab: 'general' | 'pricing' | 'media' | 'details'): void {
    this.currentTab = tab;
    
    // Si cambiamos al tab de detalles, cargar la descripción en el editor
    if (tab === 'details' && this.showEditModal) {
      console.log('🔄 Cambiando a tab "details" - Recargando descripción en editor');
      setTimeout(() => {
        this.loadDescriptionInEditor();
      }, 100);
    }
  }
  
  // ==================== CONTROL DE MODO DE IMAGEN ====================
  
  setImageUploadMode(mode: 'file' | 'url'): void {
    this.imageUploadMode = mode;
    // Limpiar campos al cambiar de modo
    if (mode === 'file') {
      this.productForm.imageUrl = '';
    } else {
      this.selectedImageFile = null;
      this.imagePreview = null;
    }
  }

  openEditModal(product: any): void {
    console.log('🔍 === ABRIENDO MODAL DE EDICIÓN ===');
    console.log('📦 Producto recibido:', product);
    console.log('📝 detailedDescription desde DB:', product.detailedDescription);
    console.log('🏷️ customAttributes desde DB:', product.customAttributes);
    
    this.selectedProduct = product;
    this.productForm = {
      name: product.name,
      description: product.description || '',
      price: product.price,
      discountPrice: product.discountPrice,
      stock: product.stock,
      imageUrl: product.imageUrl || '',
      sku: product.sku,
      categoryId: product.categoryId,
      brandId: product.brandId,
      model: product.model || '',
      weight: product.weight,
      dimensions: product.dimensions || '',
      active: product.active,
      featured: product.featured,
      // NUEVOS CAMPOS: Cargar atributos y descripción detallada
      customAttributes: product.customAttributes ? [...product.customAttributes] : [],
      detailedDescription: product.detailedDescription || ''
    };

    console.log('✅ productForm.detailedDescription asignado:', this.productForm.detailedDescription);
    console.log('✅ productForm.customAttributes asignados:', this.productForm.customAttributes);

    // Cargar galería de imágenes existentes
    this.productImages = [];
    
    // Agregar imagen principal como primera
    if (product.imageUrl) {
      this.productImages.push({
        id: undefined,
        url: product.imageUrl,
        preview: product.imageUrl,
        isPrimary: true,
        displayOrder: 1,
        altText: product.name
      });
    }

    // Agregar imágenes adicionales de la galería
    if (product.images && Array.isArray(product.images)) {
      product.images.forEach((img: any, index: number) => {
        this.productImages.push({
          id: img.id,
          url: img.imageUrl,
          preview: img.imageUrl,
          isPrimary: false,
          displayOrder: img.displayOrder || (index + 2),
          altText: img.altText || product.name
        });
      });
    }

    console.log(`📸 Cargadas ${this.productImages.length} imágenes para edición`);
    console.log(`🔧 Cargados ${this.productForm.customAttributes.length} atributos personalizados`);

    // 📊 Inicializar contador de caracteres para descripción corta
    this.updateDescriptionCharCount();

    this.showEditModal = true;
    this.currentTab = 'general'; // Empezar en la primera pestaña
    this.imageUploadMode = 'file'; // Modo archivo por defecto
    this.errorMessage = '';
    this.loadDescriptionInEditor(); // Cargar descripción en el editor
  }

  openDeleteModal(product: any): void {
    this.selectedProduct = product;
    this.showDeleteModal = true;
    this.errorMessage = '';
  }

  async saveProduct(): Promise<void> {
    // Marcar formulario como submitted para activar validaciones visuales
    this.isSubmitted = true;

    // Validar formulario básico
    if (!this.validateForm()) {
      console.error('❌ Validación del formulario falló');
      this.showToast('warning', 'Campos incompletos',
        'Por favor completa todos los campos obligatorios antes de guardar.', 6000);

      // Scroll al primer error
      setTimeout(() => {
        const firstError = document.querySelector('.is-invalid');
        if (firstError) {
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      return;
    }

    // Validar atributos personalizados
    if (!this.validateCustomAttributes()) {
      console.error('❌ Validación de atributos personalizados falló');
      this.setTab('details'); // Cambiar a la pestaña de detalles
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      // ========================================================================
      // PASO 1: Subir archivos físicos al servidor y obtener URLs
      // ========================================================================
      console.log('📤 PASO 1: Iniciando subida de archivos al servidor...');
      
      // Recolectar todos los archivos físicos (File) que necesitan subirse
      const filesToUpload: File[] = [];
      const imageMapping: Map<number, File> = new Map(); // index -> File
      
      this.productImages.forEach((img, index) => {
        if (img.file instanceof File) {
          filesToUpload.push(img.file);
          imageMapping.set(index, img.file);
          console.log(`  - Archivo ${index + 1}: ${img.file.name} (${(img.file.size / 1024).toFixed(2)} KB)`);
        }
      });

      console.log(`📊 Total archivos a subir: ${filesToUpload.length}`);

      // Subir archivos si hay alguno
      if (filesToUpload.length > 0) {
        console.log('☁️ Subiendo archivos al servidor...');
        
        const uploadResponse = await this.fileUploadService.uploadMultiple(filesToUpload).toPromise();
        
        if (!uploadResponse || !uploadResponse.success) {
          throw new Error('Error al subir las imágenes al servidor');
        }

        console.log(`✅ Archivos subidos: ${uploadResponse.uploadedCount}/${uploadResponse.totalFiles}`);
        
        // Mapear las URLs devueltas por el servidor a las imágenes correspondientes
        uploadResponse.files.forEach((uploadedFile, idx) => {
          // Encontrar el índice original de la imagen
          let originalIndex = 0;
          let currentFileIndex = 0;
          
          for (let i = 0; i < this.productImages.length; i++) {
            if (this.productImages[i].file instanceof File) {
              if (currentFileIndex === idx) {
                originalIndex = i;
                break;
              }
              currentFileIndex++;
            }
          }
          
          // Reemplazar la preview con la URL real del servidor
          this.productImages[originalIndex].url = uploadedFile.url;
          this.productImages[originalIndex].preview = uploadedFile.url;
          
          console.log(`  ✓ Imagen ${originalIndex + 1}: ${uploadedFile.url}`);
        });

        // Mostrar errores si hubo alguno
        if (uploadResponse.errors && uploadResponse.errors.length > 0) {
          console.warn('⚠️ Algunos archivos no se pudieron subir:', uploadResponse.errors);
          this.showToast('warning', 'Algunas imágenes no se subieron',
            uploadResponse.errors.join(' · '), 8000);
        }
      } else {
        console.log('ℹ️ No hay archivos nuevos para subir (todas son URLs existentes)');
      }

      // ========================================================================
      // PASO 2: Preparar datos del producto con URLs finales
      // ========================================================================
      console.log('📦 PASO 2: Preparando datos del producto...');

      // Determinar imagen principal (Portada)
      let finalImageUrl = this.productForm.imageUrl?.trim() || null;
      
      const primaryImage = this.productImages.find(img => img.isPrimary);
      if (primaryImage) {
        finalImageUrl = primaryImage.url || primaryImage.preview || '';
        console.log(`⭐ Imagen principal: ${finalImageUrl}`);
      }
      
      // Si no hay imagen, usar placeholder
      if (!finalImageUrl || finalImageUrl === '') {
        finalImageUrl = 'https://via.placeholder.com/800x800/800020/FFFFFF?text=Sin+Imagen';
        console.log('⚠️ No hay imagen principal, usando placeholder');
      }

      // Preparar galería de imágenes secundarias (sin la principal)
      const productImagesDTO = this.productImages
        .filter(img => !img.isPrimary)
        .map(img => ({
          imageUrl: img.url || img.preview || '',
          altText: img.altText || this.productForm.name || 'Imagen del producto',
          displayOrder: img.displayOrder
        }));

      console.log(`📸 Imágenes finales: 1 principal + ${productImagesDTO.length} en galería`);

      // Dimensiones por defecto
      const defaultDimensions = this.productForm.dimensions?.trim() || '30 x 10 x 5 cm';
      
      // Preparar objeto JSON final
      const productData = {
        name: this.productForm.name?.trim(),
        description: this.productForm.description?.trim() || null,
        price: this.productForm.price ? Number(this.productForm.price) : null,
        discountPrice: this.productForm.discountPrice ? Number(this.productForm.discountPrice) : null,
        stock: this.productForm.stock ? Number(this.productForm.stock) : 0,
        imageUrl: finalImageUrl, // ⭐ Imagen principal (products.image_url)
        images: productImagesDTO, // 🖼️ Galería (product_images table)
        sku: this.productForm.sku?.trim(),
        categoryId: this.productForm.categoryId ? Number(this.productForm.categoryId) : null,
        brandId: this.productForm.brandId ? Number(this.productForm.brandId) : null,
        model: this.productForm.model?.trim() || null,
        weight: this.productForm.weight ? Number(this.productForm.weight) : null,
        dimensions: defaultDimensions,
        active: this.productForm.active === true,
        featured: this.productForm.featured === true,
        // ✨ NUEVO: Sistema Híbrido de Especificaciones
        customAttributes: (this.productForm.customAttributes || [])
          .filter((attr: any) => attr.key && attr.key.trim() && attr.value && attr.value.trim())
          .map((attr: any, index: number) => ({
            key: attr.key.trim(),
            value: attr.value.trim(),
            displayOrder: index
          })),
        detailedDescription: this.productForm.detailedDescription?.trim() || null
      };

      console.log('📦 Objeto producto final:', productData);
      console.log('🏷️ Custom Attributes:', productData.customAttributes);
      console.log('📝 Detailed Description:', productData.detailedDescription);

      // ========================================================================
      // PASO 3: Enviar producto al backend
      // ========================================================================
      console.log('💾 PASO 3: Enviando producto al backend...');

      if (this.showCreateModal) {
        // CREAR PRODUCTO
        this.productService.createProduct(productData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              console.log('✅ Producto creado exitosamente:', response);
              this.showToast('success', 'Producto creado', 'El producto se guardó correctamente.', 4000);
              this.successMessage = '✅ Producto creado exitosamente con imágenes subidas';
              this.showCreateModal = false;
              this.resetForm();
              this.loadProducts();
              this.loading = false;
              setTimeout(() => this.successMessage = '', 3000);
            },
            error: (error) => {
              console.error('❌ Error al crear producto:', error);
              this.showToast('error', 'Error al crear producto', this.extractErrorMessage(error), 8000);
              this.errorMessage = this.extractErrorMessage(error);
              this.loading = false;
            }
          });
          
      } else if (this.showEditModal && this.selectedProduct) {
        // ACTUALIZAR PRODUCTO
        this.productService.updateProduct(this.selectedProduct.id, productData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              console.log('✅ Producto actualizado exitosamente:', response);
              this.showToast('success', 'Producto actualizado', 'Los cambios se guardaron correctamente.', 4000);
              this.successMessage = '✅ Producto actualizado exitosamente';
              this.showEditModal = false;
              this.selectedProduct = null;
              this.resetForm();
              this.loadProducts();
              this.loading = false;
              setTimeout(() => this.successMessage = '', 3000);
            },
            error: (error) => {
              console.error('❌ Error al actualizar producto:', error);
              this.showToast('error', 'Error al actualizar producto', this.extractErrorMessage(error), 8000);
              this.errorMessage = this.extractErrorMessage(error);
              this.loading = false;
            }
          });
      }

    } catch (error: any) {
      console.error('❌ Error general en saveProduct:', error);
      this.showToast('error', 'Error inesperado', error.message || 'Error al procesar las imágenes', 8000);
      this.errorMessage = error.message || 'Error al procesar las imágenes';
      this.loading = false;
    }
  }

  deleteProduct(): void {
    if (!this.selectedProduct) return;

    this.loading = true;
    this.errorMessage = '';

    this.productService.deleteProduct(this.selectedProduct.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = 'Producto eliminado exitosamente';
          this.showDeleteModal = false;
          this.selectedProduct = null;
          this.loadProducts();
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error al eliminar producto:', error);
          this.errorMessage = error.error?.message || 'Error al eliminar el producto';
          this.loading = false;
        }
      });
  }

  toggleStatus(product: any): void {
    const updatedProduct = { ...product, active: !product.active };
    
    this.productService.updateProduct(product.id, updatedProduct)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = `Producto ${product.active ? 'desactivado' : 'activado'} exitosamente`;
          this.loadProducts();
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: (error) => {
          console.error('Error al cambiar estado:', error);
          this.errorMessage = 'Error al cambiar el estado del producto';
        }
      });
  }

  // ==================== VALIDACIÓN PROFESIONAL ====================

  /**
   * Validación en tiempo real para campos numéricos
   */
  validateNumber(value: any, fieldName: string): void {
    const numValue = Number(value);
    
    if (value !== '' && value !== null && value !== undefined) {
      if (isNaN(numValue)) {
        this.formErrors[fieldName] = '⚠️ Solo se permiten números';
      } else if (numValue < 0) {
        this.formErrors[fieldName] = '⚠️ El valor no puede ser negativo';
      } else {
        this.formErrors[fieldName] = '';
      }
    } else {
      this.formErrors[fieldName] = '';
    }
  }

  /**
   * Manejador de eventos para inputs numéricos (type-safe)
   */
  onNumberInput(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    this.validateNumber(input.value, fieldName);
  }

  /**
   * Manejador de evento para error de imagen (type-safe)
   */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'https://via.placeholder.com/400x400/800020/FFFFFF?text=Error+al+cargar';
  }

  /**
   * Validación de precio con descuento
   */
  validateDiscountPrice(): void {
    if (this.productForm.discountPrice) {
      const price = Number(this.productForm.price);
      const discountPrice = Number(this.productForm.discountPrice);
      
      if (discountPrice >= price) {
        this.formErrors.discountPrice = '⚠️ El precio con descuento debe ser menor al precio regular';
      } else if (discountPrice < 0) {
        this.formErrors.discountPrice = '⚠️ El precio no puede ser negativo';
      } else {
        this.formErrors.discountPrice = '';
      }
    }
  }

  /**
   * Validación de SKU único
   */
  validateSKU(): void {
    const sku = this.productForm.sku?.trim();
    if (sku && sku.length < 3) {
      this.formErrors.sku = '⚠️ El SKU debe tener al menos 3 caracteres';
    } else if (sku && !/^[A-Z0-9-]+$/i.test(sku)) {
      this.formErrors.sku = '⚠️ El SKU solo puede contener letras, números y guiones';
    } else {
      this.formErrors.sku = '';
    }
  }

  /**
   * Validación del formulario completo
   */
  validateForm(): boolean {
    this.clearFormErrors();
    let isValid = true;

    // Validar nombre
    if (!this.productForm.name?.trim()) {
      this.formErrors.name = '❌ El nombre del producto es obligatorio';
      this.errorMessage = 'Por favor completa todos los campos obligatorios';
      isValid = false;
    } else if (this.productForm.name.trim().length < 3) {
      this.formErrors.name = '⚠️ El nombre debe tener al menos 3 caracteres';
      this.errorMessage = 'Por favor completa todos los campos obligatorios';
      isValid = false;
    }

    // Validar SKU
    if (!this.productForm.sku?.trim()) {
      this.formErrors.sku = '❌ El SKU es obligatorio';
      this.errorMessage = 'Por favor completa todos los campos obligatorios';
      isValid = false;
    } else {
      this.validateSKU();
      if (this.formErrors.sku) {
        isValid = false;
      }
    }

    // Validar precio
    if (!this.productForm.price || this.productForm.price <= 0) {
      this.formErrors.price = '❌ El precio debe ser mayor a 0';
      this.errorMessage = 'Por favor completa todos los campos obligatorios';
      isValid = false;
    } else if (isNaN(Number(this.productForm.price))) {
      this.formErrors.price = '⚠️ El precio debe ser un número válido';
      isValid = false;
    }

    // Validar stock
    if (this.productForm.stock === null || this.productForm.stock === undefined || this.productForm.stock < 0) {
      this.formErrors.stock = '⚠️ El stock no puede ser negativo';
      this.errorMessage = 'Por favor completa todos los campos obligatorios';
      isValid = false;
    } else if (isNaN(Number(this.productForm.stock))) {
      this.formErrors.stock = '⚠️ El stock debe ser un número válido';
      isValid = false;
    }

    // Validar categoría
    if (!this.productForm.categoryId) {
      this.formErrors.categoryId = '❌ Debes seleccionar una categoría';
      this.errorMessage = 'Por favor completa todos los campos obligatorios';
      isValid = false;
    }

    // Validar precio con descuento
    this.validateDiscountPrice();
    if (this.formErrors.discountPrice) {
      isValid = false;
    }

    if (isValid) {
      this.errorMessage = '';
    }

    return isValid;
  }

  clearFormErrors(): void {
    this.formErrors = {
      name: '',
      sku: '',
      price: '',
      stock: '',
      categoryId: '',
      brandId: '',
      imageUrl: '',
      model: '',
      discountPrice: ''
    };
  }

  // ==================== EDITOR DE DESCRIPCIÓN RICO ====================

  /**
   * Aplicar formato al texto seleccionado
   */
  applyTextFormat(command: string, value?: string): void {
    document.execCommand(command, false, value);
  }

  /**
   * Insertar lista
   */
  insertList(type: 'ul' | 'ol'): void {
    const listType = type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList';
    document.execCommand(listType, false);
  }

  /**
   * Actualizar contenido de la descripción desde el editor
   */
  onDescriptionInput(event: Event): void {
    const editor = event.target as HTMLElement;
    this.productForm.detailedDescription = editor.innerHTML;
    // console.log('📝 Descripción actualizada:', editor.innerHTML.length + ' caracteres');
  }

  /**
   * Cargar descripción en el editor cuando se edita un producto
   */
  loadDescriptionInEditor(): void {
    console.log('🔄 Intentando cargar descripción en el editor...');
    console.log('📝 Contenido a cargar:', this.productForm.detailedDescription);
    
    // Intentar múltiples veces con timeouts incrementales para asegurar que el DOM esté listo
    const attempts = [100, 300, 500];
    
    attempts.forEach((delay, index) => {
      setTimeout(() => {
        const editor = document.querySelector('.rich-text-editor-pro') as HTMLElement;
        console.log(`🔍 Intento ${index + 1} (${delay}ms) - Editor encontrado:`, !!editor);
        
        if (editor) {
          if (this.productForm.detailedDescription && this.productForm.detailedDescription.trim() !== '') {
            editor.innerHTML = this.productForm.detailedDescription;
            console.log(`✅ Intento ${index + 1} - Descripción cargada en el editor:`, 
                       this.productForm.detailedDescription.substring(0, 100) + '...');
          } else {
            editor.innerHTML = '';
            console.log(`ℹ️ Intento ${index + 1} - No hay descripción detallada para cargar (vacía o null)`);
          }
        } else {
          console.warn(`⚠️ Intento ${index + 1} - Editor NO encontrado en el DOM`);
        }
      }, delay);
    });
  }

  /**
   * Limpiar formato
   */
  clearFormatting(): void {
    document.execCommand('removeFormat', false);
  }

  /**
   * 📊 Actualizar contador de caracteres para Descripción Corta
   */
  updateDescriptionCharCount(): void {
    this.descriptionCharCount = (this.productForm.description || '').length;
  }

  extractErrorMessage(error: any): string {
    if (error.error?.message) {
      return error.error.message;
    }
    
    if (error.error?.errors) {
      const errorMessages = Object.values(error.error.errors).join(', ');
      return errorMessages || 'Error en la validación de datos';
    }

    if (error.message) {
      return error.message;
    }

    return 'Error al procesar la solicitud. Por favor intenta nuevamente.';
  }

  // ==================== BÚSQUEDA Y FILTROS ====================

  /**
   * 🔍 Método llamado cuando el usuario escribe en el buscador
   * Usa debounce para evitar parpadeos (espera 500ms después de que deje de escribir)
   */
  onSearch(): void {
    this.searchSubject$.next(this.searchTerm);
  }

  // ==================== PAGINACIÓN ====================

  /** Índice del primer producto mostrado (base-1 para la UI) */
  get startIndex(): number {
    if (this.totalProducts === 0) return 0;
    return this.currentPage * this.pageSize + 1;
  }

  /** Índice del último producto mostrado (base-1 para la UI) */
  get endIndex(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.totalProducts);
  }

  /** Arreglo de números de página para el loop del template */
  get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const delta = 2; // páginas a mostrar a cada lado de la actual
    const range: number[] = [];

    const left = Math.max(0, current - delta);
    const right = Math.min(total - 1, current + delta);

    for (let i = left; i <= right; i++) {
      range.push(i);
    }
    return range;
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadProducts();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadProducts();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadProducts();
    }
  }

  changePageSize(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize = +select.value;
    this.currentPage = 0;
    this.loadProducts();
  }

  // ==================== UTILIDADES ====================

  closeModal(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.selectedProduct = null;
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.errorMessage = '';
  }

  resetForm(): void {
    this.productForm = {
      name: '',
      description: '',
      price: null,
      discountPrice: null,
      stock: 0,
      imageUrl: '',
      sku: '',
      categoryId: null,
      brandId: null,
      model: '',
      weight: null,
      dimensions: '',
      active: true,
      featured: false,
      // NUEVOS CAMPOS: Sistema híbrido
      customAttributes: [],      // Atributos dinámicos
      detailedDescription: ''    // Descripción rica HTML
    };
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.productImages = []; // Limpiar galería de imágenes
    this.clearFormErrors();
  }

  // ==================== MANEJO DE IMÁGENES MÚLTIPLES ====================

  /**
   * Manejar selección de archivo(s) de imagen - SOPORTE MÚLTIPLE
   */
  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.addMultipleImages(Array.from(input.files));
      input.value = ''; // Limpiar el input para poder seleccionar de nuevo
    }
  }

  /**
   * Agregar múltiples imágenes a la galería
   */
  addMultipleImages(files: File[]): void {
    const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

    for (const file of files) {
      // Verificar límite de imágenes
      if (this.productImages.length >= this.maxImages) {
        this.showToast('warning', 'Límite de imágenes alcanzado',
          `Solo se permiten un máximo de ${this.maxImages} imágenes por producto.`, 6000);
        break;
      }

      // Validar tipo de archivo (PNG, JPG, WEBP)
      if (!ALLOWED_TYPES.has(file.type)) {
        this.showToast('error', 'Formato no permitido',
          `"${file.name}" no es un formato válido. Solo se aceptan imágenes PNG, JPG o WEBP.`, 7000);
        continue;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.showToast('error', 'Archivo demasiado grande',
          `"${file.name}" supera el límite de 5 MB. Por favor comprime la imagen antes de subirla.`, 7000);
        continue;
      }

      // Crear preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const newOrder = this.productImages.length + 1;
        this.productImages.push({
          url: '',
          file: file,
          preview: e.target.result,
          isPrimary: this.productImages.length === 0, // La primera es principal
          displayOrder: newOrder, // Orden secuencial
          altText: file.name.split('.')[0] // Nombre sin extensión
        });
      };
      reader.readAsDataURL(file);
    }

    // Limpiar error si se agregaron imágenes correctamente
    if (this.productImages.length > 0) {
      this.errorMessage = '';
    }
  }

  /**
   * Establecer imagen como principal (Portada del producto)
   * Esta imagen irá a products.image_url
   */
  setPrimaryImage(index: number): void {
    this.productImages.forEach((img, i) => {
      img.isPrimary = i === index;
    });
    this.showToast('success', 'Imagen principal actualizada',
      'Esta imagen será la portada del producto en el catálogo.', 3000);
  }

  /**
   * Mover imagen hacia arriba (mejor posición)
   */
  moveImageUp(index: number): void {
    if (index === 0) return; // Ya está en la primera posición
    
    // Intercambiar posiciones
    [this.productImages[index - 1], this.productImages[index]] = 
    [this.productImages[index], this.productImages[index - 1]];
    
    // Actualizar displayOrder
    this.reorderImages();
  }

  /**
   * Mover imagen hacia abajo (peor posición)
   */
  moveImageDown(index: number): void {
    if (index === this.productImages.length - 1) return; // Ya está en la última posición
    
    // Intercambiar posiciones
    [this.productImages[index], this.productImages[index + 1]] = 
    [this.productImages[index + 1], this.productImages[index]];
    
    // Actualizar displayOrder
    this.reorderImages();
  }

  /**
   * Actualizar el displayOrder de todas las imágenes
   * según su posición actual en el array
   */
  reorderImages(): void {
    this.productImages.forEach((img, index) => {
      img.displayOrder = index + 1;
    });
  }

  /**
   * Eliminar imagen de la galería
   */
  removeImage(index: number): void {
    this.productImages.splice(index, 1);
    
    // Si se eliminó la imagen principal y quedan imágenes, hacer la primera como principal
    if (this.productImages.length > 0 && !this.productImages.some(img => img.isPrimary)) {
      this.productImages[0].isPrimary = true;
    }
    
    // Reordenar después de eliminar
    this.reorderImages();
  }

  /**
   * Limpiar todas las imágenes
   */
  clearAllImages(): void {
    this.productImages = [];
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.productForm.imageUrl = '';
  }

  /**
   * Limpiar imagen seleccionada (legacy - mantener compatibilidad)
   */
  clearImage(): void {
    this.selectedImageFile = null;
    this.imagePreview = null;
    this.productForm.imageUrl = '';
  }

  /**
   * Prevenir comportamiento por defecto en drag over
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Agregar clase visual
    const uploadZone = event.currentTarget as HTMLElement;
    uploadZone.classList.add('drag-over');
  }

  /**
   * Remover efecto visual cuando sale del área
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    const uploadZone = event.currentTarget as HTMLElement;
    uploadZone.classList.remove('drag-over');
  }

  /**
   * Manejar soltar archivo(s) (drag and drop) - SOPORTE MÚLTIPLE
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    // Remover clase visual
    const uploadZone = event.currentTarget as HTMLElement;
    uploadZone.classList.remove('drag-over');

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      // Agregar múltiples archivos
      this.addMultipleImages(Array.from(files));
    }
  }

  /**
   * Subir imagen al servidor (simulado - necesitas implementar el endpoint en el backend)
   */
  async uploadImage(): Promise<string | null> {
    if (!this.selectedImageFile) {
      return this.productForm.imageUrl || null;
    }

    this.uploadingImage = true;

    try {
      // TODO: Implementar upload real al servidor
      // Por ahora convertimos a base64
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.uploadingImage = false;
          resolve(e.target.result);
        };
        reader.readAsDataURL(this.selectedImageFile!);
      });
    } catch (error) {
      console.error('Error al subir imagen:', error);
      this.uploadingImage = false;
      return null;
    }
  }

  navigateToBrands(): void {
    this.router.navigate(['/admin/brands']);
  }

  navigateToCategories(): void {
    this.router.navigate(['/admin/categories']);
  }

  getBrandName(brandId: number | null): string {
    if (!brandId) return '-';
    const brand = this.brands.find(b => b.id === brandId);
    return brand ? brand.name : 'N/A';
  }

  getCategoryName(categoryId: number | null): string {
    if (!categoryId) return '-';
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : 'N/A';
  }

  // ==================== NUEVOS MÉTODOS: ATRIBUTOS DINÁMICOS ====================

  /**
   * Agregar un nuevo atributo personalizado vacío
   */
  addAttribute(): void {
    if (!this.productForm.customAttributes) {
      this.productForm.customAttributes = [];
    }
    
    this.productForm.customAttributes.push({
      key: '',
      value: ''
    });
  }

  /**
   * Eliminar un atributo por índice
   */
  removeAttribute(index: number): void {
    if (this.productForm.customAttributes && index >= 0 && index < this.productForm.customAttributes.length) {
      this.productForm.customAttributes.splice(index, 1);
    }
  }

  /**
   * Validar que los atributos tengan tanto key como value antes de guardar
   */
  validateCustomAttributes(): boolean {
    if (!this.productForm.customAttributes || this.productForm.customAttributes.length === 0) {
      return true; // Es válido no tener atributos
    }

    // Filtrar atributos vacíos y validar los que tienen contenido
    this.productForm.customAttributes = this.productForm.customAttributes.filter((attr: any) => {
      // Si ambos están vacíos, eliminar
      if (!attr.key && !attr.value) {
        return false;
      }
      // Si solo uno está vacío, es un error
      if (!attr.key || !attr.value) {
        this.errorMessage = 'Cada característica debe tener nombre y valor';
        return true; // Mantener para mostrar error
      }
      return true;
    });

    // Verificar que todos los atributos restantes sean válidos
    const hasInvalid = this.productForm.customAttributes.some((attr: any) => !attr.key || !attr.value);
    return !hasInvalid;
  }
}
