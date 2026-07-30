// API service for Trip Outcome (TripOutcomeController)
// Endpoints: GET /api/trip-outcomes, POST /api/trip-outcomes/{id}/validate,
//            POST /api/trip-outcomes/{id}/amend?amendmentReason=...
// Authorization: Bearer JWT (DISPATCHER / LOGISTICS_MANAGER roles)

import axiosInstance from './axiosInstance';
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
 * GET /api/trip-outcomes
 * Returns all submitted TripOutcomes for the Dispatcher/Manager to review.
 * No pagination params — BE returns all SUBMITTED outcomes.
 */
export async function getTripOutcomes(): Promise<TripOutcome[]> {
  const res = await axiosInstance.get<ApiResponseWrapper<TripOutcome[]>>(
    '/api/trip-outcomes'
  );
  return unwrap(res);
}

/**
 * POST /api/trip-outcomes/{id}/validate
 * Marks a TripOutcome as VALIDATED. No request body required.
 */
export async function validateOutcome(id: number): Promise<TripOutcome> {
  const res = await axiosInstance.post<ApiResponseWrapper<TripOutcome>>(
    `/api/trip-outcomes/${id}/validate`
  );
  return unwrap(res);
}

/**
 * POST /api/trip-outcomes/{id}/amend?amendmentReason=...
 * Sends the outcome back for amendment with a reason.
 * NOTE: amendmentReason is a @RequestParam (query string), NOT a request body.
 */
export async function amendOutcome(
  id: number,
  amendmentReason: string
): Promise<TripOutcome> {
  const res = await axiosInstance.post<ApiResponseWrapper<TripOutcome>>(
    `/api/trip-outcomes/${id}/amend`,
    undefined,    // no request body
    { params: { amendmentReason } }
  );
  return unwrap(res);
}
