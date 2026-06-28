import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Statistic, Space, Typography, Tag, Badge, Spin, Descriptions } from 'antd';
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
import { userApi } from '../api/userApi';
import { storeApi } from '../api/storeApi';
import { vehicleApi } from '../api/vehicleApi';
import { productApi } from '../api/productApi';
import { routeApi } from '../api/routeApi';
import { USE_MOCK_API } from '../config';

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

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      setError('');
      try {
        const [usersRes, storesRes, capacityRes, productsRes, routesRes] = await Promise.all([
          userApi.getUsers({ page: 0, size: 1 }),
          storeApi.getStores({ page: 0, size: 1 }),
          vehicleApi.getFleetCapacity(),
          productApi.getProducts({ page: 0, size: 1 }),
          routeApi.getRoutes({ page: 0, size: 1 }),
        ]);

        // Fallback or count vehicles
        let totalVehicles = capacityRes.activeVehicleCount;
        try {
          const listVehicles = await vehicleApi.getVehicles({ page: 0, size: 1 });
          totalVehicles = listVehicles.totalElements;
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
      } catch (err: any) {
        console.error('Failed to load system stats', err);
        setError('Không thể tải toàn bộ dữ liệu thống kê từ hệ thống.');
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  const quickActions = [
    {
      title: 'Quản lý người dùng',
      desc: 'Quản lý tài khoản, phân chia vai trò và trạng thái hoạt động của nhân viên.',
      icon: <Users size={24} style={{ color: '#1677ff' }} />,
      path: '/users',
      bgColor: '#e6f7ff',
      borderColor: '#91d5ff',
    },
    {
      title: 'Quản lý cửa hàng',
      desc: 'Quản lý danh sách đại lý, địa chỉ liên hệ và cấu hình tọa độ GPS.',
      icon: <Store size={24} style={{ color: '#52c41a' }} />,
      path: '/stores',
      bgColor: '#f6ffed',
      borderColor: '#b7eb8f',
    },
    {
      title: 'Quản lý xe cộ',
      desc: 'Theo dõi đội xe vận chuyển, tải trọng (kg) và thể tích khoang hàng (m³).',
      icon: <Truck size={24} style={{ color: '#faad14' }} />,
      path: '/vehicles',
      bgColor: '#fffbe6',
      borderColor: '#ffe58f',
    },
    {
      title: 'Quản lý sản phẩm',
      desc: 'Danh mục sản phẩm kinh doanh cùng trọng lượng, kích thước vật lý.',
      icon: <Package size={24} style={{ color: '#13c2c2' }} />,
      path: '/admin/products',
      bgColor: '#e6fffb',
      borderColor: '#87e8de',
    },
    {
      title: 'Quản lý tuyến đường',
      desc: 'Tối ưu lộ trình, gán cửa hàng dừng chân và phân bổ xe giao hàng.',
      icon: <Map size={24} style={{ color: '#722ed1' }} />,
      path: '/admin/routes',
      bgColor: '#f9f0ff',
      borderColor: '#d3adf7',
    },
  ];

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Welcome Section */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
          padding: '24px 32px', 
          borderRadius: 12, 
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.05)',
          color: '#ffffff'
        }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#ffffff' }}>
            Xin chào quay trở lại, {username}!
          </h2>
          <p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: 14 }}>
            Chào mừng bạn đến với Hệ thống Quản trị ELog. Dưới đây là tóm tắt trạng thái vận hành hiện tại của đội xe, địa điểm cửa hàng và tuyến vận tải giao hàng.
          </p>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', background: '#ffffff', borderRadius: 8 }}>
            <Spin size="large" tip="Đang tải dữ liệu tổng quan..." />
          </div>
        ) : (
          <div>
            {error && (
              <Card style={{ marginBottom: 16, borderColor: '#ffccc7', backgroundColor: '#fff2f0' }} size="small">
                <Space>
                  <ShieldAlert style={{ color: '#ff4d4f' }} size={16} />
                  <Text type="danger">{error} Vui lòng kiểm tra lại server backend.</Text>
                </Space>
              </Card>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16
            }}>
              {/* Card 1: Người dùng */}
              <Card bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
                <Statistic
                  title={
                    <Space size={8}>
                      <Users size={16} style={{ color: '#8c8c8c' }} />
                      <span>Người dùng</span>
                    </Space>
                  }
                  value={stats.usersCount}
                  suffix="tài khoản"
                />
              </Card>

              {/* Card 2: Cửa hàng */}
              <Card bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
                <Statistic
                  title={
                    <Space size={8}>
                      <Store size={16} style={{ color: '#8c8c8c' }} />
                      <span>Cửa hàng</span>
                    </Space>
                  }
                  value={stats.storesCount}
                  suffix="đại lý"
                />
              </Card>

              {/* Card 3: Đội xe */}
              <Card bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
                <Statistic
                  title={
                    <Space size={8}>
                      <Truck size={16} style={{ color: '#8c8c8c' }} />
                      <span>Đội xe</span>
                    </Space>
                  }
                  value={stats.vehiclesCount}
                  suffix={`xe (${stats.activeVehicles} active)`}
                />
              </Card>

              {/* Card 4: Sản phẩm */}
              <Card bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
                <Statistic
                  title={
                    <Space size={8}>
                      <Package size={16} style={{ color: '#8c8c8c' }} />
                      <span>Sản phẩm</span>
                    </Space>
                  }
                  value={stats.productsCount}
                  suffix="mặt hàng"
                />
              </Card>

              {/* Card 5: Tuyến đường */}
              <Card bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
                <Statistic
                  title={
                    <Space size={8}>
                      <Map size={16} style={{ color: '#8c8c8c' }} />
                      <span>Tuyến đường</span>
                    </Space>
                  }
                  value={stats.routesCount}
                  suffix="hành trình"
                />
              </Card>
            </div>

            {/* Extra Capacity Info */}
            <Card bordered={false} style={{ marginTop: 16, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }} size="small">
              <Row gutter={16} style={{ textAlign: 'center' }}>
                <Col span={12} style={{ borderRight: '1px solid #f0f0f0' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>TỔNG TẢI TRỌNG ĐỘI XE</Text>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1f1f1f', marginTop: 4 }}>
                    {stats.totalWeight.toLocaleString('vi-VN')} kg
                  </div>
                </Col>
                <Col span={12}>
                  <Text type="secondary" style={{ fontSize: 12 }}>TỔNG THỂ TÍCH KHOANG HÀNG</Text>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#1f1f1f', marginTop: 4 }}>
                    {stats.totalVolume.toLocaleString('vi-VN')} m³
                  </div>
                </Col>
              </Row>
            </Card>
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
                borderRadius: 10,
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
                <h4 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
                  {action.title}
                </h4>
                <p style={{ margin: 0, fontSize: 11.5, color: '#64748b', lineHeight: 1.5 }}>
                  {action.desc}
                </p>
              </div>

              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: 600, color: '#1677ff' }}>Mở quản lý</Text>
                <ArrowRight size={13} style={{ color: '#1677ff' }} />
              </div>
            </Card>
          ))}
        </div>

        {/* Account Details & System Status */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card title={
              <Space>
                <Activity size={16} style={{ color: '#1677ff' }} />
                <span>Trạng thái tài khoản đang đăng nhập</span>
              </Space>
            } bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
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
                      <Tag color="geekblue" key={rIdx} style={{ fontWeight: 500 }}>
                        {role}
                      </Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title={
              <Space>
                <Database size={16} style={{ color: '#52c41a' }} />
                <span>Môi trường kết nối & API</span>
              </Space>
            } bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
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
                  <Tag color="success" style={{ borderRadius: 6, fontWeight: 500 }}>
                    Đang hoạt động ổn định
                  </Tag>
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
