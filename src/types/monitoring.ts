// Types for US-17 Dashboard Monitoring
// Exact match with Backend DTOs — do NOT add fields not in the DTO.

// ── Trip Monitoring Status Enums ──────────────────────────────────────────────

export type TripMonitoringStatus = 'DISPATCHED' | 'IN_PROGRESS' | 'COMPLETED';

export type TripStopMonitoringStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'EXCEPTION';

// ── ActiveTripsResponse (GET /api/dashboard/active-trips) ─────────────────────

/** Backend: ActiveTripsResponse.ExceptionSummary */
export interface MonitoringExceptionSummary {
  exceptionId: number;
  type: string;
  storeCode: string;
  description: string;
  resolvedAt: string | null;
}

/** Backend: ActiveTripsResponse.TripSummary */
export interface ActiveTripSummary {
  tripId: number;
  fixedRouteCode: string;
  vehicleCode: string;
  driverName: string;
  status: string;
  plannedDepartureTime: string | null;
  actualDepartureTime: string | null;
  totalStops: number;
  completedStops: number;
  pendingStops: number;
  exceptionStops: number;
  progressPercent: number;
  hasUnresolvedExceptions: boolean;
  exceptions: MonitoringExceptionSummary[];
  gpsLocation: unknown | null;
  gpsNote: string | null;
}

/** Backend: ActiveTripsResponse */
export interface ActiveTripsResponse {
  date: string;
  totalActiveTrips: number;
  trips: ActiveTripSummary[];
}

// ── TripProgressResponse (GET /api/trips/{id}/progress) ───────────────────────

/** Backend: TripProgressResponse.ExceptionDetail */
export interface ProgressExceptionDetail {
  exceptionId: number;
  type: string;
  description: string;
  createdAt: string | null;
  resolvedAt: string | null;
}

/** Backend: TripProgressResponse.StopProgress */
export interface StopProgress {
  tripStopId: number;
  sequenceOrder: number;
  storeCode: string;
  storeName: string | null;
  status: string;
  plannedEta: string | null;
  actualArrivalTime: string | null;
  actualDepartureTime: string | null;
  delayMinutes: number | null;
  hasException: boolean;
  exceptions: ProgressExceptionDetail[];
  latitude: number | null;
  longitude: number | null;
}

/** Backend: TripProgressResponse.VehicleInfo */
export interface ProgressVehicleInfo {
  vehicleCode: string;
  plateNumber: string;
}

/** Backend: TripProgressResponse.DriverInfo */
export interface ProgressDriverInfo {
  userId: number;
  fullName: string;
  phone: string | null;
}

/** Backend: TripProgressResponse */
export interface TripProgressResponse {
  tripId: number;
  fixedRouteCode: string;
  deliveryDate: string;
  status: string;
  totalDistanceKm: number | null;
  /** Encoded polyline (Goong.io format); multiple legs joined by ';'. */
  routePolyline: string | null;
  vehicle: ProgressVehicleInfo;
  driver: ProgressDriverInfo;
  stops: StopProgress[];
  gpsLocation: unknown | null;
  gpsNote: string | null;
}

// ── TripStartResponse (POST /api/trips/{id}/start) ───────────────────────────

/** Backend: TripStartResponse */
export interface TripStartResponse {
  tripId: number;
  status: string;
  actualDepartureTime: string | null;
  firstStopCode: string | null;
  firstStopEta: string | null;
  message: string;
}

// ── StopArriveResponse (POST /api/trip-stops/{id}/arrive) ────────────────────

/** Backend: StopArriveResponse */
export interface StopArriveResponse {
  tripStopId: number;
  storeCode: string;
  status: string;
  actualArrivalTime: string | null;
  plannedEta: string | null;
  delayMinutes: number;
  timeExceptionFlagged: boolean;
  exceptionId: number | null;
  message: string;
}

// ── StopCompleteResponse (POST /api/trip-stops/{id}/complete) ────────────────

/** Backend: StopCompleteResponse.NextStopInfo */
export interface NextStopInfo {
  tripStopId: number;
  storeCode: string;
  plannedEta: string | null;
  sequenceOrder: number;
}

/** Backend: StopCompleteResponse */
export interface StopCompleteResponse {
  tripStopId: number;
  storeCode: string;
  status: string;
  actualDepartureTime: string | null;
  tripCompleted: boolean;
  tripStatus: string;
  nextStop: NextStopInfo | null;
  message: string;
}
