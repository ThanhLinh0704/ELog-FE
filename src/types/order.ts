// Types for Order Management — GET /api/v1/orders
// Exact match with Backend DTOs from ORDER_SEARCH_API_GUIDE.md

export interface RouteSummary {
  id: number;
  code: string;
  name: string;
}

export interface StoreSummary {
  id: number;
  code: string;
  name: string;
  address?: string;
  provinceCode?: string;
  districtCode?: string;
  wardCode?: string;
}

export interface OrderItemDetail {
  id: number;
  productId?: number;
  sku: string;
  productName?: string;
  quantity: number;
  unitWeightKg?: number;
  unitVolumeM3?: number;
  lineWeightKg?: number;
  lineVolumeM3?: number;
}

export interface OrderDetail {
  id: number;
  batchId?: number;
  orderRef: string;
  deliveryDate: string;
  status: string;
  route?: RouteSummary;
  store?: StoreSummary;
  recipientName?: string;
  recipientPhone?: string;
  deliveryTimeWindow?: string;
  notes?: string;
  totalItems: number;
  totalQuantity: number;
  totalWeightKg: number;
  totalVolumeM3: number;
  items: OrderItemDetail[];
  tripDraftId?: number | null;
  createdAt: string;
}

export interface SearchOrdersParams {
  deliveryDate?: string;
  status?: string;
  routeId?: number;
  routeCode?: string;
  batchId?: number;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export type OrderStatus =
  | 'ACCEPTED'
  | 'UNASSIGNED'
  | 'IN_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  ACCEPTED:    'Đã tiếp nhận',
  UNASSIGNED:  'Chưa phân công',
  IN_DELIVERY: 'Đang giao',
  DELIVERED:   'Đã giao',
  FAILED:      'Giao thất bại',
  CANCELLED:   'Đã hủy',
};

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  ACCEPTED:    'blue',
  UNASSIGNED:  'default',
  IN_DELIVERY: 'processing',
  DELIVERED:   'success',
  FAILED:      'error',
  CANCELLED:   'default',
};

