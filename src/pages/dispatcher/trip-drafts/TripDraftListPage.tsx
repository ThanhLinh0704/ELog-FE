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
  Alert,
  message, 
  Tooltip,
  Empty,
  Modal,
  InputNumber
} from 'antd';
import { CalendarOutlined, PlayCircleOutlined, EyeOutlined } from '@ant-design/icons';
import { Layers, AlertTriangle, ClipboardList, Search, PackageCheck } from 'lucide-react';
import dayjs from 'dayjs';
import AdminShell from '../../../components/AdminShell';
import PageHeader from '../../../components/PageHeader';
import StatusBadge, { type StatusBadgeColor } from '../../../components/StatusBadge';
import { palette } from '../../../theme/tokens';
import { tripDraftApi } from '../../../api/tripDraftApi';
import type { TripDraft } from '../../../types/tripDraft';
import { usePermissions } from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../constants/permissions';

const { Text } = Typography;

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
  const { can } = usePermissions();
  const canRunConsolidate = can(PERMISSIONS.TRIP_WRITE);

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
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [draftId, setDraftId] = useState<number | null>(null);

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
      if (e?.status === 403 || e?.response?.status === 403) {
        navigate('/403');
        return;
      }
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
    if (!canRunConsolidate) {
      message.warning('Bạn không có quyền gom đơn.');
      return;
    }

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
    let color: StatusBadgeColor = 'default';
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

    return <StatusBadge color={color}>{text}</StatusBadge>;
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      render: (id: number) => (
        <Text
          strong
          style={{ color: palette.primary, cursor: 'pointer' }}
          onClick={() => navigate(`/dispatcher/trip-drafts/${id}`)}
        >
          #{id}
        </Text>
      ),
      width: 80,
    },
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
                <StatusBadge color="default">Bỏ qua: {record.skippedStopCount}</StatusBadge>
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
        <Space size="small">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/dispatcher/trip-drafts/${record.id}`)}
          >
            Xem chi tiết
          </Button>
          <Button
            type="primary"
            ghost
            icon={<ClipboardList size={14} />}
            style={{ borderRadius: 6, fontWeight: 500 }}
            onClick={() => navigate(`/trip-drafts/${record.id}/review`)}
          >
            Mở bản nháp
          </Button>
        </Space>
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

      <PageHeader
        title="Quản lý gom đơn (Trip Drafts)"
        subtitle="Gom đơn theo tuyến và ngày giao hàng, theo dõi trạng thái từng đợt."
        icon={<Layers size={20} />}
        actions={
          <Space size={16} wrap>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarOutlined style={{ color: palette.textFaint }} />
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
                style={{ fontWeight: 600, height: 38, display: canRunConsolidate ? undefined : 'none' }}
              >
                Gom đơn (Consolidate)
              </Button>
            </Tooltip>
          </Space>
        }
      />

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
          style={{ marginBottom: 20, borderRadius: 10 }}
        />
      )}

      {/* Main Table */}
      <Card
        style={{
          borderRadius: 14,
          boxShadow: palette.cardShadow,
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

      {/* Modal Mở bản nháp chuyến */}
      <Modal
        title={
          <Space>
            <ClipboardList size={18} />
            <span>Mở bản nháp chuyến</span>
          </Space>
        }
        open={isDraftModalOpen}
        onCancel={() => {
          setIsDraftModalOpen(false);
          setDraftId(null);
        }}
        footer={null}
        width={400}
      >
        <div style={{ paddingTop: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              <span style={{ color: palette.danger, marginRight: 4 }}>*</span>
              ID bản nháp
            </label>
            <InputNumber
              min={1}
              precision={0}
              value={draftId || undefined}
              onChange={(value) => setDraftId(value)}
              placeholder="Ví dụ: 10"
              style={{ width: '100%' }}
            />
            <div style={{ color: palette.textMuted, fontSize: 12, marginTop: 4 }}>
              Nhập ID bản nháp để mở màn kiểm tra.
            </div>
          </div>
          <Space size="middle" style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              type="primary"
              icon={<Search size={16} />}
              disabled={!draftId}
              onClick={() => {
                if (draftId) navigate(`/trip-drafts/${draftId}/review`);
              }}
            >
              Kiểm tra bản nháp
            </Button>
            <Button
              icon={<PackageCheck size={16} />}
              disabled={!draftId}
              onClick={() => {
                if (draftId) navigate(`/trip-drafts/${draftId}/loading-manifest`);
              }}
            >
              LIFO Manifest
            </Button>
          </Space>
        </div>
      </Modal>
    </AdminShell>
  );
};

export default TripDraftListPage;
