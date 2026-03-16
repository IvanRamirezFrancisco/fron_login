// ============================================
// WISHLIST MODELS - Fase 2 E-Commerce
// ============================================

export interface WishlistItemDTO {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  productImage?: string;
  currentPrice: number;
  originalPrice?: number;
  priceAtAddition: number;
  priceDrop: number;
  priceDropPercentage: number;
  inStock: boolean;
  stockQuantity: number;
  priority: number;
  notes?: string;
  notifyWhenAvailable: boolean;
  notifyOnDiscount: boolean;
  addedAt: string;
  lastPriceCheck: string;
}

export interface AddToWishlistRequest {
  productId: number;
  priority?: number;
  notes?: string;
  notifyWhenAvailable?: boolean;
  notifyOnDiscount?: boolean;
}

export interface UpdateWishlistItemRequest {
  priority?: number;
  notes?: string;
  notifyWhenAvailable?: boolean;
  notifyOnDiscount?: boolean;
}

export interface WishlistSummaryDTO {
  totalItems: number;
  totalValue: number;
  itemsWithPriceDrop: number;
  itemsOutOfStock: number;
  itemsWithDiscount: number;
  averagePriceDrop: number;
}

export interface WishlistNotificationDTO {
  id: number;
  wishlistItemId: number;
  productId: number;
  productName: string;
  notificationType: NotificationType;
  message: string;
  oldPrice?: number;
  newPrice?: number;
  discountPercentage?: number;
  isRead: boolean;
  createdAt: string;
}

export interface PriceDropItemDTO {
  item: WishlistItemDTO;
  savingsAmount: number;
  savingsPercentage: number;
  daysInWishlist: number;
}

export interface BulkAddToWishlistRequest {
  productIds: number[];
  priority?: number;
}

export interface BulkRemoveFromWishlistRequest {
  itemIds: number[];
}

export interface MoveToCartResponse {
  cartId: number;
  movedItem: {
    productId: number;
    productName: string;
    quantity: number;
  };
  wishlistItemRemoved: boolean;
}

export enum NotificationType {
  PRICE_DROP = 'PRICE_DROP',
  BACK_IN_STOCK = 'BACK_IN_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  DISCOUNT_AVAILABLE = 'DISCOUNT_AVAILABLE'
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface WishlistResponse {
  items: WishlistItemDTO[];
  summary: WishlistSummaryDTO;
  totalItems: number;
}

export interface NotificationsResponse {
  notifications: WishlistNotificationDTO[];
  unreadCount: number;
  totalNotifications: number;
}
