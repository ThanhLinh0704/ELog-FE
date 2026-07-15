import React from 'react';
import { Navigate } from 'react-router-dom';
import { canViewImportHistory } from '../utils/importPermissions';

interface ImportModuleGuardProps {
  children: React.ReactNode;
}

const ImportModuleGuard: React.FC<ImportModuleGuardProps> = ({ children }) => {
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

  const hasAccess = canViewImportHistory(roles);

  if (!hasAccess) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default ImportModuleGuard;
