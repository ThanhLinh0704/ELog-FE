import React from 'react';
import { Navigate } from 'react-router-dom';
import { PERMISSIONS } from '../constants/permissions';
import { hasPermission } from '../utils/permissionChecker';

interface DriverGuardProps {
  children: React.ReactNode;
}

const DriverGuard: React.FC<DriverGuardProps> = () => {
  // Giao diện Driver không dùng trên Web mà chỉ chạy trên App Flutter
  return <Navigate to="/403" replace />;
};

export default DriverGuard;
