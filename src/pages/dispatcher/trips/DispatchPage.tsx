import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Breadcrumb,
  Typography,
  Row,
  Col,
  Spin,
  message,
  Alert,
  Modal,
  Divider,
  Result,
  Statistic,
  Collapse,
  Table,
  Empty,
} from 'antd';
import {
  ArrowLeftOutlined,
  LockOutlined,
  PrinterOutlined,
  DownloadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CarOutlined,
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { Truck, ShieldCheck, ShieldAlert, Scale } from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import StatusBadge from '../../../components/StatusBadge';
import { palette } from '../../../theme/tokens';
import {
  getTripById,
  getFleetCapacityCheck,
  dispatchTrip,
  openHandoverSlip,
} from '../../../api/tripApi';
import { dispatchExportApi } from '../../../api/dispatchExportApi';
import { downloadBlob } from '../../../utils/downloadBlob';
import type { Trip, FleetCapacityCheck } from '../../../types/trip';
import { usePermissions } from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../constants/permissions';
import { getTripOutcomeHistory } from '../../../api/tripOutcomeEventApi';
import { TRIP_OUTCOME_EVENT_TYPE_LABEL, type TripOutcomeEvent } from '../../../types/tripOutcomeEvent';

const { Title, Text } = Typography;

function getCurrentUser() {
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';
  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) roles = JSON.parse(rolesStr);
  } catch {
    // ignore
  }
  return { id: Number(userId), username, fullName: username, roles };
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const [year, month, day] = String(dateStr).split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateStr);
  }
}

function formatDateTime(dt?: string | null): string {
  if (!dt) return '—';
  try {
    const d = new Date(dt);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dt;
  }
}

function fmtVolume(v?: number | null): string {
  if (v == null || isNaN(Number(v))) return '—';
  return Number(v).toFixed(3) + ' m³';
}

function fmtWeight(w?: number | null): string {
  if (w == null || isNaN(Number(w))) return '—';
  return Number(w).toFixed(3) + ' kg';
}

function getErrorCode(err: unknown): string {
  const e = err as { response?: { data?: { error?: { code?: string } } } };
  return e?.response?.data?.error?.code || '';
}

function getErrorMessage(err: unknown, fallback = 'Có lỗi xảy ra, vui lòng thử lại.'): string {
  const e = err as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string };
  return (
    e?.response?.data?.error?.message ||
    e?.response?.data?.message ||
    (e as { message?: string })?.message ||
    fallback
  );
}

function renderTripStatusTag(status?: string | null) {
  if (!status) return null;
  const map: Record<string, { color: 'success' | 'purple' | 'blue' | 'cyan' | 'default'; text: string }> = {
    VALIDATED: { color: 'success', text: 'Sẵn sàng điều phối' },
    DISPATCHED: { color: 'purple', text: 'Đã điều phối' },
    IN_PROGRESS: { color: 'blue', text: 'Đang giao hàng' },
    COMPLETED: { color: 'cyan', text: 'Hoàn thành' },
  };
  const { color, text } = map[status] || { color: 'default', text: status };
  return <StatusBadge color={color}>{text}</StatusBadge>;
}

