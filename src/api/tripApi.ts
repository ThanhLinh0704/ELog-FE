// API service for US-15 (Vehicle Assignment), US-16 (Dispatch Execution)
// & FT-09 (Driver Trip Execution — new flow)
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
import type { DriverTripExecution, UpdateOrderResultPayload } from '../types/driverTrip';
import type { TripOutcome } from '../types/tripOutcome';

interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
}

function unwrap<T>(res: { data: ApiResponseWrapper<T> }): T {
  return res.data.data;
}

/**
 * GET /api/v1/trip-drafts/{id}/eligible-vehicles
 * Returns both eligible and ineligible vehicles in a single response wrapper.
 * DISPATCHER only.
 */
export async function getEligibleVehicles(
  tripDraftId: number | string
): Promise<EligibleVehiclesResponse> {
  const res = await axiosInstance.get<ApiResponseWrapper<EligibleVehiclesResponse>>(
    `/api/v1/trip-drafts/${tripDraftId}/eligible-vehicles`
  );
  const data = unwrap(res);
  return {
    eligibleVehicles: (data.eligibleVehicles || []).map((v: any) => ({
      ...v,
      payloadKg: Number(v.payloadKg ?? v.maxWeightKg ?? v.max_weight_kg ?? 0),
    })),
    ineligibleVehicles: (data.ineligibleVehicles || []).map((v: any) => ({
      ...v,
      payloadKg: Number(v.payloadKg ?? v.maxWeightKg ?? v.max_weight_kg ?? 0),
    })),
  };
}

/**
 * GET /api/v1/trip-drafts/{id}/eligible-vehicles-for-stops?stopIds=1,2,3
 * Same response shape as getEligibleVehicles, but capacity is computed only against
 * the given subset of stops — used when Dispatcher manually builds a BR-07 split
 * group from scratch (no recommendation prefill), where whole-route eligibility
 * would never list a vehicle sized for just one sub-group.
 * DISPATCHER only.
 */
export async function getEligibleVehiclesForStops(
  tripDraftId: number | string,
  stopIds: number[]
): Promise<EligibleVehiclesResponse> {
  const res = await axiosInstance.get<ApiResponseWrapper<EligibleVehiclesResponse>>(
    `/api/v1/trip-drafts/${tripDraftId}/eligible-vehicles-for-stops`,
    { params: { stopIds: stopIds.join(',') } }
  );
  const data = unwrap(res);
  return {
    eligibleVehicles: (data.eligibleVehicles || []).map((v: any) => ({
      ...v,
      payloadKg: Number(v.payloadKg ?? v.maxWeightKg ?? v.max_weight_kg ?? 0),
    })),
    ineligibleVehicles: (data.ineligibleVehicles || []).map((v: any) => ({
      ...v,
      payloadKg: Number(v.payloadKg ?? v.maxWeightKg ?? v.max_weight_kg ?? 0),
    })),
  };
}

/**
 * GET /api/v1/drivers/available?date=YYYY-MM-DD
 * Returns all drivers (available=true AND busy=false).
 * DISPATCHER only.
 */
export async function getAvailableDrivers(date: string): Promise<AvailableDriver[]> {
  const res = await axiosInstance.get<ApiResponseWrapper<AvailableDriver[]>>(
    `/api/v1/drivers/available`,
    { params: { date } }
  );
  return unwrap(res);
}

/**
 * GET /api/v1/fleet/capacity-check?date=YYYY-MM-DD
 * DISPATCHER or LOGISTICS_MANAGER.
 */
export async function getFleetCapacityCheck(date: string): Promise<FleetCapacityCheck> {
  const res = await axiosInstance.get<ApiResponseWrapper<FleetCapacityCheck>>(
    `/api/v1/fleet/capacity-check`,
    { params: { date } }
  );
  return unwrap(res);
}

/**
 * POST /api/v1/trip-drafts/{id}/assign
 * Create one Trip from a single vehicle+driver assignment.
 * DISPATCHER only. Returns 201.
 */
export async function assignTrip(
  tripDraftId: number | string,
  request: TripAssignRequest
): Promise<Trip> {
  const res = await axiosInstance.post<ApiResponseWrapper<Trip>>(
    `/api/v1/trip-drafts/${tripDraftId}/assign`,
    request
  );
  return unwrap(res);
}

/**
 * POST /api/v1/trip-drafts/{id}/assign-split
 * Split trip draft into multiple Trips (BR-07).
 * DISPATCHER only. Returns 201.
 */
export async function assignSplitTrips(
  tripDraftId: number | string,
  request: TripSplitAssignRequest
): Promise<TripSplitResult> {
  const res = await axiosInstance.post<ApiResponseWrapper<TripSplitResult>>(
    `/api/v1/trip-drafts/${tripDraftId}/assign-split`,
    request
  );
  return unwrap(res);
}

/**
 * GET /api/v1/trips?tripDraftId={id}
 * Get all Trips created from a TripDraft.
 */
export async function getTripsByTripDraftId(tripDraftId: number | string): Promise<Trip[]> {
  const res = await axiosInstance.get<ApiResponseWrapper<Trip[]>>(
    `/api/v1/trips`,
    { params: { tripDraftId } }
  );
  return unwrap(res);
}

