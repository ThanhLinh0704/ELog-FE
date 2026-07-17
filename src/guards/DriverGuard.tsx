import React from 'react';
import { Navigate } from 'react-router-dom';

interface DriverGuardProps {
  children: React.ReactNode;
}

/**
 * Route guard for US-17 Driver web view.
 * Allows: DRIVER
 * Denies: other roles
 */
const DriverGuard: React.FC<DriverGuardProps> = ({ children }) => {
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
    console.error('Failed to parse roles in DriverGuard', e);
  }

  const hasAccess = roles.includes('DRIVER');

  if (!hasAccess) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default DriverGuard;
