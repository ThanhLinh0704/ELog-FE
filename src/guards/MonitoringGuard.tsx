import React from 'react';
import { Navigate } from 'react-router-dom';

interface MonitoringGuardProps {
  children: React.ReactNode;
}

/**
 * Route guard for US-17 Monitoring Dashboard.
 * Allows: DISPATCHER, LOGISTICS_MANAGER
 * Denies: DRIVER, WAREHOUSE_STAFF, others
 */
const MonitoringGuard: React.FC<MonitoringGuardProps> = ({ children }) => {
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
    console.error('Failed to parse roles in MonitoringGuard', e);
  }

  const hasAccess = roles.some((role) =>
    ['DISPATCHER', 'LOGISTICS_MANAGER', 'SYSTEM_ADMIN'].includes(role)
  );

  if (!hasAccess) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default MonitoringGuard;
