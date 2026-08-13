// Mirrors Backend DTO: PlanningEventResponse (PlanningHistoryController — /api/v1/planning-events,
// /api/v1/trip-drafts/{id}/history). Exact match with Backend DTOs — do NOT add fields not in the DTO.

export type PlanningEventType =
  | 'TRIP_DRAFT_CREATED'
  | 'TRIP_DRAFT_UPDATED'
  | 'RECOMMENDATION_RUN'
  | 'SINGLE_VEHICLE_NOT_FOUND'
  | 'TWO_VEHICLE_FALLBACK_TRIGGERED'
  | 'RECOMMENDATION_LIST_GENERATED'
  | 'OPTION_SELECTED'
  | 'OPTION_CHANGED'
  | 'PLAN_CONFIRMED'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_CHANGED'
  | 'PLAN_REPLANNED'
  | 'PLAN_CANCELLED'
  | 'PLAN_VERSION_CREATED'
  | 'PLAN_VERSION_RESTORED';

export type PlanningActorType = 'USER' | 'SYSTEM' | 'RECOMMENDATION_ENGINE';

export interface PlanningEvent {
  id: number;
  tripDraftId: number | null;
  tripId: number | null;
  eventType: PlanningEventType;
  actorType: PlanningActorType;
  actorUsername: string | null;
  actorRole: string | null;
  occurredAt: string;
  statusBefore: string | null;
  statusAfter: string | null;
  changeSummary: string | null;
  changeDetail: unknown;
  note: string | null;
  planVersion: number | null;
  optionCode: string | null;
  routeCode: string | null;
  deliveryDate: string | null;
}

export const PLANNING_EVENT_TYPE_LABEL: Record<PlanningEventType, string> = {
  TRIP_DRAFT_CREATED: 'Tạo kế hoạch nháp',
  TRIP_DRAFT_UPDATED: 'Cập nhật kế hoạch nháp',
  RECOMMENDATION_RUN: 'Chạy gợi ý phân xe',
  SINGLE_VEHICLE_NOT_FOUND: 'Không tìm được xe đơn phù hợp',
  TWO_VEHICLE_FALLBACK_TRIGGERED: 'Kích hoạt đề xuất 2 xe',
  RECOMMENDATION_LIST_GENERATED: 'Sinh danh sách đề xuất',
  OPTION_SELECTED: 'Chọn phương án',
  OPTION_CHANGED: 'Đổi phương án',
  PLAN_CONFIRMED: 'Xác nhận kế hoạch',
  DRIVER_ASSIGNED: 'Phân công tài xế',
  DRIVER_CHANGED: 'Đổi tài xế',
  PLAN_REPLANNED: 'Lập kế hoạch lại',
  PLAN_CANCELLED: 'Huỷ kế hoạch',
  PLAN_VERSION_CREATED: 'Tạo phiên bản kế hoạch',
  PLAN_VERSION_RESTORED: 'Khôi phục phiên bản kế hoạch',
};