const DispatchPage: React.FC = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const { can } = usePermissions();
  const canCoordinateTrip = can(PERMISSIONS.TRIP_COORDINATE);

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [fleetCheck, setFleetCheck] = useState<FleetCapacityCheck | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [handoverLoading, setHandoverLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Outcome history panel (ELOG-141)
  const OUTCOME_HISTORY_PAGE_SIZE = 10;
  const [outcomeEvents, setOutcomeEvents] = useState<TripOutcomeEvent[]>([]);
  const [outcomeHistoryLoading, setOutcomeHistoryLoading] = useState(false);
  const [outcomeHistoryLoaded, setOutcomeHistoryLoaded] = useState(false);
  const [outcomeHistoryPage, setOutcomeHistoryPage] = useState(0);
  const [outcomeHistoryTotal, setOutcomeHistoryTotal] = useState(0);

  // ── Load trip + fleet check ───────────────────────────────────────────────
  // Used by error handlers to reload after TRIP_LOCKED etc.
  const loadData = async () => {
    if (!tripId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const tripData = await getTripById(tripId);
      setTrip(tripData);

      if (tripData.deliveryDate) {
        try {
          const fleet = await getFleetCapacityCheck(String(tripData.deliveryDate));
          setFleetCheck(fleet);
        } catch {
          // Fleet check failure is non-critical
        }
      }
    } catch (err) {
      console.error(err);
      const code = getErrorCode(err);
      if (code === 'TRIP_NOT_FOUND') {
        setLoadError('Không tìm thấy chuyến đi với ID này.');
      } else {
        setLoadError(getErrorMessage(err, 'Không thể tải thông tin chuyến. Vui lòng thử lại.'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tripId]);

  // ── Dispatch ──────────────────────────────────────────────────────────────
  const handleDispatch = async () => {
    if (!tripId) return;
    setDispatching(true);
    try {
      const result = await dispatchTrip(tripId);
      setTrip(result);
      message.success('Điều phối chuyến thành công! Chuyến đã được khóa.');
      setConfirmModalOpen(false);
    } catch (err) {
      console.error(err);
      const code = getErrorCode(err);
      setConfirmModalOpen(false);

      if (code === 'TRIP_LOCKED') {
        message.warning('Chuyến đã được điều phối trước đó. Đang tải lại thông tin...');
        await loadData();
      } else if (code === 'INVALID_TRIP_TRANSITION') {
        message.error('Chuyến không ở trạng thái hợp lệ để điều phối. Vui lòng tải lại trang.');
        await loadData();
      } else if (code === 'TRIP_COMPLETED') {
        message.error('Chuyến đã hoàn thành và không thể điều phối lại.');
        await loadData();
      } else if (code === 'FLEET_CAPACITY_SHORTFALL') {
        message.error('Đội xe không đủ năng lực. Không thể điều phối chuyến.');
      } else if (code === 'ACCESS_DENIED') {
        message.error('Bạn không có quyền điều phối chuyến.');
      } else {
        message.error(getErrorMessage(err, 'Điều phối thất bại. Vui lòng thử lại.'));
      }
    } finally {
      setDispatching(false);
    }
  };

  // ── Handover slip ─────────────────────────────────────────────────────────
  const handleOpenHandoverSlip = async () => {
    if (!tripId) return;
    setHandoverLoading(true);
    try {
      await openHandoverSlip(tripId);
    } catch (err) {
      const code = getErrorCode(err);
      if (code === 'HANDOVER_SLIP_NOT_AVAILABLE') {
        message.error('Phiếu bàn giao chưa sẵn sàng. Vui lòng thử lại sau.');
      } else {
        message.error(getErrorMessage(err, 'Không thể mở phiếu bàn giao. Vui lòng thử lại.'));
      }
    } finally {
      setHandoverLoading(false);
    }
  };

  // ── Confirmed dispatch data export ───────────────────────────────────────
  const handleExportDispatch = async () => {
    if (!trip?.tripDraftId) return;
    setExportLoading(true);
    try {
      const blob = await dispatchExportApi.exportSingleDispatch(trip.tripDraftId);
      const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
      downloadBlob(blob, `ELog_DispatchExport_${trip.tripDraftId}_${stamp}.xlsx`);
      message.success('Xuất dữ liệu điều phối thành công');
    } catch (err) {
      const code = getErrorCode(err);
      if (code === 'TRIP_NOT_DISPATCHED') {
        message.error('Chuyến chưa được điều phối, không thể xuất dữ liệu.');
      } else {
        message.error(getErrorMessage(err, 'Không thể xuất dữ liệu điều phối. Vui lòng thử lại.'));
      }
    } finally {
      setExportLoading(false);
    }
  };

  // ── Outcome history ───────────────────────────────────────────────────────
  const fetchOutcomeHistory = async (page = 0) => {
    if (!tripId) return;
    setOutcomeHistoryLoading(true);
    try {
      const result = await getTripOutcomeHistory(tripId, { page, size: OUTCOME_HISTORY_PAGE_SIZE });
      setOutcomeEvents(result.items);
      setOutcomeHistoryTotal(result.pagination.totalElements);
      setOutcomeHistoryPage(page);
      setOutcomeHistoryLoaded(true);
    } catch (err) {
      message.error(getErrorMessage(err, 'Không tải được lịch sử thực thi.'));
    } finally {
      setOutcomeHistoryLoading(false);
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const isDispatched = trip?.status === 'DISPATCHED' || trip?.status === 'IN_PROGRESS' || trip?.status === 'COMPLETED';
  const canDispatch =
    canCoordinateTrip &&
    trip?.status === 'VALIDATED' &&
    !trip?.lockedAt &&
    !dispatching &&
    (fleetCheck == null || fleetCheck.canDispatch);

  // ── Render: loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <AdminShell currentUser={currentUser}>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Đang tải thông tin chuyến..." />
        </div>
      </AdminShell>
    );
  }

  // ── Render: 403 ──────────────────────────────────────────────────────────
  if (!canCoordinateTrip) {
    return (
      <AdminShell currentUser={currentUser}>
        <Result
          status="403"
          title="Không có quyền"
          subTitle="Bạn không có quyền điều phối chuyến. Chỉ Dispatcher mới được thực hiện chức năng này."
          extra={<Button type="primary" onClick={() => navigate(-1)}>Quay lại</Button>}
        />
      </AdminShell>
    );
  }

  // ── Render: load error ───────────────────────────────────────────────────
  if (loadError) {
    return (
      <AdminShell currentUser={currentUser}>
        <Result
          status="error"
          title="Không thể tải thông tin chuyến"
          subTitle={loadError}
          extra={[
            <Button key="retry" type="primary" onClick={loadData}>Tải lại</Button>,
            <Button key="back" onClick={() => navigate(-1)}>Quay lại</Button>,
          ]}
        />
      </AdminShell>
    );
  }

  if (!trip) {
    return (
      <AdminShell currentUser={currentUser}>
        <Result
          status="404"
          title="Không tìm thấy chuyến"
          extra={<Button onClick={() => navigate('/dispatcher/trip-drafts')}>Danh sách gom đơn</Button>}
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell currentUser={currentUser}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16 }}>
        <Breadcrumb
          items={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Quản lý gom đơn', href: '/dispatcher/trip-drafts' },
            { title: `TripDraft #${trip.tripDraftId}`, href: `/dispatcher/trip-drafts/${trip.tripDraftId}` },
            { title: `Phân xe`, href: `/dispatcher/trip-drafts/${trip.tripDraftId}/assign` },
            { title: `Điều phối Chuyến #${trip.tripId}` },
          ]}
        />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Quay lại
          </Button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
                Xác nhận điều phối — Chuyến #{trip.tripId}
              </Title>
              {renderTripStatusTag(trip.status)}
              {trip.lockedAt && <StatusBadge color="error" icon={<LockOutlined />}>Đã khóa</StatusBadge>}
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Tuyến: <strong>{trip.fixedRouteCode}</strong>
              &nbsp;·&nbsp;Ngày giao: <strong>{formatDate(String(trip.deliveryDate))}</strong>
            </Text>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {isDispatched && (
            <Button
              icon={<PrinterOutlined />}
              loading={handoverLoading}
              onClick={handleOpenHandoverSlip}
            >
              In phiếu bàn giao
            </Button>
          )}
          {isDispatched && (
            <Button
              icon={<DownloadOutlined />}
              loading={exportLoading}
              onClick={handleExportDispatch}
            >
              Xuất dữ liệu điều phối
            </Button>
          )}
          {!isDispatched && (
            <Button
              type="primary"
              icon={<LockOutlined />}
              disabled={!canDispatch}
              onClick={() => setConfirmModalOpen(true)}
            >
              Điều phối và khóa chuyến
            </Button>
          )}
        </div>
      </div>

      {/* Warning banner (before dispatch) */}
      {!isDispatched && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message="Cảnh báo quan trọng"
          description="Sau khi điều phối, chuyến sẽ bị khóa và không thể chỉnh sửa xe, tài xế hoặc điểm giao. Vui lòng kiểm tra kỹ thông tin trước khi xác nhận."
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Fleet capacity banner */}
      {fleetCheck && (
        <Alert
          type={fleetCheck.canDispatch ? 'success' : 'error'}
          showIcon
          icon={fleetCheck.canDispatch ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
          message={fleetCheck.canDispatch ? 'Đội xe đủ năng lực để điều phối' : 'Đội xe không đủ năng lực — Không thể điều phối'}
          description={
            !fleetCheck.canDispatch ? (
              <div style={{ fontSize: 13 }}>
                <div>Thể tích ngày: {fmtVolume(fleetCheck.dayTotalVolumeM3)} / Đội xe: {fmtVolume(fleetCheck.fleetTotalVolumeM3)}</div>
                <div>Tải trọng ngày: {fmtWeight(fleetCheck.dayTotalWeightKg)} / Đội xe: {fmtWeight(fleetCheck.fleetTotalWeightKg)}</div>
                {fleetCheck.message && <div style={{ marginTop: 4 }}>{fleetCheck.message}</div>}
              </div>
            ) : fleetCheck.message || undefined
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Dispatched success banner */}
      {isDispatched && (
        <Alert
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          message="Chuyến đã được điều phối thành công"
          description={
            <div>
              <div>Thời điểm khóa: <strong>{formatDateTime(trip.lockedAt)}</strong></div>
              {trip.lockedBy && <div>Người điều phối: <strong>{trip.lockedBy.fullName}</strong></div>}
            </div>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Trip info card */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Truck size={18} style={{ color: palette.primary }} />
                <span>Thông tin chuyến</span>
              </div>
            }
            style={{ borderRadius: 14, marginBottom: 16 }}
          >
            <Row gutter={[24, 16]}>
              <Col xs={12} sm={8}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}><CalendarOutlined /> Ngày giao</Text>
                  <Text strong>{formatDate(String(trip.deliveryDate))}</Text>
                </div>
              </Col>
              <Col xs={12} sm={8}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Tuyến</Text>
                  <Text strong>{trip.fixedRouteCode || '—'}</Text>
                </div>
              </Col>
              <Col xs={12} sm={8}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Trạng thái</Text>
                  <div style={{ marginTop: 2 }}>{renderTripStatusTag(trip.status)}</div>
                </div>
              </Col>
              <Col xs={12} sm={8}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}><ClockCircleOutlined /> Giờ xuất phát dự kiến</Text>
                  <Text strong>{trip.plannedDepartureTime ? String(trip.plannedDepartureTime) : '—'}</Text>
                </div>
              </Col>
              <Col xs={12} sm={8}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Manifest ID</Text>
                  <Text strong>{trip.manifestId ?? '—'}</Text>
                </div>
              </Col>
              {trip.lockedAt && (
                <Col xs={12} sm={8}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}><LockOutlined /> Thời điểm khóa</Text>
                    <Text strong>{formatDateTime(trip.lockedAt)}</Text>
                  </div>
                </Col>
              )}
            </Row>

            <Divider style={{ margin: '16px 0' }} />

            {/* Vehicle & Driver */}
            <Row gutter={[24, 16]}>
              <Col xs={24} sm={12}>
                <Card
                  size="small"
                  style={{ borderRadius: 10, background: palette.primaryBg, border: `1px solid ${palette.borderSoft}` }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <CarOutlined style={{ color: palette.primary, fontSize: 16 }} />
                    <Text strong>Xe</Text>
                  </div>
                  {trip.vehicle ? (
                    <>
                      <div><Text type="secondary" style={{ fontSize: 12 }}>Biển số:</Text> <Text strong>{trip.vehicle.plateNumber}</Text></div>
                      <div><Text type="secondary" style={{ fontSize: 12 }}>Loại xe:</Text> <Text strong>{trip.vehicle.vehicleType}</Text></div>
                    </>
                  ) : (
                    <Text type="secondary">Chưa phân xe</Text>
                  )}
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card
                  size="small"
                  style={{ borderRadius: 10, background: palette.successBg, border: `1px solid ${palette.borderSoft}` }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <UserOutlined style={{ color: palette.success, fontSize: 16 }} />
                    <Text strong>Tài xế</Text>
                  </div>
                  {trip.driver ? (
                    <>
                      <div><Text type="secondary" style={{ fontSize: 12 }}>Họ tên:</Text> <Text strong>{trip.driver.fullName}</Text></div>
                    </>
                  ) : (
                    <Text type="secondary">Chưa phân tài xế</Text>
                  )}
                  {trip.lockedBy && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${palette.borderSoft}` }}>
                      <Text type="secondary" style={{ fontSize: 11 }}>Điều phối bởi: {trip.lockedBy.fullName}</Text>
                    </div>
                  )}
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Stats */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Scale size={18} style={{ color: palette.gold }} />
                <span>Thông số chuyến</span>
              </div>
            }
            style={{ borderRadius: 14 }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={12}>
                <Card size="small" style={{ background: palette.primaryBg, borderRadius: 10, textAlign: 'center' }}>
                  <Statistic
                    title="Thể tích"
                    value={trip.totalVolumeM3 != null ? Number(trip.totalVolumeM3).toFixed(3) : '—'}
                    suffix="m³"
                    valueStyle={{ color: palette.primaryDark, fontSize: 18 }}
                  />
                </Card>
              </Col>
              <Col xs={12}>
                <Card size="small" style={{ background: palette.goldBg, borderRadius: 10, textAlign: 'center' }}>
                  <Statistic
                    title="Tải trọng"
                    value={trip.totalWeightKg != null ? Number(trip.totalWeightKg).toFixed(3) : '—'}
                    suffix="kg"
                    valueStyle={{ color: palette.gold, fontSize: 18 }}
                  />
                </Card>
              </Col>
              <Col xs={12}>
                <Card size="small" style={{ background: palette.violetBg, borderRadius: 10, textAlign: 'center' }}>
                  <Statistic
                    title="Số điểm dừng"
                    value={trip.tripStopCount ?? '—'}
                    valueStyle={{ color: palette.violet, fontSize: 18 }}
                  />
                </Card>
              </Col>
              <Col xs={12}>
                <Card size="small" style={{ background: palette.successBg, borderRadius: 10, textAlign: 'center' }}>
                  <Statistic
                    title="Trip ID"
                    value={`#${trip.tripId}`}
                    valueStyle={{ color: palette.success, fontSize: 18 }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Dispatch button (mobile/tablet) */}
            <div style={{ marginTop: 16 }}>
              {!isDispatched && (
                <Button
                  block
                  type="primary"
                  icon={<LockOutlined />}
                  size="large"
                  disabled={!canDispatch}
                  onClick={() => setConfirmModalOpen(true)}
                >
                  Điều phối và khóa chuyến
                </Button>
              )}
              {isDispatched && (
                <Button
                  block
                  icon={<PrinterOutlined />}
                  size="large"
                  loading={handoverLoading}
                  onClick={handleOpenHandoverSlip}
                  style={{ marginBottom: 8 }}
                >
                  In phiếu bàn giao
                </Button>
              )}
              {isDispatched && (
                <Button
                  block
                  icon={<DownloadOutlined />}
                  size="large"
                  loading={exportLoading}
                  onClick={handleExportDispatch}
                >
                  Xuất dữ liệu điều phối
                </Button>
              )}
            </div>

            {/* Disable reason */}
            {!isDispatched && !canDispatch && (
              <div style={{ marginTop: 8 }}>
                {trip.status !== 'VALIDATED' && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Chuyến phải ở trạng thái VALIDATED để điều phối (hiện tại: {trip.status}).
                  </Text>
                )}
                {trip.lockedAt && (
                  <Text type="secondary" style={{ fontSize: 12 }}>Chuyến đã bị khóa lúc {formatDateTime(trip.lockedAt)}.</Text>
                )}
                {fleetCheck && !fleetCheck.canDispatch && (
                  <Text type="danger" style={{ fontSize: 12 }}>Đội xe không đủ năng lực. Không thể điều phối.</Text>
                )}
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Lịch sử thực thi chuyến giao hàng (ELOG-141) */}
      <Collapse
        style={{ marginTop: 16, borderRadius: 12 }}
        onChange={(keys) => {
          const opened = Array.isArray(keys) ? keys.length > 0 : !!keys;
          if (opened && !outcomeHistoryLoaded && !outcomeHistoryLoading) {
            fetchOutcomeHistory(0);
          }
        }}
        items={[
          {
            key: 'outcome-history',
            label: <span style={{ fontSize: 16, fontWeight: 600 }}>Lịch sử thực thi chuyến giao hàng</span>,
            children: (
              <Table
                size="small"
                loading={outcomeHistoryLoading}
                dataSource={outcomeEvents}
                rowKey="id"
                pagination={{
                  current: outcomeHistoryPage + 1,
                  pageSize: OUTCOME_HISTORY_PAGE_SIZE,
                  total: outcomeHistoryTotal,
                  onChange: (p) => fetchOutcomeHistory(p - 1),
                }}
                locale={{ emptyText: <Empty description="Chưa có sự kiện thực thi nào." /> }}
                columns={[
                  { title: 'Thời gian', dataIndex: 'occurredAt', key: 'occurredAt', render: (t: string) => t || '—' },
                  {
                    title: 'Loại sự kiện',
                    dataIndex: 'eventType',
                    key: 'eventType',
                    render: (t: TripOutcomeEvent['eventType']) => <StatusBadge color="blue">{TRIP_OUTCOME_EVENT_TYPE_LABEL[t] ?? t}</StatusBadge>,
                  },
                  {
                    title: 'Người thực hiện',
                    key: 'actor',
                    render: (_: unknown, record: TripOutcomeEvent) =>
                      record.actorType === 'USER'
                        ? `${record.driverUsername || record.actorUsername || '—'}${record.actorRole ? ` (${record.actorRole})` : ''}`
                        : 'Hệ thống',
                  },
                  {
                    title: 'Đơn hàng / Cửa hàng',
                    key: 'order',
                    render: (_: unknown, record: TripOutcomeEvent) =>
                      record.orderRef || record.storeCode
                        ? `${record.orderRef ?? '—'}${record.storeCode ? ` · ${record.storeCode}` : ''}`
                        : '—',
                  },
                  {
                    title: 'Kết quả',
                    key: 'result',
                    render: (_: unknown, record: TripOutcomeEvent) =>
                      record.deliveryResult || record.reasonCode || record.exceptionText
                        ? [record.deliveryResult, record.reasonCode, record.exceptionText].filter(Boolean).join(' — ')
                        : '—',
                  },
                  {
                    title: 'Ghi chú duyệt',
                    dataIndex: 'validationNote',
                    key: 'validationNote',
                    render: (t: string | null) => t || '—',
                  },
                ]}
              />
            ),
          },
        ]}
      />

      {/* Dispatch confirmation modal */}
      <Modal
        open={confirmModalOpen}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LockOutlined style={{ color: palette.primary }} />
            <span>Xác nhận điều phối và khóa chuyến</span>
          </div>
        }
        onCancel={() => !dispatching && setConfirmModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setConfirmModalOpen(false)} disabled={dispatching}>
            Quay lại
          </Button>,
          <Button
            key="confirm"
            type="primary"
            icon={<LockOutlined />}
            loading={dispatching}
            onClick={handleDispatch}
            danger
          >
            Xác nhận điều phối
          </Button>,
        ]}
      >
        <Alert
          type="warning"
          showIcon
          message="Hành động không thể hoàn tác"
          description="Sau khi xác nhận, xe, tài xế và danh sách điểm giao không thể chỉnh sửa."
          style={{ marginBottom: 16 }}
        />
        <div style={{ background: palette.bgLayout, borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div><Text type="secondary">Trip ID:</Text> <Text strong>#{trip.tripId}</Text></div>
            <div><Text type="secondary">Tuyến:</Text> <Text strong>{trip.fixedRouteCode}</Text></div>
            <div><Text type="secondary">Ngày giao:</Text> <Text strong>{formatDate(String(trip.deliveryDate))}</Text></div>
            {trip.vehicle && (
              <div><Text type="secondary">Xe:</Text> <Text strong>{trip.vehicle.plateNumber} ({trip.vehicle.vehicleType})</Text></div>
            )}
            {trip.driver && (
              <div><Text type="secondary">Tài xế:</Text> <Text strong>{trip.driver.fullName}</Text></div>
            )}
            <div><Text type="secondary">Số điểm:</Text> <Text strong>{trip.tripStopCount ?? '—'}</Text></div>
            <div><Text type="secondary">Thể tích:</Text> <Text strong>{fmtVolume(trip.totalVolumeM3)}</Text></div>
            <div><Text type="secondary">Tải trọng:</Text> <Text strong>{fmtWeight(trip.totalWeightKg)}</Text></div>
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
};

export default DispatchPage;
