import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Space, Typography, Badge, Spin, Descriptions, Table, DatePicker, Button, Alert, Empty } from 'antd';
import { 
  Users, 
  Store, 
  Truck, 
  Package, 
  Map, 
  ArrowRight, 
  Activity, 
  Database,
  ShieldAlert
} from 'lucide-react';
import AdminShell from '../components/AdminShell';
import StatCard from '../components/StatCard';
import PageHeader from '../components/PageHeader';
import StatusBadge from '../components/StatusBadge';
import { palette } from '../theme/tokens';
import { userApi } from '../api/userApi';
import { storeApi } from '../api/storeApi';
import { vehicleApi } from '../api/vehicleApi';
import { productApi } from '../api/productApi';
import { routeApi } from '../api/routeApi';
import { USE_MOCK_API } from '../config';
import { getMyTrips } from '../api/tripApi';
import type { Trip } from '../types/trip';
import dayjs from 'dayjs';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../constants/permissions';

const { Title, Paragraph, Text } = Typography;

interface SystemStats {
  usersCount: number;
  storesCount: number;
  vehiclesCount: number;
  productsCount: number;
  routesCount: number;
  activeVehicles: number;
  totalWeight: number;
  totalVolume: number;
}

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

  const currentUser = {
    id: Number(userId),
    username,
    fullName: username,
    roles,
  };

  const { can } = usePermissions();
  const canViewDriverTrips = can(PERMISSIONS.TRIP_EXECUTE);
  const canReadUsers = can(PERMISSIONS.USER_READ);
  const canReadStores = can(PERMISSIONS.STORE_READ);
  const canReadVehicles = can(PERMISSIONS.VEHICLE_READ);
  const canReadRoutes = can(PERMISSIONS.ROUTE_READ);
  const canViewManagementDashboard =
    canReadUsers || canReadStores || canReadVehicles || canReadRoutes;
  const showDriverTripsDashboard = canViewDriverTrips && !canViewManagementDashboard;

  const [stats, setStats] = useState<SystemStats>({
    usersCount: 0,
    storesCount: 0,
    vehiclesCount: 0,
    productsCount: 0,
    routesCount: 0,
    activeVehicles: 0,
    totalWeight: 0,
    totalVolume: 0,
  });

  const [loading, setLoading] = useState<boolean>(!showDriverTripsDashboard);
  const [error, setError] = useState<string>('');
  
  const [driverTrips, setDriverTrips] = useState<Trip[]>([]);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [driverLoading, setDriverLoading] = useState<boolean>(false);

  useEffect(() => {
    if (showDriverTripsDashboard) {
      return;
    }
    async function loadStats() {
      setLoading(true);
      setError('');
      try {
        const [usersRes, storesRes, capacityRes, productsRes, routesRes] = await Promise.all([
          canReadUsers ? userApi.getUsers({ page: 0, size: 1 }) : Promise.resolve({ totalElements: 0 }),
          canReadStores ? storeApi.getStores({ page: 0, size: 1 }) : Promise.resolve({ totalElements: 0 }),
          canReadVehicles ? vehicleApi.getFleetCapacity() : Promise.resolve({ activeVehicleCount: 0, totalMaxWeightKg: 0, totalMaxVolumeM3: 0 }),
          productApi.getProducts({ page: 0, size: 1 }),
          canReadRoutes ? routeApi.getRoutes({ page: 0, size: 1 }) : Promise.resolve({ totalElements: 0 }),
        ]);

        // Fallback or count vehicles
        let totalVehicles = capacityRes.activeVehicleCount;
        try {
          if (canReadVehicles) {
            const listVehicles = await vehicleApi.getVehicles({ page: 0, size: 1 });
            totalVehicles = listVehicles.totalElements;
          }
        } catch (vehErr) {
          console.warn('Could not fetch total vehicles count, fallback to active capacity', vehErr);
        }

        setStats({
          usersCount: usersRes.totalElements,
          storesCount: storesRes.totalElements,
          vehiclesCount: totalVehicles,
          productsCount: productsRes.totalElements,
          routesCount: routesRes.totalElements,
          activeVehicles: capacityRes.activeVehicleCount,
          totalWeight: capacityRes.totalMaxWeightKg,
          totalVolume: capacityRes.totalMaxVolumeM3,
        });
      } catch (err: unknown) {
        console.error('Failed to load system stats', err);
        setError('Không thể tải toàn bộ dữ liệu thống kê từ hệ thống.');
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [canReadRoutes, canReadStores, canReadUsers, canReadVehicles, showDriverTripsDashboard]);

  useEffect(() => {
    if (!showDriverTripsDashboard) return;
    async function loadTrips() {
      setDriverLoading(true);
      setError('');
      try {
        const dateStr = selectedDate.format('YYYY-MM-DD');
        const trips = await getMyTrips(dateStr);
        setDriverTrips(trips);
      } catch (err: unknown) {
        console.error('Failed to load driver trips', err);
        setError('Không thể tải danh sách chuyến xe được gán.');
      } finally {
        setDriverLoading(false);
      }
    }
    void loadTrips();
  }, [showDriverTripsDashboard, selectedDate]);

  const quickActions = [
    {
      title: 'Quản lý người dùng',
      desc: 'Quản lý tài khoản, phân chia vai trò và trạng thái hoạt động của nhân viên.',
      icon: <Users size={24} style={{ color: palette.primary }} />,
      path: '/users',
      bgColor: palette.primaryBg,
      borderColor: palette.border,
      visible: canReadUsers,
    },
    {
      title: 'Quản lý cửa hàng',
      desc: 'Quản lý danh sách đại lý, địa chỉ liên hệ và cấu hình tọa độ GPS.',
      icon: <Store size={24} style={{ color: palette.success }} />,
      path: '/stores',
      bgColor: palette.successBg,
      borderColor: palette.border,
      visible: canReadStores,
    },
    {
      title: 'Quản lý xe',
      desc: 'Quản lý đội xe vận chuyển, tải trọng (kg) và thể tích khoang hàng (m³).',
      icon: <Truck size={24} style={{ color: palette.gold }} />,
      path: '/vehicles',
      bgColor: palette.goldBg,
      borderColor: palette.border,
      visible: canReadVehicles,
    },
    {
      title: 'Quản lý sản phẩm',
      desc: 'Danh mục sản phẩm kinh doanh cùng trọng lượng, kích thước vật lý.',
      icon: <Package size={24} style={{ color: palette.teal }} />,
      path: '/admin/products',
      bgColor: palette.tealBg,
      borderColor: palette.border,
      visible: true,
    },
    {
      title: 'Quản lý tuyến đường',
      desc: 'Tối ưu lộ trình, gán cửa hàng dừng chân và phân bổ xe giao hàng.',
      icon: <Map size={24} style={{ color: palette.violet }} />,
      path: '/admin/routes',
      bgColor: palette.violetBg,
      borderColor: palette.border,
      visible: canReadRoutes,
    },
  ].filter((action) => action.visible);

  if (showDriverTripsDashboard) {
    return (
      <AdminShell currentUser={currentUser}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <PageHeader
            title={`Xin chào, ${username}`}
            subtitle="Danh sách chuyến giao hàng đã được gán cho bạn."
            icon={<Truck size={20} />}
          />

          {/* Date Picker Filter */}
          <Card style={{ borderRadius: 10 }}>
            <Space direction="horizontal" align="center" size={12}>
              <Text strong>Chọn ngày giao hàng:</Text>
              <DatePicker 
                value={selectedDate} 
                onChange={(date) => date && setSelectedDate(date)} 
                format="DD/MM/YYYY"
                allowClear={false}
              />
            </Space>
          </Card>

          {/* Driver trips section */}
          <Card 
            title={
              <Space>
                <Truck size={18} style={{ color: '#2563eb' }} />
                <span>Chuyến đi được gán ngày {selectedDate.format('DD/MM/YYYY')}</span>
              </Space>
            }
            style={{ borderRadius: 12 }}
          >
            {driverLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" tip="Đang tải chuyến xe..." />
              </div>
            ) : error ? (
              <Alert type="error" showIcon message={error} />
            ) : driverTrips.length === 0 ? (
              <Empty description="Không có chuyến xe nào được gán cho bạn trong ngày này." />
            ) : (
              <Table
                dataSource={driverTrips}
                rowKey="tripId"
                pagination={false}
                expandable={{
                  expandedRowRender: (record) => (
                    <div style={{ padding: '8px 16px', background: '#fafafa', borderRadius: 8 }}>
                      <Title level={5} style={{ margin: '0 0 12px 0', fontSize: 13 }}>Danh sách điểm dừng giao hàng</Title>
                      <Table
                        dataSource={record.tripStops ?? []}
                        rowKey="tripStopId"
                        pagination={false}
                        size="small"
                        columns={[
                          { title: 'Thứ tự', dataIndex: 'sequenceOrder', key: 'sequenceOrder', width: 80, align: 'center', render: (v) => <strong style={{ color: '#2563eb' }}>#{v}</strong> },
                          { title: 'Tên cửa hàng', dataIndex: 'storeName', key: 'storeName' },
                          { title: 'Giờ ETA dự kiến', dataIndex: 'plannedEta', key: 'plannedEta', render: (v) => v ? new Date(v).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '—' },
                          { title: 'Tải trọng', key: 'load', render: (_, stop) => `${stop.stopVolumeM3 != null ? stop.stopVolumeM3.toFixed(3) : '—'} m³ / ${stop.stopWeightKg != null ? stop.stopWeightKg.toFixed(3) : '—'} kg` },
                          { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (v) => <StatusBadge color={v === 'COMPLETED' ? 'success' : v === 'IN_PROGRESS' ? 'blue' : 'default'}>{v}</StatusBadge> }
                        ]}
                      />
                    </div>
                  )
                }}
                columns={[
                  { title: 'Trip ID', dataIndex: 'tripId', key: 'tripId', render: (v) => <StatusBadge color="blue">#{v}</StatusBadge> },
                  { title: 'Tuyến đường', dataIndex: 'fixedRouteCode', key: 'fixedRouteCode' },
                  {
                    title: 'Phương tiện',
                    key: 'vehicle',
                    render: (_, r) => r.vehicle ? `${r.vehicle.plateNumber} (${r.vehicle.vehicleType})` : '—'
                  },
                  {
                    title: 'Giờ đi dự kiến',
                    dataIndex: 'plannedDepartureTime',
                    key: 'plannedDepartureTime',
                    render: (v) => v ? String(v) : '—'
                  },
                  { title: 'Số điểm giao', dataIndex: 'tripStopCount', key: 'tripStopCount' },
                  { title: 'Tổng thể tích', key: 'vol', render: (_, r) => `${r.totalVolumeM3.toFixed(3)} m³` },
                  { title: 'Tổng trọng lượng', key: 'wt', render: (_, r) => `${r.totalWeightKg.toFixed(3)} kg` },
                  { 
                    title: 'Trạng thái', 
                    dataIndex: 'status', 
                    key: 'status', 
                    render: (v) => {
                      const colors: Record<string, 'success' | 'purple' | 'blue' | 'cyan' | 'default'> = {
                        VALIDATED: 'success',
                        DISPATCHED: 'purple',
                        IN_PROGRESS: 'blue',
                        COMPLETED: 'cyan'
                      };
                      return <StatusBadge color={colors[v] || 'default'}>{v}</StatusBadge>;
                    }
                  },
                  {
                    title: 'Hành động',
                    key: 'action',
                    render: (_, r) => (
                      <Button
                        size="small"
                        onClick={() => navigate(`/trips/${r.tripId}/loading-manifest`)}
                      >
                        Xem LIFO Manifest
                      </Button>
                    )
                  }
                ]}
              />
            )}
          </Card>
        </div>
      </AdminShell>
    );
  }

  return (

    <AdminShell currentUser={currentUser}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        <PageHeader
          title={`Xin chào quay trở lại, ${username}`}
          subtitle="Tóm tắt trạng thái vận hành hiện tại của đội xe, địa điểm cửa hàng và tuyến vận tải giao hàng."
        />

        {/* Stats Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', background: '#ffffff', borderRadius: 8 }}>
            <Spin size="large" tip="Đang tải dữ liệu tổng quan..." />
          </div>
        ) : (
          <div>
            {error && (
              <Card style={{ marginBottom: 16, borderColor: palette.statusDangerBg, backgroundColor: palette.statusDangerBg }} size="small">
                <Space>
                  <ShieldAlert style={{ color: palette.statusDanger }} size={16} />
                  <Text type="danger">{error} Vui lòng kiểm tra lại server backend.</Text>
                </Space>
              </Card>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16
            }}>
              <StatCard
                accent="primary"
                icon={<Users size={18} />}
                label="Người dùng"
                value={stats.usersCount}
                caption="tài khoản"
              />
              <StatCard
                accent="success"
                icon={<Store size={18} />}
                label="Cửa hàng"
                value={stats.storesCount}
                caption="đại lý"
              />
              <StatCard
                accent="gold"
                icon={<Truck size={18} />}
                label="Đội xe"
                value={stats.vehiclesCount}
                caption={`${stats.activeVehicles} xe đang hoạt động`}
              />
              <StatCard
                accent="teal"
                icon={<Package size={18} />}
                label="Sản phẩm"
                value={stats.productsCount}
                caption="mặt hàng"
              />
              <StatCard
                accent="violet"
                icon={<Map size={18} />}
                label="Tuyến đường"
                value={stats.routesCount}
                caption="hành trình"
              />
            </div>
          </div>
        )}

        {/* Quick Actions Title */}
        <div>
          <Title level={4} style={{ margin: '12px 0 8px 0', fontSize: 16, fontWeight: 600 }}>
            Phân hệ Quản trị & Điều hành nhanh
          </Title>
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
            Lựa chọn một trong các mô-đun quản lý nghiệp vụ dưới đây để bắt đầu làm việc.
          </Paragraph>
        </div>

        {/* Quick Actions Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16
        }}>
          {quickActions.map((action, idx) => (
            <Card
              key={idx}
              hoverable
              bordered
              onClick={() => navigate(action.path)}
              style={{
                height: '100%',
                borderRadius: 14,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: `1px solid ${action.borderColor}`,
              }}
              bodyStyle={{ 
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                justifyContent: 'space-between',
                flex: 1
              }}
            >
              <div>
                <div style={{ 
                  width: 44, 
                  height: 44, 
                  borderRadius: 8, 
                  backgroundColor: action.bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16
                }}>
                  {action.icon}
                </div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600, color: palette.textDark }}>
                  {action.title}
                </h4>
                <p style={{ margin: 0, fontSize: 11.5, color: palette.textMuted, lineHeight: 1.5 }}>
                  {action.desc}
                </p>
              </div>

              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: 600, color: palette.primary }}>Mở quản lý</Text>
                <ArrowRight size={13} style={{ color: palette.primary }} />
              </div>
            </Card>
          ))}
        </div>

        {/* Account Details & System Status */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title={
              <Space>
                <Activity size={16} style={{ color: palette.primary }} />
                <span>Trạng thái tài khoản đang đăng nhập</span>
              </Space>
            } bordered={false} style={{ boxShadow: palette.cardShadow }}>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Mã User (User ID)">
                  <Text copyable>{userId}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Tên đăng nhập (Username)">
                  <Text strong>{username}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Quyền hạn truy cập">
                  <Space size={[0, 4]} wrap>
                    {roles.map((role, rIdx) => (
                      <StatusBadge color="blue" key={rIdx}>
                        {role}
                      </StatusBadge>
                    ))}
                  </Space>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title={
              <Space>
                <Database size={16} style={{ color: palette.success }} />
                <span>Môi trường kết nối & API</span>
              </Space>
            } bordered={false} style={{ boxShadow: palette.cardShadow }}>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="Chế độ dữ liệu (Data Mode)">
                  <Badge
                    status={USE_MOCK_API ? 'warning' : 'success'}
                    text={USE_MOCK_API ? 'Mock API (Offline)' : 'Cơ sở dữ liệu thật (Online)'}
                  />
                </Descriptions.Item>
                <Descriptions.Item label="Địa chỉ API Endpoint">
                  <Text code>{import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái dịch vụ">
                  <StatusBadge color="success">
                    Đang hoạt động ổn định
                  </StatusBadge>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>

      </div>
    </AdminShell>
  );
};

export default DashboardPage;
