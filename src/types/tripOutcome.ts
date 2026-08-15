// Types mirroring Backend TripOutcomeResponse DTO (TripOutcomeController)
// Source: com.elog.dto.response.TripOutcomeResponse

export type TripOutcomeStatus = 'SUBMITTED' | 'VALIDATED' | 'NEEDS_CORRECTION';

/** Mirrors TripOutcomeResponse */
export interface TripOutcome {
  id: number;
  executionId: number;
  tripId: number;
  tripCode: string;
  driverName: string | null;
  vehiclePlate: string | null;
  /** 'SUBMITTED' | 'VALIDATED' | 'NEEDS_CORRECTION' */
  status: TripOutcomeStatus;
  totalOrders: number;
  deliveredCount: number;
  failedCount: number;
  partialCount: number;
  submittedAt: string | null;   // ISO datetime
  validatedAt: string | null;   // ISO datetime
  validatedBy: string | null;
  amendmentReason: string | null;
  version: number;
}

export const OUTCOME_STATUS_LABEL: Record<TripOutcomeStatus, { color: string; label: string }> = {
  SUBMITTED:        { color: 'processing', label: 'Chờ nghiệm thu' },
  VALIDATED:        { color: 'success',    label: 'Đã nghiệm thu' },
  NEEDS_CORRECTION: { color: 'warning',    label: 'Cần điều chỉnh' },
};
