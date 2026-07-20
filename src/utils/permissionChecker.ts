export function getCurrentPermissions(): string[] {
  try {
    const raw = localStorage.getItem('permissions');

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (permission): permission is string => typeof permission === 'string'
    );
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
