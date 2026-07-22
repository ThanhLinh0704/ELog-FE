import { PERMISSIONS } from '../constants/permissions';
import { hasPermission } from './permissionChecker';

export const canManageRoutes = (): boolean => hasPermission(PERMISSIONS.ROUTE_WRITE);

export const canViewRoutes = (): boolean => hasPermission(PERMISSIONS.ROUTE_READ);
