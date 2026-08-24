/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Table,
  Select,
  Input,
  DatePicker,
  Button,
  Space,
  Typography,
  Breadcrumb,
  Alert,
  Empty,
  Spin,
  Drawer,
  Descriptions,
  Divider,
  Statistic,
} from 'antd';
import {
  Truck,
  RefreshCw,
  Search,
  CheckCircle2,
  CheckCheck,
  Clock,
  Wrench,
  Ban,
  PackageCheck,
} from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import PageHeader from '../../../components/PageHeader';
import StatusBadge, { type StatusBadgeColor } from '../../../components/StatusBadge';
import { palette } from '../../../theme/tokens';
import { vehicleApi, type VehicleItem, type VehicleTripPhase } from '../../../api/vehicleApi';
import { getTripStatusSummary } from '../../../api/monitoringApi';
import { getKpiByVehicle } from '../../../api/kpiApi';
import { getExceptions } from '../../../api/exceptionApi';
import type { TripStatusSummaryResponse } from '../../../types/monitoring';
import type { KpiVehicleBreakdown } from '../../../types/kpi';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

// ── Trạng thái vận hành xe (suy ra từ Vehicle.status + currentTrip.phase) ────────
// Xem filemd/FLEET-STATUS-DASHBOARD-ADJUSTED-SPEC.md mục 0 — hệ thống không có GPS,
// đây là trạng thái nghiệp vụ (Trip/TripExecution), không phải vị trí thực tế.

type PhaseKey = 'AVAILABLE' | 'ASSIGNED_OR_DISPATCHED' | 'IN_PROGRESS' | 'RETURNING' | 'COMPLETED' | 'MAINTENANCE' | 'OUT_OF_SERVICE';

const PHASE_LABEL: Record<PhaseKey, { label: string; color: StatusBadgeColor; icon: React.ReactNode }> = {
  AVAILABLE: { label: 'Sẵn sàng', color: 'success', icon: <CheckCircle2 size={12} /> },
  ASSIGNED_OR_DISPATCHED: { label: 'Đã phân công/điều phối', color: 'blue', icon: <PackageCheck size={12} /> },
  IN_PROGRESS: { label: 'Đang thực hiện', color: 'processing', icon: <Truck size={12} /> },
  RETURNING: { label: 'Đang về kho', color: 'gold', icon: <Clock size={12} /> },
  COMPLETED: { label: 'Đã hoàn thành', color: 'cyan', icon: <CheckCheck size={12} /> },
  MAINTENANCE: { label: 'Bảo trì', color: 'purple', icon: <Wrench size={12} /> },
  OUT_OF_SERVICE: { label: 'Không khả dụng', color: 'red', icon: <Ban size={12} /> },
};

function getPhaseKey(v: VehicleItem): PhaseKey {
  if (v.status === 'MAINTENANCE') return 'MAINTENANCE';
  if (v.status === 'OUT_OF_SERVICE') return 'OUT_OF_SERVICE';
  // Ưu tiên dữ liệu chuyến thật hơn field Vehicle.status — Vehicle.status có thể bị chỉnh tay
  // (PUT /vehicles/{id}) lệch khỏi thực tế (vd: vẫn ghi AVAILABLE dù xe còn 1 chuyến DISPATCHED
  // chưa xác nhận về kho). Đây đúng là loại lệch dữ liệu dashboard này cần lộ ra, không che đi.
  const phase: VehicleTripPhase | undefined = v.currentTrip?.phase;
  if (phase === 'ASSIGNED' || phase === 'DISPATCHED') return 'ASSIGNED_OR_DISPATCHED';
  if (phase === 'IN_PROGRESS') return 'IN_PROGRESS';
  if (phase === 'RETURNING') return 'RETURNING';
  if (phase === 'COMPLETED_RETURNED') return 'COMPLETED';
  return 'AVAILABLE';
}

function getDisplayDriverName(v: VehicleItem): string | null {
  return v.currentTrip?.driverName ?? v.assignedDriverName ?? null;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return dayjs(iso).format('HH:mm DD/MM');
}

