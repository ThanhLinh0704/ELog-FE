import { USE_MOCK_API } from '../config';
import axiosInstance from './axiosInstance';
import { mockStoreApi } from './mockStoreApi';

export interface AssignedRoute {
  id: number;
  code: string;
  name: string;
}

export interface StoreItem {
  id: number;
  storeCode: string;
  storeName: string;
  address: string;
  provinceCode?: string | null;
  provinceName?: string | null;
  districtCode?: string | null;
  districtName?: string | null;
  wardCode?: string | null;
  wardName?: string | null;
  addressDetail?: string | null;
  allowedDeliveryHours?: string | null;
  maxAllowedVehicleWeight?: number | null;
  imageUrl?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
  hasCoordinates?: boolean;
  assignedRoutes?: AssignedRoute[] | null;
  createdAt?: string;
}

export interface StorePageResponse {
  content: StoreItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface StoreQueryParams {
  keyword?: string;
  isActive?: string | boolean;
  hasRoute?: string | boolean;
  routeCode?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface StorePayload {
  storeCode?: string;
  storeName: string;
  provinceCode: string;
  districtCode: string;
  wardCode: string;
  addressDetail: string;
  allowedDeliveryHours?: string | null;
  maxAllowedVehicleWeight?: number | null;
  imageUrl?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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

function normalizeAssignedRoutes(rawList: any): AssignedRoute[] {
  if (!Array.isArray(rawList)) return [];
  return rawList.map(raw => ({
    id: Number(raw.id ?? raw.routeId ?? raw.route_id ?? 0),
    code: raw.code ?? raw.routeCode ?? raw.route_code ?? '',
    name: raw.name ?? raw.routeName ?? raw.route_name ?? '',
  }));
}

function normalizeStore(raw: any): StoreItem {
  const latitude = raw.latitude ?? raw.lat ?? null;
  const longitude = raw.longitude ?? raw.lng ?? null;

  const hasCoordinates =
    raw.hasCoordinates ??
    raw.has_coordinates ??
    (latitude !== null &&
      latitude !== undefined &&
      longitude !== null &&
      longitude !== undefined);

  return {
    ...raw,
    id: Number(raw.id ?? raw.storeId ?? 0),
    storeCode: raw.storeCode ?? raw.store_code ?? raw.code ?? '',
    storeName: raw.storeName ?? raw.store_name ?? raw.name ?? '',
    address: raw.address ?? '',
    provinceCode: raw.provinceCode ?? raw.province_code ?? null,
    provinceName: raw.provinceName ?? raw.province_name ?? null,
    districtCode: raw.districtCode ?? raw.district_code ?? null,
    districtName: raw.districtName ?? raw.district_name ?? null,
    wardCode: raw.wardCode ?? raw.ward_code ?? null,
    wardName: raw.wardName ?? raw.ward_name ?? null,
    addressDetail: raw.addressDetail ?? raw.address_detail ?? null,
    allowedDeliveryHours: raw.allowedDeliveryHours ?? raw.allowed_delivery_hours ?? null,
    maxAllowedVehicleWeight: raw.maxAllowedVehicleWeight != null ? Number(raw.maxAllowedVehicleWeight) : null,
    imageUrl: raw.imageUrl ?? raw.image_url ?? null,
    contactName: raw.contactName ?? raw.contact_name ?? null,
    contactPhone: raw.contactPhone ?? raw.contact_phone ?? null,
    latitude,
    longitude,
    isActive: raw.isActive ?? raw.is_active ?? true,
    hasCoordinates,
    assignedRoutes: normalizeAssignedRoutes(raw.assignedRoutes ?? raw.assigned_routes ?? raw.assignedRoute ?? raw.assigned_route),
    createdAt: raw.createdAt ?? raw.created_at,
  };
}

function normalizeStorePage(responseBody: any, page = 0, size = 20): StorePageResponse {
  if (responseBody && responseBody.pagination) {
    const content = Array.isArray(responseBody.data) ? responseBody.data : [];
    const pag = responseBody.pagination;
    return {
      content: content.map(normalizeStore),
      page: Number(pag.page ?? page),
      size: Number(pag.size ?? size),
      totalElements: Number(pag.totalElements ?? content.length),
      totalPages: Number(pag.totalPages ?? Math.max(1, Math.ceil((pag.totalElements ?? content.length) / size))),
    };
  }

  const payload = responseBody?.data ?? responseBody;

  if (Array.isArray(payload)) {
    const content = payload.map(normalizeStore);

    return {
      content,
      page,
      size,
      totalElements: content.length,
      totalPages: Math.max(1, Math.ceil(content.length / size)),
    };
  }

  const rawContent =
    payload?.content ??
    payload?.items ??
    payload?.stores ??
    [];

  const content = Array.isArray(rawContent)
    ? rawContent.map(normalizeStore)
    : [];

  const totalElements =
    Number(payload?.totalElements ?? payload?.total_elements ?? content.length);

  const responseSize = Number(payload?.size ?? size);
  const totalPages =
    Number(payload?.totalPages ?? payload?.total_pages) ||
    Math.max(1, Math.ceil(totalElements / responseSize));

  return {
    content,
    page: Number(payload?.page ?? payload?.number ?? page),
    size: responseSize,
    totalElements,
    totalPages,
  };
}

export function getStoreApiStatus(err: any) {
  return err?.response?.status ?? err?.status;
}

export function getStoreApiErrorCode(err: any) {
  return (
    err?.response?.data?.error?.code ||
    err?.body?.error?.code ||
    err?.code
  );
}

export function getStoreApiErrorMessage(
  err: any,
  fallback = 'API lỗi, vui lòng thử lại.'
) {
  return (
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.body?.error?.message ||
    err?.body?.message ||
    err?.message ||
    fallback
  );
}

export const storeApi = {
  async getStores(params: StoreQueryParams = {}): Promise<StorePageResponse> {
    if (USE_MOCK_API) {
      return mockStoreApi.getStores(params);
    }

    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const query = encodeQuery({
      keyword: params.keyword,
      isActive: params.isActive,
      hasRoute: params.hasRoute,
      routeCode: params.routeCode,
      page,
      size,
      sort: params.sort ?? 'id,desc',
    });

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/v1/stores?${query}`)
    );

    return normalizeStorePage(data, page, size);
  },

  async getStore(id: number): Promise<StoreItem> {
    if (USE_MOCK_API) {
      return mockStoreApi.getStore(id);
    }

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/v1/stores/${id}`)
    );

    return normalizeStore(data?.data ?? data);
  },

  async createStore(payload: StorePayload): Promise<StoreItem> {
    if (USE_MOCK_API) {
      return mockStoreApi.createStore(payload);
    }

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.post(
        '/api/v1/stores',
        cleanPayload({
          storeCode: payload.storeCode?.trim().toUpperCase(),
          storeName: payload.storeName?.trim(),
          provinceCode: payload.provinceCode,
          districtCode: payload.districtCode,
          wardCode: payload.wardCode,
          addressDetail: payload.addressDetail?.trim(),
          allowedDeliveryHours: payload.allowedDeliveryHours?.trim() || null,
          maxAllowedVehicleWeight: payload.maxAllowedVehicleWeight,
          imageUrl: payload.imageUrl?.trim() || null,
          contactName: payload.contactName?.trim() || null,
          contactPhone: payload.contactPhone?.trim() || null,
          latitude: payload.latitude,
          longitude: payload.longitude,
        })
      )
    );

    return normalizeStore(data?.data ?? data);
  },

