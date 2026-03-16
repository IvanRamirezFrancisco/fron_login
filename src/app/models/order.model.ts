/**
 * 📦 Modelos para Órdenes - Reflejan los DTOs del Backend
 */

// ==================== ENUMS ====================

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED'
}

export enum ShippingStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  SHIPPED = 'SHIPPED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  RETURNED = 'RETURNED'
}

// ==================== INTERFACES ====================

export interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  productImage?: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Order {
  // Basic Info
  id: number;
  orderNumber: string;
  orderDate: string;

  // Customer Info
  userId: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;

  // Totals
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;

  // States (con displayNames)
  status: OrderStatus;
  statusDisplayName: string;
  paymentStatus: PaymentStatus;
  paymentStatusDisplayName: string;
  shippingStatus: ShippingStatus;
  shippingStatusDisplayName: string;

  // Payment Info
  paymentMethod?: string;
  transactionId?: string;

  // Shipping Info
  shippingAddress?: string;
  billingAddress?: string;
  trackingNumber?: string;

  // Items
  items: OrderItem[];
  totalItems: number;

  // Notes
  notes?: string;
  customerNotes?: string;
  cancellationReason?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;

  // Business Logic Flags
  canBeCancelled?: boolean;
  canBeRefunded?: boolean;
  canUpdateShipping?: boolean;
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  confirmedOrders: number;
  processingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
}

export interface OrderFilters {
  search?: string;
  orderStatus?: OrderStatus | null;
  paymentStatus?: PaymentStatus | null;
  shippingStatus?: ShippingStatus | null;
  startDate?: string;
  endDate?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}
