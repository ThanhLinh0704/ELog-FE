// Mirrors Backend DTO: TripOutcomeEventResponse (TripOutcomeHistoryController —
// /api/v1/trip-outcome-events, /api/v1/trips/{id}/outcome-history). Exact match with Backend DTOs.
// KHÁC với tripOutcome.ts (mirrors TripOutcomeResponse / /api/v1/trip-outcomes — feature validate/amend
// cũ, khác hoàn toàn với audit trail chỉ-đọc này).

export type TripOutcomeEventType =
  | 'TRIP_EXECUTION_CREATED'
  | 'START_TRIP'
  | 'ORDER_DELIVERED'
  | 'ORDER_FAILED'
  | 'ORDER_PARTIALLY_DELIVERED'
  | 'STOP_STATUS_CHANGED'
  | 'COMPLETE_TRIP'
  | 'OUTCOME_SUBMITTED'
  | 'OUTCOME_VALIDATED'
  | 'OUTCOME_AMENDED';

export type TripOutcomeActorType = 'USER' | 'SYSTEM' | 'RECOMMENDATION_ENGINE';

export interface TripOutcomeEvent {
  id: number;
  tripExecutionId: number | null;
  tripId: number | null;
  eventType: TripOutcomeEventType;
  actorType: TripOutcomeActorType;
  actorUsername: string | null;
  actorRole: string | null;
  occurredAt: string;
  statusBefore: string | null;
  statusAfter: string | null;
  orderId: number | null;
  orderRef: string | null;
  stopId: number | null;
  storeCode: string | null;
  deliveryResult: string | null;
  reasonCode: string | null;
  exceptionText: string | null;
  validationNote: string | null;
  routeCode: string | null;
  deliveryDate: string | null;
  driverUsername: string | null;
}

export const TRIP_OUTCOME_EVENT_TYPE_LABEL: Record<TripOutcomeEventType, string> = {
  TRIP_EXECUTION_CREATED: 'Tạo phiên thực thi',
  START_TRIP: 'Bắt đầu chuyến đi',
  ORDER_DELIVERED: 'Giao hàng thành công',
  ORDER_FAILED: 'Giao hàng thất bại',
  ORDER_PARTIALLY_DELIVERED: 'Giao hàng một phần',
  STOP_STATUS_CHANGED: 'Đổi trạng thái điểm dừng',
  COMPLETE_TRIP: 'Hoàn thành chuyến đi',
  OUTCOME_SUBMITTED: 'Nộp kết quả giao hàng',
  OUTCOME_VALIDATED: 'Duyệt kết quả giao hàng',
  OUTCOME_AMENDED: 'Chỉnh sửa kết quả giao hàng',
};
