import axiosInstance from './axiosInstance';
import type { TripDraft, ConsolidateResponse, CapacityValidationResult } from '../types/tripDraft';

// --- Types from US-11 ---
export type TripDraftStatus = 'DRAFT' | 'PLANNED' | 'CONFIRMED' | 'CANCELLED' | string;
export type TripDraftStopStatus = 'ACTIVE' | 'SKIPPED';

export interface TripDraftVehicle {
  id: number;
  plateNumber: string;
  vehicleType: string;
}

export interface TripDraftStop {
  id: number;
  sequenceNo: number;
  storeId: number;
  storeCode: string;
  storeName: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  orderCount: number;
  weightKg: number;
  volumeM3: number;
  status: TripDraftStopStatus;
  eta: string | null;
  estimatedTravelMin: number | null;
  estimatedDistanceKm: number | null;
}

export interface TripDraftDetail {
  id: number;
  draftCode: string;
  status: TripDraftStatus;
  warehouseName: string;
  vehicle: TripDraftVehicle | null;
  totalOrders: number;
  totalWeightKg: number;
  totalVolumeM3: number;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  stops: TripDraftStop[];
  plannedDepartureTime?: string | null;
  deliveryDate: string;
}

export interface TripDraftListItem {
  id: number;
  draftCode: string;
  status: TripDraftStatus;
  warehouseName: string;
  vehicle: TripDraftVehicle | null;
  totalOrders: number;
  totalWeightKg: number;
  totalVolumeM3: number;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  activeStopCount: number;
  skippedStopCount: number;
}

export interface ToggleStopStatusPayload {
  status: TripDraftStopStatus;
}

export interface RecalculateEtaPayload {
  plannedDepartureTime: string;
}

export interface ConfirmTripDraftPayload {
  confirmNote: string;
}

export interface ConfirmTripDraftResult {
  tripId: number;
  tripCode: string;
  status: string;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
}

interface ApiErrorBody {
  error?: {
    details?: string[];
    message?: string;
  };
  message?: string;
}

interface ApiErrorLike {
  response?: {
    status?: number;
    data?: ApiErrorBody;
  };
  body?: ApiErrorBody;
  message?: string;
}

// --- Helpers from US-11 & US-10 ---
function unwrapApiResponse<T>(responseBody: ApiResponse<T> | T): T {
  if (
    responseBody &&
    typeof responseBody === 'object' &&
    'data' in responseBody
  ) {
    return (responseBody as ApiResponse<T>).data as T;
  }
  return responseBody as T;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}


function normalizeVehicle(raw: unknown): TripDraftVehicle | null {
  if (!raw || typeof raw !== 'object') return null;
  const vehicle = raw as Record<string, unknown>;
  return {
    id: toNumber(vehicle.id ?? vehicle.vehicleId ?? vehicle.vehicle_id),
    plateNumber: String(vehicle.plateNumber ?? vehicle.plate_number ?? ''),
    vehicleType: String(vehicle.vehicleType ?? vehicle.vehicle_type ?? ''),
  };
}

function normalizeStop(raw: unknown): TripDraftStop {
  const stop = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const idVal = stop.tripDraftStopId ?? stop.id ?? stop.stopId ?? stop.stop_id;
  const seqVal = stop.sequenceNo ?? stop.sequence_no ?? stop.sequence;
  const weightVal = stop.stopWeightKg ?? stop.weightKg ?? stop.weight_kg ?? 0;
  const volumeVal = stop.stopVolumeM3 ?? stop.volumeM3 ?? stop.volume_m3 ?? 0;
  const etaVal = stop.plannedEta ?? stop.eta ?? null;
  const isActiveVal = stop.isActive;

  let statusVal: TripDraftStopStatus = 'ACTIVE';
  if (isActiveVal === false || String(stop.status).toUpperCase() === 'SKIPPED') {
    statusVal = 'SKIPPED';
  }

  return {
    id: toNumber(idVal),
    sequenceNo: toNumber(seqVal),
    storeId: toNumber(stop.storeId ?? stop.store_id),
    storeCode: String(stop.storeCode ?? stop.store_code ?? ''),
    storeName: String(stop.storeName ?? stop.store_name ?? ''),
    address: String(stop.address ?? ''),
    latitude:
      stop.latitude === null || stop.latitude === undefined
        ? null
        : toNumber(stop.latitude),
    longitude:
      stop.longitude === null || stop.longitude === undefined
        ? null
        : toNumber(stop.longitude),
    orderCount: toNumber(stop.orderCount ?? stop.order_count),
    weightKg: toNumber(weightVal),
    volumeM3: toNumber(volumeVal),
    status: statusVal,
    eta: etaVal ? String(etaVal) : null,
    estimatedTravelMin:
      stop.estimatedTravelMin === null && stop.estimated_travel_min === null
        ? null
        : stop.estimatedTravelMin === undefined && stop.estimated_travel_min === undefined
          ? null
          : toNumber(stop.estimatedTravelMin ?? stop.estimated_travel_min),
    estimatedDistanceKm:
      stop.estimatedDistanceKm === null && stop.estimated_distance_km === null
        ? null
        : stop.estimatedDistanceKm === undefined && stop.estimated_distance_km === undefined
          ? null
          : toNumber(stop.estimatedDistanceKm ?? stop.estimated_distance_km),
  };
}

