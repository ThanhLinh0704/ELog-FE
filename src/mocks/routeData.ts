import type { DeliveryRoute, RouteStop } from '../types/route';

export const initialMockRoutes: DeliveryRoute[] = [
  {
    id: "route-001",
    code: "RT-BT-01",
    name: "Tuyến Bình Thạnh 01",
    description: "Tuyến giao hàng cố định cho các cửa hàng thuộc khu vực Bình Thạnh.",
    status: "ACTIVE",
    stopCount: 4,
    coordinatesWarningCount: 1,
    createdAt: "2026-06-10T08:30:00",
    updatedAt: "2026-06-20T15:10:00",
  },
  {
    id: "route-002",
    code: "RT-GV-01",
    name: "Tuyến Gò Vấp 01",
    description: "Tuyến giao hàng cố định khu vực Gò Vấp.",
    status: "INACTIVE",
    stopCount: 1,
    coordinatesWarningCount: 0,
    createdAt: "2026-06-12T09:15:00",
    updatedAt: "2026-06-18T10:45:00",
  },
  {
    id: "route-003",
    code: "RT-TD-01",
    name: "Tuyến Thủ Đức 01",
    description: "Tuyến giao hàng cố định khu vực Thủ Đức.",
    status: "INACTIVE",
    stopCount: 0,
    coordinatesWarningCount: 0,
    createdAt: "2026-06-15T13:20:00",
    updatedAt: "2026-06-15T13:20:00",
  },
];

export const initialMockRouteStops: RouteStop[] = [
  {
    id: "stop-001",
    routeId: "route-001",
    storeId: "store-001",
    storeCode: "ST-BT-001",
    storeName: "Điện Máy Thiên Hà",
    address: "102 Đinh Tiên Hoàng",
    latitude: 10.7992,
    longitude: 106.7061,
    hasCoordinates: true,
    sequenceOrder: 1,
  },
  {
    id: "stop-002",
    routeId: "route-001",
    storeId: "store-002",
    storeCode: "ST-BT-002",
    storeName: "Shop Điện Tử Minh Phát",
    address: "45 Bạch Đằng",
    latitude: 10.8031,
    longitude: 106.7094,
    hasCoordinates: true,
    sequenceOrder: 2,
  },
  {
    id: "stop-003",
    routeId: "route-001",
    storeId: "store-003",
    storeCode: "ST-BT-003",
    storeName: "Siêu Thị Điện Máy Phú Hoà",
    address: "218 Xô Viết Nghệ Tĩnh",
    latitude: 10.8094,
    longitude: 106.7132,
    hasCoordinates: true,
    sequenceOrder: 3,
  },
  {
    id: "stop-004",
    routeId: "route-001",
    storeId: "store-004",
    storeCode: "ST-BT-004",
    storeName: "Điện Lạnh Thanh Bình",
    address: "67 Nguyễn Xí",
    latitude: null,
    longitude: null,
    hasCoordinates: false,
    sequenceOrder: 4,
  },
];

const ROUTES_STORAGE_KEY = 'elog_mock_routes';
const STOPS_STORAGE_KEY = 'elog_mock_route_stops';

const getStoredRoutes = (): DeliveryRoute[] => {
  const stored = localStorage.getItem(ROUTES_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse mock routes', e);
    }
  }
  return initialMockRoutes;
};

const getStoredRouteStops = (): RouteStop[] => {
  const stored = localStorage.getItem(STOPS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse mock stops', e);
    }
  }
  return initialMockRouteStops;
};

export let mockRoutes: DeliveryRoute[] = getStoredRoutes();
export let mockRouteStops: RouteStop[] = getStoredRouteStops();

export const saveMockRoutes = (routes: DeliveryRoute[]) => {
  mockRoutes = routes;
  localStorage.setItem(ROUTES_STORAGE_KEY, JSON.stringify(routes));
};

export const saveMockRouteStops = (stops: RouteStop[]) => {
  mockRouteStops = stops;
  localStorage.setItem(STOPS_STORAGE_KEY, JSON.stringify(stops));
};

export const resetMockRouteData = () => {
  mockRoutes = [...initialMockRoutes];
  mockRouteStops = [...initialMockRouteStops];
  localStorage.setItem(ROUTES_STORAGE_KEY, JSON.stringify(mockRoutes));
  localStorage.setItem(STOPS_STORAGE_KEY, JSON.stringify(mockRouteStops));
};
