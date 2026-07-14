import axios, { type AxiosError } from 'axios';
import axiosInstance from './axiosInstance';

export type ManifestStatus = 'NOT_GENERATED' | 'GENERATED';
export type LoadingStatus = 'PENDING' | 'LOADING' | 'LOADED' | 'SKIPPED' | 'EXCEPTION';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
  error?: {
    code?: string;
    message?: string;
    details?: string[];
  };
}

export interface LoadingManifestUser {
  userId: number;
  fullName: string;
}

export interface LoadingManifestVehicle {
  vehicleId?: number;
  plateNumber?: string;
  vehicleType?: string;
  maxWeightKg?: number;
  maxVolumeM3?: number;
}

export interface LoadingManifestSummary {
  activeStopCount?: number;
  orderCount?: number;
  itemCount?: number;
  packageCount?: number;
  totalWeightKg: number;
  totalVolumeM3: number;
  weightUtilizationPercent?: number;
  volumeUtilizationPercent?: number;
}

export interface LoadingManifestItem {
  manifestItemId?: number;
  lifoSequence: number;
  loadSequence?: number;
  stopSequenceNo: number;
  deliverySequence?: number;
  storeCode?: string;
  storeName?: string;
  orderCode?: string;
  productCode: string;
  productName: string;
  category?: string;
  quantity: number;
  packageCode?: string;
  unitWeightKg?: number;
  unitVolumeM3?: number;
  lineWeightKg: number;
  lineVolumeM3: number;
  loadingZone?: string;
  loadingStatus?: LoadingStatus;
  loadingNote?: string;
  note?: string | null;
}

export interface LoadingManifestStop {
  stopId?: number;
  stopSequenceNo: number;
  deliverySequence?: number;
  loadingGroupSequence?: number;
  storeId?: number;
  storeCode: string;
  storeName: string;
  address?: string;
  eta?: string;
  loadingInstruction?: string;
  loadingNote?: string;
  orderCount?: number;
  itemCount?: number;
  totalWeightKg?: number;
  totalVolumeM3?: number;
  stopWeightKg?: number;
  stopVolumeM3?: number;
  hasCoordinates?: boolean;
  isActive?: boolean;
  items: LoadingManifestItem[];
}

export interface LoadingManifest {
  manifestId: number;
  tripDraftId: number;
  tripId?: number;
  manifestCode?: string;
  fixedRouteCode: string;
  deliveryDate: string;
  status?: ManifestStatus;
  generatedAt?: string;
  confirmedAt?: string | null;
  generatedBy?: LoadingManifestUser;
  vehicle?: LoadingManifestVehicle;
  driver?: LoadingManifestUser;
  totalLines: number;
  totalWeightKg: number;
  totalVolumeM3: number;
  summary?: LoadingManifestSummary;
  lines: LoadingManifestItem[];
  stops?: LoadingManifestStop[];
}

export interface GenerateManifestRequest {
  generationMode?: 'LIFO';
  note?: string;
}

export interface RegenerateManifestRequest {
  reason: string;
}

export interface ConfirmManifestRequest {
  confirmNote?: string;
}

export interface ManifestFlatItemsParams {
  page?: number;
  size?: number;
  sort?: string;
}

type ApiEnvelope<T> = ApiResponse<T> | T;

