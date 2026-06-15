import React from 'react';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || 'Guest';
  const userId = localStorage.getItem('userId') || 'N/A';
  
  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) {
      roles = JSON.parse(rolesStr);
    }
  } catch (e) {
    console.error('Failed to parse roles', e);
  }

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '40px',
      maxWidth: '600px',
      margin: '40px auto',
      backgroundColor: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
    }}>
      <h1 style={{ color: '#0f172a', marginBottom: '8px' }}>ELog Dashboard</h1>
      <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '24px' }}>
        Welcome back, <strong style={{ color: '#2563eb' }}>{username}</strong>!
      </p>

      <div style={{
        backgroundColor: '#f8fafc',
        padding: '16px',
        borderRadius: '8px',
        marginBottom: '24px',
        fontSize: '14px',
        lineHeight: '1.6'
      }}>
        <div style={{ marginBottom: '8px' }}>
          <strong>User ID:</strong> <span style={{ color: '#334155' }}>{userId}</span>
        </div>
        <div>
          <strong>Roles:</strong>{' '}
          {roles.length > 0 ? (
            roles.map((role, idx) => (
              <span
                key={idx}
                style={{
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginRight: '6px'
                }}
              >
                {role}
              </span>
            ))
          ) : (
            <span style={{ color: '#64748b' }}>None</span>
          )}
        </div>
      </div>

      <button
        onClick={handleLogout}
        style={{
          backgroundColor: '#ef4444',
          color: '#ffffff',
          border: 'none',
          padding: '10px 18px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
      >
        Sign Out
      </button>
    </div>
  );
};

export default DashboardPage;
