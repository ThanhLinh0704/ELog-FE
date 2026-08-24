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
 * POST /api/v1/trip-stops/{id}/reject
 * Driver records store rejection for an IN_PROGRESS stop.
 * Returns 201 Created on success.
 */
export async function rejectDelivery(
  tripStopId: number,
  request: RejectStopRequest
): Promise<DeliveryExceptionResponse> {
  const res = await axiosInstance.post<ApiResponseWrapper<DeliveryExceptionResponse>>(
    `/api/v1/trip-stops/${tripStopId}/reject`,
    request
  );
  return unwrap(res);
}

// ── Exception list (Dispatcher / Logistics Manager) ──────────────────────────

/**
 * GET /api/v1/exceptions?date=YYYY-MM-DD&type=ALL&resolved=false
 * or GET /api/v1/exceptions?fromDate=...&toDate=...&type=ALL&resolved=false
 * Backend does NOT support pagination — returns all matching exceptions.
 */
export async function getExceptions(
  filters?: ExceptionFilters
): Promise<ExceptionListResponse> {
  const params: Record<string, string> = {};
  if (filters?.fromDate && filters?.toDate) {
    params.fromDate = filters.fromDate;
    params.toDate = filters.toDate;
  } else if (filters?.date) {
    params.date = filters.date;
  }
  if (filters?.type) params.type = filters.type;
  if (filters?.resolved) params.resolved = filters.resolved;

  const res = await axiosInstance.get<ApiResponseWrapper<ExceptionListResponse>>(
    '/api/v1/exceptions',
    { params }
  );
  return unwrap(res);
}

// ── Exception detail ─────────────────────────────────────────────────────────

/**
 * GET /api/v1/exceptions/{id}
 * Returns full detail of a single exception.
 */
export async function getExceptionById(
  exceptionId: number
): Promise<DeliveryExceptionResponse> {
  const res = await axiosInstance.get<ApiResponseWrapper<DeliveryExceptionResponse>>(
    `/api/v1/exceptions/${exceptionId}`
  );
  return unwrap(res);
}

// ── Resolve exception ────────────────────────────────────────────────────────

/**
 * PATCH /api/v1/exceptions/{id}/resolve
 * Dispatcher or Logistics Manager closes an exception.
 */
export async function resolveException(
  exceptionId: number,
  request: ResolveExceptionRequest
): Promise<DeliveryExceptionResponse> {
  const res = await axiosInstance.patch<ApiResponseWrapper<DeliveryExceptionResponse>>(
    `/api/v1/exceptions/${exceptionId}/resolve`,
    request
  );
  return unwrap(res);
}

// ── Operational Violations ───────────────────────────────────────────────────

export interface OperationalViolation {
  id: number;
  type: string;
  storeCode: string;
  storeName?: string;
  description: string;
  delayMinutes?: number | null;
  createdAt?: string;
}

/**
 * GET /api/v1/exceptions/violations?date=YYYY-MM-DD
 * Returns operational violations for the date (currently: unresolved TIME_EXCEPTION only —
 * see ExceptionController#listViolations). Backend wraps the list in the same
 * ExceptionListResponse envelope as GET /exceptions (`{ ..., exceptions: [...] }`), not a bare
 * array — unwrap `.exceptions` here so callers get a flat list as the name implies.
 */
export async function getOperationalViolations(
  date?: string
): Promise<OperationalViolation[]> {
  const params: Record<string, string> = {};
  if (date) params.date = date;

  const res = await axiosInstance.get<ApiResponseWrapper<ExceptionListResponse>>(
    '/api/v1/exceptions/violations',
    { params }
  );
  const list = unwrap(res).exceptions ?? [];
  return list.map((item) => ({
    id: item.exceptionId,
    type: item.exceptionType,
    storeCode: item.storeCode ?? '—',
    storeName: item.storeName ?? undefined,
    description: item.description ?? '',
    delayMinutes: item.delayMinutes,
    createdAt: item.createdAt,
  }));
}

