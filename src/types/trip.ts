// Types for US-15 (Vehicle Assignment) & US-16 (Dispatch Execution)
// Exact match with Backend DTOs — do NOT add fields not in the DTO.

import type { ConstraintResult } from './tripDraft';

// Re-export ConstraintResult so trip.ts consumers don't need to import tripDraft.ts
export type { ConstraintResult };

// ── EligibleVehiclesResponse ────────────────────────────────────────────────
// Backend: EligibleVehicleDto
export interface EligibleVehicle {
  vehicleId: number;
  plateNumber: string;
  vehicleType: string;
  maxVolumeM3: number;
  maxWeightKg: number;
  remainingVolumeM3: number;
  remainingWeightKg: number;
}

// Backend: IneligibleVehicleDto
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

// Backend: EligibleVehiclesResponse (wrapper returned by /eligible-vehicles)
export interface EligibleVehiclesResponse {
  eligibleVehicles: EligibleVehicle[];
  ineligibleVehicles: IneligibleVehicle[];
}

// ── AvailableDriverResponse ─────────────────────────────────────────────────
// Backend: AvailableDriverResponse
export interface AvailableDriver {
  userId: number;
  fullName: string;
  email: string;
  available: boolean;
  busyReason?: string | null;
}

// ── FleetCapacityCheckResponse ──────────────────────────────────────────────
// Backend: FleetCapacityCheckResponse
export interface FleetCapacityCheck {
  deliveryDate: string;
  fleetTotalVolumeM3: number;
  fleetTotalWeightKg: number;
  dayTotalVolumeM3: number;
  dayTotalWeightKg: number;
  volumeCheckResult: ConstraintResult;
  weightCheckResult: ConstraintResult;
  canDispatch: boolean;
  message?: string;
}

// ── TripResponse ────────────────────────────────────────────────────────────
// Backend: TripResponse.VehicleInfo
export interface TripVehicleInfo {
  vehicleId: number;
  plateNumber: string;
  vehicleType: string;
}

// Backend: TripResponse.DriverInfo (also used for lockedBy)
export interface TripDriverInfo {
  userId: number;
  fullName: string;
}

// Backend: TripStopResponse
export interface TripStop {
  tripStopId: number;
  routeStopId: number;
  tripDraftStopId: number;
  sequenceOrder: number;
  storeCode?: string;
  storeName: string;
  plannedEta?: string | null;
  status: string;
  stopWeightKg?: number;
  stopVolumeM3?: number;
  notes?: string | null;
}

export type TripStatus = 'VALIDATED' | 'DISPATCHED' | 'IN_PROGRESS' | 'COMPLETED';

// Backend: TripResponse
export interface Trip {
  tripId: number;
  tripDraftId: number;
  fixedRouteCode: string;
  deliveryDate: string;
  status: TripStatus;
  vehicle: TripVehicleInfo | null;
  driver: TripDriverInfo | null;
  totalWeightKg: number;
  totalVolumeM3: number;
  plannedDepartureTime?: string | null;
  lockedAt?: string | null;
  lockedBy?: TripDriverInfo | null;
  completedAt?: string | null;
  tripStopCount: number;
  manifestId?: number | null;
  tripStops?: TripStop[];
  handoverSlipUrl?: string | null;
  message?: string;
}

// ── TripSplitResponse ───────────────────────────────────────────────────────
// Backend: TripSplitResponse.TripSummary
export interface TripSplitSummary {
  tripId: number;
  plateNumber: string;
  vehicleType: string;
  stopCount: number;
  totalVolumeM3: number;
  totalWeightKg: number;
}

// Backend: TripSplitResponse
export interface TripSplitResult {
  tripDraftId: number;
  tripsCreated: number;
  trips: TripSplitSummary[];
  message?: string;
}

// ── Request DTOs ────────────────────────────────────────────────────────────
// Backend: TripAssignRequest
export interface TripAssignRequest {
  vehicleId: number;
  driverId: number;
}

// Backend: TripSplitAssignRequest.SplitAssignment
export interface SplitAssignment {
  vehicleId: number;
  driverId: number;
  stopIds: number[];
}

// Backend: TripSplitAssignRequest
export interface TripSplitAssignRequest {
  assignments: SplitAssignment[];
}