const unwrapData = <T>(response: ApiEnvelope<T>): T => {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as ApiResponse<T>).data;
  }
  return response as T;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const toStringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const normalizeLine = (raw: unknown): LoadingManifestItem => {
  const item = isRecord(raw) ? raw : {};
  const lifoSequence = toNumber(item.lifoSequence ?? item.loadSequence);
  const stopSequenceNo = toNumber(item.stopSequenceNo ?? item.deliverySequence);

  return {
    manifestItemId: toNumber(item.manifestItemId, undefined as unknown as number),
    lifoSequence,
    loadSequence: lifoSequence,
    stopSequenceNo,
    deliverySequence: stopSequenceNo,
    storeCode: toStringValue(item.storeCode),
    storeName: toStringValue(item.storeName),
    orderCode: toStringValue(item.orderCode),
    productCode: toStringValue(item.productCode),
    productName: toStringValue(item.productName),
    category: toStringValue(item.category),
    quantity: toNumber(item.quantity),
    packageCode: toStringValue(item.packageCode),
    unitWeightKg: toNumber(item.unitWeightKg),
    unitVolumeM3: toNumber(item.unitVolumeM3),
    lineWeightKg: toNumber(item.lineWeightKg ?? item.weightKg),
    lineVolumeM3: toNumber(item.lineVolumeM3 ?? item.volumeM3),
    loadingZone: toStringValue(item.loadingZone),
    loadingStatus: (toStringValue(item.loadingStatus, 'PENDING') || 'PENDING') as LoadingStatus,
    loadingNote: toStringValue(item.loadingNote),
    note: typeof item.note === 'string' ? item.note : null,
  };
};

const normalizeStop = (raw: unknown): LoadingManifestStop => {
  const stop = isRecord(raw) ? raw : {};
  const items = Array.isArray(stop.items) ? stop.items.map(normalizeLine) : [];
  const stopWeightKg = toNumber(stop.stopWeightKg ?? stop.totalWeightKg);
  const stopVolumeM3 = toNumber(stop.stopVolumeM3 ?? stop.totalVolumeM3);

  return {
    stopId: toNumber(stop.stopId, undefined as unknown as number),
    stopSequenceNo: toNumber(stop.stopSequenceNo ?? stop.deliverySequence),
    deliverySequence: toNumber(stop.deliverySequence ?? stop.stopSequenceNo),
    loadingGroupSequence: toNumber(stop.loadingGroupSequence),
    storeId: toNumber(stop.storeId, undefined as unknown as number),
    storeCode: toStringValue(stop.storeCode),
    storeName: toStringValue(stop.storeName),
    address: toStringValue(stop.address),
    eta: toStringValue(stop.eta),
    loadingInstruction: toStringValue(stop.loadingInstruction),
    loadingNote: toStringValue(stop.loadingNote),
    orderCount: toNumber(stop.orderCount),
    itemCount: toNumber(stop.itemCount, items.length),
    totalWeightKg: stopWeightKg,
    totalVolumeM3: stopVolumeM3,
    stopWeightKg,
    stopVolumeM3,
    hasCoordinates: typeof stop.hasCoordinates === 'boolean' ? stop.hasCoordinates : undefined,
    isActive: typeof stop.isActive === 'boolean' ? stop.isActive : undefined,
    items,
  };
};

const normalizeManifest = (raw: unknown): LoadingManifest => {
  const manifest = isRecord(raw) ? raw : {};
  const lines = Array.isArray(manifest.lines) ? manifest.lines.map(normalizeLine) : [];
  const stops = Array.isArray(manifest.stops) ? manifest.stops.map(normalizeStop) : undefined;

  return {
    manifestId: toNumber(manifest.manifestId ?? manifest.id),
    tripDraftId: toNumber(manifest.tripDraftId),
    tripId: toNumber(manifest.tripId, undefined as unknown as number),
    manifestCode: toStringValue(manifest.manifestCode),
    fixedRouteCode: toStringValue(manifest.fixedRouteCode ?? manifest.tripCode),
    deliveryDate: toStringValue(manifest.deliveryDate),
    status: (toStringValue(manifest.status, 'GENERATED') || 'GENERATED') as ManifestStatus,
    generatedAt: toStringValue(manifest.generatedAt),
    confirmedAt: typeof manifest.confirmedAt === 'string' ? manifest.confirmedAt : null,
    generatedBy: isRecord(manifest.generatedBy)
      ? {
          userId: toNumber(manifest.generatedBy.userId),
          fullName: toStringValue(manifest.generatedBy.fullName),
        }
      : undefined,
    vehicle: isRecord(manifest.vehicle)
      ? {
          vehicleId: toNumber(manifest.vehicle.vehicleId),
          plateNumber: toStringValue(manifest.vehicle.plateNumber),
          vehicleType: toStringValue(manifest.vehicle.vehicleType),
          maxWeightKg: toNumber(manifest.vehicle.maxWeightKg),
          maxVolumeM3: toNumber(manifest.vehicle.maxVolumeM3),
        }
      : undefined,
    driver: isRecord(manifest.driver)
      ? {
          userId: toNumber(manifest.driver.userId),
          fullName: toStringValue(manifest.driver.fullName),
        }
      : undefined,
    totalLines: toNumber(manifest.totalLines, lines.length),
    totalWeightKg: toNumber(manifest.totalWeightKg),
    totalVolumeM3: toNumber(manifest.totalVolumeM3),
    summary: isRecord(manifest.summary)
      ? {
          activeStopCount: toNumber(manifest.summary.activeStopCount),
          orderCount: toNumber(manifest.summary.orderCount),
          itemCount: toNumber(manifest.summary.itemCount),
          packageCount: toNumber(manifest.summary.packageCount),
          totalWeightKg: toNumber(manifest.summary.totalWeightKg),
          totalVolumeM3: toNumber(manifest.summary.totalVolumeM3),
          weightUtilizationPercent: toNumber(manifest.summary.weightUtilizationPercent),
          volumeUtilizationPercent: toNumber(manifest.summary.volumeUtilizationPercent),
        }
      : undefined,
    lines,
    stops,
  };
};

