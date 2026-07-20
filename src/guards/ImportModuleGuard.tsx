import React from 'react';
import { Navigate } from 'react-router-dom';
import { PERMISSIONS } from '../constants/permissions';
import { hasAnyPermission } from '../utils/permissionChecker';

interface ImportModuleGuardProps {
  children: React.ReactNode;
}

const ImportModuleGuard: React.FC<ImportModuleGuardProps> = ({ children }) => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = hasAnyPermission([PERMISSIONS.ORDER_IMPORT, PERMISSIONS.TRIP_READ]);

  if (!hasAccess) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default ImportModuleGuard;
