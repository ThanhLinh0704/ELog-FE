import axiosInstance from './axiosInstance';

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
  startTime: string;
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

function normalizeStatus(value: unknown): TripDraftStopStatus {
  return String(value || 'ACTIVE').toUpperCase() === 'SKIPPED' ? 'SKIPPED' : 'ACTIVE';
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

  return {
    id: toNumber(stop.id ?? stop.stopId ?? stop.stop_id),
    sequenceNo: toNumber(stop.sequenceNo ?? stop.sequence_no ?? stop.sequence),
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
    weightKg: toNumber(stop.weightKg ?? stop.weight_kg),
    volumeM3: toNumber(stop.volumeM3 ?? stop.volume_m3),
    status: normalizeStatus(stop.status),
    eta: stop.eta ? String(stop.eta) : null,
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

  return {
    id: toNumber(draft.id ?? draft.draftId ?? draft.draft_id),
    draftCode: String(draft.draftCode ?? draft.draft_code ?? ''),
    status: String(draft.status ?? 'DRAFT').toUpperCase(),
    warehouseName: String(draft.warehouseName ?? draft.warehouse_name ?? ''),
    vehicle: normalizeVehicle(draft.vehicle),
    totalOrders: toNumber(draft.totalOrders ?? draft.total_orders),
    totalWeightKg: toNumber(draft.totalWeightKg ?? draft.total_weight_kg),
    totalVolumeM3: toNumber(draft.totalVolumeM3 ?? draft.total_volume_m3),
    estimatedDistanceKm: toNumber(
      draft.estimatedDistanceKm ?? draft.estimated_distance_km
    ),
    estimatedDurationMin: toNumber(
      draft.estimatedDurationMin ?? draft.estimated_duration_min
    ),
    stops: rawStops.map(normalizeStop).sort((a, b) => a.sequenceNo - b.sequenceNo),
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

export function getTripDraftApiStatus(err: unknown): number | undefined {
  const apiError = err as ApiErrorLike;
  return apiError?.response?.status;
}

export function getApiErrorMessage(
  err: unknown,
  fallback = 'Co loi xay ra, vui long thu lai.'
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
