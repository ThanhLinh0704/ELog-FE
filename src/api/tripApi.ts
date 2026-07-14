// API service for US-15 (Vehicle Assignment) & US-16 (Dispatch Execution)
// Uses existing axiosInstance — Bearer token is handled by request interceptor.
// Error format from Backend: { success: false, error: { code, message } }

import axiosInstance from './axiosInstance';
import type {
  EligibleVehiclesResponse,
  AvailableDriver,
  FleetCapacityCheck,
  Trip,
  TripSplitResult,
  TripAssignRequest,
  TripSplitAssignRequest,
} from '../types/trip';

interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
}

function unwrap<T>(res: { data: ApiResponseWrapper<T> }): T {
  return res.data.data;
}

/**
 * GET /api/trip-drafts/{id}/eligible-vehicles
 * Returns both eligible and ineligible vehicles in a single response wrapper.
 * DISPATCHER only.
 */
export async function getEligibleVehicles(
  tripDraftId: number | string
): Promise<EligibleVehiclesResponse> {
  const res = await axiosInstance.get<ApiResponseWrapper<EligibleVehiclesResponse>>(
    `/api/trip-drafts/${tripDraftId}/eligible-vehicles`
  );
  return unwrap(res);
}

/**
 * GET /api/drivers/available?date=YYYY-MM-DD
 * Returns all drivers (available=true AND busy=false).
 * DISPATCHER only.
 */
export async function getAvailableDrivers(date: string): Promise<AvailableDriver[]> {
  const res = await axiosInstance.get<ApiResponseWrapper<AvailableDriver[]>>(
    `/api/drivers/available`,
    { params: { date } }
  );
  return unwrap(res);
}

/**
 * GET /api/fleet/capacity-check?date=YYYY-MM-DD
 * DISPATCHER or LOGISTICS_MANAGER.
 */
export async function getFleetCapacityCheck(date: string): Promise<FleetCapacityCheck> {
  const res = await axiosInstance.get<ApiResponseWrapper<FleetCapacityCheck>>(
    `/api/fleet/capacity-check`,
    { params: { date } }
  );
  return unwrap(res);
}

/**
 * POST /api/trip-drafts/{id}/assign
 * Create one Trip from a single vehicle+driver assignment.
 * DISPATCHER only. Returns 201.
 */
export async function assignTrip(
  tripDraftId: number | string,
  request: TripAssignRequest
): Promise<Trip> {
  const res = await axiosInstance.post<ApiResponseWrapper<Trip>>(
    `/api/trip-drafts/${tripDraftId}/assign`,
    request
  );
  return unwrap(res);
}

/**
 * POST /api/trip-drafts/{id}/assign-split
 * Split trip draft into multiple Trips (BR-07).
 * DISPATCHER only. Returns 201.
 */
export async function assignSplitTrips(
  tripDraftId: number | string,
  request: TripSplitAssignRequest
): Promise<TripSplitResult> {
  const res = await axiosInstance.post<ApiResponseWrapper<TripSplitResult>>(
    `/api/trip-drafts/${tripDraftId}/assign-split`,
    request
  );
  return unwrap(res);
}

/**
 * GET /api/trips?tripDraftId={id}
 * Get all Trips created from a TripDraft.
 */
export async function getTripsByTripDraftId(tripDraftId: number | string): Promise<Trip[]> {
  const res = await axiosInstance.get<ApiResponseWrapper<Trip[]>>(
    `/api/trips`,
    { params: { tripDraftId } }
  );
  return unwrap(res);
}

/**
 * GET /api/trips/{tripId}
 * Get Trip detail by ID. Works on page refresh and direct URL open.
 * DISPATCHER, LOGISTICS_MANAGER, WAREHOUSE_STAFF, DRIVER.
 */
export async function getTripById(tripId: number | string): Promise<Trip> {
  const res = await axiosInstance.get<ApiResponseWrapper<Trip>>(
    `/api/trips/${tripId}`
  );
  return unwrap(res);
}

/**
 * POST /api/trips/{tripId}/dispatch
 * Lock and dispatch a VALIDATED trip. DISPATCHER only.
 */
export async function dispatchTrip(tripId: number | string): Promise<Trip> {
  const res = await axiosInstance.post<ApiResponseWrapper<Trip>>(
    `/api/trips/${tripId}/dispatch`
  );
  return unwrap(res);
}

/**
 * GET /api/trips/{tripId}/handover-slip → text/html
 * Bearer token required — open via axiosInstance to carry Authorization header.
 * Opens the HTML in a new browser tab.
 */
export async function openHandoverSlip(tripId: number | string): Promise<void> {
  // Open blank tab immediately (before async call) to avoid popup blocker
  const tab = window.open('about:blank', '_blank');

  try {
    const res = await axiosInstance.get(`/api/trips/${tripId}/handover-slip`, {
      responseType: 'blob',
    });

    const blob = new Blob([res.data as BlobPart], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    if (tab) {
      tab.location.href = url;
    } else {
      // Fallback if popup was blocked: trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `handover-slip-${tripId}.html`;
      a.click();
    }

    // Revoke after 60s to allow the tab to fully load
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (err) {
    // Close the blank tab on error to avoid leaving an empty tab
    if (tab && !tab.closed) {
      tab.close();
    }
    throw err;
  }
}
/**
 * PATCH /api/trips/{id}/assignment
 * Update vehicle and driver for a VALIDATED trip (before dispatch).
 * Fails with TRIP_LOCKED if trip is already DISPATCHED/COMPLETED.
 * DISPATCHER only.
 */
export async function updateTripAssignment(
  tripId: number | string,
  request: TripAssignRequest
): Promise<Trip> {
  const res = await axiosInstance.patch<ApiResponseWrapper<Trip>>(
    `/api/trips/${tripId}/assignment`,
    request
  );
  return unwrap(res);
}

/**
 * GET /api/trips/my-trips?date={date}&status={status}
 * Driver view: get trips assigned to current driver.
 * DRIVER only.
 */
export async function getMyTrips(date: string, status?: string): Promise<Trip[]> {
  const res = await axiosInstance.get<ApiResponseWrapper<Trip[]>>(
    `/api/trips/my-trips`,
    { params: { date, status } }
  );
  return unwrap(res);
}

