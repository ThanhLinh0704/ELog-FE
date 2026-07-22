import React from 'react';
import { Navigate } from 'react-router-dom';
import { PERMISSIONS } from '../constants/permissions';
import { hasPermission } from '../utils/permissionChecker';

interface MonitoringGuardProps {
  children: React.ReactNode;
}

const MonitoringGuard: React.FC<MonitoringGuardProps> = ({ children }) => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = hasPermission(PERMISSIONS.TRIP_READ);

  if (!hasAccess) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default MonitoringGuard;
