// ============================================
// SHOPPING CART MODELS - Fase 2 E-Commerce
// ============================================

export interface ShoppingCartDTO {
  id: number;
  userId?: number;
  sessionId?: string;
  status: CartStatus;
  subtotal: number;
  discount: number;
  tax: number;
  shippingCost: number;
  total: number;
  items: CartItemDTO[];
  appliedCoupon?: CouponDTO;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface CartItemDTO {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  total: number;
  availableStock: number;
  addedAt: string;
}

export interface AddToCartRequest {
  productId: number;
  quantity: number;
  selectedOptions?: { [key: string]: string };
}

export interface UpdateCartItemRequest {
  itemId: number;
  quantity: number;
}

export interface ApplyCouponRequest {
  couponCode: string;
}

export interface TransferCartRequest {
  sessionId: string;
}

export interface CartValidationResponse {
  valid: boolean;
  errors: CartValidationError[];
  warnings: CartValidationWarning[];
  cart: ShoppingCartDTO;
}

export interface CartValidationError {
  type: ValidationErrorType;
  itemId?: number;
  productId?: number;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface CartValidationWarning {
  type: string;
  message: string;
  itemId?: number;
}

export enum CartStatus {
  ACTIVE = 'ACTIVE',
  ABANDONED = 'ABANDONED',
  CONVERTED = 'CONVERTED',
  EXPIRED = 'EXPIRED'
}

export enum ValidationErrorType {
  INSUFFICIENT_STOCK = 'INSUFFICIENT_STOCK',
  PRODUCT_NOT_AVAILABLE = 'PRODUCT_NOT_AVAILABLE',
  PRICE_CHANGED = 'PRICE_CHANGED',
  COUPON_INVALID = 'COUPON_INVALID',
  MINIMUM_PURCHASE_NOT_MET = 'MINIMUM_PURCHASE_NOT_MET'
}

// ============================================
// COUPON MODELS
// ============================================

export interface CouponDTO {
  id: number;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  minimumPurchase?: number;
  maximumDiscount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usageLimitPerUser?: number;
  currentUsageCount: number;
  isActive: boolean;
  applicableCategories?: number[];
  applicableProducts?: number[];
  firstPurchaseOnly: boolean;
  createdAt: string;
}

export interface CreateCouponRequest {
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  minimumPurchase?: number;
  maximumDiscount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usageLimitPerUser?: number;
  applicableCategories?: number[];
  applicableProducts?: number[];
  firstPurchaseOnly?: boolean;
}

export interface ValidateCouponRequest {
  code: string;
  amount: number;
  productIds: number[];
}

export interface CouponValidationResponse {
  valid: boolean;
  coupon?: CouponDTO;
  discountAmount: number;
  errors: string[];
}

export interface CouponStatsDTO {
  couponId: number;
  couponCode: string;
  totalUsages: number;
  uniqueUsers: number;
  totalDiscountGiven: number;
  averageOrderValue: number;
  conversionRate: number;
  revenue: number;
}

export interface CouponOverviewDTO {
  totalActiveCoupons: number;
  totalUsages: number;
  totalDiscountGiven: number;
  topPerformingCoupons: CouponStatsDTO[];
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
  FREE_SHIPPING = 'FREE_SHIPPING'
}

// ============================================
// API RESPONSE WRAPPERS
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  timestamp?: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  first: boolean;
  last: boolean;
}

// Respuesta específica del backend para cupones
export interface CouponListResponse {
  coupons: CouponDTO[];
  totalCoupons: number;
  currentPage: number;
  totalPages: number;
}
