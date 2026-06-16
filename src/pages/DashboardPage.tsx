import React from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import '../styles/dashboard/DashboardPage.css';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';
  
  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) {
      roles = JSON.parse(rolesStr);
    }
  } catch (e) {
    console.error('Failed to parse roles', e);
  }

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await axiosInstance.post('/api/auth/logout', { refreshToken });
      } catch (err) {
        console.error('Failed to logout in backend', err);
      }
    }
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div className="elog-dashboard-page">
      {/* Background Vectors & Ambience to match Login aesthetics */}
      <div className="elog-dashboard-bg-grid" />
      <div className="elog-dashboard-blob elog-dashboard-blob-1" />
      <div className="elog-dashboard-blob elog-dashboard-blob-2" />

      <div className="elog-dashboard-container">
        {/* Header section with ELog branding */}
        <div className="elog-dashboard-header">
          <div className="elog-dashboard-logo-box">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="1" y="3" width="15" height="13" rx="2" ry="2" fill="currentColor" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" fill="currentColor" />
              <circle cx="5.5" cy="18.5" r="2.5" fill="currentColor" />
              <circle cx="18.5" cy="18.5" r="2.5" fill="currentColor" />
            </svg>
          </div>
          <h2 className="elog-dashboard-logo-title">ELog</h2>
        </div>

        <h1 className="elog-dashboard-title">Dashboard</h1>
        <p className="elog-dashboard-welcome">
          Welcome back, <span className="elog-dashboard-username">{username}</span>!
        </p>

        {/* User telemetry info block */}
        <div className="elog-dashboard-info">
          <div className="elog-dashboard-info-row">
            <span className="elog-dashboard-info-lbl">User ID:</span>
            <span className="elog-dashboard-info-val">{userId}</span>
          </div>
          <div className="elog-dashboard-info-row">
            <span className="elog-dashboard-info-lbl">Roles:</span>
            <span className="elog-dashboard-info-val">
              {roles.length > 0 ? (
                roles.map((role, idx) => (
                  <span key={idx} className="elog-dashboard-role-badge">
                    {role}
                  </span>
                ))
              ) : (
                <span className="elog-dashboard-role-empty">None</span>
              )}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button className="elog-dashboard-btn-logout" onClick={handleLogout}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default DashboardPage;