/**
 * GET /api/v1/trips/{tripId}
 * Get Trip detail by ID. Works on page refresh and direct URL open.
 * DISPATCHER, LOGISTICS_MANAGER, WAREHOUSE_STAFF, DRIVER.
 */
export async function getTripById(tripId: number | string): Promise<Trip> {
  const res = await axiosInstance.get<ApiResponseWrapper<Trip>>(
    `/api/v1/trips/${tripId}`
  );
  return unwrap(res);
}

/**
 * POST /api/v1/trips/{tripId}/dispatch
 * Lock and dispatch a VALIDATED trip. DISPATCHER only.
 */
export async function dispatchTrip(tripId: number | string): Promise<Trip> {
  const res = await axiosInstance.post<ApiResponseWrapper<Trip>>(
    `/api/v1/trips/${tripId}/dispatch`
  );
  return unwrap(res);
}

/**
 * GET /api/v1/trips/{tripId}/handover-slip → text/html
 * Bearer token required — open via axiosInstance to carry Authorization header.
 * Opens the HTML in a new browser tab.
 */
export async function openHandoverSlip(tripId: number | string): Promise<void> {
  // Open blank tab immediately (before async call) to avoid popup blocker
  const tab = window.open('about:blank', '_blank');

  try {
    const res = await axiosInstance.get(`/api/v1/trips/${tripId}/handover-slip`, {
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
 * PATCH /api/v1/trips/{id}/assignment
 * Update vehicle and driver for a VALIDATED trip (before dispatch).
 * Fails with TRIP_LOCKED if trip is already DISPATCHED/COMPLETED.
 * DISPATCHER only.
 */
export async function updateTripAssignment(
  tripId: number | string,
  request: TripAssignRequest
): Promise<Trip> {
  const res = await axiosInstance.patch<ApiResponseWrapper<Trip>>(
    `/api/v1/trips/${tripId}/assignment`,
    request
  );
  return unwrap(res);
}

/**
 * GET /api/v1/trips/my-trips?date={date}&status={status}
 * Driver view: get trips assigned to current driver.
 * DRIVER only.
 */
export async function getMyTrips(date: string, status?: string): Promise<Trip[]> {
  const res = await axiosInstance.get<ApiResponseWrapper<Trip[]>>(
    `/api/v1/trips/my-trips`,
    { params: { date, status } }
  );
  return unwrap(res);
}

// ── NEW Driver Execution APIs (FT-09) ────────────────────────────────────────
// These call /api/v1/driver/trips/* endpoints served by DriverTripController.
// Authorization: trip:read / trip:write via Bearer JWT — driver ID taken from token.

/**
 * GET /api/v1/driver/trips/active
 * Returns the active TripExecution for the logged-in Driver (from JWT).
 * Returns null if no active trip exists (data: null in response).
 */
export async function getActiveTrip(): Promise<DriverTripExecution | null> {
  try {
    const res = await axiosInstance.get<ApiResponseWrapper<DriverTripExecution | null>>(
      '/api/v1/driver/trips/active'
    );
    return res.data.data ?? null;
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

/**
 * POST /api/v1/driver/trips/{executionId}/start
 * Transitions TripExecution from ASSIGNED -> IN_PROGRESS.
 * Returns updated DriverTripResponse.
 */
export async function startExecution(executionId: number): Promise<DriverTripExecution> {
  const res = await axiosInstance.post<ApiResponseWrapper<DriverTripExecution>>(
    `/api/v1/driver/trips/${executionId}/start`
  );
  return unwrap(res);
}

/**
 * PUT /api/v1/driver/trips/{executionId}/orders/{orderId}/result
 * Update delivery result for a single Order.
 * reasonCode required when status is PARTIALLY_DELIVERED or FAILED.
 * Returns updated DriverTripResponse (full state refresh).
 */
export async function updateOrderResult(
  executionId: number,
  orderId: number,
  payload: UpdateOrderResultPayload
): Promise<DriverTripExecution> {
  const res = await axiosInstance.put<ApiResponseWrapper<DriverTripExecution>>(
    `/api/v1/driver/trips/${executionId}/orders/${orderId}/result`,
    payload
  );
  return unwrap(res);
}

/**
 * POST /api/v1/driver/trips/{executionId}/complete
 * Complete the trip — only allowed when pendingOrdersCount == 0.
 * Returns TripOutcomeResponse with status SUBMITTED.
 */
export async function completeExecution(executionId: number): Promise<TripOutcome> {
  const res = await axiosInstance.post<ApiResponseWrapper<TripOutcome>>(
    `/api/v1/driver/trips/${executionId}/complete`
  );
  return unwrap(res);
}

/**
 * POST /api/v1/driver/trips/{executionId}/return-to-warehouse
 * Driver confirms vehicle has returned to warehouse, transitioning vehicle status from IN_USE to AVAILABLE.
 * Returns updated DriverTripExecution.
 */
export async function returnToWarehouse(executionId: number): Promise<DriverTripExecution> {
  const res = await axiosInstance.post<ApiResponseWrapper<DriverTripExecution>>(
    `/api/v1/driver/trips/${executionId}/return-to-warehouse`
  );
  return unwrap(res);
}


