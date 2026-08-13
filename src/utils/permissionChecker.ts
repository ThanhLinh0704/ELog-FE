import { PERMISSIONS } from '../constants/permissions';

export function getCurrentPermissions(): string[] {
  try {
    const raw = localStorage.getItem('permissions');

    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(
          (permission): permission is string => typeof permission === 'string'
        );
      }
    }

    // Fallback: If user has SYSTEM_ADMIN role, automatically grant all permissions
    const rolesRaw = localStorage.getItem('roles');
    if (rolesRaw) {
      const roles: unknown = JSON.parse(rolesRaw);
      if (Array.isArray(roles) && roles.includes('SYSTEM_ADMIN')) {
        return Object.values(PERMISSIONS);
      }
    }

    return [];
  } catch (error) {
    console.error('Failed to parse permissions:', error);
    return [];
  }
}

export function hasPermission(permission: string): boolean {
  return getCurrentPermissions().includes(permission);
}

export function hasAnyPermission(requiredPermissions: string[]): boolean {
  if (requiredPermissions.length === 0) {
    return true;
  }

  const currentPermissions = getCurrentPermissions();

  return requiredPermissions.some((permission) =>
    currentPermissions.includes(permission)
  );
}

export function hasAllPermissions(requiredPermissions: string[]): boolean {
  if (requiredPermissions.length === 0) {
    return true;
  }

  const currentPermissions = getCurrentPermissions();

  return requiredPermissions.every((permission) =>
    currentPermissions.includes(permission)
  );
}
