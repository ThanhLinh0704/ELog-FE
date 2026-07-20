import { PERMISSIONS } from '../constants/permissions';
import { hasAnyPermission, hasPermission } from './permissionChecker';

export const canUploadOrders = (): boolean => hasPermission(PERMISSIONS.ORDER_IMPORT);

export const canViewImportHistory = (): boolean =>
  hasAnyPermission([PERMISSIONS.ORDER_IMPORT, PERMISSIONS.TRIP_READ]);

export const canViewTripDrafts = (): boolean => hasPermission(PERMISSIONS.TRIP_READ);

export const canConsolidate = (): boolean => hasPermission(PERMISSIONS.TRIP_WRITE);
