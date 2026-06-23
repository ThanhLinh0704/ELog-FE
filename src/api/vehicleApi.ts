import axiosInstance from './axiosInstance';

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

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  pagination?: {
    page?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
  };
  message?: string;
  error?: {
    code?: string;
    message?: string;
    field?: string;
    details?: string[];
  };
}

function cleanParams(params: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== '' && value !== undefined && value !== null
    )
  );
}

function cleanPayload(payload: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  );
}

function createApiError(body: ApiResponse<any>) {
  const error = new Error(
    body.error?.message ||
      body.error?.details?.[0] ||
      body.message ||
      'API request failed.'
  ) as Error & {
    body?: ApiResponse<any>;
    code?: string;
    field?: string;
  };

  error.body = body;
  error.code = body.error?.code;
  error.field = body.error?.field;

  return error;
}

function unwrapApiData<T>(response: any): T {
  const body = response?.data;

  if (body && typeof body === 'object' && 'success' in body) {
    if (body.success === false) {
      throw createApiError(body);
    }

    return body.data as T;
  }

  return body as T;
}

function getApiPagination(response: any) {
  return response?.data?.pagination;
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
  response: any,
  page = 0,
  size = 10
): VehiclePageResponse {
  const body = response?.data;
  const apiPagination = getApiPagination(response);
  const payload = body?.data ?? body;

  if (Array.isArray(payload)) {
    const content = payload.map(normalizeVehicle);

    return {
      content,
      page: Number(apiPagination?.page ?? page),
      size: Number(apiPagination?.size ?? size),
      totalElements: Number(apiPagination?.totalElements ?? content.length),
      totalPages: Number(
        apiPagination?.totalPages ??
          Math.max(1, Math.ceil(content.length / Number(apiPagination?.size ?? size)))
      ),
    };
  }

  const rawContent = payload?.content ?? payload?.items ?? payload?.vehicles ?? [];
  const content = Array.isArray(rawContent) ? rawContent.map(normalizeVehicle) : [];

  const responseSize = Number(payload?.size ?? apiPagination?.size ?? size);
  const totalElements = Number(
    payload?.totalElements ?? apiPagination?.totalElements ?? content.length
  );

  return {
    content,
    page: Number(payload?.page ?? payload?.number ?? apiPagination?.page ?? page),
    size: responseSize,
    totalElements,
    totalPages: Number(
      payload?.totalPages ??
        apiPagination?.totalPages ??
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
    const page = params.page ?? 0;
    const size = params.size ?? 10;

    const response = await axiosInstance.get('/api/vehicles', {
      params: cleanParams({
        keyword: params.keyword,
        isActive: params.isActive,
        page,
        size,
        sort: params.sort ?? 'id,desc',
      }),
    });

    return normalizeVehiclePage(response, page, size);
  },

  async getVehicle(id: number): Promise<VehicleItem> {
    const response = await axiosInstance.get(`/api/vehicles/${id}`);
    return normalizeVehicle(unwrapApiData<any>(response));
  },

  async getFleetCapacity(): Promise<FleetCapacity> {
    const response = await axiosInstance.get('/api/vehicles/fleet-capacity');
    return normalizeFleetCapacity(unwrapApiData<any>(response));
  },

  async createVehicle(payload: VehiclePayload): Promise<VehicleItem> {
    const response = await axiosInstance.post(
      '/api/vehicles',
      cleanPayload({
        plateNumber: payload.plateNumber?.trim().toUpperCase(),
        vehicleType: payload.vehicleType?.trim(),
        maxWeightKg: payload.maxWeightKg,
        maxVolumeM3: payload.maxVolumeM3,
      })
    );

    return normalizeVehicle(unwrapApiData<any>(response));
  },

  async updateVehicle(id: number, payload: VehiclePayload): Promise<VehicleItem> {
    const response = await axiosInstance.put(
      `/api/vehicles/${id}`,
      cleanPayload({
        vehicleType: payload.vehicleType?.trim(),
        maxWeightKg: payload.maxWeightKg,
        maxVolumeM3: payload.maxVolumeM3,
      })
    );

    return normalizeVehicle(unwrapApiData<any>(response));
  },

  async updateStatus(id: number, isActive: boolean): Promise<VehicleItem> {
    const response = await axiosInstance.patch(`/api/vehicles/${id}/status`, {
      isActive,
    });

    return normalizeVehicle(unwrapApiData<any>(response));
  },
};
