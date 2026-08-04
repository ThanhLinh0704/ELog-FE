import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Col,
  Empty,
  Modal,
  Popconfirm,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
  TimePicker,
  Flex,
} from 'antd';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeft,
  CheckCircle2,
  MapPinned,
  Navigation,
  PackageCheck,
  RefreshCw,
  Eye,
} from 'lucide-react';
import AdminShell from '../components/AdminShell';
import {
  confirmTripDraft,
  getApiErrorMessage,
  getTripDraft,
  getTripDraftApiStatus,
  recalculateEta,
  updateStopStatus,
  getStopOrderItems,
  tripDraftApi,
  type TripDraftDetail,
  type TripDraftStop,
  type TripDraftStopStatus,
} from '../api/tripDraftApi';
import { getTripsByTripDraftId } from '../api/tripApi';
import type { Trip } from '../types/trip';
import { storeApi } from '../api/storeApi';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../constants/permissions';

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

function formatNumber(value?: number | null, fractionDigits = 0) {
  return Number(value || 0).toLocaleString('vi-VN', {
    maximumFractionDigits: fractionDigits,
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getStopStatusLabel(status: TripDraftStopStatus) {
  return status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã bỏ qua';
}

function getDraftStatusLabel(status?: string | null) {
  const normalizedStatus = String(status || '').toUpperCase();
  const statusMap: Record<string, string> = {
    DRAFT: 'Bản nháp',
    PLANNED: 'Đã lập kế hoạch',
    CONFIRMED: 'Đã xác nhận',
    CANCELLED: 'Đã huỷ',
  };

  return statusMap[normalizedStatus] || normalizedStatus || '-';
}

function mergeRecalculatedDraft(
  draft: TripDraftDetail,
  recalculated: Pick<TripDraftDetail, 'estimatedDistanceKm' | 'estimatedDurationMin' | 'stops'>
): TripDraftDetail {
  const recalculatedStops = new Map(recalculated.stops.map((stop) => [stop.id, stop]));

  return {
    ...draft,
    estimatedDistanceKm: recalculated.estimatedDistanceKm,
    estimatedDurationMin: recalculated.estimatedDurationMin,
    stops: draft.stops
      .map((stop) => {
        const recalculatedStop = recalculatedStops.get(stop.id);
        if (recalculatedStop) {
          return {
            ...stop,
            eta: recalculatedStop.eta,
            estimatedTravelMin: recalculatedStop.estimatedTravelMin,
            estimatedDistanceKm: recalculatedStop.estimatedDistanceKm,
          };
        }
        return stop;
      })
      .sort((a, b) => a.sequenceNo - b.sequenceNo),
  };
}

const TripDraftReviewPage: React.FC = () => {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const { can } = usePermissions();
  const canEditTrip = can(PERMISSIONS.TRIP_WRITE);
  const canConfirmTrip = can(PERMISSIONS.TRIP_CONFIRM);

  const [draft, setDraft] = useState<TripDraftDetail | null>(null);
  const [assignedTrips, setAssignedTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbiddenMessage, setForbiddenMessage] = useState('');
  const [toggleStopId, setToggleStopId] = useState<number | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [modal, contextHolder] = Modal.useModal();
  const [plannedTime, setPlannedTime] = useState<dayjs.Dayjs | null>(dayjs('07:30:00', 'HH:mm:ss'));

  // Order Details Modal States
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedStopForDetail, setSelectedStopForDetail] = useState<TripDraftStop | null>(null);
  const [stopOrderItems, setStopOrderItems] = useState<any[]>([]);
  const [detailModalLoading, setDetailModalLoading] = useState(false);

  const showOrderDetails = async (stop: TripDraftStop) => {
    if (!draftId) return;

    setSelectedStopForDetail(stop);
    setDetailModalVisible(true);
    setDetailModalLoading(true);
    setStopOrderItems([]);

    try {
      const items = await getStopOrderItems(draftId, stop.id);
      setStopOrderItems(items);
    } catch (err) {
      console.error("Failed to load stop order details", err);
      message.error("Không tải được chi tiết đơn hàng của điểm dừng.");
    } finally {
      setDetailModalLoading(false);
    }
  };

  const detailColumns = [
    {
      title: 'Mã đơn hàng',
      dataIndex: 'orderRef',
      key: 'orderRef',
      render: (text: string) => <Typography.Text strong>{text}</Typography.Text>,
    },
    {
      title: 'Mã sản phẩm (SKU)',
      dataIndex: 'sku',
      key: 'sku',
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
      render: (value: number) => <Typography.Text strong>{formatNumber(value)}</Typography.Text>,
    },
    {
      title: 'Khối lượng (kg)',
      dataIndex: 'weightKg',
      key: 'weightKg',
      align: 'right' as const,
      render: (value: number) => formatNumber(value, 1),
    },
    {
      title: 'Thể tích (m³)',
      dataIndex: 'volumeM3',
      key: 'volumeM3',
      align: 'right' as const,
      render: (value: number) => formatNumber(value, 3),
    },
  ];

  const activeStops = useMemo(
    () => draft?.stops.filter((stop) => stop.status === 'ACTIVE') ?? [],
    [draft]
  );

  // BE không trả tổng thời lượng dự kiến (không có field nào ở TripDraftResponse/RecalculateEtaResponse),
  // và tổng quãng đường trả về sau "Tính lại ETA" cũng không có — tự cộng dồn từ từng điểm dừng
  // (estimatedDistanceKm/estimatedTravelMin) để luôn đúng cả lúc tải trang lẫn sau khi tính lại ETA.
  const estimatedTotals = useMemo(
    () =>
      activeStops.reduce(
        (acc, stop) => ({
          distanceKm: acc.distanceKm + (stop.estimatedDistanceKm ?? 0),
          durationMin: acc.durationMin + (stop.estimatedTravelMin ?? 0),
        }),
        { distanceKm: 0, durationMin: 0 }
      ),
    [activeStops]
  );
  const isDraftEditable = draft?.status === 'DRAFT' || draft?.status === 'PLANNED' || draft?.status === 'VALIDATED';
  const actionDisabled = !canEditTrip || !isDraftEditable || recalculating || confirming;

  const vehicleDisplay = useMemo(() => {
    const withVehicle = assignedTrips.filter((t) => t.vehicle);
    if (withVehicle.length === 0) return { value: 'Chưa phân xe', suffix: '' };
    if (withVehicle.length === 1) {
      return {
        value: withVehicle[0].vehicle!.plateNumber,
        suffix: withVehicle[0].vehicle!.vehicleType ? ` / ${withVehicle[0].vehicle!.vehicleType}` : '',
      };
    }
    return { value: `${withVehicle.length} xe (tách chuyến)`, suffix: '' };
  }, [assignedTrips]);

  async function fetchDraft() {
    if (!draftId) return;

    setLoading(true);
    setError('');
    setForbiddenMessage('');

    try {
      const result = await getTripDraft(draftId);
      
      // Enrich stops with store information from storeApi
      try {
        const storesRes = await storeApi.getStores({ size: 1000 });
        const storeMap = new Map(storesRes.content.map(s => [s.storeCode, s]));
        result.stops = result.stops.map(stop => {
          const store = storeMap.get(stop.storeCode);
          if (store) {
            return {
              ...stop,
              storeName: stop.storeName && !stop.storeName.includes('?') ? stop.storeName : store.storeName,
              address: stop.address || store.address,
              latitude: stop.latitude || store.latitude || null,
              longitude: stop.longitude || store.longitude || null,
            };
          }
          return stop;
        });
      } catch (storeErr) {
        console.error("Failed to enrich stops with store details", storeErr);
      }
      
      setDraft(result);

      // TripDraft itself never carries a vehicle — assignment lives on the
      // Trip(s) created from it (possibly split into multiple, per BR-07).
      try {
        const trips = await getTripsByTripDraftId(draftId);
        setAssignedTrips(trips);
      } catch (tripErr) {
        console.error('Failed to load assigned trips for draft', tripErr);
        setAssignedTrips([]);
      }
    } catch (err) {
      if (getTripDraftApiStatus(err) === 403) {
        setForbiddenMessage(
          getApiErrorMessage(
            err,
            'Tài khoản hiện tại không có quyền kiểm tra bản nháp chuyến.'
          )
        );
      } else {
        setError(getApiErrorMessage(err, 'Không tải được bản nháp chuyến.'));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  useEffect(() => {
    if (draft?.plannedDepartureTime) {
      setPlannedTime(dayjs(draft.plannedDepartureTime, 'HH:mm:ss'));
    }
  }, [draft?.plannedDepartureTime]);

  async function runRecalculate(currentDraft = draft) {
    if (!draftId || !currentDraft || !canEditTrip) return;

    setRecalculating(true);

    try {
      const timeStr = plannedTime ? plannedTime.format('HH:mm:ss') : '07:30:00';
      const result = await recalculateEta(draftId, {
        plannedDepartureTime: timeStr,
      });
      setDraft((previous) => (previous ? mergeRecalculatedDraft(previous, result) : previous));
      message.success('Đã tính lại ETA thành công.');
    } catch (err) {
      const apiMessage = getApiErrorMessage(err, 'Không tính lại được ETA.');
      if (getTripDraftApiStatus(err) === 409) {
        message.warning(apiMessage);
      } else {
        message.error(apiMessage);
      }
    } finally {
      setRecalculating(false);
    }
  }

  async function handleToggleStop(stop: TripDraftStop) {
    if (!draftId || !draft || !canEditTrip) return;

    const nextStatus: TripDraftStopStatus = stop.status === 'ACTIVE' ? 'SKIPPED' : 'ACTIVE';
    setToggleStopId(stop.id);

    try {
      const updatedStop = await updateStopStatus(draftId, stop.id, nextStatus === 'ACTIVE');
      const nextDraft = {
        ...draft,
        stops: draft.stops.map((item) =>
          item.id === stop.id ? { ...item, status: updatedStop.status, eta: updatedStop.eta } : item
        ),
      };
      setDraft(nextDraft);
      await runRecalculate(nextDraft);
    } catch (err) {
      const apiMessage = getApiErrorMessage(err, 'Không cập nhật được trạng thái điểm dừng.');
      if (getTripDraftApiStatus(err) === 409) {
        message.warning(apiMessage);
      } else {
        message.error(apiMessage);
      }
    } finally {
      setToggleStopId(null);
    }
  }

  function handleConfirm() {
    if (!draftId || !draft || !canConfirmTrip) return;

    modal.confirm({
      title: 'Xác nhận bản nháp chuyến?',
      content: 'Thao tác này sẽ chuyển bản nháp đã kiểm tra thành chuyến đã lập kế hoạch.',
      okText: 'Xác nhận',
      cancelText: 'Huỷ',
      icon: <CheckCircle2 size={20} color="#1677ff" />,
      onOk: async () => {
        setConfirming(true);

        try {
          await confirmTripDraft(draftId);

          // Auto-run capacity validation right after confirm (existing endpoint —
          // no manual "Kiểm tra tải trọng" click needed anymore).
          try {
            const capacityRes = await tripDraftApi.validateTripDraftCapacity(draftId);
            if (capacityRes.validationPassed) {
              message.success('Đã xác nhận kế hoạch và kiểm tra tải trọng thành công.');
            } else {
              message.warning(
                `Đã xác nhận kế hoạch nhưng chưa có xe nào đủ tải.${capacityRes.suggestion ? ' ' + capacityRes.suggestion : ''}`
              );
            }
          } catch (capacityErr) {
            console.error('Auto capacity validation failed after confirm', capacityErr);
            message.info('Đã xác nhận kế hoạch. Chưa thể tự động kiểm tra tải trọng, vui lòng kiểm tra thủ công.');
          }

          navigate(`/dispatcher/trip-drafts/${draftId}`);
        } catch (err) {
          const apiMessage = getApiErrorMessage(err, 'Không xác nhận được bản nháp chuyến.');
          if (getTripDraftApiStatus(err) === 409) {
            message.warning(apiMessage);
          } else {
            message.error(apiMessage);
          }
        } finally {
          setConfirming(false);
        }
      },
    });
  }

  const columns: ColumnsType<TripDraftStop> = [
    {
      title: 'Thứ tự',
      dataIndex: 'sequenceNo',
      key: 'sequenceNo',
      width: 100,
      sorter: (a, b) => a.sequenceNo - b.sequenceNo,
      render: (value: number) => <Typography.Text strong>#{value}</Typography.Text>,
    },
    {
      title: 'Cửa hàng',
      key: 'store',
      width: 240,
      render: (_value, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.storeName || '-'}</Typography.Text>
          <Typography.Text type="secondary">{record.storeCode || '-'}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      width: 280,
      render: (value: string) => value || '-',
    },
    {
      title: 'Đơn hàng',
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: 100,
      align: 'right' as const,
      render: (count: number) => count,
    },
    {
      title: 'Khối lượng / Thể tích',
      key: 'capacity',
      width: 170,
      render: (_value, record) => (
        <Space direction="vertical" size={0}>
          <span>{formatNumber(record.weightKg)} kg</span>
          <Typography.Text type="secondary">
            {formatNumber(record.volumeM3, 2)} m3
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'ETA',
      key: 'eta',
      width: 190,
      render: (_value, record) =>
        record.status === 'SKIPPED' ? (
          <Typography.Text type="secondary">Không tính ETA</Typography.Text>
        ) : (
          <Space direction="vertical" size={0}>
            <Typography.Text>{formatDateTime(record.eta)}</Typography.Text>
            <Typography.Text type="secondary">
              {record.estimatedTravelMin ?? 0} phút, {formatNumber(record.estimatedDistanceKm, 1)} km
            </Typography.Text>
          </Space>
        ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      render: (_value, record) =>
        record.status === 'ACTIVE' ? (
          <Tag color="green">{getStopStatusLabel(record.status)}</Tag>
        ) : (
          <Tag color="default">{getStopStatusLabel(record.status)}</Tag>
        ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_value, record) => {
        const isActive = record.status === 'ACTIVE';
        const label = isActive ? 'Bỏ qua' : 'Kích hoạt';
        const hasOrders = record.orderCount > 0;

        const isSkipButton = canEditTrip ? (
          <Popconfirm
            title={`${label} điểm dừng này?`}
            description="Tuyến đường và ETA sẽ được tính lại sau thay đổi này."
            okText={label}
            cancelText="Huỷ"
            onConfirm={() => handleToggleStop(record)}
            disabled={actionDisabled}
          >
            <Button
              danger={isActive}
              loading={toggleStopId === record.id}
              disabled={actionDisabled}
              type={isActive ? 'default' : 'primary'}
              size="small"
              style={{ borderRadius: 6 }}
            >
              {label}
            </Button>
          </Popconfirm>
        ) : (
          <Typography.Text type="secondary">Chỉ xem</Typography.Text>
        );

        return (
          <Space size={8}>
            {hasOrders && (
              <Button
                icon={<Eye size={14} />}
                size="small"
                onClick={() => showOrderDetails(record)}
                style={{ borderRadius: 6 }}
              >
                Chi tiết
              </Button>
            )}
            {isSkipButton}
          </Space>
        );
      }
    },
  ];

  return (
    <AdminShell currentUser={currentUser}>
      {contextHolder}
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 16 }}>
        <Breadcrumb
          items={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Quản lý gom đơn', href: '/dispatcher/trip-drafts' },
            { title: 'Kiểm tra bản nháp chuyến' },
          ]}
        />
        <Flex align="center" gap={12}>
          <Button
            type="text"
            icon={<ArrowLeft size={18} />}
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate('/dispatcher/trip-drafts');
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: '#f5f5f5',
              border: 'none',
              padding: 0
            }}
          />
          <Typography.Title level={2} style={{ margin: 0, fontWeight: 700 }}>
            Kiểm tra bản nháp chuyến
          </Typography.Title>
        </Flex>
      </Space>

        {forbiddenMessage ? (
          <Alert
            type="warning"
            showIcon
            message="Không có quyền truy cập"
            description={
              <Space direction="vertical" size={4}>
                <span>{forbiddenMessage}</span>
                <span>
                  Vai trò hiện tại:{' '}
                  {currentUser.roles.length > 0 ? currentUser.roles.join(', ') : 'Không tìm thấy vai trò'}
                </span>
                <span>
                  Vui lòng đăng nhập bằng tài khoản được backend cấp quyền kiểm tra bản nháp chuyến,
                  thường là DISPATCHER hoặc LOGISTICS_MANAGER.
                </span>
              </Space>
            }
          />
        ) : null}

        {error ? <Alert type="error" showIcon message={error} /> : null}

        {draft && draft.status !== 'DRAFT' ? (
          <Alert
            type="warning"
            showIcon
            message={`Bản nháp hiện có trạng thái ${getDraftStatusLabel(draft.status)}. Không thể đổi trạng thái điểm dừng hoặc xác nhận.`}
          />
        ) : null}

        <Spin spinning={loading}>
          {draft ? (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic title="Mã bản nháp" value={draft.draftCode || draft.id} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic
                      title="Xe giao hàng"
                      value={vehicleDisplay.value}
                      suffix={vehicleDisplay.suffix}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic title="Điểm dừng hoạt động" value={activeStops.length} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic title="Tổng đơn hàng" value={draft.totalOrders} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic
                      title="Tổng khối lượng"
                      value={draft.totalWeightKg}
                      suffix="kg"
                      formatter={(value) => formatNumber(Number(value))}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic
                      title="Tổng thể tích"
                      value={draft.totalVolumeM3}
                      suffix="m3"
                      precision={2}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic
                      title="Quãng đường dự kiến"
                      value={estimatedTotals.distanceKm}
                      suffix="km"
                      precision={1}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic
                      title="Thời lượng dự kiến"
                      value={estimatedTotals.durationMin}
                      suffix="phút"
                    />
                  </Card>
                </Col>
              </Row>

              <Card
                bordered={false}
                title={
                  <Space>
                    <MapPinned size={18} />
                    <span>Điểm dừng</span>
                  </Space>
                }
                extra={
                  <Space wrap>
                    <Tag color="green">{activeStops.length} hoạt động</Tag>
                    <Tag color="default">
                      {draft.stops.length - activeStops.length} bỏ qua
                    </Tag>
                  </Space>
                }
              >
                <Table
                  columns={columns}
                  dataSource={draft.stops}
                  rowKey="id"
                  loading={recalculating}
                  scroll={{ x: 1420 }}
                  pagination={false}
                  onRow={(record) => ({
                    style:
                      record.status === 'SKIPPED'
                        ? { opacity: 0.62, backgroundColor: '#fafafa' }
                        : undefined,
                  })}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Chưa có điểm dừng"
                      />
                    ),
                  }}
                />
              </Card>

              <Card bordered={false}>
                <Row justify="space-between" gutter={[12, 12]}>
                  <Col>
                    <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
                      Quay lại
                    </Button>
                  </Col>
                  <Col>
                    <Space wrap>
                      <TimePicker
                        format="HH:mm"
                        value={plannedTime}
                        onChange={(val) => setPlannedTime(val)}
                        allowClear={false}
                        disabled={!isDraftEditable || confirming}
                        placeholder="Giờ đi"
                        style={{ width: 100, display: canEditTrip ? undefined : 'none' }}
                      />
                      <Button
                        icon={<RefreshCw size={16} />}
                        loading={recalculating}
                        disabled={!isDraftEditable || confirming}
                        onClick={() => runRecalculate()}
                        style={{ display: canEditTrip ? undefined : 'none' }}
                      >
                        Tính lại ETA
                      </Button>
                      <Button
                        icon={<PackageCheck size={16} />}
                        onClick={() => navigate(`/trip-drafts/${draft.id}/loading-manifest`)}
                      >
                        LIFO Manifest
                      </Button>
                      <Button
                        type="primary"
                        icon={<Navigation size={16} />}
                        loading={confirming}
                        disabled={
                          loading ||
                          !isDraftEditable ||
                          activeStops.length === 0 ||
                          recalculating
                        }
                        onClick={handleConfirm}
                        style={{ display: canConfirmTrip ? undefined : 'none' }}
                      >
                        Xác nhận bản nháp
                      </Button>
                    </Space>
                  </Col>
                </Row>
              </Card>
            </Space>
          ) : !loading ? (
            <Card bordered={false}>
              <Empty description="Không tìm thấy bản nháp chuyến" />
            </Card>
          ) : null}
        </Spin>
      </Space>

      {/* Order Items Detail Modal */}
      <Modal
        title={
          <Space>
            <PackageCheck size={20} style={{ color: '#1677ff' }} />
            <span>Chi tiết đơn hàng điểm dừng: {selectedStopForDetail?.storeName || selectedStopForDetail?.storeCode}</span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setDetailModalVisible(false)}>
            Đóng
          </Button>
        ]}
        width={800}
        destroyOnClose
      >
        {detailModalLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin tip="Đang tải chi tiết đơn hàng..." />
          </div>
        ) : stopOrderItems.length > 0 ? (
          <Table
            dataSource={stopOrderItems}
            columns={detailColumns}
            rowKey={(record, idx) => `${record.orderRef}-${record.sku}-${idx}`}
            pagination={false}
            bordered
            size="small"
            summary={(pageData) => {
              let totalQty = 0;
              let totalWeight = 0;
              let totalVolume = 0;
              pageData.forEach(({ quantity, weightKg, volumeM3 }) => {
                totalQty += quantity;
                totalWeight += weightKg;
                totalVolume += volumeM3;
              });
              return (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 600 }}>
                    <Table.Summary.Cell index={0} colSpan={3}>Tổng cộng</Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">{formatNumber(totalQty)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">{formatNumber(totalWeight, 1)} kg</Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">{formatNumber(totalVolume, 3)} m³</Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              );
            }}
          />
        ) : (
          <Alert
            type="info"
            message="Không tìm thấy chi tiết sản phẩm"
            description="Dữ liệu chi tiết sản phẩm từ file Excel nhập cho batch này không tồn tại trên trình duyệt này."
            showIcon
          />
        )}
      </Modal>
    </AdminShell>
  );
};

export default TripDraftReviewPage;