export async function getLoadingManifest(tripDraftId: string | number): Promise<LoadingManifest> {
  const response = await axiosInstance.get<ApiResponse<LoadingManifest>>(
    `/api/trip-drafts/${tripDraftId}/manifest`
  );
  return normalizeManifest(unwrapData(response.data));
}

export async function generateLoadingManifest(
  tripDraftId: string | number,
  _payload: GenerateManifestRequest = { generationMode: 'LIFO' }
): Promise<LoadingManifest> {
  const response = await axiosInstance.post<ApiResponse<LoadingManifest>>(
    `/api/trip-drafts/${tripDraftId}/generate-manifest`
  );
  return normalizeManifest(unwrapData(response.data));
}

export async function getManifestFlatItems(
  tripDraftId: string | number,
  _params: ManifestFlatItemsParams = {}
): Promise<LoadingManifestItem[]> {
  const manifest = await getLoadingManifest(tripDraftId);
  return [...manifest.lines].sort((a, b) => a.lifoSequence - b.lifoSequence);
}

export async function getManifestStops(tripDraftId: string | number): Promise<LoadingManifestStop[]> {
  const response = await axiosInstance.get<ApiResponse<Pick<LoadingManifest, 'stops'>>>(
    `/api/trip-drafts/${tripDraftId}/manifest/by-stop`
  );
  const data = unwrapData(response.data);
  const stops = isRecord(data) && Array.isArray(data.stops) ? data.stops : [];
  return stops.map(normalizeStop);
}

export async function regenerateLoadingManifest(
  _tripDraftId: string | number,
  _payload: RegenerateManifestRequest
): Promise<LoadingManifest> {
  // PROPOSED API: POST /api/trip-drafts/{id}/manifest/regenerate is not present in ELog_API_Contract US-13.
  throw new Error('Regenerate manifest API is not defined in the current API Contract.');
}

export async function confirmLoadingManifest(
  _tripDraftId: string | number,
  _payload: ConfirmManifestRequest
): Promise<LoadingManifest> {
  // PROPOSED API: POST /api/trip-drafts/{id}/manifest/confirm is not present in ELog_API_Contract US-13.
  throw new Error('Confirm manifest API is not defined in the current API Contract.');
}

export function getLoadingManifestApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (isRecord(data)) {
      const apiError = isRecord(data.error) ? data.error : undefined;
      const details = Array.isArray(apiError?.details) ? apiError.details : undefined;
      const firstDetail = details?.find((detail): detail is string => typeof detail === 'string');
      return (
        firstDetail ||
        (typeof apiError?.message === 'string' ? apiError.message : '') ||
        (typeof data.message === 'string' ? data.message : '') ||
        error.message ||
        fallback
      );
    }
    return error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export function getLoadingManifestApiStatus(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? (error as AxiosError).response?.status : undefined;
}
