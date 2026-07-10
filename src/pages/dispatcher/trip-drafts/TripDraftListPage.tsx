import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Card, 
  Table, 
  DatePicker, 
  Button, 
  Breadcrumb, 
  Typography, 
  Space, 
  Tag, 
  Alert, 
  message, 
  Tooltip,
  Empty
} from 'antd';
import { CalendarOutlined, PlayCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { Layers, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';
import AdminShell from '../../../components/AdminShell';
import { tripDraftApi } from '../../../api/tripDraftApi';
import type { TripDraft } from '../../../types/tripDraft';

const { Title, Text } = Typography;

function getCurrentUser() {
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';

  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) roles = JSON.parse(rolesStr);
  } catch (err) {
    console.error('Failed to parse roles', err);
  }

  return {
    id: Number(userId),
    username,
    fullName: username,
    roles,
  };
}

const TripDraftListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = getCurrentUser();

  // Roles verification
  const roles = currentUser.roles || [];
  const canRunConsolidate = roles.some(role => ["SYSTEM_ADMIN", "DISPATCHER"].includes(role));

  // Date state (defaults to parameter or today)
  const dateParam = searchParams.get('deliveryDate');
  const initialDate = dateParam ? dayjs(dateParam, 'YYYY-MM-DD') : dayjs();
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(initialDate);

  const [loading, setLoading] = useState(false);
  const [consolidating, setConsolidating] = useState(false);
  const [drafts, setDrafts] = useState<TripDraft[]>([]);
  const [skippedRoutes, setSkippedRoutes] = useState<any[]>([]);

  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);

  const deliveryDateStr = selectedDate.format('YYYY-MM-DD');

  const fetchDrafts = async (dateStr: string, pageNum: number, sizeNum: number) => {
    setLoading(true);
    try {
      const response = await tripDraftApi.getTripDrafts({
        deliveryDate: dateStr,
        page: pageNum,
        size: sizeNum
      });
      setDrafts(response.content);
      setTotalElements(response.totalElements);
    } catch (e: any) {
      console.error(e);
      message.error("Không thể tải danh sách đợt gom đơn.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Keep URL parameter synchronized
    setSearchParams({ deliveryDate: deliveryDateStr });
    fetchDrafts(deliveryDateStr, page, pageSize);
    // Reset skipped routes when changing date
    setSkippedRoutes([]);
  }, [deliveryDateStr, page, pageSize]);

  const handleDateChange = (date: dayjs.Dayjs | null) => {
    if (date) {
      setSelectedDate(date);
      setPage(0);
    }
  };

  const handleConsolidate = async () => {
    setConsolidating(true);
    setSkippedRoutes([]);
    try {
      const response = await tripDraftApi.consolidate(deliveryDateStr);
      message.success(`Consolidation hoàn tất. Tạo hoặc cập nhật ${response.tripDraftsCreatedOrUpdated} Trip Draft.`);
      
      if (response.skippedRoutes && response.skippedRoutes.length > 0) {
        setSkippedRoutes(response.skippedRoutes);
      }
      
      // Reload current list
      setPage(0);
      fetchDrafts(deliveryDateStr, 0, pageSize);
    } catch (error: any) {
      console.error(error);
      const isLocked = error.status === 409 || error.body?.error?.code === 'TRIP_DRAFT_LOCKED';
      if (isLocked) {
        message.error("Trip Draft đã bị khóa (status khác DRAFT), không thể gom đơn lại tự động.");
      } else {
        message.error(error.message || "Gom đơn thất bại.");
      }
    } finally {
      setConsolidating(false);
    }
  };

  // Status tag mapper
  const renderStatusTag = (status: string) => {
    let color = 'default';
    let text = status;

    switch (status) {
      case 'DRAFT':
        color = 'warning';
        text = 'Nháp (Draft)';
        break;
      case 'PLANNED':
        color = 'processing';
        text = 'Đã lập chuyến (Planned)';
        break;
      case 'VALIDATED':
        color = 'success';
        text = 'Đã kiểm tra tải (Validated)';
        break;
      case 'DISPATCHED':
        color = 'purple';
        text = 'Đã xuất phát (Dispatched)';
        break;
      case 'IN_PROGRESS':
        color = 'blue';
        text = 'Đang giao hàng (In Progress)';
        break;
      case 'COMPLETED':
        color = 'cyan';
        text = 'Hoàn thành (Completed)';
        break;
    }

    return <Tag color={color} style={{ fontWeight: 500 }}>{text}</Tag>;
  };

  const columns = [
    {
      title: 'Tuyến đường',
      dataIndex: 'routeCode',
      key: 'routeCode',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Stops hoạt động',
      key: 'activeStops',
      render: (_: any, record: TripDraft) => {
        const total = record.activeStopCount + record.skippedStopCount;
        return (
          <Space>
            <Text>{record.activeStopCount}/{total}</Text>
            {record.skippedStopCount > 0 && (
              <Tooltip title={`${record.skippedStopCount} stop bị bỏ qua do không có đơn hàng`}>
                <Tag color="default">Bỏ qua: {record.skippedStopCount}</Tag>
              </Tooltip>
            )}
          </Space>
        );
      }
    },
    {
      title: 'Tổng thể tích (m³)',
      dataIndex: 'totalVolumeM3',
      key: 'totalVolumeM3',
      render: (vol: number) => <Text>{vol.toFixed(6)}</Text>,
    },
    {
      title: 'Tổng trọng lượng (kg)',
      dataIndex: 'totalWeightKg',
      key: 'totalWeightKg',
      render: (wt: number) => <Text>{wt.toFixed(3)}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => renderStatusTag(status),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: TripDraft) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/dispatcher/trip-drafts/${record.id}`)}
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ marginBottom: 16 }}>
        <Breadcrumb
          items={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Quản lý gom đơn' },
          ]}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Layers size={24} style={{ color: '#1677ff' }} />
          <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
            Quản lý gom đơn (Trip Drafts)
          </Title>
        </div>

        <Space size={16} wrap>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarOutlined style={{ color: '#8c8c8c' }} />
            <Text type="secondary">Ngày giao hàng:</Text>
            <DatePicker
              value={selectedDate}
              onChange={handleDateChange}
              format="DD/MM/YYYY"
              allowClear={false}
              style={{ width: 150 }}
            />
          </div>

          <Tooltip title={!canRunConsolidate ? "Bạn không có quyền Dispatcher để thực hiện gom đơn" : ""}>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              loading={consolidating}
              disabled={!canRunConsolidate || consolidating}
              onClick={handleConsolidate}
              style={{ borderRadius: 6, fontWeight: 600, height: 38 }}
            >
              Gom đơn (Consolidate)
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* Warning Alert if skippedRoutes list is not empty */}
      {skippedRoutes.length > 0 && (
        <Alert
          message={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
              <AlertTriangle size={16} />
              <span>Phát hiện {skippedRoutes.length} tuyến bị bỏ qua khi gom đơn</span>
            </div>
          }
          description={
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
              {skippedRoutes.map((route, idx) => (
                <li key={idx}>
                  <Text strong>Tuyến {route.routeCode || `ID #${route.routeId}`}:</Text> {route.reason}
                </li>
              ))}
            </ul>
          }
          type="warning"
          showIcon={false}
          closable
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      )}

      {/* Main Table */}
      <Card
        style={{
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          columns={columns}
          dataSource={drafts}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page + 1,
            pageSize: pageSize,
            total: totalElements,
            onChange: (p, sz) => {
              setPage(p - 1);
              setPageSize(sz);
            },
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            locale: { items_per_page: '/ trang' },
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space direction="vertical" size={4}>
                    <Text type="secondary">Chưa có Trip Draft cho ngày {selectedDate.format('DD/MM/YYYY')}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>Hãy thực hiện gom đơn bằng nút bấm phía trên hoặc import file đơn hàng mới.</Text>
                  </Space>
                }
              />
            ),
          }}
        />
      </Card>
    </AdminShell>
  );
};

export default TripDraftListPage;
