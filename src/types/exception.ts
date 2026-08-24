// Types for US-18 Exception Management
// Exact match with Backend DTOs — do NOT add fields not in the DTO.

// ── Enums ────────────────────────────────────────────────────────────────────

/** Backend: ExceptionType enum */
export type ExceptionType =
  | 'TIME_EXCEPTION'
  | 'DELIVERY_REJECTION'
  | 'TRIP_STALE_UNSTARTED'
  | 'TRIP_START_DEADLINE_EXCEEDED';

/**
 * Rejection sub-type — stored as prefix in description column: "[STORE_CLOSED] ..."
 * Backend validates via String, not enum — these are the 6 supported values.
 */
export type RejectionType =
  | 'STORE_CLOSED'
  | 'STORE_REFUSED'
  | 'WRONG_ITEMS'
  | 'DAMAGED_GOODS'
  | 'NO_SPACE'
  | 'OTHER';

/** Filter values for GET /api/v1/exceptions?resolved= */
export type ExceptionResolvedFilter = 'all' | 'true' | 'false';

/** Filter values for GET /api/v1/exceptions?type= */
export type ExceptionTypeFilter = 'ALL' | ExceptionType;

// ── Response DTOs ────────────────────────────────────────────────────────────

/**
 * Backend: DeliveryExceptionResponse.ReporterInfo
 * Used for both reportedBy and resolvedBy in detail response.
 */
export interface ExceptionReporterInfo {
  userId: number;
  fullName: string;
}

/**
 * Backend: DeliveryExceptionResponse
 * Returned by POST /api/v1/trip-stops/{id}/reject, GET /api/v1/exceptions/{id},
 * and PATCH /api/v1/exceptions/{id}/resolve.
 */
export interface DeliveryExceptionResponse {
  exceptionId: number;
  exceptionType: string;
  rejectionType: string | null;

  // Stop info
  tripStopId: number;
  storeCode: string;
  storeName: string | null;
  tripStopStatus: string;

  // Trip info
  tripId: number;
  fixedRouteCode: string;
  vehicleCode: string;

  // Timing
  plannedEta: string | null;
  actualArrivalTime: string | null;
  delayMinutes: number | null;

  // Description & reporter
  description: string | null;
  reportedBy: ExceptionReporterInfo | null;
  createdAt: string;

  // Resolution
  resolvedAt: string | null;
  resolvedBy: ExceptionReporterInfo | null;
  resolutionNotes: string | null;

  // Message (used in reject/resolve response)
  message: string | null;
}

/**
 * Backend: ExceptionListResponse.ExceptionItem
 * List response uses string for reportedBy/resolvedBy instead of ReporterInfo.
 */
export interface ExceptionListItem {
  exceptionId: number;
  exceptionType: string;
  rejectionType: string | null;

  // Trip / Route
  tripId: number | null;
  fixedRouteCode: string | null;
  vehicleCode: string | null;
  driverName: string | null;

  // Stop
  tripStopId: number | null;
  storeCode: string | null;
  storeName: string | null;

  // Timing
  plannedEta: string | null;
  actualArrivalTime: string | null;
  delayMinutes: number | null;

  // Description & reporter
  description: string | null;
  reportedBy: string | null;
  createdAt: string;

  // Resolution
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolutionNotes: string | null;
}

/**
 * Backend: ExceptionListResponse
 * Returned by GET /api/v1/exceptions.
 */
export interface ExceptionListResponse {
  /** Set when queried by a single date; null when queried by fromDate/toDate range. */
  date: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  totalCount: number;
  unresolvedCount: number;
  exceptions: ExceptionListItem[];
}

// ── Request DTOs ─────────────────────────────────────────────────────────────

/**
 * Backend: RejectStopRequest
 * POST /api/v1/trip-stops/{id}/reject
 */
export interface RejectStopRequest {
  rejectionType: string;
  description?: string;
}

/**
 * Backend: ResolveExceptionRequest
 * PATCH /api/v1/exceptions/{id}/resolve
 */
export interface ResolveExceptionRequest {
  resolutionNotes: string;
}

// ── Filter interface for API calls ───────────────────────────────────────────

export interface ExceptionFilters {
  /** Single-day filter. Ignored if `fromDate`/`toDate` are both set. */
  date?: string;
  /** Date-range filter — pass both together. */
  fromDate?: string;
  toDate?: string;
  type?: ExceptionTypeFilter;
  resolved?: ExceptionResolvedFilter;
}
