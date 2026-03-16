import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductReviewService } from '../../../services/product-review.service';
import { ProductReviewDTO, ReviewStatus, SellerResponseRequest } from '../../../models/review.model';

interface ReviewFilters {
  status?: ReviewStatus;
  rating?: number;
  productId?: number;
  userId?: number;
  startDate?: string;
  endDate?: string;
}

@Component({
  selector: 'app-admin-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-reviews.component.html',
  styleUrls: ['./admin-reviews.component.css']
})
export class AdminReviewsComponent implements OnInit {
  reviews: ProductReviewDTO[] = [];
  currentPage: number = 0;
  pageSize: number = 10;
  totalPages: number = 0;
  totalElements: number = 0;
  isLoading: boolean = false;
  error: string | null = null;

  // Modal states
  showDetailsModal: boolean = false;
  showResponseModal: boolean = false;
  showRejectModal: boolean = false;
  selectedReview: ProductReviewDTO | null = null;

  // Seller response form
  sellerResponse: SellerResponseRequest = {
    response: ''
  };

  // Reject reason
  rejectReason: string = '';

  // Filters
  filters: ReviewFilters = {};
  statusFilter: ReviewStatus | 'ALL' = 'ALL';
  ratingFilter: number | 'ALL' = 'ALL';

  // Enum for template
  ReviewStatus = ReviewStatus;

  constructor(private reviewService: ProductReviewService) {}

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.isLoading = true;
    this.error = null;

    // Prepare filters
    const filters: ReviewFilters = {};
    if (this.statusFilter !== 'ALL') {
      filters.status = this.statusFilter;
    }
    if (this.ratingFilter !== 'ALL') {
      filters.rating = this.ratingFilter;
    }

    // For now, only load pending reviews (can be extended later with more filters)
    this.reviewService.getPendingReviews(this.currentPage, this.pageSize).subscribe({
      next: (response: any) => {
        this.reviews = response.content;
        this.totalPages = response.totalPages;
        this.totalElements = response.totalElements;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading reviews:', error);
        this.error = 'Error al cargar las reseñas. Por favor, intenta de nuevo.';
        this.isLoading = false;
      }
    });
  }

  openDetailsModal(review: ProductReviewDTO): void {
    this.selectedReview = review;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedReview = null;
  }

  openResponseModal(review: ProductReviewDTO): void {
    this.selectedReview = review;
    this.sellerResponse = {
      response: review.sellerResponse || ''
    };
    this.showResponseModal = true;
  }

  closeResponseModal(): void {
    this.showResponseModal = false;
    this.selectedReview = null;
    this.sellerResponse = {
      response: ''
    };
  }

  openRejectModal(review: ProductReviewDTO): void {
    this.selectedReview = review;
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.selectedReview = null;
    this.rejectReason = '';
  }

  approveReview(reviewId: number): void {
    if (!confirm('¿Estás seguro de que quieres aprobar esta reseña?')) {
      return;
    }

    this.isLoading = true;
    this.reviewService.approveReview(reviewId).subscribe({
      next: (updatedReview) => {
        console.log('Review approved:', updatedReview);
        this.loadReviews();
      },
      error: (error) => {
        console.error('Error approving review:', error);
        this.error = 'Error al aprobar la reseña. Por favor, intenta de nuevo.';
        this.isLoading = false;
      }
    });
  }

  rejectReview(): void {
    if (!this.selectedReview) return;
    if (!this.rejectReason.trim()) {
      alert('Por favor, proporciona un motivo para el rechazo.');
      return;
    }

    this.isLoading = true;
    // Note: Backend currently doesn't accept reason parameter, only rejects the review
    this.reviewService.rejectReview(this.selectedReview.id).subscribe({
      next: (updatedReview: ProductReviewDTO) => {
        console.log('Review rejected:', updatedReview);
        this.closeRejectModal();
        this.loadReviews();
      },
      error: (error: any) => {
        console.error('Error rejecting review:', error);
        this.error = 'Error al rechazar la reseña. Por favor, intenta de nuevo.';
        this.isLoading = false;
      }
    });
  }

  saveSellerResponse(): void {
    if (!this.selectedReview) return;
    if (!this.sellerResponse.response.trim()) {
      alert('Por favor, escribe una respuesta.');
      return;
    }

    if (this.sellerResponse.response.length < 10) {
      alert('La respuesta debe tener al menos 10 caracteres.');
      return;
    }

    if (this.sellerResponse.response.length > 1000) {
      alert('La respuesta no puede exceder 1000 caracteres.');
      return;
    }

    this.isLoading = true;
    this.reviewService.addSellerResponse(this.selectedReview.id, this.sellerResponse).subscribe({
      next: (updatedReview: ProductReviewDTO) => {
        console.log('Seller response added:', updatedReview);
        this.closeResponseModal();
        this.loadReviews();
      },
      error: (error: any) => {
        console.error('Error adding seller response:', error);
        this.error = 'Error al guardar la respuesta. Por favor, intenta de nuevo.';
        this.isLoading = false;
      }
    });
  }

  deleteReview(reviewId: number): void {
    if (!confirm('¿Estás seguro de que quieres eliminar esta reseña? Esta acción no se puede deshacer.')) {
      return;
    }

    this.isLoading = true;
    this.reviewService.deleteReview(reviewId).subscribe({
      next: () => {
        console.log('Review deleted successfully');
        this.loadReviews();
      },
      error: (error) => {
        console.error('Error deleting review:', error);
        this.error = 'Error al eliminar la reseña. Por favor, intenta de nuevo.';
        this.isLoading = false;
      }
    });
  }

  // Filter methods
  applyFilters(): void {
    this.currentPage = 0;
    this.loadReviews();
  }

  resetFilters(): void {
    this.statusFilter = 'ALL';
    this.ratingFilter = 'ALL';
    this.filters = {};
    this.currentPage = 0;
    this.loadReviews();
  }

  // Pagination
  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadReviews();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadReviews();
    }
  }

  // Helper methods
  getStatusClass(status: ReviewStatus): string {
    switch (status) {
      case ReviewStatus.APPROVED:
        return 'status-approved';
      case ReviewStatus.PENDING:
        return 'status-pending';
      case ReviewStatus.REJECTED:
        return 'status-rejected';
      default:
        return '';
    }
  }

  getStatusLabel(status: ReviewStatus): string {
    switch (status) {
      case ReviewStatus.APPROVED:
        return 'Aprobada';
      case ReviewStatus.PENDING:
        return 'Pendiente';
      case ReviewStatus.REJECTED:
        return 'Rechazada';
      default:
        return status;
    }
  }

  getRatingStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  hasImages(review: ProductReviewDTO): boolean {
    return !!(review.images && review.images.length > 0);
  }

  hasSellerResponse(review: ProductReviewDTO): boolean {
    return !!review.sellerResponse && review.sellerResponse.trim().length > 0;
  }

  canModerate(review: ProductReviewDTO): boolean {
    return review.status === ReviewStatus.PENDING;
  }

  canAddResponse(review: ProductReviewDTO): boolean {
    return review.status === ReviewStatus.APPROVED && !this.hasSellerResponse(review);
  }

  canEditResponse(review: ProductReviewDTO): boolean {
    return review.status === ReviewStatus.APPROVED && this.hasSellerResponse(review);
  }

  getPendingCount(): number {
    return this.statusFilter === ReviewStatus.PENDING ? this.totalElements : 0;
  }

  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
}