function normalizeTripDraft(raw: unknown): TripDraftDetail {
  const draft = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const rawStops = Array.isArray(draft.stops) ? draft.stops : [];
  const normalizedStops = rawStops.map(normalizeStop).sort((a, b) => a.sequenceNo - b.sequenceNo);
  
  const totalOrdersVal = draft.totalOrders ?? draft.total_orders ?? normalizedStops.reduce((sum, s) => sum + s.orderCount, 0);

  return {
    id: toNumber(draft.id ?? draft.draftId ?? draft.draft_id),
    draftCode: String(draft.draftCode ?? draft.draft_code ?? draft.routeCode ?? ''),
    status: String(draft.status ?? 'DRAFT').toUpperCase(),
    warehouseName: String(draft.warehouseName ?? draft.warehouse_name ?? ''),
    deliveryDate: String(draft.deliveryDate ?? draft.delivery_date ?? ''),
    vehicle: normalizeVehicle(draft.vehicle),
    totalOrders: toNumber(totalOrdersVal),
    totalWeightKg: toNumber(draft.totalWeightKg ?? draft.total_weight_kg),
    totalVolumeM3: toNumber(draft.totalVolumeM3 ?? draft.total_volume_m3),
    estimatedDistanceKm: toNumber(
      draft.estimatedDistanceKm ?? draft.estimated_distance_km
    ),
    estimatedDurationMin: toNumber(
      draft.estimatedDurationMin ?? draft.estimated_duration_min
    ),
    stops: normalizedStops,
    plannedDepartureTime: draft.plannedDepartureTime ? String(draft.plannedDepartureTime) : null,
  };
}

function normalizeTripDraftListItem(raw: unknown): TripDraftListItem {
  const draft = normalizeTripDraft(raw);
  const activeStopCount = draft.stops.filter((stop) => stop.status === 'ACTIVE').length;
  return {
    id: draft.id,
    draftCode: draft.draftCode,
    status: draft.status,
    warehouseName: draft.warehouseName,
    vehicle: draft.vehicle,
    totalOrders: draft.totalOrders,
    totalWeightKg: draft.totalWeightKg,
    totalVolumeM3: draft.totalVolumeM3,
    estimatedDistanceKm: draft.estimatedDistanceKm,
    estimatedDurationMin: draft.estimatedDurationMin,
    activeStopCount,
    skippedStopCount: draft.stops.length - activeStopCount,
  };
}

export class ApiError extends Error {
  status?: number;
  body?: any;

