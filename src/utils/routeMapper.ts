import type { DeliveryRoute, RouteStop, StoreSearchResult } from '../types/route';

export interface RoutePage {
  content: DeliveryRoute[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export function normalizeRoute(apiRoute: any): DeliveryRoute {
  return {
    id: String(apiRoute.id),
    code: apiRoute.code || '',
    name: apiRoute.name || '',
    description: apiRoute.description || '',
    status: apiRoute.isActive === true || apiRoute.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
    stopCount: apiRoute.stopCount != null ? Number(apiRoute.stopCount) : 0,
    coordinatesWarningCount: apiRoute.coordinatesWarningCount != null ? Number(apiRoute.coordinatesWarningCount) : 0,
    createdAt: apiRoute.createdAt || '',
    updatedAt: apiRoute.updatedAt || apiRoute.createdAt || '',
  };
}

export function normalizeRouteStop(apiStop: any): RouteStop {
  const store = apiStop.store || {};
  return {
    id: String(apiStop.id),
    routeId: String(apiStop.routeId),
    storeId: String(store.id || ''),
    storeCode: store.storeCode || '',
    storeName: store.storeName || '',
    address: store.address || '',
    latitude: store.latitude != null ? Number(store.latitude) : null,
    longitude: store.longitude != null ? Number(store.longitude) : null,
    hasCoordinates: store.hasCoordinates === true,
    sequenceOrder: apiStop.sequenceOrder != null ? Number(apiStop.sequenceOrder) : Number(apiStop.sequenceNo || 1),
  };
}

export function normalizeStoreSearchResult(apiStore: any): StoreSearchResult {
  return {
    id: String(apiStore.id),
    code: apiStore.storeCode || '',
    name: apiStore.storeName || '',
    address: apiStore.address || '',
    latitude: apiStore.latitude != null ? Number(apiStore.latitude) : null,
    longitude: apiStore.longitude != null ? Number(apiStore.longitude) : null,
    hasCoordinates: apiStore.hasCoordinates === true,
    isActive: apiStore.isActive === true,
    routeId: apiStore.assignedRoute ? String(apiStore.assignedRoute.id) : null,
  };
}

export function normalizeRoutePage(responseBody: any, page: number, size: number): RoutePage {
  if (responseBody && responseBody.pagination) {
    const content = Array.isArray(responseBody.data) ? responseBody.data : [];
    const pag = responseBody.pagination;
    return {
      content: content.map(normalizeRoute),
      page: pag.page ?? page,
      size: pag.size ?? size,
      totalElements: pag.totalElements ?? content.length,
      totalPages: pag.totalPages ?? Math.max(1, Math.ceil((pag.totalElements ?? content.length) / size)),
    };
  }

  const raw = responseBody?.data ?? responseBody;
  const content = Array.isArray(raw?.content) ? raw.content : (Array.isArray(raw) ? raw : []);

  return {
    content: content.map(normalizeRoute),
    page: raw?.page ?? page,
    size: raw?.size ?? size,
    totalElements: raw?.totalElements ?? content.length,
    totalPages: raw?.totalPages ?? Math.max(1, Math.ceil((raw?.totalElements ?? content.length) / size)),
  };
}
