import React from 'react';
import { Navigate } from 'react-router-dom';
import { hasAllPermissions, hasAnyPermission, hasPermission } from '../../utils/permissionChecker';

interface ProtectedPermissionRouteProps {
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
  children: React.ReactNode;
}

const ProtectedPermissionRoute: React.FC<ProtectedPermissionRouteProps> = ({
  permission,
  anyOf,
  allOf,
  children,
}) => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess =
    (!permission || hasPermission(permission)) &&
    (!anyOf || hasAnyPermission(anyOf)) &&
    (!allOf || hasAllPermissions(allOf));

  if (!hasAccess) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default ProtectedPermissionRoute;
