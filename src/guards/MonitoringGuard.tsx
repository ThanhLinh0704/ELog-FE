import React from 'react';
import { Navigate } from 'react-router-dom';

interface MonitoringGuardProps {
  children: React.ReactNode;
}

const MonitoringGuard: React.FC<MonitoringGuardProps> = ({ children }) => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default MonitoringGuard;
