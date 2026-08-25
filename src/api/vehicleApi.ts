import { USE_MOCK_API } from '../config';
import axiosInstance from './axiosInstance';
import { mockVehicleApi } from '../mocks/mockVehicles';

/**
 * ASSIGNED = đã phân công, chờ dispatch · DISPATCHED = đã điều phối, chưa xuất phát ·
 * IN_PROGRESS = đang thực hiện chuyến · RETURNING = đã hoàn thành, chưa xác nhận về kho ·
 * COMPLETED_RETURNED = đã hoàn thành và đã xác nhận về kho (chỉ trả về khi gọi `getVehicles`
 * kèm `date` — xem tham số `date` bên dưới).
 * Xem filemd/FLEET-STATUS-DASHBOARD-ADJUSTED-SPEC.md mục 0.
 */
export type VehicleTripPhase = 'ASSIGNED' | 'DISPATCHED' | 'IN_PROGRESS' | 'RETURNING' | 'COMPLETED_RETURNED';

export interface VehicleCurrentTrip {
  tripId: number;
  routeCode: string | null;
  driverName: string | null;
  deliveryDate: string | null;
  phase: VehicleTripPhase;
  estimatedCompletionAt: string | null;
}

export interface VehicleItem {
  id: number;
  vehicleCode: string;
  plateNumber: string;
  vehicleType: string;
  vehicleClass?: string | null;
  payloadKg: number;
  grossVehicleWeightKg?: number | null;
  requiredLicense: 'B' | 'C1' | 'C';
  maxVolumeM3: number;
  cargoLengthMm?: number | null;
  cargoWidthMm?: number | null;
  cargoHeightMm?: number | null;
  averageSpeedKmh?: number | null;
  costPerKm?: number | null;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  assignedDriverId?: number | null;
  assignedDriverName?: string | null;
  assignedDriverPhone?: string | null;
  assignedDriverLicenseClass?: 'B' | 'C1' | 'C' | null;
  imageUrl?: string | null;
  permitInfo?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
  currentTrip?: VehicleCurrentTrip | null;
}

export interface VehiclePageResponse {
  content: VehicleItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface VehicleQueryParams {
  keyword?: string;
  isActive?: string | boolean;
  /** Operational status enum filter — combine with `isActive` for an exact effective-status match
   *  (e.g. "Sẵn sàng" = isActive:true + status:'AVAILABLE'). See VehiclesPage.tsx effective status mapping. */
  status?: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  minWeightKg?: number;
  maxWeightKg?: number;
  page?: number;
  size?: number;
  sort?: string;
  /** yyyy-MM-dd — when set, `currentTrip` on each vehicle reflects that specific date's trip
   *  (including COMPLETED_RETURNED) instead of "whatever's active right now". */
  date?: string;
}

export interface VehiclePayload {
  vehicleCode?: string;
  plateNumber?: string;
  vehicleType: string;
  vehicleClass?: string | null;
  payloadKg: number;
  grossVehicleWeightKg?: number | null;
  requiredLicense: 'B' | 'C1' | 'C';
  maxVolumeM3: number;
  cargoLengthMm?: number | null;
  cargoWidthMm?: number | null;
  cargoHeightMm?: number | null;
  averageSpeedKmh?: number | null;
  costPerKm?: number | null;
  status?: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  /** Cùng 1 request set cả status lẫn isActive — xem VehiclesPage.tsx effectiveStatusToPayload(). */
  isActive?: boolean;
  assignedDriverId?: number | null;
  imageUrl?: string | null;
  permitInfo?: string | null;
  description?: string | null;
}

export interface FleetCapacity {
  activeVehicleCount: number;
  totalMaxWeightKg: number;
  totalMaxVolumeM3: number;
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
      const message = body?.error?.message || body?.message || `API error ${status}`;
      throw new ApiError(message, status, body);
    }
    throw new ApiError(error.message || 'Network Error');
  }
}

function normalizeQueryValue(value: any): string {
  if (value === undefined || value === null || value === '') return '';

  if (typeof value === 'object') {
    if ('value' in value) return value.value;
    if ('id' in value) return value.id;
    return '';
  }

  return String(value);
}

function encodeQuery(params: Record<string, any>): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    const normalizedValue = normalizeQueryValue(value);

    if (normalizedValue !== '') {
      search.set(key, normalizedValue);
    }
  });

  return search.toString();
}

