// Types mirroring Backend DriverTripResponse DTO (DriverTripController)
// Source: com.elog.dto.response.DriverTripResponse

// ── Enums (from BE DTO comments) ─────────────────────────────────────────────

/** Status của TripExecution (DriverTripResponse.status) */
export type ExecutionStatus =
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'COMPLETED_WITH_EXCEPTIONS';

/** Status của từng Order (DriverOrderDto.deliveryStatus) */
export type OrderDeliveryStatus =
  | 'PENDING'
  | 'DELIVERED'
  | 'PARTIALLY_DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

/**
 * Aggregated status của Stop (DriverStopDto.aggregatedStatus)
 * NOTE: BE dùng "PARTIAL" (không phải "PARTIALLY_DELIVERED")
 */
export type StopAggregatedStatus =
  | 'PENDING'
  | 'DELIVERED'
  | 'PARTIAL'
  | 'FAILED';

// ── reasonCode mapping (UpdateOrderResultRequest.reasonCode) ─────────────────
// BE không có enum riêng — là String. Dùng danh sách chuẩn theo nghiệp vụ.
export const REASON_CODE_LABELS: Record<string, string> = {
  STORE_REJECTED: 'Cửa hàng từ chối nhận hàng',
  STORE_CLOSED: 'Cửa hàng đóng cửa',
  WRONG_ITEMS: 'Hàng không đúng đơn',
  DAMAGED_GOODS: 'Hàng bị hư hỏng',
  NO_SPACE: 'Không có chỗ chứa hàng',
  RECIPIENT_ABSENT: 'Người nhận vắng mặt',
  DELIVERY_FAILED_OTHER: 'Lý do khác',
};

export const REASON_CODE_OPTIONS = Object.entries(REASON_CODE_LABELS).map(
  ([value, label]) => ({ value, label })
);

// ── Nested DTOs ───────────────────────────────────────────────────────────────

/** Mirrors DriverTripResponse.DriverOrderItemDto */
export interface DriverOrderItem {
  sku: string;
  productName: string;
  quantity: number;
  unitWeightKg: number | null;
  unitVolumeM3: number | null;
}

/** Mirrors DriverTripResponse.DriverOrderDto */
export interface DriverOrder {
  orderId: number;
  orderRef: string;
  recipientName: string | null;
  recipientPhone: string | null;
  deliveryTimeWindow: string | null;
  notes: string | null;
  deliveryStatus: OrderDeliveryStatus;
  exceptionReason: string | null;
  items: DriverOrderItem[];
}

/** Mirrors DriverTripResponse.DriverStopDto */
export interface DriverTripStop {
  stopId: number;
  sequenceNo: number;
  storeCode: string;
  storeName: string;
  address: string;
  plannedEta: string | null;   // "HH:mm:ss"
  closingTime: string | null;  // "HH:mm:ss"
  aggregatedStatus: StopAggregatedStatus;
  orders: DriverOrder[];
}

/** Mirrors DriverTripResponse.LifoLoadingItemDto */
export interface LifoLoadingItem {
  loadingOrder: number;        // 1 = xep dau tien (duoi/trong cung xe)
  stopSequenceNo: number;
  storeName: string;
  orderRef: string;
  sku: string;
  productName: string;
  quantity: number;
  instruction: string;
}

/** Mirrors full DriverTripResponse */
export interface DriverTripExecution {
  executionId: number;
  tripId: number;
  tripCode: string;
  deliveryDate: string;        // "yyyy-MM-dd"
  status: ExecutionStatus;
  assignmentVersion: number | null;
  returnedToWarehouseAt?: string | null;

  // Vehicle info
  vehicleCode: string | null;
  plateNumber: string | null;

  // Driver info
  driverName: string | null;

  // Summary counts
  totalStops: number;
  totalOrders: number;
  completedOrdersCount: number;
  pendingOrdersCount: number;

  // Stop list with orders
  stops: DriverTripStop[];

  // LIFO loading guidance
  lifoLoadingGuidance: LifoLoadingItem[];
}

// ── Request DTO ───────────────────────────────────────────────────────────────

/** Mirrors UpdateOrderResultRequest */
export interface UpdateOrderResultPayload {
  /** "DELIVERED" | "PARTIALLY_DELIVERED" | "FAILED" | "CANCELLED" */
  status: OrderDeliveryStatus;
  /** Required when status is PARTIALLY_DELIVERED or FAILED */
  reasonCode?: string | null;
  /** Optional free-text note from driver */
  exceptionText?: string | null;
}

// ── UI helpers ────────────────────────────────────────────────────────────────

export const EXECUTION_STATUS_LABEL: Record<ExecutionStatus, { color: string; label: string }> = {
  ASSIGNED:                  { color: 'blue',    label: 'Đã phân công' },
  IN_PROGRESS:               { color: 'processing', label: 'Đang giao' },
  COMPLETED:                 { color: 'success', label: 'Hoàn thành' },
  COMPLETED_WITH_EXCEPTIONS: { color: 'warning', label: 'Hoàn thành (có ngoại lệ)' },
};

export const ORDER_STATUS_LABEL: Record<OrderDeliveryStatus, { color: string; label: string }> = {
  PENDING:             { color: 'default',    label: 'Chờ giao' },
  DELIVERED:           { color: 'success',    label: 'Đã giao' },
  PARTIALLY_DELIVERED: { color: 'warning',    label: 'Giao một phần' },
  FAILED:              { color: 'error',      label: 'Giao thất bại' },
  CANCELLED:           { color: 'default',    label: 'Đã hủy' },
};

export const STOP_STATUS_LABEL: Record<StopAggregatedStatus, { color: string; label: string }> = {
  PENDING:   { color: 'default',    label: 'Chờ giao' },
  DELIVERED: { color: 'success',    label: 'Đã giao' },
  PARTIAL:   { color: 'warning',    label: 'Giao một phần' },
  FAILED:    { color: 'error',      label: 'Thất bại' },
};
