import { useCallback, useMemo } from 'react';
import { getCurrentPermissions } from '../utils/permissionChecker';

export function usePermissions() {
  const permissions = useMemo(() => getCurrentPermissions(), []);

  const can = useCallback(
    (permission: string) => permissions.includes(permission),
    [permissions]
  );

  const canAny = useCallback(
    (requiredPermissions: string[]) => {
      if (requiredPermissions.length === 0) {
        return true;
      }

      return requiredPermissions.some((permission) =>
        permissions.includes(permission)
      );
    },
    [permissions]
  );

  const canAll = useCallback(
    (requiredPermissions: string[]) => {
      if (requiredPermissions.length === 0) {
        return true;
      }

      return requiredPermissions.every((permission) =>
        permissions.includes(permission)
      );
    },
    [permissions]
  );

  return {
    permissions,
    can,
    canAny,
    canAll,
  };
}
