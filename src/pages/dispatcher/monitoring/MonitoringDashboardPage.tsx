import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Progress,
  Badge,
  Spin,
  Alert,
  Button,
  Space,
  Typography,
  Empty,
  Drawer,
  Table,
  Tooltip,
  Switch,
  Breadcrumb,
  Statistic,
  message,
  DatePicker,
} from 'antd';
import {
  RefreshCw,
  Truck,
  MapPin,
  AlertTriangle,
  ChevronRight,
  Satellite,
  Activity,
  Info,
  User,
} from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import { TripRouteMap } from '../../../components/TripRouteMap';
import { getActiveTrips, getTripProgress } from '../../../api/monitoringApi';
import type {
  ActiveTripsResponse,
  ActiveTripSummary,
  TripProgressResponse,
  StopProgress,
} from '../../../types/monitoring';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const DEFAULT_REFRESH_INTERVAL = 60; // seconds

// ── Status helpers ──────────────────────────────────────────────────────────

const TRIP_STATUS_MAP: Record<string, { color: string; label: string }> = {
  DISPATCHED: { color: 'default', label: 'Đã điều phối' },
  IN_PROGRESS: { color: 'processing', label: 'Đang giao' },
  COMPLETED: { color: 'success', label: 'Hoàn thành' },
};

