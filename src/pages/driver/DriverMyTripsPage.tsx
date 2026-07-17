import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Tag,
  Spin,
  Alert,
  Button,
  Space,
  Typography,
  Empty,
  message,
  DatePicker,
  Breadcrumb,
  Progress,
  Popconfirm,
  Badge,
  Tooltip,
  Divider,
} from 'antd';
import {
  Truck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Play,
  Navigation,
  CircleCheck,
  ChevronDown,
  ChevronUp,
  FileText,
  RefreshCw,
} from 'lucide-react';
import AdminShell from '../../components/AdminShell';
import { getMyTrips } from '../../api/tripApi';
import { startTrip, arriveAtStop, completeStop, getTripProgress } from '../../api/monitoringApi';
import type { Trip } from '../../types/trip';
import type {
  TripProgressResponse,
  StopProgress,
} from '../../types/monitoring';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

// ── Status maps ─────────────────────────────────────────────────────────────

const TRIP_STATUS_LABEL: Record<string, { color: string; label: string }> = {
  DISPATCHED: { color: 'purple', label: 'Đã điều phối' },
  IN_PROGRESS: { color: 'processing', label: 'Đang giao' },
  COMPLETED: { color: 'success', label: 'Hoàn thành' },
  VALIDATED: { color: 'default', label: 'Đã xác nhận' },
};

const STOP_STATUS_LABEL: Record<string, { color: string; label: string }> = {
  PENDING: { color: 'default', label: 'Chờ đến' },
  IN_PROGRESS: { color: 'processing', label: 'Đang giao' },
  COMPLETED: { color: 'success', label: 'Đã hoàn thành' },
  EXCEPTION: { color: 'error', label: 'Có ngoại lệ' },
};

function formatTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoStr;
  }
}

function formatDelay(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes === 0) return 'Đúng giờ';
  return `Trễ ${minutes} phút`;
}

// ── Error helper ────────────────────────────────────────────────────────────

interface ApiError {
  response?: {
    status?: number;
    data?: {
      error?: {
        code?: string;
        message?: string;
      };
    };
  };
}

function getErrorInfo(err: unknown): { code: string; message: string } {
  const axErr = err as ApiError;
  const code = axErr?.response?.data?.error?.code || '';
  const msg = axErr?.response?.data?.error?.message || '';

  switch (code) {
    case 'NOT_YOUR_TRIP':
      return { code, message: 'Bạn không được phân công cho chuyến này.' };
    case 'INVALID_TRIP_TRANSITION':
      return { code, message: msg || 'Chuyến không ở trạng thái phù hợp để thực hiện.' };
    case 'TRIP_COMPLETED':
      return { code, message: 'Chuyến đã hoàn thành.' };
    case 'STOP_ALREADY_DONE':
      return { code, message: msg || 'Điểm giao đã được xử lý.' };
    case 'STOP_NOT_PENDING':
      return { code, message: msg || 'Điểm giao không ở trạng thái chờ.' };
    case 'STOP_NOT_IN_PROGRESS':
      return { code, message: msg || 'Điểm giao chưa được xác nhận đến.' };
    case 'PREVIOUS_STOP_NOT_DONE':
      return { code, message: msg || 'Vui lòng hoàn thành điểm giao trước đó.' };
    case 'TRIP_NOT_FOUND':
    case 'TRIP_STOP_NOT_FOUND':
      return { code, message: msg || 'Không tìm thấy dữ liệu.' };
    case 'ACCESS_DENIED':
      return { code, message: 'Bạn không có quyền cập nhật chuyến này.' };
    default:
      if (axErr?.response?.status === 403) {
        return { code: 'ACCESS_DENIED', message: 'Bạn không có quyền cập nhật chuyến này.' };
      }
      if (axErr?.response?.status === 404) {
        return { code: 'NOT_FOUND', message: 'Không tìm thấy dữ liệu.' };
      }
      return { code: 'UNKNOWN', message: msg || 'Đã xảy ra lỗi. Vui lòng thử lại.' };
  }
}

// ── Component ───────────────────────────────────────────────────────────────

