export const PERMISSIONS = {
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',

  ROLE_READ: 'role:read',
  ROLE_WRITE: 'role:write',

  VEHICLE_READ: 'vehicle:read',
  VEHICLE_WRITE: 'vehicle:write',

  ROUTE_READ: 'route:read',
  ROUTE_WRITE: 'route:write',

  STORE_READ: 'store:read',
  STORE_WRITE: 'store:write',

  PRODUCT_READ: 'product:read',
  PRODUCT_WRITE: 'product:write',

  ORDER_IMPORT: 'order:import',

  TRIP_READ: 'trip:read',
  TRIP_WRITE: 'trip:write',
  TRIP_CONFIRM: 'trip:confirm',
  TRIP_COORDINATE: 'trip:coordinate',
  TRIP_EXECUTE: 'trip:execute',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
