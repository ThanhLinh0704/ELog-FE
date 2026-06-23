import React from 'react';
import { Navigate } from 'react-router-dom';
import { canViewRoutes } from '../utils/routePermissions';

interface RouteManagementGuardProps {
  children: React.ReactNode;
}

const RouteManagementGuard: React.FC<RouteManagementGuardProps> = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) {
      roles = JSON.parse(rolesStr);
    }
  } catch (e) {
    console.error('Failed to parse roles in Guard', e);
  }

  const hasAccess = roles.some(role => canViewRoutes(role));

  if (!hasAccess) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default RouteManagementGuard;