const STOP_STATUS_MAP: Record<string, { color: string; label: string }> = {
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

function sortTrips(trips: ActiveTripSummary[]): ActiveTripSummary[] {
  const order: Record<string, number> = { IN_PROGRESS: 0, DISPATCHED: 1, COMPLETED: 2 };
  return [...trips].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
}

// ── Component ───────────────────────────────────────────────────────────────

const MonitoringDashboardPage: React.FC = () => {
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
  const [data, setData] = useState<ActiveTripsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [countdown, setCountdown] = useState(DEFAULT_REFRESH_INTERVAL);

  // Trip detail drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [tripProgress, setTripProgress] = useState<TripProgressResponse | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  // ── Error helper ──────────────────────────────────────────────────────────

  const extractErrorMessage = useCallback((err: unknown): string => {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      const axErr = err as { response?: { status?: number; data?: { error?: { code?: string; message?: string } } } };
      if (axErr.response?.status === 403) {
        return 'Bạn không có quyền theo dõi chuyến hàng.';
      }
      if (axErr.response?.data?.error?.message) {
        return axErr.response.data.error.message;
      }
    }
    return 'Không thể tải dữ liệu từ hệ thống.';
  }, []);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(
    async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      else setRefreshing(true);

      try {
        const dateStr = selectedDate.format('YYYY-MM-DD');
        const result = await getActiveTrips(dateStr);
        setData(result);
        setError(null);
        setCountdown(DEFAULT_REFRESH_INTERVAL);
      } catch (err: unknown) {
        if (!isBackground) {
          const errMsg = extractErrorMessage(err);
          setError(errMsg);
        } else {
          message.warning('Không thể làm mới dữ liệu. Giữ dữ liệu hiện tại.');
        }
      } finally {
        if (!isBackground) setLoading(false);
        else setRefreshing(false);
      }
    },
    [selectedDate, extractErrorMessage]
  );

  // Initial load
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      fetchDashboard(false);
    } else {
      fetchDashboard(false);
    }
  }, [fetchDashboard]);

  // Auto-refresh interval
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            fetchDashboard(true);
            return DEFAULT_REFRESH_INTERVAL;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, fetchDashboard]);

  // ── Trip progress ─────────────────────────────────────────────────────────

  const openTripDetail = useCallback(async (tripId: number) => {
    setSelectedTripId(tripId);
    setDrawerOpen(true);
    setProgressLoading(true);
    setTripProgress(null);

    try {
      const progress = await getTripProgress(tripId);
      setTripProgress(progress);
    } catch (err: unknown) {
      const errMsg = extractErrorMessage(err);
      message.error(errMsg);
    } finally {
      setProgressLoading(false);
    }
  }, [extractErrorMessage]);

  const handleManualRefresh = () => {
    setCountdown(DEFAULT_REFRESH_INTERVAL);
    fetchDashboard(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const trips = data ? sortTrips(data.trips) : [];

  const stopColumns = [
    {
      title: '#',
      dataIndex: 'sequenceOrder',
      key: 'sequenceOrder',
      width: 50,
      render: (v: number) => <Text strong style={{ color: '#1677ff' }}>#{v}</Text>,
    },
    {
      title: 'Mã CH',
      dataIndex: 'storeCode',
      key: 'storeCode',
      width: 100,
    },
    {
      title: 'Cửa hàng',
      dataIndex: 'storeName',
      key: 'storeName',
      render: (v: string | null) => v || '—',
    },
    {
      title: 'ETA dự kiến',
      dataIndex: 'plannedEta',
      key: 'plannedEta',
      width: 100,
      render: (v: string | null) => formatTime(v),
    },
    {
      title: 'Đến thực tế',
      dataIndex: 'actualArrivalTime',
      key: 'actualArrivalTime',
      width: 100,
      render: (v: string | null) => formatTime(v),
    },
    {
      title: 'Rời thực tế',
      dataIndex: 'actualDepartureTime',
      key: 'actualDepartureTime',
      width: 100,
      render: (v: string | null) => formatTime(v),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (v: string) => {
        const m = STOP_STATUS_MAP[v] || { color: 'default', label: v };
        return <Tag color={m.color}>{m.label}</Tag>;
      },
    },
    {
      title: 'Độ trễ',
      dataIndex: 'delayMinutes',
      key: 'delayMinutes',
      width: 110,
      render: (v: number | null, record: StopProgress) => {
        const text = formatDelay(v);
        if (v && v > 0 && record.hasException) {
          return <Text type="danger"><AlertTriangle size={12} style={{ marginRight: 4 }} />{text}</Text>;
        }
        if (v && v > 0) {
          return <Text type="warning">{text}</Text>;
        }
        return <Text type="success">{text}</Text>;
      },
    },
    {
      title: 'Ngoại lệ',
      key: 'exception',
      width: 100,
      render: (_: unknown, record: StopProgress) => {
        if (!record.hasException) return <Text type="secondary">—</Text>;
        return (
          <Tooltip title={record.exceptions?.[0]?.description || 'Có ngoại lệ'}>
            <Tag color="error" icon={<AlertTriangle size={12} />}>
              Ngoại lệ
            </Tag>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Breadcrumb + Header */}
        <Breadcrumb
          items={[
            { title: 'Trang chủ' },
            { title: 'Theo dõi chuyến hàng' },
          ]}
        />

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              <Activity size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
              Theo dõi chuyến hàng
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Ngày {data?.date ? dayjs(data.date).format('DD/MM/YYYY') : selectedDate.format('DD/MM/YYYY')}
              {data ? ` — ${data.totalActiveTrips} chuyến đang hoạt động` : ''}
            </Text>
          </div>

          <Space wrap>
            <DatePicker
              value={selectedDate}
              onChange={(v) => v && setSelectedDate(v)}
              format="DD/MM/YYYY"
              allowClear={false}
              style={{ width: 140 }}
            />
            <Space size={4}>
              <Switch
                size="small"
                checked={autoRefresh}
                onChange={setAutoRefresh}
              />
              <Text style={{ fontSize: 12 }}>
                Tự động ({countdown}s)
              </Text>
            </Space>
            <Button
              icon={<RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />}
              onClick={handleManualRefresh}
              loading={refreshing}
            >
              Làm mới
            </Button>
          </Space>
        </div>

        {/* GPS Banner */}
        <Alert
          type="info"
          showIcon
          icon={<Satellite size={16} />}
          message="Theo dõi GPS chưa khả dụng trong giai đoạn hiện tại."
          description="Tiến độ chuyến được cập nhật dựa trên trạng thái Driver gửi từ hệ thống."
          style={{ borderRadius: 8 }}
        />

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" tip="Đang tải danh sách chuyến..." />
          </div>
        ) : error ? (
          <Alert
            type="error"
            showIcon
            message="Lỗi tải dữ liệu"
            description={error}
            action={
              <Button size="small" onClick={() => fetchDashboard(false)}>
                Thử lại
              </Button>
            }
          />
        ) : trips.length === 0 ? (
          <Card>
            <Empty
              description={
                <span>
                  Không có chuyến nào đang hoạt động trong ngày{' '}
                  <strong>{selectedDate.format('DD/MM/YYYY')}</strong>.
                </span>
              }
            >
              <Button onClick={handleManualRefresh}>Làm mới</Button>
            </Empty>
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            {trips.map((trip) => (
              <Col xs={24} lg={12} xxl={8} key={trip.tripId}>
                <Card
                  hoverable
                  onClick={() => openTripDetail(trip.tripId)}
                  style={{
                    borderRadius: 12,
                    opacity: trip.status === 'COMPLETED' ? 0.7 : 1,
                    border: trip.hasUnresolvedExceptions
                      ? '1px solid #ff7a45'
                      : '1px solid #f0f0f0',
                  }}
                  styles={{
                    body: { padding: '16px 20px' },
                  }}
                  id={`trip-card-${trip.tripId}`}
                >
                  {/* Card header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 12,
                  }}>
                    <div>
                      <Text strong style={{ fontSize: 15 }}>
                        {trip.fixedRouteCode}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Trip #{trip.tripId}
                      </Text>
                    </div>
                    <Space size={4}>
                      {trip.hasUnresolvedExceptions && (
                        <Badge count={trip.exceptionStops} size="small" style={{ backgroundColor: '#ff4d4f' }}>
                          <Tag color="error" icon={<AlertTriangle size={12} />}>
                            Ngoại lệ
                          </Tag>
                        </Badge>
                      )}
                      <Tag color={TRIP_STATUS_MAP[trip.status]?.color || 'default'}>
                        {TRIP_STATUS_MAP[trip.status]?.label || trip.status}
                      </Tag>
                    </Space>
                  </div>

                  {/* Vehicle + Driver */}
                  <Space style={{ marginBottom: 12 }} wrap>
                    <Tooltip title="Xe">
                      <Tag icon={<Truck size={12} />} style={{ fontSize: 12 }}>
                        {trip.vehicleCode || '—'}
                      </Tag>
                    </Tooltip>
                    <Tooltip title="Tài xế">
                      <Tag icon={<User size={12} />} style={{ fontSize: 12 }}>
                        {trip.driverName || '—'}
                      </Tag>
                    </Tooltip>
                  </Space>

                  {/* Departure times */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 12 }}>
                    <div>
                      <Text type="secondary">Dự kiến: </Text>
                      <Text>{trip.plannedDepartureTime ? String(trip.plannedDepartureTime) : '—'}</Text>
                    </div>
                    <div>
                      <Text type="secondary">Thực tế: </Text>
                      <Text>{formatTime(trip.actualDepartureTime)}</Text>
                    </div>
                  </div>

                  {/* Progress */}
                  <Progress
                    percent={trip.progressPercent}
                    status={trip.hasUnresolvedExceptions ? 'exception' : trip.status === 'COMPLETED' ? 'success' : 'active'}
                    size="small"
                    style={{ marginBottom: 8 }}
                  />

                  {/* Stop counts */}
                  <Row gutter={8}>
                    <Col span={6}>
                      <Statistic
                        title={<Text style={{ fontSize: 11 }}>Tổng</Text>}
                        value={trip.totalStops}
                        valueStyle={{ fontSize: 16, fontWeight: 600 }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title={<Text style={{ fontSize: 11, color: '#52c41a' }}>Xong</Text>}
                        value={trip.completedStops}
                        valueStyle={{ fontSize: 16, fontWeight: 600, color: '#52c41a' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title={<Text style={{ fontSize: 11 }}>Chờ</Text>}
                        value={trip.pendingStops}
                        valueStyle={{ fontSize: 16, fontWeight: 600, color: '#8c8c8c' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title={<Text style={{ fontSize: 11, color: '#ff4d4f' }}>Lỗi</Text>}
                        value={trip.exceptionStops}
                        valueStyle={{ fontSize: 16, fontWeight: 600, color: trip.exceptionStops > 0 ? '#ff4d4f' : '#8c8c8c' }}
                      />
                    </Col>
                  </Row>

                  {/* Open detail hint */}
                  <div style={{ textAlign: 'right', marginTop: 8 }}>
                    <Text style={{ fontSize: 12, color: '#1677ff' }}>
                      Xem chi tiết <ChevronRight size={12} />
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {/* ── Trip Detail Drawer ───────────────────────────────────────────── */}
        <Drawer
          title={
            <Space>
              <MapPin size={18} />
              Chi tiết chuyến #{selectedTripId}
            </Space>
          }
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={Math.min(window.innerWidth - 40, 900)}
          destroyOnClose
        >
          {progressLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin size="large" tip="Đang tải chi tiết..." />
            </div>
          ) : tripProgress ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Trip header info */}
              <Card size="small" style={{ borderRadius: 8 }}>
                <Row gutter={[16, 8]}>
                  <Col span={8}>
                    <Text type="secondary">Mã tuyến</Text>
                    <br />
                    <Text strong>{tripProgress.fixedRouteCode}</Text>
                  </Col>
                  <Col span={8}>
                    <Text type="secondary">Ngày giao</Text>
                    <br />
                    <Text strong>
                      {dayjs(tripProgress.deliveryDate).format('DD/MM/YYYY')}
                    </Text>
                  </Col>
                  <Col span={8}>
                    <Text type="secondary">Trạng thái</Text>
                    <br />
                    <Tag color={TRIP_STATUS_MAP[tripProgress.status]?.color || 'default'}>
                      {TRIP_STATUS_MAP[tripProgress.status]?.label || tripProgress.status}
                    </Tag>
                  </Col>
                  <Col span={8}>
                    <Text type="secondary">Xe</Text>
                    <br />
                    <Text strong>{tripProgress.vehicle?.plateNumber || '—'}</Text>
                  </Col>
                  <Col span={8}>
                    <Text type="secondary">Tài xế</Text>
                    <br />
                    <Text strong>{tripProgress.driver?.fullName || '—'}</Text>
                  </Col>
                  <Col span={8}>
                    <Text type="secondary">SĐT</Text>
                    <br />
                    <Text>{tripProgress.driver?.phone || '—'}</Text>
                  </Col>
                </Row>
              </Card>

              {/* GPS note */}
              {tripProgress.gpsNote && (
                <Alert
                  type="info"
                  showIcon
                  icon={<Info size={14} />}
                  message={tripProgress.gpsNote}
                  style={{ borderRadius: 8 }}
                />
              )}

              {/* Bản đồ tuyến đường */}
              <Card
                title={
                  <Space>
                    <MapPin size={16} />
                    Bản đồ tuyến đường giao hàng
                  </Space>
                }
                size="small"
                style={{ borderRadius: 8 }}
                extra={
                  <Tag color="blue" style={{ fontSize: 11 }}>
                    {tripProgress.stops.filter((s) => s.latitude != null && s.longitude != null).length} / {tripProgress.stops.length} điểm có tọa độ
                  </Tag>
                }
              >
                <TripRouteMap stops={tripProgress.stops} />
              </Card>

              {/* Stops table */}
              <Card
                title={
                  <Space>
                    <MapPin size={16} />
                    Danh sách điểm giao ({tripProgress.stops.length} điểm)
                  </Space>
                }
                size="small"
                style={{ borderRadius: 8 }}
              >
                <Table
                  dataSource={[...tripProgress.stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder)}
                  columns={stopColumns}
                  rowKey="tripStopId"
                  pagination={false}
                  size="small"
                  scroll={{ x: 900 }}
                  rowClassName={(record) => {
                    if (record.hasException) return 'stop-row-exception';
                    if (record.status === 'COMPLETED') return 'stop-row-completed';
                    if (record.status === 'IN_PROGRESS') return 'stop-row-active';
                    return '';
                  }}
                />
              </Card>
            </div>
          ) : (
            <Empty description="Không thể tải chi tiết chuyến." />
          )}
        </Drawer>
      </div>

      <style>{`
        .stop-row-exception {
          background-color: #fff2e8 !important;
        }
        .stop-row-completed {
          background-color: #f6ffed !important;
        }
        .stop-row-active {
          background-color: #e6f7ff !important;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-icon {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </AdminShell>
  );
};

export default MonitoringDashboardPage;
