import React from 'react';
import { Navigate } from 'react-router-dom';
import { PERMISSIONS } from '../constants/permissions';
import { hasPermission } from '../utils/permissionChecker';

interface RouteManagementGuardProps {
  children: React.ReactNode;
}

const RouteManagementGuard: React.FC<RouteManagementGuardProps> = ({ children }) => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = hasPermission(PERMISSIONS.ROUTE_READ);

  if (!hasAccess) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default RouteManagementGuard;
