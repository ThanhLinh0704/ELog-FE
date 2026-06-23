import type { DeliveryRoute, RouteStop, StoreSearchResult, RouteStatus } from '../types/route';
import { mockRoutes, mockRouteStops, saveMockRoutes, saveMockRouteStops } from './routeData';
import { mockStores, saveMockStores } from './storeData';
import { renumberStops, countMissingCoordinates } from '../utils/routeCalculations';

const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

export let MOCK_REORDER_FAILURE = false;
export const setMockReorderFailure = (val: boolean) => {
  MOCK_REORDER_FAILURE = val;
};

// Helper to update route statistics (stopCount and coordinatesWarningCount)
const updateRouteStats = (routeId: string) => {
  const currentRoutes = [...mockRoutes];
  const currentStops = mockRouteStops.filter(s => s.routeId === routeId);
  
  const routeIndex = currentRoutes.findIndex(r => r.id === routeId);
  if (routeIndex !== -1) {
    const stopCount = currentStops.length;
    const coordinatesWarningCount = countMissingCoordinates(currentStops);
    
    let status = currentRoutes[routeIndex].status;
    let autoDeactivated = false;
    
    if (status === 'ACTIVE' && stopCount < 2) {
      status = 'INACTIVE';
      autoDeactivated = true;
    }
    
    currentRoutes[routeIndex] = {
      ...currentRoutes[routeIndex],
      stopCount,
      coordinatesWarningCount,
      status,
      updatedAt: new Date().toISOString()
    };
    
    saveMockRoutes(currentRoutes);
    return { autoDeactivated };
  }
  return { autoDeactivated: false };
};

export async function getRoutesMock(params: {
  keyword?: string;
  status?: 'ALL' | 'ACTIVE' | 'INACTIVE';
  page: number;
  size: number;
}): Promise<{ content: DeliveryRoute[]; totalElements: number; totalPages: number }> {
  await delay(400);
  
  let filtered = [...mockRoutes];
  
  // Search filter
  if (params.keyword && params.keyword.trim() !== '') {
    const kw = params.keyword.toLowerCase().trim();
    filtered = filtered.filter(
      (r) => r.code.toLowerCase().includes(kw) || r.name.toLowerCase().includes(kw)
    );
  }
  
  // Status filter
  if (params.status && params.status !== 'ALL') {
    filtered = filtered.filter((r) => r.status === params.status);
  }
  
  // Sort by updatedAt or createdAt descending
  filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  
  const totalElements = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / params.size));
  const start = params.page * params.size;
  const content = filtered.slice(start, start + params.size);
  
  return {
    content,
    totalElements,
    totalPages
  };
}

export async function getRouteByIdMock(routeId: string): Promise<DeliveryRoute> {
  await delay(300);
  const route = mockRoutes.find(r => r.id === routeId);
  if (!route) {
    throw new Error('404');
  }
  return route;
}

export async function getRouteStopsMock(routeId: string): Promise<RouteStop[]> {
  await delay(300);
  const stops = mockRouteStops.filter(s => s.routeId === routeId);
  stops.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  return stops;
}

export async function createRouteMock(
  payload: Pick<DeliveryRoute, 'code' | 'name' | 'description'>
): Promise<DeliveryRoute> {
  await delay(600);
  
  const codeFormatted = payload.code.toUpperCase().trim();
  const duplicated = mockRoutes.some((route) => route.code === codeFormatted);
  
  if (duplicated) {
    throw {
      status: 409,
      field: "code",
      message: "Mã tuyến này đã tồn tại"
    };
  }
  
  const now = new Date().toISOString();
  const newRoute: DeliveryRoute = {
    id: `route-${Date.now()}`,
    code: codeFormatted,
    name: payload.name.trim(),
    description: payload.description ? payload.description.trim() : undefined,
    status: "INACTIVE",
    stopCount: 0,
    coordinatesWarningCount: 0,
    createdAt: now,
    updatedAt: now
  };
  
  const currentRoutes = [newRoute, ...mockRoutes];
  saveMockRoutes(currentRoutes);
  
  return newRoute;
}

export async function updateRouteMock(
  routeId: string,
  payload: Pick<DeliveryRoute, 'name' | 'description'>
): Promise<DeliveryRoute> {
  await delay(500);
  
  const currentRoutes = [...mockRoutes];
  const routeIndex = currentRoutes.findIndex(r => r.id === routeId);
  
  if (routeIndex === -1) {
    throw new Error('404');
  }
  
  currentRoutes[routeIndex] = {
    ...currentRoutes[routeIndex],
    name: payload.name.trim(),
    description: payload.description ? payload.description.trim() : undefined,
    updatedAt: new Date().toISOString()
  };
  
  saveMockRoutes(currentRoutes);
  return currentRoutes[routeIndex];
}

