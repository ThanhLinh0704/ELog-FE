// Types for US-18 Exception Management
// Exact match with Backend DTOs — do NOT add fields not in the DTO.

// ── Enums ────────────────────────────────────────────────────────────────────

/** Backend: ExceptionType enum */
export type ExceptionType = 'TIME_EXCEPTION' | 'DELIVERY_REJECTION';

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

/** Filter values for GET /api/exceptions?resolved= */
export type ExceptionResolvedFilter = 'all' | 'true' | 'false';

/** Filter values for GET /api/exceptions?type= */
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
 * Returned by POST /api/trip-stops/{id}/reject, GET /api/exceptions/{id},
 * and PATCH /api/exceptions/{id}/resolve.
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
 * Returned by GET /api/exceptions.
 */
export interface ExceptionListResponse {
  date: string;
  totalCount: number;
  unresolvedCount: number;
  exceptions: ExceptionListItem[];
}

// ── Request DTOs ─────────────────────────────────────────────────────────────

/**
 * Backend: RejectStopRequest
 * POST /api/trip-stops/{id}/reject
 */
export interface RejectStopRequest {
  rejectionType: string;
  description?: string;
}

/**
 * Backend: ResolveExceptionRequest
 * PATCH /api/exceptions/{id}/resolve
 */
export interface ResolveExceptionRequest {
  resolutionNotes: string;
}

// ── Filter interface for API calls ───────────────────────────────────────────

export interface ExceptionFilters {
  date?: string;
  type?: ExceptionTypeFilter;
  resolved?: ExceptionResolvedFilter;
}
