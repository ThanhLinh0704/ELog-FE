import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Button, ConfigProvider, Dropdown, Layout, Menu, Space } from 'antd';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ClipboardCheck,
  FileSpreadsheet,
  History,
  Home,
  Layers,
  LayoutGrid,
  LogOut,
  Map,
  Navigation,
  Package,
  Settings,
  Truck,
  UserCog,
  Users,
} from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import { PERMISSIONS } from '../constants/permissions';
import { usePermissions } from '../hooks/usePermissions';
import { antdTheme, palette } from '../theme/tokens';

const { Header, Sider, Content } = Layout;

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

const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: 'System Admin',
  DISPATCHER: 'Điều phối viên',
  LOGISTICS_MANAGER: 'Quản lý Logistics',
  DRIVER: 'Tài xế',
};

const AdminShell: React.FC<AdminShellProps> = ({ currentUser, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = usePermissions();

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await axiosInstance.post('/api/v1/auth/logout', { refreshToken });
      } catch (err) {
        console.error('Failed to logout in backend', err);
      }
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('roles');
    localStorage.removeItem('permissions');
    localStorage.removeItem('remember');
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
      : location.pathname.startsWith('/dispatcher/import')
        ? '/dispatcher/import'
        : location.pathname.startsWith('/dispatcher/trip-drafts')
          ? '/dispatcher/trip-drafts'
          : location.pathname.startsWith('/dispatcher/monitoring')
            ? '/dispatcher/monitoring'
            : location.pathname.startsWith('/manager/monitoring')
              ? '/dispatcher/monitoring'
              : location.pathname.startsWith('/dispatcher/exceptions')
                ? '/exceptions'
                : location.pathname.startsWith('/manager/exceptions')
                  ? '/exceptions'
                  : location.pathname.startsWith('/dispatcher/kpi')
                    ? '/kpi'
                    : location.pathname.startsWith('/manager/kpi')
                      ? '/kpi'
                      : location.pathname.startsWith('/dispatcher/activity-history')
                        ? '/activity-history'
                        : location.pathname.startsWith('/manager/activity-history')
                          ? '/activity-history'
                          : location.pathname.startsWith('/dispatcher/trip-outcomes') || location.pathname.startsWith('/manager/trip-outcomes')
                            ? '/dispatcher/trip-outcomes'
                            : location.pathname.startsWith('/driver/my-trips')
                              ? '/driver/my-trips'
                              : location.pathname.startsWith('/trip-drafts')
                                ? '/trip-drafts'
                                : location.pathname;

  const roles = currentUser.roles || [];
  const roleLabel = roles.map((role) => ROLE_LABELS[role] || role).join(', ') || 'User';
  const canViewImport = can(PERMISSIONS.ORDER_IMPORT) || can(PERMISSIONS.TRIP_READ);
  const canViewTripDraftsMenu = can(PERMISSIONS.TRIP_READ);
  const canViewMonitoring = can(PERMISSIONS.TRIP_READ);
  const canViewTripOutcomes = can(PERMISSIONS.TRIP_READ);
  const canViewExceptions = can(PERMISSIONS.TRIP_READ);
  const canViewKpi = can(PERMISSIONS.KPI_READ);
  const canViewActivityHistory = can(PERMISSIONS.TRIP_READ) || can(PERMISSIONS.PLANNING_HISTORY_READ);
  const canViewDriverTrips = can(PERMISSIONS.TRIP_EXECUTE);

  const sidebarMenuItems = [
    {
      key: 'grp-main',
      label: (
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: palette.sidebarTextMuted }}>
          QUẢN TRỊ CHÍNH
        </span>
      ),
      type: 'group' as const,
      children: [
        {
          key: '/dashboard',
          icon: <LayoutGrid size={ICON_SIZE} />,
          label: 'Tổng quan',
          onClick: () => navigate('/dashboard'),
        },
        can(PERMISSIONS.ROLE_READ)
          ? {
              key: '/roles',
              icon: <Settings size={ICON_SIZE} />,
              label: 'Phân quyền',
              onClick: () => navigate('/roles'),
            }
          : null,
        can(PERMISSIONS.USER_READ)
          ? {
              key: '/users',
              icon: <Users size={ICON_SIZE} />,
              label: 'Quản lý người dùng',
              onClick: () => navigate('/users'),
            }
          : null,
        can(PERMISSIONS.DRIVER_READ)
          ? {
              key: '/admin/drivers',
              icon: <UserCog size={ICON_SIZE} />,
              label: 'Quản lý tài xế',
              onClick: () => navigate('/admin/drivers'),
            }
          : null,
        can(PERMISSIONS.STORE_READ)
          ? {
              key: '/stores',
              icon: <Home size={ICON_SIZE} />,
              label: 'Quản lý cửa hàng',
              onClick: () => navigate('/stores'),
            }
          : null,
        can(PERMISSIONS.VEHICLE_READ)
          ? {
              key: '/vehicles',
              icon: <Truck size={ICON_SIZE} />,
              label: 'Quản lý xe',
              onClick: () => navigate('/vehicles'),
            }
          : null,
        can(PERMISSIONS.PRODUCT_READ)
          ? {
              key: '/admin/products',
              icon: <Package size={ICON_SIZE} />,
              label: 'Quản lý sản phẩm',
              onClick: () => navigate('/admin/products'),
            }
          : null,
        can(PERMISSIONS.ROUTE_READ)
          ? {
              key: '/admin/routes',
              icon: <Map size={ICON_SIZE} />,
              label: 'Quản lý tuyến',
              onClick: () => navigate('/admin/routes'),
            }
          : null,
        canViewImport
          ? {
              key: '/dispatcher/import',
              icon: <FileSpreadsheet size={ICON_SIZE} />,
              label: 'Nhập đơn hàng',
              onClick: () => navigate('/dispatcher/import'),
            }
          : null,
        canViewTripDraftsMenu
          ? {
              key: '/dispatcher/trip-drafts',
              icon: <Layers size={ICON_SIZE} />,
              label: 'Quản lý gom đơn',
              onClick: () => navigate('/dispatcher/trip-drafts'),
            }
          : null,

        canViewMonitoring
          ? {
              key: '/dispatcher/monitoring',
              icon: <Activity size={ICON_SIZE} />,
              label: 'Theo dõi chuyến hàng',
              onClick: () => navigate('/dispatcher/monitoring'),
            }
          : null,
        canViewTripOutcomes
          ? {
              key: '/dispatcher/trip-outcomes',
              icon: <ClipboardCheck size={ICON_SIZE} />,
              label: 'Nghiệm thu chuyến hàng',
              onClick: () => navigate('/dispatcher/trip-outcomes'),
            }
          : null,
        canViewExceptions
          ? {
              key: '/exceptions',
              icon: <AlertTriangle size={ICON_SIZE} />,
              label: 'Quản lý ngoại lệ',
              onClick: () => navigate('/dispatcher/exceptions'),
            }
          : null,
        canViewKpi
          ? {
              key: '/kpi',
              icon: <BarChart3 size={ICON_SIZE} />,
              label: 'KPI vận hành',
              onClick: () => navigate('/dispatcher/kpi'),
            }
          : null,
        canViewActivityHistory
          ? {
              key: '/activity-history',
              icon: <History size={ICON_SIZE} />,
              label: 'Nhật ký hoạt động',
              onClick: () => navigate('/dispatcher/activity-history'),
            }
          : null,
      ].filter((item): item is Exclude<typeof item, null> => item !== null),
    },
  ];

  return (
    <ConfigProvider theme={antdTheme}>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider theme="dark" width={260} className="elog-admin-sider">
          <div onClick={() => navigate('/dashboard')} className="elog-sidebar-logo">
            <div className="elog-logo-badge">E</div>
            <div style={{ lineHeight: 1.2 }}>
              <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: palette.sidebarTextActive, letterSpacing: 0.4 }}>
                ELog Quản trị
              </h1>
              <p style={{ margin: 0, fontSize: 10, color: palette.sidebarTextMuted, fontWeight: 500 }}>
                Bảng điều khiển hệ thống
              </p>
            </div>
          </div>

          <div className="elog-sidebar-menu-wrapper">
            <div className="elog-sidebar-menu-scrollable">
              <Menu
                mode="inline"
                theme="dark"
                selectedKeys={[selectedKey]}
                items={sidebarMenuItems}
                style={{ borderRight: 0, padding: '16px 0', background: palette.navySider }}
              />
            </div>

            <div className="elog-sidebar-profile">
              <div className="elog-profile-info">
                <Avatar
                  style={{
                    backgroundColor: palette.primaryBg,
                    color: palette.primary,
                    fontWeight: 600,
                    marginRight: 12,
                  }}
                >
                  {(currentUser.fullName || currentUser.username).slice(0, 1).toUpperCase()}
                </Avatar>
                <div style={{ lineHeight: 1.2 }}>
                  <div className="elog-profile-name">
                    {currentUser.fullName || currentUser.username}
                  </div>
                  <div style={{ fontSize: 11, color: palette.sidebarTextMuted }}>{roleLabel}</div>
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
          <Header className="elog-admin-header" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
            <Space size={12}>
              <Dropdown menu={userMenuItems} placement="bottomRight" trigger={['click']}>
                <Button type="text" style={{ height: 40, padding: '0 8px', borderRadius: 10 }}>
                  <Space>
                    <Avatar size="small" style={{ backgroundColor: palette.primary }}>
                      {(currentUser.fullName || currentUser.username).slice(0, 1).toUpperCase()}
                    </Avatar>
                    <span style={{ color: palette.textBody, fontWeight: 500 }}>
                      {currentUser.fullName || currentUser.username}
                    </span>
                    <ChevronDown size={CHEVRON_ICON_SIZE} style={{ color: palette.textFaint }} />
                  </Space>
                </Button>
              </Dropdown>
            </Space>
          </Header>
          <Content style={{ margin: '24px', minHeight: 280 }}>{children}</Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default AdminShell;
