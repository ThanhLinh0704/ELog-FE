import React from 'react';
import { Navigate } from 'react-router-dom';

interface ExceptionGuardProps {
  children: React.ReactNode;
}

/**
 * Route guard for US-18 Exception Management.
 * Allows: DISPATCHER, LOGISTICS_MANAGER, SYSTEM_ADMIN
 * Denies: DRIVER, WAREHOUSE_STAFF, others
 */
const ExceptionGuard: React.FC<ExceptionGuardProps> = ({ children }) => {
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
    console.error('Failed to parse roles in ExceptionGuard', e);
  }

  const hasAccess = roles.some((role) =>
    ['DISPATCHER', 'LOGISTICS_MANAGER', 'SYSTEM_ADMIN'].includes(role)
  );

  if (!hasAccess) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default ExceptionGuard;
