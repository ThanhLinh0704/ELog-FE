export interface ConfirmedByDto {
  userId: number;
  fullName: string;
}

export interface TripDraftStop {
  tripDraftStopId: number;
  sequenceNo: number;
  storeId: number;
  storeCode: string;
  storeName: string;
  isActive: boolean;
  orderCount: number;
  plannedEta?: string | null;
  overrideNote?: string | null;
}

export interface TripDraft {
  id: number;
  routeId: number;
  routeCode: string;
  deliveryDate: string;
  totalVolumeM3: number;
  totalWeightKg: number;
  activeStopCount: number;
  skippedStopCount: number;
  status: string; // DRAFT | PLANNED | VALIDATED | ...
  plannedDepartureTime?: string | null;
  confirmedAt?: string | null;
  confirmedBy?: ConfirmedByDto | null;
  stops?: TripDraftStop[] | null;
}

export interface ConsolidateResponse {
  deliveryDate: string;
  tripDraftsCreatedOrUpdated: number;
  tripDrafts: TripDraft[];
  skippedRoutes: {
    routeId: number;
    routeCode: string;
    reason: string;
  }[];
}

export type ConstraintResult = 'NOT_CHECKED' | 'PASS' | 'FAIL';

export interface EligibleVehicle {
  vehicleId: number;
  plateNumber: string;
  vehicleType: string;
  maxVolumeM3: number;
  maxWeightKg: number;
  remainingVolumeM3: number;
  remainingWeightKg: number;
}

export interface IneligibleVehicle {
  vehicleId: number;
  plateNumber: string;
  vehicleType: string;
  maxVolumeM3: number;
  maxWeightKg: number;
  volumeCheckResult: ConstraintResult;
  weightCheckResult: ConstraintResult;
  failureReason?: string;
}

export interface CapacityValidationResult {
  tripDraftId: number;
  fixedRouteCode: string;
  deliveryDate: string;
  newStatus: string;
  totalVolumeM3: number;
  totalWeightKg: number;
  validationPassed: boolean;
  volumeCheckResult: ConstraintResult;
  weightCheckResult: ConstraintResult;
  eligibleVehicles: EligibleVehicle[];
  ineligibleVehicles: IneligibleVehicle[];
  bindingConstraint?: 'VOLUME' | 'WEIGHT' | 'BOTH' | null;
  suggestion?: string | null;
  validatedAt?: string | null;
  validatedBy?: ConfirmedByDto | null;
  message?: string;
}

export interface AdjustDepartureTimePayload {
  newDepartureTime: string;
}

export interface SettleDelayPayload {
  reason: string;
}

