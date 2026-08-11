import { USE_MOCK_API } from '../config';
import axiosInstance from './axiosInstance';
import {
  getRoutesMock,
  getRouteByIdMock,
  getRouteStopsMock,
  createRouteMock,
  updateRouteMock,
  updateRouteStatusMock,
  addStopMock,
  reorderStopsMock,
  deleteStopMock,
  getAvailableStoresMock
} from '../mocks/routeService';
import type { DeliveryRoute, RouteDirections, RouteStop, StoreSearchResult, RouteStatus } from '../types/route';
import {
  normalizeRoute,
  normalizeRouteStop,
  normalizeStoreSearchResult,
  normalizeRoutePage,
  type RoutePage
} from '../utils/routeMapper';

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

function encodeQuery(params: Record<string, any>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  return search.toString();
}

export const routeApi = {
  async getRoutes(params: {
    keyword?: string;
    status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
    page: number;
    size: number;
  }): Promise<RoutePage> {
    if (USE_MOCK_API) {
      const mockRes = await getRoutesMock(params);
      return {
        ...mockRes,
        page: params.page,
        size: params.size,
      };
    }

    const { keyword = '', status = 'ALL', page = 0, size = 10 } = params;
    const isActive = status === 'ALL' ? undefined : status === 'ACTIVE';

    const queryParams: Record<string, any> = {
      page,
      size,
    };
    if (keyword.trim()) {
      queryParams.keyword = keyword.trim();
    }
    if (isActive !== undefined) {
      queryParams.isActive = isActive;
    }

    const query = encodeQuery(queryParams);
    const data = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/v1/routes?${query}`)
    );

    return normalizeRoutePage(data, page, size);
  },

  async getRouteById(id: string): Promise<DeliveryRoute> {
    if (USE_MOCK_API) {
      return getRouteByIdMock(id);
    }

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/v1/routes/${id}`)
    );
    const rawData = data?.data ?? data;
    return normalizeRoute(rawData);
  },

  async getRouteStops(routeId: string): Promise<RouteStop[]> {
    if (USE_MOCK_API) {
      return getRouteStopsMock(routeId);
    }

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/v1/routes/${routeId}`)
    );
    const rawData = data?.data ?? data;
    const rawStops = Array.isArray(rawData?.stops) ? rawData.stops : [];
    return rawStops.map(normalizeRouteStop);
  },

  async createRoute(payload: Pick<DeliveryRoute, 'code' | 'name' | 'description'>): Promise<DeliveryRoute> {
    if (USE_MOCK_API) {
      return createRouteMock(payload);
    }

    try {
      const requestBody = {
        code: payload.code.toUpperCase().trim(),
        name: payload.name.trim(),
        description: payload.description ? payload.description.trim() : '',
      };

      const data = await handleAxiosCall<any>(() =>
        axiosInstance.post('/api/v1/routes', requestBody)
      );
      return normalizeRoute(data?.data ?? data);
    } catch (error: any) {
      if (error instanceof ApiError && error.status === 409) {
        const errCode = error.body?.error?.code;
        if (errCode === 'ROUTE_CODE_DUPLICATE') {
          throw {
            status: 409,
            field: 'code',
            message: 'Mã tuyến này đã tồn tại',
          };
        }
      }
      throw error;
    }
  },

  async updateRoute(
    id: string,
    payload: Pick<DeliveryRoute, 'name' | 'description'>
  ): Promise<DeliveryRoute> {
    if (USE_MOCK_API) {
      return updateRouteMock(id, payload);
    }

    const requestBody = {
      name: payload.name.trim(),
      description: payload.description ? payload.description.trim() : '',
    };

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.put(`/api/v1/routes/${id}`, requestBody)
    );
    return normalizeRoute(data?.data ?? data);
  },

  async updateStatus(id: string, status: RouteStatus): Promise<DeliveryRoute> {
    if (USE_MOCK_API) {
      return updateRouteStatusMock(id, status);
    }

    const isActive = status === 'ACTIVE';
    const data = await handleAxiosCall<any>(() =>
      axiosInstance.patch(`/api/v1/routes/${id}/status`, { isActive })
    );
    return normalizeRoute(data?.data ?? data);
  },

  async addStop(routeId: string, store: StoreSearchResult): Promise<RouteStop> {
    if (USE_MOCK_API) {
      // Fetch current stops from mock service for the sequence computation
      const currentStops = await getRouteStopsMock(routeId);
      return addStopMock(routeId, store, currentStops);
    }

    const requestBody = {
      storeId: Number(store.id),
    };

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.post(`/api/v1/routes/${routeId}/stops`, requestBody)
    );
    return normalizeRouteStop(data?.data ?? data);
  },

  async reorderStops(routeId: string, stops: RouteStop[]): Promise<RouteStop[]> {
    if (USE_MOCK_API) {
      return reorderStopsMock(routeId, stops);
    }

    const requestBody = {
      orderedStopIds: stops.map(s => Number(s.id)),
    };

    const data = await handleAxiosCall<any>(() =>
      axiosInstance.put(`/api/v1/routes/${routeId}/stops/reorder`, requestBody)
    );
    const rawStops = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    return rawStops.map(normalizeRouteStop);
  },

  async removeStop(routeId: string, stopId: string): Promise<void> {
    if (USE_MOCK_API) {
      await deleteStopMock(stopId);
      return;
    }

    await handleAxiosCall<any>(() =>
      axiosInstance.delete(`/api/v1/routes/${routeId}/stops/${stopId}`)
    );
  },

  async getAvailableStores(keyword?: string): Promise<StoreSearchResult[]> {
    if (USE_MOCK_API) {
      return getAvailableStoresMock(keyword);
    }

    // isActive = true, hasRoute = false, size = 100 to get first batch of available stores
    const queryParams: Record<string, any> = {
      isActive: true,
      hasRoute: false,
      size: 100,
    };
    if (keyword && keyword.trim()) {
      queryParams.keyword = keyword.trim();
    }

    const query = encodeQuery(queryParams);
    const data = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/v1/stores?${query}`)
    );

    const rawStores = Array.isArray(data?.data) ? data.data : [];
    return rawStores.map(normalizeStoreSearchResult);
  },

  async getRouteDirections(routeId: string, forceRefresh: boolean = false): Promise<RouteDirections> {
    if (USE_MOCK_API) {
      return {
        routeId,
        routeCode: 'RT-MOCK',
        routeName: 'Tuyến Mẫu',
        routePolyline: null,
        totalDistanceKm: null,
        totalDurationMin: null,
        warehouseLat: 21.032612,
        warehouseLng: 105.868367,
      };
    }

    const url = `/api/v1/routes/${routeId}/directions${forceRefresh ? '?forceRefresh=true' : ''}`;
    const data = await handleAxiosCall<any>(() =>
      axiosInstance.get(url)
    );
    const raw = data?.data ?? data;
    return {
      routeId: String(raw.routeId),
      routeCode: raw.routeCode || '',
      routeName: raw.routeName || '',
      routePolyline: raw.routePolyline ?? null,
      totalDistanceKm: raw.totalDistanceKm ?? null,
      totalDurationMin: raw.totalDurationMin ?? null,
      warehouseLat: Number(raw.warehouseLat),
      warehouseLng: Number(raw.warehouseLng),
    };
  },
};
