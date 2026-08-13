export type RouteStatus = "ACTIVE" | "INACTIVE";

export type UserRole =
  | "SYSTEM_ADMIN"
  | "DISPATCHER"
  | "LOGISTICS_MANAGER"
  | "WAREHOUSE_STAFF"
  | "DRIVER";

export interface DeliveryRoute {
  id: string;
  code: string;
  name: string;
  description?: string;
  status: RouteStatus;
  stopCount: number;
  coordinatesWarningCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RouteStop {
  id: string;
  routeId: string;
  storeId: string;
  storeCode: string;
  storeName: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  hasCoordinates: boolean;
  sequenceOrder: number;
}

export interface StoreSearchResult {
  id: string;
  code: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  hasCoordinates: boolean;
  isActive: boolean;
  routeId: string | null;
}

export interface RouteDirections {
  routeId: string;
  routeCode: string;
  routeName: string;
  routePolyline: string | null;
  totalDistanceKm: number | null;
  totalDurationMin: number | null;
  warehouseLat: number;
  warehouseLng: number;
}