const DriverMyTripsPage: React.FC = () => {
  // Auth
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';
  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) roles = JSON.parse(rolesStr);
  } catch { /* */ }

  const currentUser = { id: Number(userId), username, fullName: username, roles };

  // State
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());

  // Expanded trips with stop details
  const [expandedTripId, setExpandedTripId] = useState<number | null>(null);
  const [tripProgress, setTripProgress] = useState<Record<number, TripProgressResponse>>({});
  const [progressLoading, setProgressLoading] = useState<Record<number, boolean>>({});

  // Submitting states
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dateStr = selectedDate.format('YYYY-MM-DD');
      const result = await getMyTrips(dateStr);
      setTrips(result);
    } catch (err: unknown) {
      const { message: errMsg } = getErrorInfo(err);
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  const initialLoadRef = React.useRef(false);
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      fetchTrips();
    } else {
      fetchTrips();
    }
  }, [fetchTrips]);

  // ── Load progress for expanded trip ───────────────────────────────────────

  const loadProgress = useCallback(async (tripId: number) => {
    setProgressLoading((prev) => ({ ...prev, [tripId]: true }));
    try {
      const progress = await getTripProgress(tripId);
      setTripProgress((prev) => ({ ...prev, [tripId]: progress }));
    } catch {
      // Silently fail — stops will just not show details
    } finally {
      setProgressLoading((prev) => ({ ...prev, [tripId]: false }));
    }
  }, []);

  const toggleExpand = (tripId: number) => {
    if (expandedTripId === tripId) {
      setExpandedTripId(null);
    } else {
      setExpandedTripId(tripId);
      if (!tripProgress[tripId]) {
        void loadProgress(tripId);
      }
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleStartTrip = async (tripId: number) => {
    const key = `start-${tripId}`;
    if (submitting[key]) return;
    setSubmitting((prev) => ({ ...prev, [key]: true }));

    try {
      const result = await startTrip(tripId);
      message.success(result.message || 'Bắt đầu chuyến thành công!');
      await fetchTrips();
      // Auto expand started trip
      setExpandedTripId(tripId);
      void loadProgress(tripId);
    } catch (err: unknown) {
      const { code, message: errMsg } = getErrorInfo(err);
      message.error(errMsg);
      if (code === 'NOT_YOUR_TRIP' || code === 'INVALID_TRIP_TRANSITION' || code === 'TRIP_COMPLETED') {
        await fetchTrips();
      }
    } finally {
      setSubmitting((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleArrive = async (tripStopId: number, tripId: number) => {
    const key = `arrive-${tripStopId}`;
    if (submitting[key]) return;
    setSubmitting((prev) => ({ ...prev, [key]: true }));

    try {
      const result = await arriveAtStop(tripStopId);
      if (result.timeExceptionFlagged) {
        message.warning(result.message || `⚠️ Trễ ${result.delayMinutes} phút — Ngoại lệ thời gian!`);
      } else {
        message.success(result.message || 'Đã xác nhận đến điểm giao.');
      }
      void loadProgress(tripId);
    } catch (err: unknown) {
      const { code, message: errMsg } = getErrorInfo(err);
      message.error(errMsg);
      if (code === 'NOT_YOUR_TRIP' || code === 'TRIP_COMPLETED') {
        await fetchTrips();
      } else {
        void loadProgress(tripId);
      }
    } finally {
      setSubmitting((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleComplete = async (tripStopId: number, tripId: number) => {
    const key = `complete-${tripStopId}`;
    if (submitting[key]) return;
    setSubmitting((prev) => ({ ...prev, [key]: true }));

    try {
      const result = await completeStop(tripStopId);
      if (result.tripCompleted) {
        message.success(result.message || 'Tất cả điểm giao đã hoàn thành. Chuyến đã kết thúc!');
        await fetchTrips();
      } else {
        message.success(result.message || 'Hoàn thành điểm giao.');
        void loadProgress(tripId);
      }
    } catch (err: unknown) {
      const { code, message: errMsg } = getErrorInfo(err);
      message.error(errMsg);
      if (code === 'NOT_YOUR_TRIP' || code === 'TRIP_COMPLETED') {
        await fetchTrips();
      } else {
        void loadProgress(tripId);
      }
    } finally {
      setSubmitting((prev) => ({ ...prev, [key]: false }));
    }
  };

  // ── Check if LIFO manifest route exists ───────────────────────────────────

  const hasLIFORoute = true; // Route `/trips/:tripId/loading-manifest` exists in App.tsx

  // ── Helpers to determine which stop can be actioned ───────────────────────
  // Backend enforces sequential order, so we find the first PENDING stop as actionable

  function getNextActionableStop(stops: StopProgress[]): StopProgress | null {
    const sorted = [...stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    // First find IN_PROGRESS — that's the current stop to complete
    const inProgress = sorted.find((s) => s.status === 'IN_PROGRESS');
    if (inProgress) return inProgress;
    // Then find first PENDING — that's the next to arrive
    const pending = sorted.find((s) => s.status === 'PENDING');
    return pending || null;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <Breadcrumb
          items={[
            { title: 'Trang chủ' },
            { title: 'Chuyến giao hàng' },
          ]}
        />

        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          padding: '20px 24px',
          borderRadius: 12,
          color: '#ffffff',
        }}>
          <Title level={4} style={{ margin: 0, color: '#ffffff' }}>
            <Truck size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Chuyến giao hàng của tôi
          </Title>
          <Text style={{ color: '#94a3b8', fontSize: 13 }}>
            Xin chào {username}! Dưới đây là danh sách chuyến giao hàng của bạn.
          </Text>
        </div>

        {/* Date picker */}
        <Card size="small" style={{ borderRadius: 10 }}>
          <Space align="center">
            <Clock size={16} style={{ color: '#8c8c8c' }} />
            <Text strong>Ngày giao:</Text>
            <DatePicker
              value={selectedDate}
              onChange={(v) => v && setSelectedDate(v)}
              format="DD/MM/YYYY"
              allowClear={false}
            />
            <Button
              icon={<RefreshCw size={14} />}
              onClick={fetchTrips}
              size="small"
            >
              Làm mới
            </Button>
          </Space>
        </Card>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" tip="Đang tải chuyến xe..." />
          </div>
        ) : error ? (
          <Alert
            type="error"
            showIcon
            message={error}
            action={<Button size="small" onClick={fetchTrips}>Thử lại</Button>}
          />
        ) : trips.length === 0 ? (
          <Card>
            <Empty
              description={
                <span>
                  Không có chuyến xe nào được gán cho bạn ngày{' '}
                  <strong>{selectedDate.format('DD/MM/YYYY')}</strong>.
                </span>
              }
            />
          </Card>
        ) : (
          trips.map((trip) => {
            const isExpanded = expandedTripId === trip.tripId;
            const progress = tripProgress[trip.tripId];
            const isLoadingProgress = progressLoading[trip.tripId] || false;
            const statusInfo = TRIP_STATUS_LABEL[trip.status] || { color: 'default', label: trip.status };

            return (
              <Card
                key={trip.tripId}
                style={{
                  borderRadius: 12,
                  border: trip.status === 'IN_PROGRESS'
                    ? '2px solid #1677ff'
                    : trip.status === 'COMPLETED'
                    ? '1px solid #b7eb8f'
                    : '1px solid #f0f0f0',
                }}
                styles={{
                  body: { padding: '16px 20px' },
                }}
                id={`driver-trip-${trip.tripId}`}
              >
                {/* Trip header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <Text strong style={{ fontSize: 16 }}>
                      {trip.fixedRouteCode}
                    </Text>
                    <br />
                    <Space size={8} style={{ marginTop: 4 }}>
                      <Tag icon={<Truck size={12} />}>
                        {trip.vehicle?.plateNumber || '—'}
                      </Tag>
                      <Tag icon={<Clock size={12} />}>
                        {trip.plannedDepartureTime ? String(trip.plannedDepartureTime) : '—'}
                      </Tag>
                    </Space>
                  </div>
                  <Tag color={statusInfo.color} style={{ fontWeight: 600, fontSize: 13, padding: '4px 12px' }}>
                    {statusInfo.label}
                  </Tag>
                </div>

                {/* Stop count */}
                <div style={{ margin: '12px 0' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {trip.tripStopCount} điểm giao
                  </Text>
                </div>

                {/* Actions for DISPATCHED */}
                {trip.status === 'DISPATCHED' && (
                  <Popconfirm
                    title="Bắt đầu chuyến"
                    description="Bạn có muốn bắt đầu chuyến này không?"
                    onConfirm={() => handleStartTrip(trip.tripId)}
                    okText="Bắt đầu"
                    cancelText="Hủy"
                  >
                    <Button
                      type="primary"
                      size="large"
                      block
                      icon={<Play size={16} />}
                      loading={submitting[`start-${trip.tripId}`]}
                      style={{
                        height: 48,
                        fontSize: 15,
                        fontWeight: 600,
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      Bắt đầu chuyến
                    </Button>
                  </Popconfirm>
                )}

                {/* COMPLETED badge */}
                {trip.status === 'COMPLETED' && (
                  <Alert
                    type="success"
                    showIcon
                    icon={<CheckCircle2 size={16} />}
                    message="Chuyến đã hoàn thành"
                    style={{ borderRadius: 8, marginTop: 8 }}
                  />
                )}

                {/* Expand button for IN_PROGRESS */}
                {(trip.status === 'IN_PROGRESS' || trip.status === 'DISPATCHED') && (
                  <Button
                    type="text"
                    block
                    onClick={() => toggleExpand(trip.tripId)}
                    style={{ marginTop: 8, color: '#1677ff' }}
                    icon={isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  >
                    {isExpanded ? 'Thu gọn' : 'Xem danh sách điểm giao'}
                  </Button>
                )}

                {/* LIFO manifest link */}
                {hasLIFORoute && (
                  <Button
                    type="link"
                    icon={<FileText size={14} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`/trips/${trip.tripId}/loading-manifest`, '_blank');
                    }}
                    style={{ padding: '4px 0', fontSize: 13 }}
                  >
                    Xem Manifest LIFO
                  </Button>
                )}

                {/* ── Expanded stop list ─────────────────────────────────── */}
                {isExpanded && (
                  <div style={{ marginTop: 12 }}>
                    <Divider style={{ margin: '8px 0' }} />

                    {isLoadingProgress ? (
                      <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <Spin tip="Đang tải điểm giao..." />
                      </div>
                    ) : progress ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Progress bar */}
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Tiến độ:{' '}
                            {progress.stops.filter((s) => s.status === 'COMPLETED').length}/{progress.stops.length} điểm giao
                          </Text>
                          <Progress
                            percent={
                              progress.stops.length > 0
                                ? Math.floor(
                                    (progress.stops.filter((s) => s.status === 'COMPLETED').length * 100) /
                                      progress.stops.length
                                  )
                                : 0
                            }
                            size="small"
                          />
                        </div>

                        {/* Stops */}
                        {[...progress.stops]
                          .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
                          .map((stop) => {
                            const sInfo = STOP_STATUS_LABEL[stop.status] || { color: 'default', label: stop.status };
                            const actionable = getNextActionableStop(progress.stops);
                            const isCurrentActionable = actionable?.tripStopId === stop.tripStopId;
                            const canArrive = stop.status === 'PENDING' && isCurrentActionable && trip.status === 'IN_PROGRESS';
                            const canComplete = stop.status === 'IN_PROGRESS' && isCurrentActionable;

                            return (
                              <Card
                                key={stop.tripStopId}
                                size="small"
                                style={{
                                  borderRadius: 10,
                                  border: isCurrentActionable && (canArrive || canComplete)
                                    ? '2px solid #1677ff'
                                    : stop.hasException
                                    ? '1px solid #ff7a45'
                                    : '1px solid #f0f0f0',
                                  background: stop.status === 'COMPLETED' ? '#f6ffed' : stop.hasException ? '#fff7e6' : '#fff',
                                }}
                              >
                                {/* Stop header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div>
                                    <Badge count={stop.sequenceOrder} style={{ backgroundColor: '#1677ff' }}>
                                      <Text strong style={{ fontSize: 14, paddingRight: 8 }}>
                                        {stop.storeCode}
                                      </Text>
                                    </Badge>
                                    {stop.storeName && (
                                      <Text style={{ display: 'block', fontSize: 12, color: '#595959', marginTop: 4 }}>
                                        {stop.storeName}
                                      </Text>
                                    )}
                                  </div>
                                  <Tag color={sInfo.color}>{sInfo.label}</Tag>
                                </div>

                                {/* Time info */}
                                <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, flexWrap: 'wrap' }}>
                                  <div>
                                    <Text type="secondary">ETA: </Text>
                                    <Text>{formatTime(stop.plannedEta)}</Text>
                                  </div>
                                  {stop.actualArrivalTime && (
                                    <div>
                                      <Text type="secondary">Đến: </Text>
                                      <Text>{formatTime(stop.actualArrivalTime)}</Text>
                                    </div>
                                  )}
                                  {stop.actualDepartureTime && (
                                    <div>
                                      <Text type="secondary">Rời: </Text>
                                      <Text>{formatTime(stop.actualDepartureTime)}</Text>
                                    </div>
                                  )}
                                </div>

                                {/* Delay info */}
                                {stop.delayMinutes !== null && stop.delayMinutes !== undefined && stop.delayMinutes > 0 && (
                                  <div style={{ marginTop: 6 }}>
                                    {stop.hasException ? (
                                      <Tag color="error" icon={<AlertTriangle size={12} />}>
                                        {formatDelay(stop.delayMinutes)} — Ngoại lệ thời gian
                                      </Tag>
                                    ) : (
                                      <Tag color="warning">
                                        {formatDelay(stop.delayMinutes)}
                                      </Tag>
                                    )}
                                  </div>
                                )}
                                {stop.delayMinutes !== null && stop.delayMinutes !== undefined && stop.delayMinutes === 0 && stop.actualArrivalTime && (
                                  <div style={{ marginTop: 6 }}>
                                    <Tag color="success" icon={<CheckCircle2 size={12} />}>Đúng giờ</Tag>
                                  </div>
                                )}

                                {/* Exception details */}
                                {stop.exceptions && stop.exceptions.length > 0 && (
                                  <Alert
                                    type="warning"
                                    showIcon
                                    icon={<AlertTriangle size={14} />}
                                    message={stop.exceptions[0].description}
                                    style={{ marginTop: 8, borderRadius: 6, fontSize: 12 }}
                                  />
                                )}

                                {/* Actions */}
                                {canArrive && (
                                  <Popconfirm
                                    title="Xác nhận đến điểm giao"
                                    description={`Xác nhận bạn đã đến ${stop.storeCode}?`}
                                    onConfirm={() => handleArrive(stop.tripStopId, trip.tripId)}
                                    okText="Xác nhận"
                                    cancelText="Hủy"
                                  >
                                    <Button
                                      type="primary"
                                      block
                                      size="large"
                                      icon={<Navigation size={16} />}
                                      loading={submitting[`arrive-${stop.tripStopId}`]}
                                      style={{
                                        marginTop: 12,
                                        height: 48,
                                        fontSize: 15,
                                        fontWeight: 600,
                                        borderRadius: 10,
                                        background: '#1677ff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                      }}
                                    >
                                      Đã đến điểm giao
                                    </Button>
                                  </Popconfirm>
                                )}

                                {canComplete && (
                                  <Popconfirm
                                    title="Hoàn thành điểm giao"
                                    description={`Xác nhận hoàn thành ${stop.storeCode}?`}
                                    onConfirm={() => handleComplete(stop.tripStopId, trip.tripId)}
                                    okText="Hoàn thành"
                                    cancelText="Hủy"
                                  >
                                    <Button
                                      type="primary"
                                      block
                                      size="large"
                                      icon={<CircleCheck size={16} />}
                                      loading={submitting[`complete-${stop.tripStopId}`]}
                                      style={{
                                        marginTop: 12,
                                        height: 48,
                                        fontSize: 15,
                                        fontWeight: 600,
                                        borderRadius: 10,
                                        background: '#52c41a',
                                        borderColor: '#52c41a',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 8,
                                      }}
                                    >
                                      Hoàn thành điểm giao
                                    </Button>
                                  </Popconfirm>
                                )}

                                {/* Non-actionable pending stops tooltip */}
                                {stop.status === 'PENDING' && !canArrive && trip.status === 'IN_PROGRESS' && (
                                  <Tooltip title="Vui lòng hoàn thành điểm giao trước đó">
                                    <Button
                                      block
                                      disabled
                                      style={{
                                        marginTop: 12,
                                        height: 44,
                                        borderRadius: 10,
                                        opacity: 0.5,
                                      }}
                                    >
                                      Chờ hoàn thành điểm trước
                                    </Button>
                                  </Tooltip>
                                )}
                              </Card>
                            );
                          })}
                      </div>
                    ) : (
                      <Empty description="Không thể tải danh sách điểm giao." />
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </AdminShell>
  );
};

export default DriverMyTripsPage;