export async function updateRouteStatusMock(routeId: string, status: RouteStatus): Promise<DeliveryRoute> {
  await delay(400);
  
  const currentRoutes = [...mockRoutes];
  const routeIndex = currentRoutes.findIndex(r => r.id === routeId);
  
  if (routeIndex === -1) {
    throw new Error('404');
  }
  
  const route = currentRoutes[routeIndex];
  
  if (status === 'ACTIVE' && route.stopCount < 2) {
    throw new Error('Tuyến cần ít nhất 2 điểm dừng để hoạt động');
  }
  
  currentRoutes[routeIndex] = {
    ...route,
    status,
    updatedAt: new Date().toISOString()
  };
  
  saveMockRoutes(currentRoutes);
  return currentRoutes[routeIndex];
}

export async function reorderStopsMock(routeId: string, stops: RouteStop[]): Promise<RouteStop[]> {
  await delay(800);
  
  if (MOCK_REORDER_FAILURE) {
    throw new Error("REORDER_FAILED");
  }
  
  const reordered = renumberStops(stops);
  
  // Replace the stops in global list
  let otherStops = mockRouteStops.filter(s => s.routeId !== routeId);
  const newStopsList = [...otherStops, ...reordered];
  saveMockRouteStops(newStopsList);
  
  // Update stats on route
  updateRouteStats(routeId);
  
  return reordered;
}

export async function addStopMock(
  routeId: string,
  store: StoreSearchResult,
  currentStops: RouteStop[]
): Promise<RouteStop> {
  await delay(500);
  
  // Create the stop
  const newStop: RouteStop = {
    id: `stop-${Date.now()}`,
    routeId,
    storeId: store.id,
    storeCode: store.code,
    storeName: store.name,
    address: store.address,
    latitude: store.latitude,
    longitude: store.longitude,
    hasCoordinates: store.hasCoordinates,
    sequenceOrder: currentStops.length + 1
  };
  
  // Save stop
  const stopsList = [...mockRouteStops, newStop];
  saveMockRouteStops(stopsList);
  
  // Update store reference
  const currentStores = [...mockStores];
  const storeIndex = currentStores.findIndex(s => s.id === store.id);
  if (storeIndex !== -1) {
    currentStores[storeIndex] = {
      ...currentStores[storeIndex],
      routeId
    };
    saveMockStores(currentStores);
  }
  
  // Update route stats
  updateRouteStats(routeId);
  
  return newStop;
}

export async function deleteStopMock(stopId: string): Promise<{ autoDeactivated: boolean; routeId: string }> {
  await delay(400);
  
  const stopIndex = mockRouteStops.findIndex(s => s.id === stopId);
  if (stopIndex === -1) {
    throw new Error('Stop not found');
  }
  
  const stop = mockRouteStops[stopIndex];
  const { routeId, storeId } = stop;
  
  // Remove stop
  const remainingStops = mockRouteStops.filter(s => s.id !== stopId);
  
  // Renumber remaining stops for this route
  const thisRouteStops = remainingStops.filter(s => s.routeId === routeId);
  const renumberedThisRouteStops = renumberStops(thisRouteStops);
  
  const otherRouteStops = remainingStops.filter(s => s.routeId !== routeId);
  saveMockRouteStops([...otherRouteStops, ...renumberedThisRouteStops]);
  
  // Reset store route association
  const currentStores = [...mockStores];
  const storeIndex = currentStores.findIndex(s => s.id === storeId);
  if (storeIndex !== -1) {
    currentStores[storeIndex] = {
      ...currentStores[storeIndex],
      routeId: null
    };
    saveMockStores(currentStores);
  }
  
  // Update route stats & check if auto de-activated
  const { autoDeactivated } = updateRouteStats(routeId);
  
  return { autoDeactivated, routeId };
}

export async function getAvailableStoresMock(keyword?: string): Promise<StoreSearchResult[]> {
  await delay(300);
  
  let available = mockStores.filter(s => s.isActive && s.routeId === null);
  
  if (keyword && keyword.trim() !== '') {
    const kw = keyword.toLowerCase().trim();
    available = available.filter(
      s => s.code.toLowerCase().includes(kw) || s.name.toLowerCase().includes(kw) || s.address.toLowerCase().includes(kw)
    );
  }
  
  return available;
}
