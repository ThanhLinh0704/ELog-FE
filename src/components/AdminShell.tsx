import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Button, Space, Input, Badge, ConfigProvider } from 'antd';
import { Bell, ChevronDown, LogOut, Search, Users, LayoutGrid, Store, Map, Settings, Package, Home, Truck } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';

const { Header, Sider, Content } = Layout;

// JavaScript Constants for centralized Icon Sizes
const ICON_SIZE = 18;
const UTILITY_ICON_SIZE = 15;
const CHEVRON_ICON_SIZE = 14;

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

  const userMenuItems = {
    items: [
      {
        key: 'logout',
        label: 'Đăng xuất',
        icon: <LogOut size={ICON_SIZE - 2} />,
        danger: true,
        onClick: handleLogout,
      },
    ],
  };

  const selectedKey = location.pathname.startsWith('/admin/products')
    ? '/admin/products'
    : location.pathname.startsWith('/admin/routes')
    ? '/admin/routes'
    : location.pathname;

  const sidebarMenuItems = [
    {
      key: 'grp-main',
      label: <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: '#64748b' }}>QUẢN TRỊ CHÍNH</span>,
      type: 'group' as const,
      children: [
        {
          key: '/dashboard',
          icon: <LayoutGrid size={ICON_SIZE} />,
          label: 'Tổng quan',
          onClick: () => navigate('/dashboard'),
        },
        {
          key: '/users',
          icon: <Users size={ICON_SIZE} />,
          label: 'Quản lý người dùng',
          onClick: () => navigate('/users'),
        },
         {
          key: '/stores',
          icon: <Home size={ICON_SIZE} />,
          label: 'Quản lý kho hàng',
          onClick: () => navigate('/stores'),
        },
         {
          key: '/vehicles',
          icon: <Truck size={ICON_SIZE} />,
          label: 'Quản lý xe cộ',
          onClick: () => navigate('/vehicles'),
        },

        {
          key: '/admin/products',
          icon: <Package size={ICON_SIZE} />,
          label: 'Quản lý sản phẩm',
          onClick: () => navigate('/admin/products'),
        },
        {
          key: '/admin/routes',
          icon: <Map size={ICON_SIZE} />,
          label: 'Quản lý tuyến',
          onClick: () => navigate('/admin/routes'),
        },
        {
          key: '/stores',
          icon: <Store size={ICON_SIZE} />,
          label: 'Quản lý cửa hàng',
          disabled: true,
        },
      ],
    },
    {
      key: 'grp-extend',
      label: <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: '#64748b' }}>MỞ RỘNG SAU</span>,
      type: 'group' as const,
      children: [
        {
          key: '/settings',
          icon: <Settings size={ICON_SIZE} />,
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>Cài đặt hệ thống</span>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>Sau</span>
            </div>
          ),
          disabled: true,
        },
      ],
    },
  ];

  return (
    <ConfigProvider
      theme={{
        components: {
          Layout: {
            siderBg: '#0d1727',
          },
          Menu: {
            darkItemBg: '#0d1727',
            darkItemColor: '#a6b0cf',
            darkItemHoverBg: 'rgba(255, 255, 255, 0.05)',
            darkItemSelectedBg: 'rgba(255, 255, 255, 0.08)',
            darkItemSelectedColor: '#ffffff',
            darkSubMenuItemBg: '#0d1727',
            darkGroupTitleColor: '#64748b',
          },
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          theme="dark"
          width={260}
          className="elog-admin-sider"
        >
          <div 
            onClick={() => navigate('/dashboard')} 
            className="elog-sidebar-logo"
          >
            <div className="elog-logo-badge">
              E
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#ffffff' }}>ELog Admin</h1>
              <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 500 }}>System Dashboard</p>
            </div>
          </div>

          <div className="elog-sidebar-menu-wrapper">
            <Menu
              mode="inline"
              theme="dark"
              selectedKeys={[selectedKey]}
              items={sidebarMenuItems}
              style={{ borderRight: 0, padding: '16px 0', background: '#0d1727' }}
            />

            <div className="elog-sidebar-profile">
              <div className="elog-profile-info">
                <Avatar 
                  style={{ 
                    backgroundColor: '#e6f7ff', 
                    color: '#1677ff', 
                    fontWeight: 600,
                    marginRight: 12 
                  }}
                >
                  {(currentUser.fullName || currentUser.username).slice(0, 1).toUpperCase()}
                </Avatar>
                <div style={{ lineHeight: 1.2 }}>
                  <div className="elog-profile-name">
                    {currentUser.fullName || currentUser.username}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>System Admin</div>
                </div>
              </div>
              <Button 
                type="default" 
                danger 
                icon={<LogOut size={UTILITY_ICON_SIZE} />} 
                onClick={handleLogout}
                className="elog-logout-btn"
              >
                Đăng xuất
              </Button>
            </div>
          </div>
        </Sider>

        <Layout style={{ marginLeft: 260 }}>
          <Header className="elog-admin-header">
            <Input 
              prefix={<Search size={ICON_SIZE - 2} style={{ color: '#bfbfbf' }} />} 
              placeholder="Tìm kiếm nhanh..." 
              style={{ width: 250, borderRadius: 6 }}
            />
            <Space size={16}>
              <Badge dot color="#ff4d4f">
                <Button 
                  type="text" 
                  shape="circle" 
                  icon={<Bell size={ICON_SIZE} style={{ color: '#595959' }} />} 
                />
              </Badge>
              <Dropdown menu={userMenuItems} placement="bottomRight" trigger={['click']}>
                <Button type="text" style={{ height: 40, padding: '0 8px' }}>
                  <Space>
                    <Avatar size="small" style={{ backgroundColor: '#1677ff' }}>
                      {(currentUser.fullName || currentUser.username).slice(0, 1).toUpperCase()}
                    </Avatar>
                    <span style={{ color: '#595959', fontWeight: 500 }}>
                      {currentUser.fullName || currentUser.username}
                    </span>
                    <ChevronDown size={CHEVRON_ICON_SIZE} style={{ color: '#8c8c8c' }} />
                  </Space>
                </Button>
              </Dropdown>
            </Space>
          </Header>
          <Content style={{ margin: '24px', minHeight: 280 }}>
            {children}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default AdminShell;