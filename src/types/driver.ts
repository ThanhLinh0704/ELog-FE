// Mirrors Backend DTOs: DriverResponse, DriverStatusHistoryResponse, ActiveTripWarningResponse
// (DriverStatusController — /api/v1/drivers/*). Exact match with Backend DTOs — do NOT add fields not in the DTO.

export type DriverStatus = 'ACTIVE' | 'INACTIVE';

export type DriverInactiveReasonCode =
  | 'ON_LEAVE'
  | 'RESIGNED'
  | 'SUSPENDED'
  | 'NOT_QUALIFIED'
  | 'OTHER';

export interface ActiveTripWarning {
  tripId: number;
  status: string;
  deliveryDate: string;
  routeCode: string;
}

export interface Driver {
  id: number;
  fullName: string;
  phoneNumber: string;
  email: string;
  driverStatus: DriverStatus;
  reasonCode: DriverInactiveReasonCode | null;
  reasonNote: string | null;
  statusUpdatedAt: string | null;
  statusUpdatedByName: string | null;
  activeTripsWarning: ActiveTripWarning[];
  // BE chưa trả field này ở /api/v1/drivers (xem filemd/FEATURE-DRIVER-LICENSE-CLASS-IN-DRIVERS-API.md) —
  // optional để không vỡ khi BE chưa kịp bổ sung, hiển thị "—" cho tới lúc đó.
  licenseClass?: string | null;
}

export interface DriverStatusHistoryEntry {
  id: number;
  statusBefore: DriverStatus;
  statusAfter: DriverStatus;
  reasonCode: DriverInactiveReasonCode | null;
  reasonNote: string | null;
  changedByName: string;
  changedAt: string;
}

export const DRIVER_STATUS_LABEL: Record<DriverStatus, { color: string; label: string }> = {
  ACTIVE: { color: 'success', label: 'Đang hoạt động' },
  INACTIVE: { color: 'error', label: 'Ngừng hoạt động' },
};

export const REASON_CODE_LABEL: Record<DriverInactiveReasonCode, string> = {
  ON_LEAVE: 'Nghỉ phép',
  RESIGNED: 'Đã nghỉ việc',
  SUSPENDED: 'Đình chỉ',
  NOT_QUALIFIED: 'Không đủ điều kiện',
  OTHER: 'Khác',
};
