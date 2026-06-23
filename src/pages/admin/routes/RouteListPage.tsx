import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Card, Row, Col, Space, Button, Input, Select, Breadcrumb,
  Statistic, Tag, message, Alert, Tooltip, Empty, Typography
} from 'antd';
import { Edit3, Eye, Lock, Unlock, Plus, RefreshCw, Search, AlertTriangle } from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import type { DeliveryRoute, RouteStatus } from '../../../types/route';
import { routeApi } from '../../../api/routeApi';
import { USE_MOCK_API } from '../../../config';
import { mockRoutes } from '../../../mocks/routeData';
import { getActivateButtonState } from '../../../utils/routeCalculations';
import dayjs from 'dayjs';
import ActivateRouteModal from './components/ActivateRouteModal';
import DeactivateRouteModal from './components/DeactivateRouteModal';

const { Paragraph } = Typography;

const RouteListPage: React.FC = () => {
  const navigate = useNavigate();

  // Retrieve current user roles from localStorage
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

  const isAdmin = roles.includes('SYSTEM_ADMIN');
  const currentUser = {
    id: Number(userId),
    username,
    fullName: username,
    roles,
  };

  // State definitions
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [pageMeta, setPageMeta] = useState({ totalElements: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Total stats from mock database directly (reactive)
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);

  // Debounce searchKeyword to keyword state
  useEffect(() => {
    const handler = setTimeout(() => {
      setKeyword(searchKeyword);
      setPage(0);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchKeyword]);

  // Modals state
  const [actionRoute, setActionRoute] = useState<DeliveryRoute | null>(null);
  const [deactivateVisible, setDeactivateVisible] = useState(false);
  const [activateVisible, setActivateVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const queryParams = useMemo(() => ({
    keyword,
    status,
    page,
    size,
  }), [keyword, status, page, size]);

  const fetchRoutes = async (params = queryParams) => {
    setLoading(true);
    setError('');
    try {
      const response = await routeApi.getRoutes(params);
      setRoutes(response.content);
      setPageMeta({
        totalElements: response.totalElements,
        totalPages: response.totalPages,
      });

      if (USE_MOCK_API) {
        // Update counters directly from mockRoutes storage
        setActiveCount(mockRoutes.filter(r => r.status === 'ACTIVE').length);
        setInactiveCount(mockRoutes.filter(r => r.status === 'INACTIVE').length);
      } else {
        const activeRes = await routeApi.getRoutes({ page: 0, size: 1, status: 'ACTIVE' });
        const inactiveRes = await routeApi.getRoutes({ page: 0, size: 1, status: 'INACTIVE' });
        setActiveCount(activeRes.totalElements);
        setInactiveCount(inactiveRes.totalElements);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách tuyến đường.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes(queryParams);
  }, [queryParams]);

  const handleResetFilters = () => {
    setSearchKeyword('');
    setKeyword('');
    setStatus('ALL');
    setPage(0);
  };

  // Status Action triggers
  const handleOpenDeactivate = (route: DeliveryRoute) => {
    setActionRoute(route);
    setDeactivateVisible(true);
  };

  const handleOpenActivate = (route: DeliveryRoute) => {
    setActionRoute(route);
    setActivateVisible(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!actionRoute) return;
    setModalLoading(true);
    try {
      await routeApi.updateStatus(actionRoute.id, 'INACTIVE');
      message.success(`Tuyến ${actionRoute.code} đã được vô hiệu hoá`);
      setDeactivateVisible(false);
      setActionRoute(null);
      fetchRoutes();
    } catch (err: any) {
      message.error(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmActivate = async () => {
    if (!actionRoute) return;
    setModalLoading(true);
    try {
      await routeApi.updateStatus(actionRoute.id, 'ACTIVE');
      message.success(`Tuyến ${actionRoute.code} đã được kích hoạt`);
      setActivateVisible(false);
      setActionRoute(null);
      fetchRoutes();
    } catch (err: any) {
      message.error(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setModalLoading(false);
    }
  };

  // Table columns definition
  const columns = [
    {
      title: 'Mã tuyến',
      dataIndex: 'code',
      key: 'code',
      render: (code: string, record: DeliveryRoute) => (
        <a 
          onClick={() => navigate(`/admin/routes/${record.id}`)}
          style={{ fontWeight: 700, color: '#1677ff' }}
        >
          {code}
        </a>
      ),
    },
    {
      title: 'Tên tuyến',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: 'Số điểm dừng',
      dataIndex: 'stopCount',
      key: 'stopCount',
      render: (stopCount: number, record: DeliveryRoute) => (
        <Space size="small">
          <span>{stopCount} điểm dừng</span>
          {record.coordinatesWarningCount > 0 && (
            <Tooltip title={`Có ${record.coordinatesWarningCount} điểm dừng chưa có toạ độ GPS`}>
              <Tag color="warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 4, margin: 0 }}>
                <AlertTriangle size={12} />
                <span>{record.coordinatesWarningCount}</span>
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (routeStatus: RouteStatus) => {
        const isActive = routeStatus === 'ACTIVE';
        return (
          <Tag color={isActive ? 'success' : 'default'} style={{ borderRadius: 6, fontWeight: 500 }}>
            {isActive ? 'Đang hoạt động' : 'Chưa kích hoạt'}
          </Tag>
        );
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (dateStr: string) => dayjs(dateStr).format('DD/MM/YYYY'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: DeliveryRoute) => {
        const activationState = getActivateButtonState(record.stopCount);
        return (
          <Space size="small">
            <Tooltip title="Xem chi tiết">
              <Button
                type="text"
                icon={<Eye size={16} />}
                onClick={() => navigate(`/admin/routes/${record.id}`)}
              />
            </Tooltip>

            {isAdmin && (
              <>
                <Tooltip title="Chỉnh sửa">
                  <Button
                    type="text"
                    icon={<Edit3 size={16} />}
                    onClick={() => navigate(`/admin/routes/${record.id}/edit`)}
                  />
                </Tooltip>

                {record.status === 'ACTIVE' ? (
                  <Tooltip title="Vô hiệu hoá">
                    <Button
                      type="text"
                      danger
                      icon={<Lock size={16} />}
                      onClick={() => handleOpenDeactivate(record)}
                    />
                  </Tooltip>
                ) : (
                  <Tooltip title={activationState.disabled ? activationState.tooltip : 'Kích hoạt'}>
                    <Button
                      type="text"
                      style={{ color: activationState.disabled ? undefined : '#52c41a' }}
                      disabled={activationState.disabled}
                      icon={<Unlock size={16} />}
                      onClick={() => handleOpenActivate(record)}
                    />
                  </Tooltip>
                )}
              </>
            )}
          </Space>
        );
      },
    },
  ];

  const isFullyEmpty = mockRoutes.length === 0 && !loading;

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header Breadcrumb & Title */}
        <div>
          <Breadcrumb
            items={[
              { title: 'Admin' },
              { title: 'Quản lý tuyến' }
            ]}
          />
          <h2 style={{ margin: '8px 0 0 0', fontSize: 24, fontWeight: 700, color: '#1f1f1f' }}>
            Quản lý tuyến
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>
            Quản lý các tuyến giao hàng cố định và thứ tự điểm dừng.
          </p>
        </div>

        {/* Statistic Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card size="small" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
              <Statistic title="Tổng số tuyến" value={pageMeta.totalElements} suffix="tuyến" />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
              <Statistic title="Đang hoạt động" value={activeCount} valueStyle={{ color: '#52c41a' }} suffix="tuyến" />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
              <Statistic title="Chưa kích hoạt" value={inactiveCount} valueStyle={{ color: '#8c8c8c' }} suffix="tuyến" />
            </Card>
          </Col>
        </Row>

        {/* Main Card */}
        <Card bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
          {/* Filters and Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <Space size="middle" wrap style={{ flex: 1 }}>
              <Input
                placeholder="Tìm theo mã hoặc tên tuyến..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                prefix={<Search size={16} style={{ color: '#bfbfbf' }} />}
                style={{ width: 280, borderRadius: 6 }}
                allowClear
              />
              <Select
                placeholder="Trạng thái"
                value={status}
                onChange={(val) => {
                  setStatus(val);
                  setPage(0);
                }}
                style={{ width: 180 }}
                options={[
                  { value: 'ALL', label: 'Tất cả trạng thái' },
                  { value: 'ACTIVE', label: 'Đang hoạt động' },
                  { value: 'INACTIVE', label: 'Chưa kích hoạt' }
                ]}
              />
            </Space>

            <Space size="small">
              <Button
                icon={<RefreshCw size={14} />}
                onClick={() => fetchRoutes()}
              >
                Tải lại
              </Button>
              {isAdmin && (
                <Button
                  type="primary"
                  icon={<Plus size={14} />}
                  onClick={() => navigate('/admin/routes/new')}
                >
                  Tạo tuyến
                </Button>
              )}
            </Space>
          </div>

          {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

          {/* Table List */}
          {isFullyEmpty ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  isAdmin ? (
                    <div>
                      <Paragraph strong style={{ fontSize: 16, margin: 0 }}>Chưa có tuyến nào.</Paragraph>
                      <Paragraph style={{ color: '#8c8c8c' }}>Hãy tạo tuyến đầu tiên để bắt đầu quản lý.</Paragraph>
                    </div>
                  ) : (
                    <Paragraph strong style={{ fontSize: 16, margin: 0 }}>Chưa có tuyến nào.</Paragraph>
                  )
                }
              >
                {isAdmin && (
                  <Button type="primary" icon={<Plus size={14} />} onClick={() => navigate('/admin/routes/new')}>
                    Tạo tuyến
                  </Button>
                )}
              </Empty>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={routes}
              rowKey="id"
              loading={loading}
              scroll={{ x: 'max-content' }}
              pagination={{
                current: page + 1,
                pageSize: size,
                total: pageMeta.totalElements,
                showSizeChanger: true,
                pageSizeOptions: ['5', '10', '20', '50'],
                onChange: (p, s) => {
                  setPage(p - 1);
                  if (s) setSize(s);
                },
                showTotal: (total) => `Tổng cộng ${total} tuyến`,
                position: ['bottomRight'],
              }}
              locale={{
                emptyText: (
                  <Empty
                    description="Không tìm thấy tuyến phù hợp"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  >
                    <Button onClick={handleResetFilters}>Xoá bộ lọc</Button>
                  </Empty>
                )
              }}
            />
          )}
        </Card>
      </div>

      {/* Confirmation Modals */}
      <ActivateRouteModal
        visible={activateVisible}
        routeCode={actionRoute?.code || ''}
        loading={modalLoading}
        onCancel={() => {
          setActivateVisible(false);
          setActionRoute(null);
        }}
        onConfirm={handleConfirmActivate}
      />

      <DeactivateRouteModal
        visible={deactivateVisible}
        routeCode={actionRoute?.code || ''}
        loading={modalLoading}
        onCancel={() => {
          setDeactivateVisible(false);
          setActionRoute(null);
        }}
        onConfirm={handleConfirmDeactivate}
      />
    </AdminShell>
  );
};

export default RouteListPage;
