import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Breadcrumb,
  Typography,
  Row,
  Col,
  Statistic,
  Tag,
  Divider,
  Spin,
  message,
  Empty,
  Space,
  Modal,
  Alert,
  TimePicker,
  Form,
  Tooltip,
  Progress,
  Collapse,
} from 'antd';
import { ArrowLeftOutlined, CarOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import { MapPin, CheckCircle2, XCircle, Sparkles, Eye } from 'lucide-react';
import dayjs from 'dayjs';
import AdminShell from '../../../components/AdminShell';
import {
  tripDraftApi,
  adjustDepartureTime,
  getStopOrderItems,
  getApiErrorMessage,
  getRecommendations,
  confirmTripDraft,
  type StopOrderItem,
  type RecommendationResult,
  type VehicleRecommendation,
} from '../../../api/tripDraftApi';
import { isFeasibleRecommendationPlan } from '../../../api/recommendationNormalizer';
import { getTripsByTripDraftId } from '../../../api/tripApi';
import { getTripDraftPlanningHistory } from '../../../api/planningHistoryApi';
import { PLANNING_EVENT_TYPE_LABEL, type PlanningEvent } from '../../../types/planningEvent';
import type { TripDraft, TripDraftStop, CapacityValidationResult } from '../../../types/tripDraft';
import type { Trip } from '../../../types/trip';

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

const TripDraftDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<TripDraft | null>(null);
  const [existingTrips, setExistingTrips] = useState<Trip[]>([]);
  const [revertLoading, setRevertLoading] = useState(false);
  const [revertModalOpen, setRevertModalOpen] = useState(false);

  // Adjust Departure Time states
  const [adjustDepModalOpen, setAdjustDepModalOpen] = useState(false);
  const [adjustDepTime, setAdjustDepTime] = useState<dayjs.Dayjs | null>(dayjs('07:30:00', 'HH:mm:ss'));
  const [adjustDepLoading, setAdjustDepLoading] = useState(false);

  // Stop Order Items Modal states
  const [orderItemsModalOpen, setOrderItemsModalOpen] = useState(false);
  const [selectedStop, setSelectedStop] = useState<TripDraftStop | null>(null);
  const [orderItems, setOrderItems] = useState<StopOrderItem[]>([]);
  const [orderItemsLoading, setOrderItemsLoading] = useState(false);

  // Recommendations state (US-13)
  const [recLoading, setRecLoading] = useState(false);
  const [recResult, setRecResult] = useState<RecommendationResult | null>(null);
  const [selectedRecIdx, setSelectedRecIdx] = useState<number | null>(null);

  // Confirm TripDraft state (US-14)
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Auto capacity-check result (surfaced when confirm couldn't reach VALIDATED)
  const [capacityFailInfo, setCapacityFailInfo] = useState<CapacityValidationResult | null>(null);

  // Planning history panel (ELOG-140)
  const HISTORY_PAGE_SIZE = 10;
  const [historyEvents, setHistoryEvents] = useState<PlanningEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);

  const fetchHistory = async (page = 0) => {
    if (!id) return;
    setHistoryLoading(true);
    try {
      const result = await getTripDraftPlanningHistory(id, { page, size: HISTORY_PAGE_SIZE });
      setHistoryEvents(result.items);
      setHistoryTotal(result.pagination.totalElements);
      setHistoryPage(page);
      setHistoryLoaded(true);
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const hasFeasibleRecommendations = isFeasibleRecommendationPlan(recResult?.planType);

  const isOperableStatus = (draft?.status === 'DRAFT' || draft?.status === 'PLANNED' || draft?.status === 'VALIDATED') && existingTrips.length === 0;

  const fetchDraftDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await tripDraftApi.getTripDraftById(Number(id));
      setDraft(data);

      if (data.plannedDepartureTime) {
        setAdjustDepTime(dayjs(data.plannedDepartureTime, 'HH:mm:ss'));
      }

      if (data.status === 'PLANNED') {
        try {
          const capacityResult = await tripDraftApi.getCapacityValidationResult(id);
          setCapacityFailInfo(capacityResult.validationPassed ? null : capacityResult);
        } catch (err) {
          console.error('Failed to fetch capacity validation result', err);
          setCapacityFailInfo(null);
        }
      } else {
        setCapacityFailInfo(null);
      }

      try {
        const trips = await getTripsByTripDraftId(id);
        setExistingTrips(trips || []);
      } catch {
        setExistingTrips([]);
      }
    } catch (e: any) {
      console.error(e);
      message.error("Không thể tải thông tin chi tiết đợt gom đơn.");
    } finally {
      setLoading(false);
    }
  };


  const reloadAllData = async () => {
    await fetchDraftDetail();
  };

  useEffect(() => {
    reloadAllData();
  }, [id]);

  // ── Recommendations handler (US-13) ─────────────────────────────────────

  const handleFetchRecommendations = async () => {
    if (!id) return;
    setRecLoading(true);
    setRecResult(null);
    setSelectedRecIdx(null);
    try {
      const res = await getRecommendations(id);
      setRecResult(res);
    } catch (err: any) {
      console.error(err);
      message.error(getApiErrorMessage(err, 'Không thể tải gợi ý phân xe.'));
    } finally {
      setRecLoading(false);
    }
  };

  const getAssignUrlWithVehicle = () => {
    let assignUrl = `/dispatcher/trip-drafts/${draft?.id}/assign`;
    const selIdx = selectedRecIdx ?? 0;
    const selectedRec = recResult?.recommendations?.[selIdx];
    const recommendedVehicle = selectedRec?.vehicles?.[0];
    // TWO_VEHICLE plans carry their vehicle/stop split via navigation state instead
    // (see getAssignNavigationState) — VehicleAssignmentPage's eligible-vehicles list
    // is computed against the WHOLE route's load, so it can never show either vehicle
    // of a plan that only works because it's split in two. Only forward query params
    // for the SINGLE_VEHICLE case, which the assign page's single-mode picker can use.
    if (selectedRec?.planType !== 'TWO_VEHICLE' && recommendedVehicle?.vehicleId) {
      const params = new URLSearchParams();
      params.set('vehicleId', String(recommendedVehicle.vehicleId));
      // Carry over the recommended driver pairing (may be a temporary driver,
      // not necessarily the vehicle's fixed driver) so it isn't silently
      // dropped in favor of the backend's auto-assign-fixed-driver fallback.
      if (recommendedVehicle.driverId != null) {
        params.set('driverId', String(recommendedVehicle.driverId));
      }
      assignUrl += `?${params.toString()}`;
    }
    return assignUrl;
  };

  // TWO_VEHICLE recommendations already contain a fully valid vehicle+driver+stop
  // split (subTrips) computed server-side — hand the whole thing to the assign page
  // via router state so it can prefill split mode instead of re-deriving eligibility
  // from a per-vehicle-vs-whole-route check that can never pass for a split plan.
  const getAssignNavigationState = (): { tripDraftId: number; recommendation: VehicleRecommendation } | undefined => {
    const selIdx = selectedRecIdx ?? 0;
    const selectedRec = recResult?.recommendations?.[selIdx];
    if (!draft?.id || selectedRec?.planType !== 'TWO_VEHICLE' || !selectedRec.subTrips?.length) {
      return undefined;
    }
    return { tripDraftId: draft.id, recommendation: selectedRec };
  };

  // ── Confirm TripDraft handler (US-14) ─────────────────────────────────

  const handleConfirmTripDraft = async () => {
    if (!id) return;
    setConfirmLoading(true);
    try {
      if (draft?.status === 'DRAFT') {
        const res = await confirmTripDraft(id);
        message.success(res.summary || `Đã xác nhận kế hoạch chuyến ${res.fixedRouteCode}. Trạng thái: ${res.status}`);
        await reloadAllData();
      } else {
        const assignUrl = getAssignUrlWithVehicle();
        message.info('Kế hoạch chuyến đã xác nhận. Đang chuyển sang màn hình Phân xe & tài xế...');
        navigate(assignUrl, { state: getAssignNavigationState() });
      }
    } catch (err: any) {
      console.error(err);
      message.error(getApiErrorMessage(err, 'Xác nhận kế hoạch thất bại.'));
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleAdjustDepartureTimeSubmit = async () => {
    if (!id || !adjustDepTime) {
      message.warning('Vui lòng chọn giờ xuất phát mới');
      return;
    }
    const formattedTime = adjustDepTime.format('HH:mm:ss');
    setAdjustDepLoading(true);
    try {
      await adjustDepartureTime(id, formattedTime);
      message.success(`Đã điều chỉnh giờ xuất phát thành ${formattedTime}`);
      setAdjustDepModalOpen(false);
      await reloadAllData();
    } catch (err: any) {
      console.error(err);
      message.error(getApiErrorMessage(err, 'Không thể điều chỉnh giờ xuất phát.'));
    } finally {
      setAdjustDepLoading(false);
    }
  };

  const handleOpenStopOrderItems = async (stop: TripDraftStop) => {
    if (!id) return;
    setSelectedStop(stop);
    setOrderItemsModalOpen(true);
    setOrderItemsLoading(true);
    try {
      const items = await getStopOrderItems(id, stop.tripDraftStopId);
      setOrderItems(items || []);
    } catch (err) {
      console.error("Failed to fetch stop order items", err);
      message.error(getApiErrorMessage(err, "Không thể tải chi tiết mặt hàng của điểm dừng."));
    } finally {
      setOrderItemsLoading(false);
    }
  };

  const handleRevert = async () => {
    if (!id) return;
    setRevertLoading(true);
    try {
      const res = await tripDraftApi.revertTripDraft(id);
      if (res.success) {
        message.success(res.message || 'Thu hồi đợt gom đơn thành công.');
        navigate(`/dispatcher/trip-drafts?deliveryDate=${draft?.deliveryDate}`);
      } else {
        message.error(res.message || 'Thu hồi đợt gom đơn thất bại.');
      }
    } catch (err: any) {
      console.error(err);
      message.error(getApiErrorMessage(err, 'Có lỗi xảy ra khi thu hồi.'));
    } finally {
      setRevertLoading(false);
      setRevertModalOpen(false);
    }
  };

  const sortedStops = useMemo(() => {
    if (!draft || !draft.stops) return [];
    return [...draft.stops].sort((a, b) => a.sequenceNo - b.sequenceNo);
  }, [draft]);

  const formatDateStr = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

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

  const stopsColumns = [
    {
      title: 'STT',
      dataIndex: 'sequenceNo',
      key: 'sequenceNo',
      width: 80,
      render: (seq: number) => <Text strong>{seq}</Text>,
    },
    {
      title: 'Mã cửa hàng',
      dataIndex: 'storeCode',
      key: 'storeCode',
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: 'Tên cửa hàng',
      dataIndex: 'storeName',
      key: 'storeName',
      render: (name: string) => <Text>{name}</Text>,
    },
    {
      title: 'Trạng thái điểm dừng',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        isActive
          ? <Tag color="success">🟢 Hoạt động (Active)</Tag>
          : <Tag color="default">⚪ Bỏ qua (Skipped)</Tag>
      ),
    },
    {
      title: 'ETA dự kiến',
      dataIndex: 'plannedEta',
      key: 'plannedEta',
      render: (eta?: string | null) => (eta ? <Text strong style={{ color: '#1677ff' }}>{eta}</Text> : <Text type="secondary">—</Text>),
    },
    {
      title: 'Số lượng đơn',
      dataIndex: 'orderCount',
      key: 'orderCount',
      render: (count: number, record: TripDraftStop) => (
        count > 0 ? (
          <Button
            type="link"
            style={{ padding: 0, fontWeight: 700 }}
            onClick={() => handleOpenStopOrderItems(record)}
          >
            {count} đơn
          </Button>
        ) : (
          <Text type="secondary">0 đơn</Text>
        )
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: TripDraftStop) => (
        record.orderCount > 0 ? (
          <Button
            type="default"
            size="small"
            icon={<Eye size={14} />}
            onClick={() => handleOpenStopOrderItems(record)}
            style={{ borderRadius: 6 }}
          >
            Xem mặt hàng
          </Button>
        ) : null
      ),
    },
  ];

  const orderItemsModalColumns = [
    {
      title: 'Mã đơn (orderRef)',
      dataIndex: 'orderRef',
      key: 'orderRef',
      render: (ref: string) => <Text strong>{ref}</Text>,
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (sku: string) => <Tag color="geekblue">{sku}</Tag>,
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'productName',
      key: 'productName',
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right' as const,
      render: (qty: number) => <Text strong>{qty}</Text>,
    },
    {
      title: 'Trọng lượng (kg)',
      dataIndex: 'weightKg',
      key: 'weightKg',
      align: 'right' as const,
      render: (wt: number) => `${Number(wt || 0).toFixed(2)} kg`,
    },
    {
      title: 'Thể tích (m³)',
      dataIndex: 'volumeM3',
      key: 'volumeM3',
      align: 'right' as const,
      render: (vol: number) => `${Number(vol || 0).toFixed(4)} m³`,
    },
  ];

  if (loading) {
    return (
      <AdminShell currentUser={currentUser}>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Đang tải chi tiết Trip Draft..." />
        </div>
      </AdminShell>
    );
  }

  if (!draft) {
    return (
      <AdminShell currentUser={currentUser}>
        <div style={{ marginBottom: 16 }}>
          <Breadcrumb
            items={[
              { title: 'Dashboard', href: '/dashboard' },
              { title: 'Quản lý gom đơn', href: '/dispatcher/trip-drafts' },
              { title: 'Lỗi' },
            ]}
          />
        </div>
        <Card style={{ borderRadius: 12, textAlign: 'center', padding: '40px 0' }}>
          <Empty description={<span style={{ color: '#8c8c8c' }}>Không tìm thấy Trip Draft hoặc xảy ra lỗi.</span>}>
            <Button
              type="primary"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/dispatcher/trip-drafts')}
              style={{ borderRadius: 6, marginTop: 12 }}
            >
              Quay lại danh sách
            </Button>
          </Empty>
        </Card>
      </AdminShell>
    );
  }

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ marginBottom: 16 }}>
        <Breadcrumb
          items={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Quản lý gom đơn', href: '/dispatcher/trip-drafts' },
            { title: `Chi tiết tuyến ${draft.routeCode}` },
          ]}
        />
      </div>

      {existingTrips.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message="Đợt gom đơn đã tạo chuyến hàng chính thức"
          description="Đợt gom đơn này đã được phân xe / tạo chuyến hàng chính thức. Các thao tác điều chỉnh giờ xuất phát, dàn xếp trễ và tách đơn bị khóa để đảm bảo tính toàn vẹn dữ liệu của chuyến hàng đang thực thi."
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      {capacityFailInfo && (
        <Alert
          type="error"
          showIcon
          message={
            capacityFailInfo.volumeCheckResult === 'NOT_CHECKED'
              ? 'Chưa thể kiểm tra tải trọng tự động'
              : 'Không có xe nào đủ tải cho tuyến này'
          }
          description={
            <div>
              {capacityFailInfo.suggestion && <div>{capacityFailInfo.suggestion}</div>}
              {capacityFailInfo.message && <div style={{ marginTop: capacityFailInfo.suggestion ? 4 : 0 }}>{capacityFailInfo.message}</div>}
            </div>
          }
          action={
            <Button size="small" danger onClick={() => navigate(`/dispatcher/trip-drafts/${draft.id}/capacity`)}>
              Xem chi tiết &amp; kiểm tra lại
            </Button>
          }
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}


      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/dispatcher/trip-drafts?deliveryDate=${draft.deliveryDate}`)}
            style={{ borderRadius: 6 }}
          >
            Quay lại
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
              Chi tiết đợt gom đơn: Tuyến {draft.routeCode}
            </Title>
            {renderStatusTag(draft.status)}
          </div>
        </div>

        <Space wrap>
          {isOperableStatus && (
            <Button
              icon={<ClockCircleOutlined />}
              style={{ borderRadius: 6, fontWeight: 600, borderColor: '#1890ff', color: '#1890ff' }}
              onClick={() => setAdjustDepModalOpen(true)}
            >
              Điều chỉnh giờ xuất phát
            </Button>
          )}

          {(draft.status === 'PLANNED' || draft.status === 'VALIDATED') && (
            <>
              <Button
                danger
                style={{ borderRadius: 6, fontWeight: 600 }}
                loading={revertLoading}
                onClick={() => setRevertModalOpen(true)}
              >
                Thu hồi gom đơn
              </Button>
              <Button
                style={{ borderRadius: 6, fontWeight: 600 }}
                onClick={() => navigate(`/dispatcher/trip-drafts/${draft.id}/capacity`)}
              >
                Xem kết quả tải trọng
              </Button>
            </>
          )}
          {/* US-13: Recommendations button — visible when status is PLANNED or VALIDATED */}
          {(draft.status === 'PLANNED' || draft.status === 'VALIDATED') && existingTrips.length === 0 && (
            <Button
              icon={<Sparkles size={16} />}
              style={{ borderRadius: 6, fontWeight: 600, color: '#1677ff', borderColor: '#91caff', background: '#e6f4ff' }}
              loading={recLoading}
              onClick={handleFetchRecommendations}
            >
              Gợi ý phân xe
            </Button>
          )}
          {/* US-14: Confirm button — visible when status is VALIDATED and recommendations have been loaded */}
          {draft.status === 'VALIDATED' && existingTrips.length === 0 && recResult && hasFeasibleRecommendations && (
            <Button
              type="primary"
              icon={<CheckCircle2 size={16} />}
              style={{ borderRadius: 6, fontWeight: 600, background: '#13c2c2', borderColor: '#13c2c2' }}
              loading={confirmLoading}
              onClick={handleConfirmTripDraft}
            >
              Xác nhận kế hoạch
            </Button>
          )}
          {draft.status === 'VALIDATED' && existingTrips.length === 0 && (
            <Button
              type="primary"
              icon={<CarOutlined />}
              style={{ borderRadius: 6, fontWeight: 600, background: '#52c41a', borderColor: '#52c41a' }}
              onClick={() => navigate(getAssignUrlWithVehicle(), { state: getAssignNavigationState() })}
            >
              Phân xe & tài xế
            </Button>
          )}
          {draft.status === 'VALIDATED' && existingTrips.length > 0 && (
            <Button
              type="primary"
              icon={<CarOutlined />}
              style={{ borderRadius: 6, fontWeight: 600 }}
              onClick={() => navigate(`/dispatcher/trip-drafts/${draft.id}/assign`)}
            >
              Xem chuyến đã tạo
            </Button>
          )}
        </Space>
      </div>

      {/* Overview Metrics Card */}
      <Card
        style={{
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          marginBottom: 24,
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Title level={5} style={{ margin: '0 0 16px 0', color: '#262626', fontWeight: 600 }}>Thông tin tổng quan</Title>
        <Row gutter={[24, 16]}>
          <Col xs={12} sm={8} md={6}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Mã Tuyến đường</Text>
              <Text strong style={{ fontSize: 15 }}>{draft.routeCode}</Text>
            </div>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Ngày giao hàng</Text>
              <Text strong style={{ fontSize: 15 }}>{formatDateStr(draft.deliveryDate)}</Text>
            </div>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Giờ xuất phát dự kiến</Text>
              <Text strong style={{ fontSize: 15, color: '#1890ff' }}>
                {draft.plannedDepartureTime || 'Chưa thiết lập'}
              </Text>
            </div>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Trạng thái</Text>
              <div style={{ marginTop: 2 }}>{renderStatusTag(draft.status)}</div>
            </div>
          </Col>
        </Row>

        <Divider style={{ margin: '20px 0' }} />

        {/* Aggregate Stats */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card style={{ background: '#f5f5f5', borderRadius: 8, textAlign: 'center' }} bodyStyle={{ padding: '12px 16px' }}>
              <Statistic
                title="Stops hoạt động"
                value={draft.activeStopCount}
                valueStyle={{ color: '#262626', fontWeight: 700, fontSize: 20 }}
                prefix={<CheckCircle2 size={16} style={{ marginRight: 4, verticalAlign: 'middle', color: '#52c41a' }} />}
                suffix={`/ ${draft.activeStopCount + draft.skippedStopCount}`}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: '#f5f5f5', borderRadius: 8, textAlign: 'center' }} bodyStyle={{ padding: '12px 16px' }}>
              <Statistic
                title="Stops bỏ qua"
                value={draft.skippedStopCount}
                valueStyle={{ color: '#8c8c8c', fontWeight: 700, fontSize: 20 }}
                prefix={<XCircle size={16} style={{ marginRight: 4, verticalAlign: 'middle', color: '#bfbfbf' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: '#f5f5f5', borderRadius: 8, textAlign: 'center' }} bodyStyle={{ padding: '12px 16px' }}>
              <Statistic
                title="Thể tích (m³)"
                value={draft.totalVolumeM3}
                precision={6}
                valueStyle={{ color: '#096dd9', fontWeight: 700, fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: '#f5f5f5', borderRadius: 8, textAlign: 'center' }} bodyStyle={{ padding: '12px 16px' }}>
              <Statistic
                title="Trọng lượng (kg)"
                value={draft.totalWeightKg}
                precision={3}
                valueStyle={{ color: '#d46b08', fontWeight: 700, fontSize: 20 }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* US-13: Recommendations Card */}
      {recResult && (
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} style={{ color: '#1677ff' }} />
              <span style={{ fontSize: 16, fontWeight: 600 }}>Gợi ý phân xe tự động</span>
              <Tag color={hasFeasibleRecommendations ? 'success' : 'error'}>
                {hasFeasibleRecommendations ? 'Khả thi' : 'Cần xử lý thủ công'}
              </Tag>
            </div>
          }
          style={{
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            marginBottom: 24,
            border: hasFeasibleRecommendations ? '1px solid #91caff' : '1px solid #ffa39e',
          }}
          bodyStyle={{ padding: 20 }}
        >
          {!hasFeasibleRecommendations ? (
            <>
              <Alert
                type="error"
                showIcon
                message="Không thể tự động phân xe cho tuyến này"
                description="Hệ thống chỉ hỗ trợ đề xuất tối đa 2 xe cho 1 tuyến. Nếu tuyến này cần nhiều hơn 2 xe mới đủ tải, vui lòng phối hợp xử lý thủ công (tách bớt đơn hàng sang đợt gom đơn/ngày giao khác, hoặc báo Logistics Manager để quyết định phương án)."
                style={{ marginBottom: 12 }}
              />
              {recResult.message && <Alert type="warning" showIcon message={recResult.message} style={{ marginBottom: 12 }} />}
              {(recResult.violatedConstraints?.length ?? 0) > 0 && (
                <div>
                  <Text strong style={{ color: '#cf1322' }}>Chi tiết ràng buộc vi phạm:</Text>
                  <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                    {recResult.violatedConstraints.map((c, i) => (
                      <li key={i}><Text type="danger">{c}</Text></li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <>
              {recResult.message && <Alert type="info" showIcon message={recResult.message} style={{ marginBottom: 12 }} />}
              <Row gutter={[16, 16]}>
                {recResult.recommendations.map((rec: VehicleRecommendation, idx: number) => (
                  <Col xs={24} md={8} key={idx}>
                    <Card
                      size="small"
                      hoverable
                      onClick={() => setSelectedRecIdx(idx)}
                      style={{
                        borderRadius: 10,
                        border: selectedRecIdx === idx ? '2px solid #1677ff' : '1px solid #f0f0f0',
                        cursor: 'pointer',
                        background: selectedRecIdx === idx ? '#e6f4ff' : '#fff',
                      }}
                      bodyStyle={{ padding: 16 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text strong style={{ fontSize: 14 }}>Phương án {idx + 1}</Text>
                        <Tag color={rec.planType === 'SINGLE_VEHICLE' ? 'blue' : 'purple'}>
                          {rec.planType === 'SINGLE_VEHICLE' ? '1 xe' : 'Nhiều xe'}
                        </Tag>
                      </div>
                      {(rec.warnings?.length ?? 0) > 0 && (
                        <div style={{ marginBottom: 8 }}>
                          {rec.warnings!.map((w, wi) => (
                            <Tag key={wi} color="gold" style={{ fontSize: 11, marginBottom: 4, whiteSpace: 'normal' }}>
                              ⚠ {w}
                            </Tag>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Điểm khả thi</Text>
                        <Text strong style={{ color: rec.totalScore >= 80 ? '#52c41a' : rec.totalScore >= 60 ? '#fa8c16' : '#ff4d4f', fontSize: 16 }}>
                          {rec.totalScore}/100
                        </Text>
                      </div>
                      <Divider style={{ margin: '8px 0' }} />
                      {rec.vehicles.map((v, vi) => (
                        <div key={vi} style={{ marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                            <Tag icon={<CarOutlined />}>{v.vehicleCode} · {v.plateNumber}</Tag>
                            <Text style={{ fontSize: 12, color: '#595959' }}>
                              {v.payloadKg} kg / {v.maxVolumeM3} m³
                            </Text>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text type="secondary" style={{ fontSize: 11 }}>{v.vehicleType}</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {v.costPerKm != null ? `${v.costPerKm.toLocaleString('vi-VN')} đ/km` : ''}
                              {v.averageSpeedKmh != null ? ` · ${v.averageSpeedKmh} km/h` : ''}
                            </Text>
                          </div>
                          {/* Driver info from recommendation */}
                          <div style={{ paddingLeft: 4, fontSize: 12 }}>
                            {v.driverId != null ? (
                              <>
                                <div style={{ color: '#262626' }}>
                                  <UserOutlined style={{ marginRight: 4, color: '#1677ff' }} />
                                  {v.driverName || '—'}
                                  {v.driverPhone && <Text type="secondary" style={{ marginLeft: 6, fontSize: 11 }}>({v.driverPhone})</Text>}
                                  {v.driverLicenseClass && <Tag style={{ marginLeft: 6, fontSize: 10 }} color="default">Bằng {v.driverLicenseClass}</Tag>}
                                </div>
                                <div style={{ marginTop: 2 }}>
                                  {v.isTemporaryDriver === false && (
                                    <Tag color="green" style={{ fontSize: 10 }}>Tài xế cố định</Tag>
                                  )}
                                  {v.isTemporaryDriver === true && (
                                    <Tag color="orange" style={{ fontSize: 10 }}>Tài xế thay thế</Tag>
                                  )}
                                </div>
                              </>
                            ) : (
                              <Tag color="red" style={{ fontSize: 10, marginTop: 2 }}>Chưa tìm được tài xế phù hợp</Tag>
                            )}
                          </div>
                        </div>
                      ))}
                      {rec.planType === 'TWO_VEHICLE' && (rec.subTrips?.length ?? 0) > 0 && (
                        <>
                          <Divider style={{ margin: '8px 0' }} />
                          <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>Chia điểm dừng theo xe</Text>
                          {rec.subTrips!.map((st, si) => (
                            <div key={si} style={{ marginTop: 8, padding: 8, background: '#fafafa', borderRadius: 6 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <Text strong style={{ fontSize: 12 }}>{st.label}</Text>
                                <Text type="secondary" style={{ fontSize: 11 }}>{st.stopSequenceNos.length} điểm dừng</Text>
                              </div>
                              <div style={{ display: 'flex', gap: 12, marginBottom: st.warnings?.length ? 6 : 0 }}>
                                <div style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 10, color: '#8c8c8c' }}>Thể tích</Text>
                                  <Progress
                                    percent={st.volumeUtilizationPct}
                                    size="small"
                                    format={(p) => `${p}%`}
                                    status={st.volumeUtilizationPct < 30 ? 'exception' : 'normal'}
                                  />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 10, color: '#8c8c8c' }}>Khối lượng</Text>
                                  <Progress
                                    percent={st.weightUtilizationPct}
                                    size="small"
                                    format={(p) => `${p}%`}
                                    status={st.weightUtilizationPct < 30 ? 'exception' : 'normal'}
                                  />
                                </div>
                              </div>
                              {(st.warnings?.length ?? 0) > 0 && (
                                <div>
                                  {st.warnings!.map((w, wi) => (
                                    <Tag key={wi} color="orange" style={{ fontSize: 10, marginBottom: 2, whiteSpace: 'normal' }}>
                                      ⚠ {w}
                                    </Tag>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                      {rec.explanation && (
                        <Tooltip title={rec.explanation}>
                          <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 8, cursor: 'help' }}>
                            💡 {rec.explanation.length > 80 ? rec.explanation.slice(0, 80) + '...' : rec.explanation}
                          </Text>
                        </Tooltip>
                      )}
                    </Card>
                  </Col>
                ))}
              </Row>
              {selectedRecIdx !== null && (
                <Alert
                  type="success"
                  showIcon
                  message={`Đã chọn Phương án ${selectedRecIdx + 1}. Nhấn "Xác nhận kế hoạch" để lưu và chuyển sang bước phân xe.`}
                  style={{ marginTop: 12, borderRadius: 8 }}
                />
              )}
            </>
          )}
        </Card>
      )}

      {/* Stops Sequence Table */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} style={{ color: '#1677ff' }} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>Thứ tự giao hàng tại các điểm dừng (Stops)</span>
          </div>
        }
        style={{
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          marginBottom: 24,
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          columns={stopsColumns}
          dataSource={sortedStops}
          rowKey="tripDraftStopId"
          pagination={false}
          locale={{
            emptyText: <Empty description="Tuyến đường này chưa cấu hình điểm dừng stops." />
          }}
        />
      </Card>

      {/* Lịch sử lập kế hoạch (ELOG-140) */}
      <Collapse
        style={{ marginBottom: 24, borderRadius: 12 }}
        onChange={(keys) => {
          const opened = Array.isArray(keys) ? keys.length > 0 : !!keys;
          if (opened && !historyLoaded && !historyLoading) {
            fetchHistory(0);
          }
        }}
        items={[
          {
            key: 'planning-history',
            label: <span style={{ fontSize: 16, fontWeight: 600 }}>Lịch sử lập kế hoạch</span>,
            children: (
              <Table
                size="small"
                loading={historyLoading}
                dataSource={historyEvents}
                rowKey="id"
                pagination={{
                  current: historyPage + 1,
                  pageSize: HISTORY_PAGE_SIZE,
                  total: historyTotal,
                  onChange: (p) => fetchHistory(p - 1),
                }}
                locale={{ emptyText: <Empty description="Chưa có sự kiện lập kế hoạch nào." /> }}
                columns={[
                  { title: 'Thời gian', dataIndex: 'occurredAt', key: 'occurredAt', render: (t: string) => t || '—' },
                  {
                    title: 'Loại sự kiện',
                    dataIndex: 'eventType',
                    key: 'eventType',
                    render: (t: PlanningEvent['eventType']) => <Tag color="blue">{PLANNING_EVENT_TYPE_LABEL[t] ?? t}</Tag>,
                  },
                  {
                    title: 'Người thực hiện',
                    key: 'actor',
                    render: (_: unknown, record: PlanningEvent) =>
                      record.actorType === 'USER'
                        ? `${record.actorUsername ?? '—'}${record.actorRole ? ` (${record.actorRole})` : ''}`
                        : record.actorType === 'RECOMMENDATION_ENGINE'
                        ? 'Hệ thống gợi ý'
                        : 'Hệ thống',
                  },
                  {
                    title: 'Trạng thái',
                    key: 'status',
                    render: (_: unknown, record: PlanningEvent) =>
                      record.statusBefore || record.statusAfter
                        ? `${record.statusBefore ?? '—'} → ${record.statusAfter ?? '—'}`
                        : '—',
                  },
                  { title: 'Tóm tắt', dataIndex: 'changeSummary', key: 'changeSummary', render: (t: string) => t || '—' },
                ]}
              />
            ),
          },
        ]}
      />

      {/* Modal Điều chỉnh giờ xuất phát */}
      <Modal
        open={adjustDepModalOpen}
        title={
          <Space>
            <ClockCircleOutlined style={{ color: '#1890ff' }} />
            <span>Điều chỉnh giờ xuất phát</span>
          </Space>
        }
        onCancel={() => setAdjustDepModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setAdjustDepModalOpen(false)}>
            Huỷ
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={adjustDepLoading}
            onClick={handleAdjustDepartureTimeSubmit}
          >
            Xác nhận điều chỉnh
          </Button>,
        ]}
      >
        <div style={{ paddingTop: 12 }}>
          <Alert
            type="info"
            showIcon
            message="Lưu ý"
            description="Khi thay đổi giờ xuất phát, hệ thống Backend sẽ tự động tính toán lại ETA của toàn bộ các điểm dừng active trên chuyến."
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
          <Form layout="vertical">
            <Form.Item label="Giờ xuất phát hiện tại">
              <Text strong style={{ fontSize: 16 }}>{draft.plannedDepartureTime || 'Chưa thiết lập'}</Text>
            </Form.Item>
            <Form.Item label="Giờ xuất phát mới (HH:mm:ss)" required>
              <TimePicker
                value={adjustDepTime}
                onChange={(val) => setAdjustDepTime(val)}
                format="HH:mm:ss"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>

      {/* Modal Chi tiết đơn hàng của điểm dừng */}
      <Modal
        open={orderItemsModalOpen}
        title={
          <Space>
            <Eye size={18} color="#1677ff" />
            <span>Chi tiết các mặt hàng tại {selectedStop?.storeName} ({selectedStop?.storeCode})</span>
          </Space>
        }
        width={900}
        onCancel={() => setOrderItemsModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setOrderItemsModalOpen(false)}>
            Đóng
          </Button>,
        ]}
      >
        <Table
          columns={orderItemsModalColumns}
          dataSource={orderItems}
          rowKey={(item) => `${item.orderId}-${item.sku}`}
          loading={orderItemsLoading}
          pagination={false}
          locale={{
            emptyText: <Empty description="Không có đơn hàng nào." />
          }}
        />
      </Modal>

      {/* Modal Xác nhận thu hồi đợt gom đơn */}
      <Modal
        open={revertModalOpen}
        title="Xác nhận thu hồi đợt gom đơn"
        onCancel={() => !revertLoading && setRevertModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setRevertModalOpen(false)} disabled={revertLoading}>
            Quay lại
          </Button>,
          <Button
            key="confirm"
            type="primary"
            danger
            loading={revertLoading}
            onClick={handleRevert}
          >
            Xác nhận thu hồi
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 12 }}>
          <p>Hành động này sẽ <strong>xóa đợt gom đơn hiện tại</strong> và chuyển các đơn hàng trở lại trạng thái chờ gom đơn để lập kế hoạch mới.</p>
          <Alert
            type="warning"
            showIcon
            message="Chú ý"
            description="Nếu đợt gom đơn này đã được phân xe (assign) hoặc tách chuyến (assign-split), hệ thống sẽ từ chối thu hồi."
          />
        </div>
      </Modal>

    </AdminShell>
  );
};

export default TripDraftDetailPage;