function formatUtilPct(kpi?: KpiVehicleBreakdown): string {
  if (!kpi) return '—';
  const v = kpi.avgVolumeUtilPct != null ? `${kpi.avgVolumeUtilPct.toFixed(0)}%` : '—';
  const w = kpi.avgWeightUtilPct != null ? `${kpi.avgWeightUtilPct.toFixed(0)}%` : '—';
  return `Thể tích ${v} · Trọng lượng ${w}`;
}

const KPI_CARD_ORDER: { key: PhaseKey | 'ALL'; label: string; icon: React.ReactNode }[] = [
  { key: 'ALL', label: 'Tổng số xe', icon: <Truck size={16} /> },
  { key: 'AVAILABLE', label: 'Sẵn sàng', icon: <CheckCircle2 size={16} /> },
  { key: 'ASSIGNED_OR_DISPATCHED', label: 'Đã phân công/điều phối', icon: <PackageCheck size={16} /> },
  { key: 'IN_PROGRESS', label: 'Đang thực hiện', icon: <Truck size={16} /> },
  { key: 'RETURNING', label: 'Đang về kho', icon: <Clock size={16} /> },
  { key: 'COMPLETED', label: 'Đã hoàn thành', icon: <CheckCheck size={16} /> },
  { key: 'MAINTENANCE', label: 'Bảo trì', icon: <Wrench size={16} /> },
  { key: 'OUT_OF_SERVICE', label: 'Không khả dụng', icon: <Ban size={16} /> },
];

const FleetStatusDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || '';
  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) roles = JSON.parse(rolesStr);
  } catch { /* ignore malformed roles */ }
  const currentUser = { id: Number(localStorage.getItem('userId') || 0), username, fullName: username, roles };

  const [date, setDate] = useState(dayjs());
  const dateStr = date.format('YYYY-MM-DD');

  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehiclesError, setVehiclesError] = useState('');

  const [tripSummary, setTripSummary] = useState<TripStatusSummaryResponse | null>(null);
  const [kpiByVehicle, setKpiByVehicle] = useState<KpiVehicleBreakdown[]>([]);
  const [unresolvedExceptions, setUnresolvedExceptions] = useState<number | null>(null);

  const [phaseFilter, setPhaseFilter] = useState<PhaseKey | 'ALL'>('ALL');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('ALL');
  const [driverFilter, setDriverFilter] = useState<string>('ALL');
  const [routeFilter, setRouteFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const [selectedVehicle, setSelectedVehicle] = useState<VehicleItem | null>(null);

  const fetchVehicles = useCallback(async (d: string) => {
    setVehiclesLoading(true);
    setVehiclesError('');
    try {
      // date-scoped: currentTrip reflects the vehicle's trip status for that specific delivery
      // date (including "đã hoàn thành, đã về kho") instead of "whatever's active right now" —
      // otherwise the DatePicker above wouldn't actually change what this table shows.
      const result = await vehicleApi.getVehicles({ page: 0, size: 500, sort: 'plateNumber,asc', date: d });
      setVehicles(result.content);
    } catch (err) {
      setVehiclesError((err as Error).message || 'Không tải được danh sách xe.');
    } finally {
      setVehiclesLoading(false);
    }
  }, []);

  const fetchDateScoped = useCallback(async (d: string) => {
    try {
      // Utilization report is a 7-day rolling window ending on the selected date — a single
      // day's KPI is too sparse to be meaningful (most vehicles don't run every single day).
      const kpiRangeStart = dayjs(d).subtract(6, 'day').format('YYYY-MM-DD');
      const [summary, kpi, exceptions] = await Promise.all([
        getTripStatusSummary(d),
        getKpiByVehicle({ startDate: kpiRangeStart, endDate: d }),
        getExceptions({ date: d, type: 'TIME_EXCEPTION', resolved: 'false' }),
      ]);
      setTripSummary(summary);
      setKpiByVehicle(kpi.vehicles);
      setUnresolvedExceptions(exceptions.unresolvedCount);
    } catch {
      // Không chặn hiển thị dashboard nếu 1 trong các API phụ trợ lỗi — các khu vực liên quan
      // sẽ tự hiện "—"/rỗng.
      setTripSummary(null);
      setKpiByVehicle([]);
      setUnresolvedExceptions(null);
    }
  }, []);

  useEffect(() => {
    fetchVehicles(dateStr);
    fetchDateScoped(dateStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);

  const kpiByVehicleMap = useMemo(() => {
    const map: Record<number, KpiVehicleBreakdown> = {};
    kpiByVehicle.forEach((k) => { map[k.vehicleId] = k; });
    return map;
  }, [kpiByVehicle]);

  const phaseCounts = useMemo(() => {
    const counts: Record<PhaseKey, number> = {
      AVAILABLE: 0, ASSIGNED_OR_DISPATCHED: 0, IN_PROGRESS: 0, RETURNING: 0, COMPLETED: 0, MAINTENANCE: 0, OUT_OF_SERVICE: 0,
    };
    vehicles.forEach((v) => { counts[getPhaseKey(v)] += 1; });
    return counts;
  }, [vehicles]);

  const vehicleTypeOptions = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.vehicleType).filter(Boolean))).sort(),
    [vehicles]
  );
  const driverOptions = useMemo(
    () => Array.from(new Set(vehicles.map(getDisplayDriverName).filter((n): n is string => !!n))).sort(),
    [vehicles]
  );
  const routeOptions = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.currentTrip?.routeCode).filter((r): r is string => !!r))).sort(),
    [vehicles]
  );

  const filteredVehicles = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (phaseFilter !== 'ALL' && getPhaseKey(v) !== phaseFilter) return false;
      if (vehicleTypeFilter !== 'ALL' && v.vehicleType !== vehicleTypeFilter) return false;
      if (driverFilter !== 'ALL' && getDisplayDriverName(v) !== driverFilter) return false;
      if (routeFilter !== 'ALL' && v.currentTrip?.routeCode !== routeFilter) return false;
      if (kw) {
        const driverName = getDisplayDriverName(v) ?? '';
        const haystack = [
          v.plateNumber, v.vehicleCode, driverName, v.currentTrip?.tripId ? String(v.currentTrip.tripId) : '',
        ].join(' ').toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      return true;
    });
  }, [vehicles, phaseFilter, vehicleTypeFilter, driverFilter, routeFilter, search]);

  const vehicleColumns: ColumnsType<VehicleItem> = [
    {
      title: 'Xe',
      key: 'vehicle',
      render: (_, v) => (
        <div>
          <Text strong>{v.plateNumber}</Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>{v.vehicleCode}</Text></div>
        </div>
      ),
    },
    {
      title: 'Loại xe',
      key: 'vehicleType',
      render: (_, v) => (
        <div>
          <div>{v.vehicleType}</div>
          {v.vehicleClass && <Text type="secondary" style={{ fontSize: 12 }}>{v.vehicleClass}</Text>}
        </div>
      ),
    },
    {
      title: 'Tải trọng / Sức chứa',
      key: 'capacity',
      render: (_, v) => `${v.payloadKg.toLocaleString('vi-VN')} kg / ${v.maxVolumeM3} m³`,
    },
    {
      title: 'Tài xế',
      key: 'driver',
      render: (_, v) => getDisplayDriverName(v) ?? <Text type="secondary">—</Text>,
    },
    {
      title: 'Chuyến trong ngày',
      key: 'currentTrip',
      render: (_, v) => v.currentTrip
        ? <div>#{v.currentTrip.tripId}{v.currentTrip.routeCode ? <div><Text type="secondary" style={{ fontSize: 12 }}>{v.currentTrip.routeCode}</Text></div> : null}</div>
        : <Text type="secondary">—</Text>,
    },
    {
      title: 'Trạng thái xe',
      key: 'status',
      render: (_, v) => {
        const meta = PHASE_LABEL[getPhaseKey(v)];
        return <StatusBadge color={meta.color} icon={meta.icon}>{meta.label}</StatusBadge>;
      },
    },
    {
      title: 'Dự kiến hoàn thành',
      key: 'eta',
      render: (_, v) => formatDateTime(v.currentTrip?.estimatedCompletionAt),
    },
    {
      title: 'Mức độ sử dụng (7 ngày)',
      key: 'utilization',
      render: (_, v) => v.id != null ? formatUtilPct(kpiByVehicleMap[v.id]) : '—',
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, v) => (
        <Button size="small" onClick={() => setSelectedVehicle(v)}>Chi tiết</Button>
      ),
    },
  ];

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Breadcrumb items={[{ title: 'Admin' }, { title: 'Tình trạng đội xe' }]} />

        <PageHeader
          icon={<Truck size={20} />}
          title="Tình trạng đội xe"
          subtitle="Toàn bộ đội xe và tình hình chuyến giao hàng hôm nay — dựa trên dữ liệu vận hành (phân công, dispatch, xác nhận về kho), không phải theo dõi GPS."
          actions={
            <Space>
              <DatePicker value={date} onChange={(d) => d && setDate(d)} allowClear={false} />
              <Button icon={<RefreshCw size={14} />} onClick={() => { fetchVehicles(dateStr); fetchDateScoped(dateStr); }}>
                Tải lại
              </Button>
            </Space>
          }
        />

        {vehiclesError && (
          <Alert type="error" showIcon message={vehiclesError} />
        )}

        {/* KPI cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
          {KPI_CARD_ORDER.map((c) => {
            const count = c.key === 'ALL' ? vehicles.length : phaseCounts[c.key];
            const active = phaseFilter === c.key;
            return (
              <Card
                key={c.key}
                size="small"
                hoverable
                onClick={() => setPhaseFilter(active ? 'ALL' : c.key)}
                style={{
                  borderRadius: 10,
                  borderColor: active ? palette.primary : undefined,
                  boxShadow: active ? `0 0 0 2px ${palette.primaryBg}` : undefined,
                  cursor: 'pointer',
                }}
              >
                <Space size={8}>
                  <span style={{ color: palette.primary }}>{c.icon}</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>{c.label}</Text>
                </Space>
                <Title level={3} style={{ margin: '4px 0 0 0' }}>{vehiclesLoading ? '—' : count}</Title>
              </Card>
            );
          })}
        </div>

        {/* Chuyến hôm nay */}
        <Card
          title="Tình trạng chuyến hôm nay"
          size="small"
          extra={
            <Button
              size="small"
              onClick={() => navigate(`/dispatcher/exceptions?fromDate=${dateStr}&toDate=${dateStr}&resolved=false`)}
            >
              Xem ngoại lệ{unresolvedExceptions != null ? ` (${unresolvedExceptions})` : ''}
            </Button>
          }
        >
          {tripSummary ? (
            <Row gutter={16}>
              <Col flex="1"><Statistic title="Đã phân công" value={tripSummary.validatedCount} /></Col>
              <Col flex="1"><Statistic title="Đã điều phối" value={tripSummary.dispatchedCount} /></Col>
              <Col flex="1"><Statistic title="Đang thực hiện" value={tripSummary.inProgressCount} /></Col>
              <Col flex="1"><Statistic title="Hoàn thành" value={tripSummary.completedCount} /></Col>
              <Col flex="1"><Statistic title="Tổng số chuyến" value={tripSummary.totalCount} /></Col>
            </Row>
          ) : (
            <Empty description="Không có dữ liệu chuyến cho ngày này." image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>

        {/* Bộ lọc + Bảng tình trạng xe */}
        <Card
          title="Tình trạng toàn bộ xe"
          size="small"
          extra={<Text type="secondary" style={{ fontSize: 12 }}>{filteredVehicles.length}/{vehicles.length} xe</Text>}
        >
          <Space wrap style={{ marginBottom: 12 }}>
            <Input
              prefix={<Search size={14} />}
              placeholder="Biển số, mã xe, tài xế, mã chuyến..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 240 }}
              allowClear
            />
            <Select
              value={phaseFilter}
              onChange={setPhaseFilter}
              style={{ width: 200 }}
              options={[{ value: 'ALL', label: 'Tất cả trạng thái' }, ...KPI_CARD_ORDER.slice(1).map((c) => ({ value: c.key, label: c.label }))]}
            />
            <Select
              value={vehicleTypeFilter}
              onChange={setVehicleTypeFilter}
              style={{ width: 160 }}
              options={[{ value: 'ALL', label: 'Tất cả loại xe' }, ...vehicleTypeOptions.map((t) => ({ value: t, label: t }))]}
            />
            <Select
              value={driverFilter}
              onChange={setDriverFilter}
              style={{ width: 180 }}
              options={[{ value: 'ALL', label: 'Tất cả tài xế' }, ...driverOptions.map((d) => ({ value: d, label: d }))]}
            />
            {routeOptions.length > 0 && (
              <Select
                value={routeFilter}
                onChange={setRouteFilter}
                style={{ width: 160 }}
                options={[{ value: 'ALL', label: 'Tất cả tuyến' }, ...routeOptions.map((r) => ({ value: r, label: r }))]}
              />
            )}
          </Space>

          {vehiclesLoading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin /></div>
          ) : (
            <Table
              rowKey="id"
              columns={vehicleColumns}
              dataSource={filteredVehicles}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              size="small"
            />
          )}
        </Card>

        {/* Báo cáo mức độ sử dụng xe */}
        <Card title="Báo cáo mức độ sử dụng xe (7 ngày gần nhất)" size="small">
          {kpiByVehicle.length === 0 ? (
            <Empty description="Chưa có dữ liệu KPI." image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Table
              rowKey="vehicleId"
              size="small"
              pagination={false}
              dataSource={kpiByVehicle}
              columns={[
                { title: 'Biển số', dataIndex: 'licensePlate', key: 'licensePlate' },
                { title: 'Loại xe', dataIndex: 'vehicleType', key: 'vehicleType' },
                { title: 'Số chuyến', dataIndex: 'totalTrips', key: 'totalTrips' },
                {
                  title: 'Quãng đường (km)', dataIndex: 'totalDistanceKm', key: 'totalDistanceKm',
                  render: (v: number | null) => v != null ? v.toFixed(1) : '—',
                },
                {
                  title: '% Thể tích TB', dataIndex: 'avgVolumeUtilPct', key: 'avgVolumeUtilPct',
                  render: (v: number | null) => v != null ? `${v.toFixed(0)}%` : '—',
                },
                {
                  title: '% Tải trọng TB', dataIndex: 'avgWeightUtilPct', key: 'avgWeightUtilPct',
                  render: (v: number | null) => v != null ? `${v.toFixed(0)}%` : '—',
                },
                {
                  title: 'Đúng giờ', dataIndex: 'onTimeRatePct', key: 'onTimeRatePct',
                  render: (v: number | null) => v != null ? `${v.toFixed(0)}%` : '—',
                },
                { title: 'Ngoại lệ', dataIndex: 'totalExceptions', key: 'totalExceptions' },
              ]}
            />
          )}
        </Card>

        <Alert
          type="info"
          showIcon
          message="Trạng thái xe được xác định dựa trên dữ liệu vận hành và cập nhật từ Dispatcher/Driver. Hệ thống hiện chưa hỗ trợ theo dõi vị trí GPS theo thời gian thực."
        />

        {/* Drawer chi tiết xe */}
        <Drawer
          open={!!selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          title={selectedVehicle ? `Xe ${selectedVehicle.plateNumber}` : ''}
          width={480}
        >
          {selectedVehicle && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <Text strong style={{ fontSize: 13 }}>Thông tin xe</Text>
                <Descriptions column={1} size="small" bordered style={{ marginTop: 8 }}>
                  <Descriptions.Item label="Mã xe">{selectedVehicle.vehicleCode}</Descriptions.Item>
                  <Descriptions.Item label="Loại xe">{selectedVehicle.vehicleType}{selectedVehicle.vehicleClass ? ` (${selectedVehicle.vehicleClass})` : ''}</Descriptions.Item>
                  <Descriptions.Item label="Tải trọng">{selectedVehicle.payloadKg.toLocaleString('vi-VN')} kg</Descriptions.Item>
                  <Descriptions.Item label="Sức chứa">{selectedVehicle.maxVolumeM3} m³</Descriptions.Item>
                  <Descriptions.Item label="Trạng thái">
                    {(() => { const meta = PHASE_LABEL[getPhaseKey(selectedVehicle)]; return <StatusBadge color={meta.color} icon={meta.icon}>{meta.label}</StatusBadge>; })()}
                  </Descriptions.Item>
                </Descriptions>
              </div>

              <div>
                <Text strong style={{ fontSize: 13 }}>Tài xế</Text>
                <Descriptions column={1} size="small" bordered style={{ marginTop: 8 }}>
                  <Descriptions.Item label="Tài xế hiện tại">{getDisplayDriverName(selectedVehicle) ?? '—'}</Descriptions.Item>
                  <Descriptions.Item label="Tài xế mặc định gắn xe">{selectedVehicle.assignedDriverName ?? '—'}</Descriptions.Item>
                </Descriptions>
              </div>

              <div>
                <Text strong style={{ fontSize: 13 }}>Chuyến trong ngày</Text>
                {selectedVehicle.currentTrip ? (
                  <Descriptions column={1} size="small" bordered style={{ marginTop: 8 }}>
                    <Descriptions.Item label="Mã chuyến">#{selectedVehicle.currentTrip.tripId}</Descriptions.Item>
                    <Descriptions.Item label="Tuyến">{selectedVehicle.currentTrip.routeCode ?? '—'}</Descriptions.Item>
                    <Descriptions.Item label="Ngày giao">{selectedVehicle.currentTrip.deliveryDate ?? '—'}</Descriptions.Item>
                    <Descriptions.Item label="Dự kiến hoàn thành">{formatDateTime(selectedVehicle.currentTrip.estimatedCompletionAt)}</Descriptions.Item>
                  </Descriptions>
                ) : (
                  <Empty description="Không có chuyến nào trong ngày này." image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 8 }} />
                )}
              </div>

              <div>
                <Text strong style={{ fontSize: 13 }}>Sử dụng (7 ngày gần nhất)</Text>
                {selectedVehicle.id != null && kpiByVehicleMap[selectedVehicle.id] ? (
                  <Descriptions column={1} size="small" bordered style={{ marginTop: 8 }}>
                    <Descriptions.Item label="Số chuyến">{kpiByVehicleMap[selectedVehicle.id].totalTrips}</Descriptions.Item>
                    <Descriptions.Item label="Quãng đường">{kpiByVehicleMap[selectedVehicle.id].totalDistanceKm?.toFixed(1) ?? '—'} km</Descriptions.Item>
                    <Descriptions.Item label="Đúng giờ">{kpiByVehicleMap[selectedVehicle.id].onTimeRatePct?.toFixed(0) ?? '—'}%</Descriptions.Item>
                    <Descriptions.Item label="Ngoại lệ">{kpiByVehicleMap[selectedVehicle.id].totalExceptions}</Descriptions.Item>
                  </Descriptions>
                ) : (
                  <Empty description="Chưa có dữ liệu KPI." image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 8 }} />
                )}
              </div>

              <Divider style={{ margin: 0 }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Bảo trì: hệ thống hiện chỉ lưu trạng thái bảo trì hiện tại, chưa có lịch sử bảo trì chi tiết.
              </Text>
            </div>
          )}
        </Drawer>
      </div>
    </AdminShell>
  );
};

export default FleetStatusDashboardPage;