  async updateStore(id: number, payload: StorePayload): Promise<StoreItem> {
    if (USE_MOCK_API) {
      return mockStoreApi.updateStore(id, payload);
    }

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.put(
        `/api/v1/stores/${id}`,
        cleanPayload({
          storeName: payload.storeName?.trim(),
          provinceCode: payload.provinceCode,
          districtCode: payload.districtCode,
          wardCode: payload.wardCode,
          addressDetail: payload.addressDetail?.trim(),
          allowedDeliveryHours: payload.allowedDeliveryHours?.trim() || null,
          maxAllowedVehicleWeight: payload.maxAllowedVehicleWeight,
          imageUrl: payload.imageUrl?.trim() || null,
          contactName: payload.contactName?.trim() || null,
          contactPhone: payload.contactPhone?.trim() || null,
          latitude: payload.latitude,
          longitude: payload.longitude,
        })
      )
    );

    return normalizeStore(data?.data ?? data);
  },

  async updateStatus(id: number, isActive: boolean): Promise<StoreItem> {
    if (USE_MOCK_API) {
      return mockStoreApi.updateStatus(id, isActive);
    }

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.patch(`/api/v1/stores/${id}/status`, {
        isActive,
      })
    );

    return normalizeStore(data?.data ?? data);
  },
};