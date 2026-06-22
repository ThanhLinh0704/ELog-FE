import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronDown,
  LogOut,
  Search,
  ShieldCheck,
  Users,
  Home,
  Store as StoreIcon,
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import '../styles/layout/AdminShell.css';

interface AdminShellProps {
  currentUser: {
    id: number;
    username: string;
    fullName: string;
    roles: string[];
  };
  children: React.ReactNode;
}

const AdminShell: React.FC<AdminShellProps> = ({ currentUser, children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

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
    <div className="app-shell">
      <aside className="sidebar">
        <div
          className="brand"
          onClick={() => navigate('/dashboard')}
          style={{ cursor: 'pointer' }}
        >
          <div className="brand-logo">E</div>
          <div>
            <h1>ELog Admin</h1>
            <p>User Access Control</p>
          </div>
        </div>

        <nav className="side-nav">
          <p>Hệ thống</p>

          <button
            className={`side-link ${isActivePath('/dashboard') ? 'active' : ''}`}
            onClick={() => navigate('/dashboard')}
            type="button"
          >
            <Home size={18} /> Dashboard
          </button>

          <p>Quản trị</p>

          <button
            className={`side-link ${isActivePath('/users') ? 'active' : ''}`}
            onClick={() => navigate('/users')}
            type="button"
          >
            <Users size={18} /> Quản lý người dùng
          </button>

          <button
            className={`side-link ${isActivePath('/stores') ? 'active' : ''}`}
            onClick={() => navigate('/stores')}
            type="button"
          >
            <StoreIcon size={18} /> Quản lý cửa hàng
          </button>

          <button className="side-link disabled" type="button">
            <ShieldCheck size={18} /> Phân quyền nâng cao
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="mini-user">
            <div className="avatar">A</div>
            <div>
              <strong>{currentUser.fullName || currentUser.username}</strong>
              <span>System Admin</span>
            </div>
          </div>

          <button className="logout-btn" onClick={handleLogout} type="button">
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="top-search">
            <Search size={17} />
            <input placeholder="Tìm kiếm nhanh..." />
          </div>

          <div className="top-actions">
            <button className="top-icon" type="button">
              <Bell size={18} />
              <span />
            </button>

            <button className="profile-btn" type="button">
              <div className="avatar small">A</div>
              {currentUser.fullName || currentUser.username}
              <ChevronDown size={16} />
            </button>
          </div>
        </header>

        <main className="content">{children}</main>
      </section>
    </div>
  );
};

export default AdminShell;