  constructor(message: string, status?: number, body?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function handleAxiosCall<T>(call: () => Promise<any>): Promise<T> {
  try {
    const response = await call();
    return response.data;
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const body = error.response.data;
      const message = body?.message || body?.error?.message || `API error ${status}`;
      throw new ApiError(message, status, body);
    }
    throw new ApiError(error.message || 'Network Error');
  }
}

// --- Named exports from US-11 ---
export function getTripDraftApiStatus(err: unknown): number | undefined {
  const apiError = err as ApiErrorLike;
  return apiError?.response?.status;
}

export function getApiErrorMessage(
  err: unknown,
  fallback = 'Có lỗi xảy ra, vui lòng thử lại.'
): string {
  const apiError = err as ApiErrorLike;
  return (
    apiError?.response?.data?.error?.details?.[0] ||
    apiError?.response?.data?.error?.message ||
    apiError?.response?.data?.message ||
    apiError?.body?.error?.details?.[0] ||
    apiError?.body?.error?.message ||
    apiError?.body?.message ||
    apiError?.message ||
    fallback
  );
}

export async function getTripDraft(draftId: string | number): Promise<TripDraftDetail> {
  const response = await axiosInstance.get<ApiResponse<TripDraftDetail>>(
    `/api/trip-drafts/${draftId}`
  );
  return normalizeTripDraft(unwrapApiResponse(response.data));
}

export async function getTripDrafts(): Promise<TripDraftListItem[]> {
  const response = await axiosInstance.get<ApiResponse<TripDraftDetail[]> | TripDraftDetail[]>(
    '/api/trip-drafts'
  );
  const data = unwrapApiResponse(response.data);
  const listPayload = data as
    | TripDraftDetail[]
    | {
        content?: TripDraftDetail[];
        items?: TripDraftDetail[];
        tripDrafts?: TripDraftDetail[];
      };
  const drafts = Array.isArray(listPayload)
    ? listPayload
    : listPayload.content ?? listPayload.items ?? listPayload.tripDrafts ?? [];
  return drafts.map(normalizeTripDraftListItem);
}

export async function updateStopStatus(
  draftId: string | number,
  stopId: string | number,
  status: TripDraftStopStatus
): Promise<TripDraftStop> {
  const payload: ToggleStopStatusPayload = { status };
  const response = await axiosInstance.patch<ApiResponse<TripDraftStop>>(
    `/api/trip-drafts/${draftId}/stops/${stopId}/status`,
    payload
  );
  return normalizeStop(unwrapApiResponse(response.data));
}

export async function recalculateEta(
  draftId: string | number,
  payload: RecalculateEtaPayload
): Promise<Pick<TripDraftDetail, 'estimatedDistanceKm' | 'estimatedDurationMin' | 'stops'>> {
  const response = await axiosInstance.post<
    ApiResponse<Pick<TripDraftDetail, 'estimatedDistanceKm' | 'estimatedDurationMin' | 'stops'>>
  >(`/api/trip-drafts/${draftId}/recalculate-eta`, payload);
  const data = unwrapApiResponse(response.data);
  const normalized = normalizeTripDraft(data);
  return {
    estimatedDistanceKm: normalized.estimatedDistanceKm,
    estimatedDurationMin: normalized.estimatedDurationMin,
    stops: normalized.stops,
  };
}

export async function confirmTripDraft(
  draftId: string | number,
  payload: ConfirmTripDraftPayload
): Promise<ConfirmTripDraftResult> {
  const response = await axiosInstance.post<ApiResponse<ConfirmTripDraftResult>>(
    `/api/trip-drafts/${draftId}/confirm`,
    payload
  );
  const data = unwrapApiResponse(response.data) as Partial<ConfirmTripDraftResult>;
  return {
    tripId: toNumber(data.tripId),
    tripCode: String(data.tripCode ?? ''),
    status: String(data.status ?? ''),
  };
}

// --- Object export for US-10/12 ---
export const tripDraftApi = {
  async consolidate(deliveryDate: string): Promise<ConsolidateResponse> {
    const res = await handleAxiosCall<any>(() =>
      axiosInstance.post('/api/trip-drafts/consolidate', { deliveryDate })
    );
    return res.data;
  },

  async getTripDrafts(params: {
    deliveryDate: string;
    page: number;
    size: number;
  }): Promise<{ content: TripDraft[]; totalElements: number; totalPages: number }> {
    const query = new URLSearchParams();
    query.set('deliveryDate', params.deliveryDate);
    query.set('page', String(params.page));
    query.set('size', String(params.size));
    query.set('sort', 'route.code,asc');

    const res = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/trip-drafts?${query.toString()}`)
    );

    return {
      content: res?.data || [],
      totalElements: res?.pagination?.totalElements ?? 0,
      totalPages: res?.pagination?.totalPages ?? 0,
    };
  },

  async getTripDraftById(id: number): Promise<TripDraft> {
    const res = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/trip-drafts/${id}`)
    );
    return res.data;
  },

  async getCapacityValidationResult(tripDraftId: number | string): Promise<CapacityValidationResult> {
    const res = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/trip-drafts/${tripDraftId}/validation-result`)
    );
    return res.data;
  },

  async validateTripDraftCapacity(tripDraftId: number | string): Promise<CapacityValidationResult> {
    const res = await handleAxiosCall<any>(() =>
      axiosInstance.post(`/api/trip-drafts/${tripDraftId}/validate-capacity`)
    );
    return res.data;
  },

  async revertTripDraft(id: number | string): Promise<{ success: boolean; message: string }> {
    const res = await axiosInstance.post<{ success: boolean; message: string }>(
      `/api/trip-drafts/${id}/revert`
    );
    return res.data;
  }
};

export interface StopOrderItem {
  orderRef: string;
  sku: string;
  productName: string;
  quantity: number;
  weightKg: number;
  volumeM3: number;
}

export async function getStopOrderItems(
  draftId: string | number,
  stopId: string | number
): Promise<StopOrderItem[]> {
  const response = await axiosInstance.get<ApiResponse<StopOrderItem[]>>(
    `/api/trip-drafts/${draftId}/stops/${stopId}/order-items`
  );
  return unwrapApiResponse(response.data);
}

