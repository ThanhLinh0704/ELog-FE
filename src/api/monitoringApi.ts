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
 * GET /api/dashboard/active-trips?date=YYYY-MM-DD
 * Returns active trips for a date (DISPATCHED/IN_PROGRESS/COMPLETED).
 */
export async function getActiveTrips(date?: string): Promise<ActiveTripsResponse> {
  const res = await axiosInstance.get<ApiResponseWrapper<ActiveTripsResponse>>(
    '/api/dashboard/active-trips',
    { params: date ? { date } : undefined }
  );
  return unwrap(res);
}

/**
 * GET /api/trips/{id}/progress
 * Returns detailed stop-by-stop progress of a trip.
 */
export async function getTripProgress(tripId: number): Promise<TripProgressResponse> {
  const res = await axiosInstance.get<ApiResponseWrapper<TripProgressResponse>>(
    `/api/trips/${tripId}/progress`
  );
  return unwrap(res);
}

// ── Driver Action APIs (DRIVER) ──────────────────────────────────────────────

/**
 * POST /api/trips/{id}/start
 * Driver starts trip: DISPATCHED → IN_PROGRESS.
 */
export async function startTrip(tripId: number): Promise<TripStartResponse> {
  const res = await axiosInstance.post<ApiResponseWrapper<TripStartResponse>>(
    `/api/trips/${tripId}/start`
  );
  return unwrap(res);
}

/**
 * POST /api/trip-stops/{id}/arrive
 * Driver arrives at stop: PENDING → IN_PROGRESS.
 * Auto-flags TIME_EXCEPTION if late (BR-09).
 */
export async function arriveAtStop(tripStopId: number): Promise<StopArriveResponse> {
  const res = await axiosInstance.post<ApiResponseWrapper<StopArriveResponse>>(
    `/api/trip-stops/${tripStopId}/arrive`
  );
  return unwrap(res);
}

/**
 * POST /api/trip-stops/{id}/complete
 * Driver completes stop: IN_PROGRESS → COMPLETED.
 * Trip auto-completes if last stop done.
 */
export async function completeStop(tripStopId: number): Promise<StopCompleteResponse> {
  const res = await axiosInstance.post<ApiResponseWrapper<StopCompleteResponse>>(
    `/api/trip-stops/${tripStopId}/complete`
  );
  return unwrap(res);
}