function cleanPayload(payload: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

function normalizeVehicle(raw: any): VehicleItem {
  return {
    ...raw,
    id: Number(raw.id ?? raw.vehicleId ?? raw.vehicle_id ?? 0),
    vehicleCode: raw.vehicleCode ?? raw.vehicle_code ?? '',
    plateNumber: raw.plateNumber ?? raw.plate_number ?? '',
    vehicleType: raw.vehicleType ?? raw.vehicle_type ?? '',
    vehicleClass: raw.vehicleClass ?? raw.vehicle_class ?? null,
    payloadKg: Number(raw.payloadKg ?? raw.payload_kg ?? 0),
    grossVehicleWeightKg: raw.grossVehicleWeightKg != null ? Number(raw.grossVehicleWeightKg) : null,
    requiredLicense: raw.requiredLicense ?? 'B',
    maxVolumeM3: Number(raw.maxVolumeM3 ?? raw.max_volume_m3 ?? raw.maxVolume ?? 0),
    cargoLengthMm: raw.cargoLengthMm != null ? Number(raw.cargoLengthMm) : null,
    cargoWidthMm: raw.cargoWidthMm != null ? Number(raw.cargoWidthMm) : null,
    cargoHeightMm: raw.cargoHeightMm != null ? Number(raw.cargoHeightMm) : null,
    averageSpeedKmh: raw.averageSpeedKmh != null ? Number(raw.averageSpeedKmh) : null,
    costPerKm: raw.costPerKm != null ? Number(raw.costPerKm) : null,
    status: raw.status ?? 'AVAILABLE',
    assignedDriverId: raw.assignedDriverId ?? raw.assigned_driver_id ?? null,
    assignedDriverName: raw.assignedDriverName ?? raw.assigned_driver_name ?? null,
    assignedDriverPhone: raw.assignedDriverPhone ?? raw.assigned_driver_phone ?? null,
    assignedDriverLicenseClass: raw.assignedDriverLicenseClass ?? raw.assigned_driver_license_class ?? null,
    imageUrl: raw.imageUrl ?? raw.image_url ?? null,
    permitInfo: raw.permitInfo ?? raw.permit_info ?? null,
    description: raw.description ?? null,
    isActive: raw.isActive ?? raw.is_active ?? true,
    createdAt: raw.createdAt ?? raw.created_at ?? null,
    updatedAt: raw.updatedAt ?? raw.updated_at ?? null,
    currentTrip: raw.currentTrip ?? raw.current_trip ?? null,
  };
}

function normalizeVehiclePage(
  responseBody: any,
  page = 0,
  size = 10
): VehiclePageResponse {
  if (responseBody && responseBody.pagination) {
    const content = Array.isArray(responseBody.data) ? responseBody.data : [];
    const pag = responseBody.pagination;
    return {
      content: content.map(normalizeVehicle),
      page: Number(pag.page ?? page),
      size: Number(pag.size ?? size),
      totalElements: Number(pag.totalElements ?? content.length),
      totalPages: Number(
        pag.totalPages ??
          Math.max(1, Math.ceil(content.length / Number(pag.size ?? size)))
      ),
    };
  }

  const payload = responseBody?.data ?? responseBody;

  if (Array.isArray(payload)) {
    const content = payload.map(normalizeVehicle);

    return {
      content,
      page,
      size,
      totalElements: content.length,
      totalPages: Math.max(1, Math.ceil(content.length / size)),
    };
  }

  const rawContent = payload?.content ?? payload?.items ?? payload?.vehicles ?? [];
  const content = Array.isArray(rawContent) ? rawContent.map(normalizeVehicle) : [];

  const responseSize = Number(payload?.size ?? size);
  const totalElements = Number(
    payload?.totalElements ?? content.length
  );

  return {
    content,
    page: Number(payload?.page ?? payload?.number ?? page),
    size: responseSize,
    totalElements,
    totalPages: Number(
      payload?.totalPages ??
        Math.max(1, Math.ceil(totalElements / responseSize))
    ),
  };
}

function normalizeFleetCapacity(raw: any): FleetCapacity {
  const payload = raw?.data ?? raw ?? {};

  return {
    activeVehicleCount: Number(
      payload.activeVehicleCount ??
        payload.active_vehicle_count ??
        payload.vehicleCount ??
        payload.totalVehicles ??
        payload.totalActiveVehicles ??
        0
    ),
    totalMaxWeightKg: Number(
      payload.totalMaxWeightKg ??
        payload.total_max_weight_kg ??
        payload.totalWeightKg ??
        payload.total_weight_kg ??
        payload.totalWeight ??
        0
    ),
    totalMaxVolumeM3: Number(
      payload.totalMaxVolumeM3 ??
        payload.total_max_volume_m3 ??
        payload.totalVolumeM3 ??
        payload.total_volume_m3 ??
        payload.totalVolume ??
        0
    ),
  };
}

export function getVehicleApiStatus(err: any) {
  return err?.response?.status ?? err?.status;
}

export function getVehicleApiErrorMessage(
  err: any,
  fallback = 'Có lỗi xảy ra, vui lòng thử lại.'
) {
  return (
    err?.response?.data?.error?.message ||
    err?.response?.data?.error?.details?.[0] ||
    err?.response?.data?.message ||
    err?.body?.error?.message ||
    err?.body?.error?.details?.[0] ||
    err?.body?.message ||
    err?.message ||
    fallback
  );
}

export const vehicleApi = {
  async getVehicles(params: VehicleQueryParams = {}): Promise<VehiclePageResponse> {
    if (USE_MOCK_API) {
      return mockVehicleApi.getVehicles(params);
    }

    const page = params.page ?? 0;
    const size = params.size ?? 10;
    const query = encodeQuery({
      keyword: params.keyword,
      isActive: params.isActive,
      status: params.status,
      minWeightKg: params.minWeightKg,
      maxWeightKg: params.maxWeightKg,
      page,
      size,
      sort: params.sort ?? 'id,desc',
      date: params.date,
    });

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/v1/vehicles?${query}`)
    );

    return normalizeVehiclePage(data, page, size);
  },

  async getVehicle(id: number): Promise<VehicleItem> {
    if (USE_MOCK_API) {
      return mockVehicleApi.getVehicle(id);
    }

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/v1/vehicles/${id}`)
    );

    return normalizeVehicle(data?.data ?? data);
  },

  async getFleetCapacity(): Promise<FleetCapacity> {
    if (USE_MOCK_API) {
      return mockVehicleApi.getFleetCapacity();
    }

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.get('/api/v1/vehicles/fleet-capacity')
    );

    return normalizeFleetCapacity(data);
  },

  async createVehicle(payload: VehiclePayload): Promise<VehicleItem> {
    if (USE_MOCK_API) {
      return mockVehicleApi.createVehicle(payload as any);
    }

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.post(
        '/api/v1/vehicles',
        cleanPayload({
          vehicleCode: payload.vehicleCode?.trim(),
          plateNumber: payload.plateNumber?.trim().toUpperCase(),
          vehicleType: payload.vehicleType?.trim(),
          vehicleClass: payload.vehicleClass?.trim() || null,
          payloadKg: payload.payloadKg,
          grossVehicleWeightKg: payload.grossVehicleWeightKg,
          requiredLicense: payload.requiredLicense,
          maxVolumeM3: payload.maxVolumeM3,
          cargoLengthMm: payload.cargoLengthMm,
          cargoWidthMm: payload.cargoWidthMm,
          cargoHeightMm: payload.cargoHeightMm,
          averageSpeedKmh: payload.averageSpeedKmh,
          costPerKm: payload.costPerKm,
          status: payload.status,
          assignedDriverId: payload.assignedDriverId ?? null,
          imageUrl: payload.imageUrl?.trim() || null,
          permitInfo: payload.permitInfo?.trim() || null,
          description: payload.description?.trim() || null,
        })
      )
    );

    return normalizeVehicle(data?.data ?? data);
  },

  async updateVehicle(id: number, payload: VehiclePayload): Promise<VehicleItem> {
    if (USE_MOCK_API) {
      return mockVehicleApi.updateVehicle(id, payload as any);
    }

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.put(
        `/api/v1/vehicles/${id}`,
        cleanPayload({
          vehicleType: payload.vehicleType?.trim(),
          vehicleClass: payload.vehicleClass?.trim() || null,
          payloadKg: payload.payloadKg,
          grossVehicleWeightKg: payload.grossVehicleWeightKg,
          requiredLicense: payload.requiredLicense,
          maxVolumeM3: payload.maxVolumeM3,
          cargoLengthMm: payload.cargoLengthMm,
          cargoWidthMm: payload.cargoWidthMm,
          cargoHeightMm: payload.cargoHeightMm,
          averageSpeedKmh: payload.averageSpeedKmh,
          costPerKm: payload.costPerKm,
          status: payload.status,
          isActive: payload.isActive,
          assignedDriverId: payload.assignedDriverId ?? null,
          imageUrl: payload.imageUrl?.trim() || null,
          permitInfo: payload.permitInfo?.trim() || null,
          description: payload.description?.trim() || null,
        })
      )
    );

    return normalizeVehicle(data?.data ?? data);
  },

  async updateStatus(id: number, isActive: boolean): Promise<VehicleItem> {
    if (USE_MOCK_API) {
      return mockVehicleApi.updateStatus(id, isActive);
    }

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.patch(`/api/v1/vehicles/${id}/status`, {
        isActive,
      })
    );

    return normalizeVehicle(data?.data ?? data);
  },

  async getAvailableVehicles(tripId?: number): Promise<VehicleItem[]> {
    const params: Record<string, any> = {};
    if (tripId) params.tripId = tripId;
    const query = encodeQuery(params);

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/v1/vehicles/available${query ? `?${query}` : ''}`)
    );

    const payload = data?.data ?? data;
    const list = Array.isArray(payload) ? payload : payload.content ?? [];
    return list.map(normalizeVehicle);
  },
};
