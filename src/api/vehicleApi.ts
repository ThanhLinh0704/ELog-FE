import { USE_MOCK_API } from '../config';
import axiosInstance from './axiosInstance';
import { mockVehicleApi } from '../mocks/mockVehicles';

export interface VehicleItem {
  id: number;
  plateNumber: string;
  vehicleType: string;
  maxWeightKg: number;
  maxVolumeM3: number;
  isActive: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
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
  page?: number;
  size?: number;
  sort?: string;
}

export interface VehiclePayload {
  plateNumber?: string;
  vehicleType: string;
  maxWeightKg: number;
  maxVolumeM3: number;
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
    plateNumber: raw.plateNumber ?? raw.plate_number ?? '',
    vehicleType: raw.vehicleType ?? raw.vehicle_type ?? '',
    maxWeightKg: Number(raw.maxWeightKg ?? raw.max_weight_kg ?? raw.maxWeight ?? 0),
    maxVolumeM3: Number(raw.maxVolumeM3 ?? raw.max_volume_m3 ?? raw.maxVolume ?? 0),
    isActive: raw.isActive ?? raw.is_active ?? true,
    createdAt: raw.createdAt ?? raw.created_at ?? null,
    updatedAt: raw.updatedAt ?? raw.updated_at ?? null,
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
      page,
      size,
      sort: params.sort ?? 'id,desc',
    });

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/vehicles?${query}`)
    );

    return normalizeVehiclePage(data, page, size);
  },

  async getVehicle(id: number): Promise<VehicleItem> {
    if (USE_MOCK_API) {
      return mockVehicleApi.getVehicle(id);
    }

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/vehicles/${id}`)
    );

    return normalizeVehicle(data?.data ?? data);
  },

  async getFleetCapacity(): Promise<FleetCapacity> {
    if (USE_MOCK_API) {
      return mockVehicleApi.getFleetCapacity();
    }

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.get('/api/vehicles/fleet-capacity')
    );

    return normalizeFleetCapacity(data);
  },

  async createVehicle(payload: VehiclePayload): Promise<VehicleItem> {
    if (USE_MOCK_API) {
      return mockVehicleApi.createVehicle(payload);
    }

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.post(
        '/api/vehicles',
        cleanPayload({
          plateNumber: payload.plateNumber?.trim().toUpperCase(),
          vehicleType: payload.vehicleType?.trim(),
          maxWeightKg: payload.maxWeightKg,
          maxVolumeM3: payload.maxVolumeM3,
        })
      )
    );

    return normalizeVehicle(data?.data ?? data);
  },

  async updateVehicle(id: number, payload: VehiclePayload): Promise<VehicleItem> {
    if (USE_MOCK_API) {
      return mockVehicleApi.updateVehicle(id, payload);
    }

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.put(
        `/api/vehicles/${id}`,
        cleanPayload({
          vehicleType: payload.vehicleType?.trim(),
          maxWeightKg: payload.maxWeightKg,
          maxVolumeM3: payload.maxVolumeM3,
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
      axiosInstance.patch(`/api/vehicles/${id}/status`, {
        isActive,
      })
    );

    return normalizeVehicle(data?.data ?? data);
  },
};
