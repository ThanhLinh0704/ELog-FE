// API service for US-18 Exception Management
// Uses existing axiosInstance — Bearer token is handled by request interceptor.
// Error format from Backend: { success: false, error: { code, message } }

import axiosInstance from './axiosInstance';
import type {
  DeliveryExceptionResponse,
  ExceptionListResponse,
  RejectStopRequest,
  ResolveExceptionRequest,
  ExceptionFilters,
} from '../types/exception';

interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
}

function unwrap<T>(res: { data: ApiResponseWrapper<T> }): T {
  return res.data.data;
}

// ── Driver rejection ─────────────────────────────────────────────────────────

/**
 * POST /api/trip-stops/{id}/reject
 * Driver records store rejection for an IN_PROGRESS stop.
 * Returns 201 Created on success.
 */
export async function rejectDelivery(
  tripStopId: number,
  request: RejectStopRequest
): Promise<DeliveryExceptionResponse> {
  const res = await axiosInstance.post<ApiResponseWrapper<DeliveryExceptionResponse>>(
    `/api/trip-stops/${tripStopId}/reject`,
    request
  );
  return unwrap(res);
}

// ── Exception list (Dispatcher / Logistics Manager) ──────────────────────────

/**
 * GET /api/exceptions?date=YYYY-MM-DD&type=ALL&resolved=false
 * Backend does NOT support pagination — returns all matching exceptions.
 */
export async function getExceptions(
  filters?: ExceptionFilters
): Promise<ExceptionListResponse> {
  const params: Record<string, string> = {};
  if (filters?.date) params.date = filters.date;
  if (filters?.type) params.type = filters.type;
  if (filters?.resolved) params.resolved = filters.resolved;

  const res = await axiosInstance.get<ApiResponseWrapper<ExceptionListResponse>>(
    '/api/exceptions',
    { params }
  );
  return unwrap(res);
}

// ── Exception detail ─────────────────────────────────────────────────────────

/**
 * GET /api/exceptions/{id}
 * Returns full detail of a single exception.
 */
export async function getExceptionById(
  exceptionId: number
): Promise<DeliveryExceptionResponse> {
  const res = await axiosInstance.get<ApiResponseWrapper<DeliveryExceptionResponse>>(
    `/api/exceptions/${exceptionId}`
  );
  return unwrap(res);
}

// ── Resolve exception ────────────────────────────────────────────────────────

/**
 * PATCH /api/exceptions/{id}/resolve
 * Dispatcher or Logistics Manager closes an exception.
 */
export async function resolveException(
  exceptionId: number,
  request: ResolveExceptionRequest
): Promise<DeliveryExceptionResponse> {
  const res = await axiosInstance.patch<ApiResponseWrapper<DeliveryExceptionResponse>>(
    `/api/exceptions/${exceptionId}/resolve`,
    request
  );
  return unwrap(res);
}
