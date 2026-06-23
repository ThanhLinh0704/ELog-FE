import type { UserRole } from '../types/route';

export const canManageRoutes = (role: UserRole | string): boolean => role === "SYSTEM_ADMIN";

export const canViewRoutes = (role: UserRole | string): boolean =>
  [
    "SYSTEM_ADMIN",
    "DISPATCHER",
    "LOGISTICS_MANAGER",
  ].includes(role);
