// API service for US-17 Dashboard Monitoring
// Uses existing axiosInstance — Bearer token is handled by request interceptor.
// Error format from Backend: { success: false, error: { code, message } }

import axiosInstance from './axiosInstance';
import type {
  ActiveTripsResponse,
  TripProgressResponse,
  TripStartResponse,
  StopArriveResponse,
  StopCompleteResponse,
  TripStatusSummaryResponse,
} from '../types/monitoring';

interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
}

function unwrap<T>(res: { data: ApiResponseWrapper<T> }): T {
  return res.data.data;
}

// ── Dashboard APIs (DISPATCHER / LOGISTICS_MANAGER) ──────────────────────────

/**
 * GET /api/v1/dashboard/active-trips?date=YYYY-MM-DD
 * Returns active trips for a date (DISPATCHED/IN_PROGRESS/COMPLETED).
 */
export async function getActiveTrips(date?: string): Promise<ActiveTripsResponse> {
  const res = await axiosInstance.get<ApiResponseWrapper<ActiveTripsResponse>>(
    '/api/v1/dashboard/active-trips',
    { params: date ? { date } : undefined }
  );
  return unwrap(res);
}

/**
 * GET /api/v1/trips/{id}/progress
 * Returns detailed stop-by-stop progress of a trip.
 */
export async function getTripProgress(tripId: number): Promise<TripProgressResponse> {
  const res = await axiosInstance.get<ApiResponseWrapper<TripProgressResponse>>(
    `/api/v1/trips/${tripId}/progress`
  );
  return unwrap(res);
}

/**
 * GET /api/v1/dashboard/trip-status-summary?date=YYYY-MM-DD
 * Returns trip counts by status (VALIDATED/DISPATCHED/IN_PROGRESS/COMPLETED) for a date.
 */
export async function getTripStatusSummary(date?: string): Promise<TripStatusSummaryResponse> {
  const res = await axiosInstance.get<ApiResponseWrapper<TripStatusSummaryResponse>>(
    '/api/v1/dashboard/trip-status-summary',
    { params: date ? { date } : undefined }
  );
  return unwrap(res);
}

// ── Driver Action APIs (DRIVER) ──────────────────────────────────────────────

/**
 * POST /api/v1/trips/{id}/start
 * Driver starts trip: DISPATCHED → IN_PROGRESS.
 */
export async function startTrip(tripId: number): Promise<TripStartResponse> {
  const res = await axiosInstance.post<ApiResponseWrapper<TripStartResponse>>(
    `/api/v1/trips/${tripId}/start`
  );
  return unwrap(res);
}

/**
 * POST /api/v1/trip-stops/{id}/arrive
 * Driver arrives at stop: PENDING → IN_PROGRESS.
 * Auto-flags TIME_EXCEPTION if late (BR-09).
 */
export async function arriveAtStop(tripStopId: number): Promise<StopArriveResponse> {
  const res = await axiosInstance.post<ApiResponseWrapper<StopArriveResponse>>(
    `/api/v1/trip-stops/${tripStopId}/arrive`
  );
  return unwrap(res);
}

/**
 * POST /api/v1/trip-stops/{id}/complete
 * Driver completes stop: IN_PROGRESS → COMPLETED.
 * Trip auto-completes if last stop done.
 */
export async function completeStop(tripStopId: number): Promise<StopCompleteResponse> {
  const res = await axiosInstance.post<ApiResponseWrapper<StopCompleteResponse>>(
    `/api/v1/trip-stops/${tripStopId}/complete`
  );
  return unwrap(res);
}
