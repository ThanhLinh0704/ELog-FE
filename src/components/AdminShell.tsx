import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Button, Space, Input, Badge, ConfigProvider } from 'antd';
import { Bell, ChevronDown, LogOut, Search, Users, LayoutGrid, Store, Map, Settings } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';

const { Header, Sider, Content } = Layout;

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
        icon: <LogOut size={16} />,
        danger: true,
        onClick: handleLogout,
      },
    ],
  };

  const selectedKey = location.pathname;

  const sidebarMenuItems = [
    {
      key: 'grp-main',
      label: <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: '#64748b' }}>QUẢN TRỊ CHÍNH</span>,
      type: 'group' as const,
      children: [
        {
          key: '/dashboard',
          icon: <LayoutGrid size={18} />,
          label: 'Tổng quan',
          onClick: () => navigate('/dashboard'),
        },
        {
          key: '/users',
          icon: <Users size={18} />,
          label: 'Quản lý người dùng',
          onClick: () => navigate('/users'),
        },
        {
          key: '/stores',
          icon: <Store size={18} />,
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
          key: '/routes',
          icon: <Map size={18} />,
          label: (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>Quản lý tuyến</span>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>Sau</span>
            </div>
          ),
          disabled: true,
        },
        {
          key: '/settings',
          icon: <Settings size={18} />,
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
          style={{
            borderRight: '1px solid rgba(255, 255, 255, 0.05)',
            position: 'fixed',
            height: '100vh',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            background: '#0d1727',
          }}
        >
          <div 
            onClick={() => navigate('/dashboard')} 
            style={{ 
              height: 64, 
              display: 'flex', 
              alignItems: 'center', 
              padding: '0 24px', 
              cursor: 'pointer',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              background: '#0d1727'
            }}
          >
            <div 
              style={{ 
                width: 34, 
                height: 34, 
                borderRadius: 10, 
                background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                marginRight: 12, 
                fontWeight: 800, 
                fontSize: 18,
                color: '#fff',
                boxShadow: '0 4px 12px rgba(6, 182, 212, 0.2)'
              }}
            >
              E
            </div>
            <div style={{ lineHeight: 1.2 }}>
              <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#ffffff' }}>ELog Admin</h1>
              <p style={{ margin: 0, fontSize: 10, color: '#64748b', fontWeight: 500 }}>System Dashboard</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', justifyContent: 'space-between' }}>
            <Menu
              mode="inline"
              theme="dark"
              selectedKeys={[selectedKey]}
              items={sidebarMenuItems}
              style={{ borderRight: 0, padding: '16px 0', background: '#0d1727' }}
            />

            <div 
              style={{ 
                padding: '16px 24px', 
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                backgroundColor: '#09101c'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
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
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#ffffff', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentUser.fullName || currentUser.username}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>System Admin</div>
                </div>
              </div>
              <Button 
                type="default" 
                danger 
                icon={<LogOut size={15} />} 
                onClick={handleLogout}
                style={{ 
                  width: '100%', 
                  borderRadius: 8, 
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.85)',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Đăng xuất
              </Button>
            </div>
          </div>
        </Sider>

        <Layout style={{ marginLeft: 260 }}>
          <Header 
            style={{ 
              background: '#fff', 
              padding: '0 24px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              height: 64,
              borderBottom: '1px solid #f0f0f0',
              position: 'sticky',
              top: 0,
              zIndex: 99,
            }}
          >
            <Input 
              prefix={<Search size={16} style={{ color: '#bfbfbf' }} />} 
              placeholder="Tìm kiếm nhanh..." 
              style={{ width: 250, borderRadius: 6 }}
            />
            <Space size={16}>
              <Badge dot color="#ff4d4f">
                <Button 
                  type="text" 
                  shape="circle" 
                  icon={<Bell size={18} style={{ color: '#595959' }} />} 
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
                    <ChevronDown size={14} style={{ color: '#8c8c8c' }} />
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
