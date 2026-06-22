import axiosInstance from './axiosInstance';

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
  contactName?: string | null;
  contactPhone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive: boolean;
  hasCoordinates?: boolean;
  assignedRoute?: AssignedRoute | null;
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
  page?: number;
  size?: number;
  sort?: string;
}

export interface StorePayload {
  storeCode?: string;
  storeName: string;
  address: string;
  contactName?: string | null;
  contactPhone?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
  error?: {
    code?: string;
    message?: string;
    field?: string;
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
    body.error?.message || body.message || 'API request failed.'
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

function normalizeAssignedRoute(raw: any): AssignedRoute | null {
  if (!raw) return null;

  return {
    ...raw,
    id: Number(raw.id ?? raw.routeId ?? 0),
    code: raw.code ?? raw.routeCode ?? '',
    name: raw.name ?? raw.routeName ?? '',
  };
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
    contactName: raw.contactName ?? raw.contact_name ?? null,
    contactPhone: raw.contactPhone ?? raw.contact_phone ?? null,
    latitude,
    longitude,
    isActive: raw.isActive ?? raw.is_active ?? true,
    hasCoordinates,
    assignedRoute: normalizeAssignedRoute(raw.assignedRoute ?? raw.assigned_route),
    createdAt: raw.createdAt ?? raw.created_at,
  };
}

function normalizeStorePage(raw: any, page = 0, size = 20): StorePageResponse {
  const payload = raw?.data ?? raw;

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
    const page = params.page ?? 0;
    const size = params.size ?? 20;

    const response = await axiosInstance.get('/api/stores', {
      params: cleanParams({
        keyword: params.keyword,
        isActive: params.isActive,
        hasRoute: params.hasRoute,
        page,
        size,
        sort: params.sort ?? 'id,desc',
      }),
    });

    const data = unwrapApiData<any>(response);
    return normalizeStorePage(data, page, size);
  },

  async getStore(id: number): Promise<StoreItem> {
    const response = await axiosInstance.get(`/api/stores/${id}`);
    const data = unwrapApiData<any>(response);

    return normalizeStore(data);
  },

  async createStore(payload: StorePayload): Promise<StoreItem> {
    const response = await axiosInstance.post(
      '/api/stores',
      cleanPayload({
        storeCode: payload.storeCode?.trim().toUpperCase(),
        storeName: payload.storeName?.trim(),
        address: payload.address?.trim(),
        contactName: payload.contactName?.trim() || null,
        contactPhone: payload.contactPhone?.trim() || null,
        latitude: payload.latitude,
        longitude: payload.longitude,
      })
    );

    const data = unwrapApiData<any>(response);
    return normalizeStore(data);
  },

  async updateStore(id: number, payload: StorePayload): Promise<StoreItem> {
    const response = await axiosInstance.put(
      `/api/stores/${id}`,
      cleanPayload({
        storeName: payload.storeName?.trim(),
        address: payload.address?.trim(),
        contactName: payload.contactName?.trim() || null,
        contactPhone: payload.contactPhone?.trim() || null,
        latitude: payload.latitude,
        longitude: payload.longitude,
      })
    );

    const data = unwrapApiData<any>(response);
    return normalizeStore(data);
  },

  async updateStatus(id: number, isActive: boolean): Promise<StoreItem> {
    const response = await axiosInstance.patch(`/api/stores/${id}/status`, {
      isActive,
    });

    const data = unwrapApiData<any>(response);
    return normalizeStore(data);
  },
};