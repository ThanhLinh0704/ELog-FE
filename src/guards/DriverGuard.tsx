import React from 'react';
import { Navigate } from 'react-router-dom';
import { PERMISSIONS } from '../constants/permissions';
import { hasPermission } from '../utils/permissionChecker';

interface DriverGuardProps {
  children: React.ReactNode;
}

const DriverGuard: React.FC<DriverGuardProps> = ({ children }) => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = hasPermission(PERMISSIONS.TRIP_EXECUTE);

  if (!hasAccess) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default DriverGuard;
