import React from 'react';
import { Navigate } from 'react-router-dom';

interface ExceptionGuardProps {
  children: React.ReactNode;
}

const ExceptionGuard: React.FC<ExceptionGuardProps> = ({ children }) => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ExceptionGuard;
