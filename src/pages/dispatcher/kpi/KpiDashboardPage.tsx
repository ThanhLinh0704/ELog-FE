/* eslint-disable react-hooks/set-state-in-effect */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Typography,
} from 'antd';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  RefreshCw,
  Truck,
  User,
  Weight,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import AdminShell from '../../../components/AdminShell';
import StatusBadge from '../../../components/StatusBadge';
import { palette } from '../../../theme/tokens';
import {
  getKpiByDriver,
  getKpiByRoute,
  getKpiByVehicle,
  getKpiDailyTrend,
  getKpiSummary,
} from '../../../api/kpiApi';
import type {
  KpiByDriverResponse,
  KpiByRouteResponse,
  KpiByVehicleResponse,
  KpiDailyTrendResponse,
  KpiDriverBreakdown,
  KpiPreset,
  KpiQueryParams,
  KpiRouteBreakdown,
  KpiSummaryResponse,
  KpiVehicleBreakdown,
} from '../../../types/kpi';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const PRESET_OPTIONS: { value: KpiPreset; label: string }[] = [
  { value: 'TODAY', label: 'Hôm nay' },
  { value: 'LAST_7_DAYS', label: '7 ngày gần nhất' },
  { value: 'LAST_30_DAYS', label: '30 ngày gần nhất' },
];

type PeriodMode = KpiPreset | 'CUSTOM';

interface ApiError {
  response?: { status?: number; data?: { error?: { code?: string; message?: string } } };
  message?: string;
}

function getErrorMessage(err: unknown, fallback: string): string {
  const axErr = err as ApiError;
  return axErr?.response?.data?.error?.message || axErr?.message || fallback;
}

function formatPct(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`;
}

function utilColor(value: number | null): string {
  if (value === null) return palette.textFaint;
  if (value >= 85) return palette.success;
  if (value >= 60) return palette.primary;
  return palette.gold;
}

function renderRateProgress(val: number | null) {
  if (val === null) return <Text type="secondary">—</Text>;
  const pct = Math.min(100, Math.max(0, Math.round(val * 10) / 10));
  let strokeColor: string = palette.gold;
  if (pct >= 90) strokeColor = palette.success;
  else if (pct >= 70) strokeColor = palette.primary;
  else if (pct < 60) strokeColor = palette.danger;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      <Progress
        percent={pct}
        size="small"
        strokeColor={strokeColor}
        showInfo={false}
        style={{ flex: 1, margin: 0 }}
      />
      <Text strong style={{ fontSize: 12, minWidth: 44, textAlign: 'right', color: strokeColor }}>
        {pct.toFixed(1)}%
      </Text>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

const KpiDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';
  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) roles = JSON.parse(rolesStr);
  } catch { /* */ }
  const currentUser = { id: Number(userId), username, fullName: username, roles };

  const [periodMode, setPeriodMode] = useState<PeriodMode>('LAST_7_DAYS');
  const [customRange, setCustomRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>([
    dayjs().subtract(6, 'day'),
    dayjs(),
  ]);

  const [summary, setSummary] = useState<KpiSummaryResponse | null>(null);
  const [trend, setTrend] = useState<KpiDailyTrendResponse | null>(null);
  const [byRoute, setByRoute] = useState<KpiByRouteResponse | null>(null);
  const [byDriver, setByDriver] = useState<KpiByDriverResponse | null>(null);
  const [byVehicle, setByVehicle] = useState<KpiByVehicleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildQuery = useCallback((): KpiQueryParams | null => {
    if (periodMode === 'CUSTOM') {
      if (!customRange) return null;
      return {
        startDate: customRange[0].format('YYYY-MM-DD'),
        endDate: customRange[1].format('YYYY-MM-DD'),
      };
    }
    return { preset: periodMode };
  }, [periodMode, customRange]);

  const fetchAll = useCallback(async () => {
    const query = buildQuery();
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, trendRes, byRouteRes, byDriverRes, byVehicleRes] = await Promise.all([
        getKpiSummary(query),
        getKpiDailyTrend(query),
        getKpiByRoute(query),
        getKpiByDriver(query),
        getKpiByVehicle(query).catch((err) => {
          console.warn('Failed to load vehicle KPI breakdown:', err);
          return null;
        }),
      ]);
      setSummary(summaryRes);
      setTrend(trendRes);
      setByRoute(byRouteRes);
      setByDriver(byDriverRes);
      setByVehicle(byVehicleRes);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Không tải được dữ liệu KPI.'));
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const chartData = (trend?.data ?? []).map((point) => ({
    date: dayjs(point.date).format('DD/MM'),
    onTimeRatePct: point.onTimeRatePct,
    volumeUtilPct: point.volumeUtilPct,
  }));

  const routeColumns: ColumnsType<KpiRouteBreakdown> = [
    { title: 'Mã tuyến', dataIndex: 'routeCode', key: 'routeCode', width: 110, render: (code: string) => <Text strong style={{ color: palette.primary }}>{code}</Text> },
    { title: 'Tên tuyến', dataIndex: 'routeName', key: 'routeName' },
    { title: 'Số chuyến', dataIndex: 'totalTrips', key: 'totalTrips', width: 100, align: 'right' },
    {
      title: 'Tỷ lệ đúng giờ',
      dataIndex: 'onTimeRatePct',
      key: 'onTimeRatePct',
      width: 170,
      sorter: (a, b) => (a.onTimeRatePct ?? -1) - (b.onTimeRatePct ?? -1),
      defaultSortOrder: 'ascend',
      render: (val: number | null) => renderRateProgress(val),
    },
    {
      title: 'Tỷ lệ lấp đầy thể tích',
      dataIndex: 'avgVolumeUtilPct',
      key: 'avgVolumeUtilPct',
      width: 170,
      sorter: (a, b) => (a.avgVolumeUtilPct ?? -1) - (b.avgVolumeUtilPct ?? -1),
      render: (val: number | null) => renderRateProgress(val),
    },
    {
      title: 'Sự cố',
      key: 'exceptions',
      width: 140,
      align: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Text strong style={{ color: record.totalExceptions > 0 ? palette.danger : undefined }}>{record.totalExceptions}</Text>
          {record.totalRejections > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              ({record.totalRejections} từ chối)
            </Text>
          )}
        </Space>
      ),
    },
  ];

  const driverColumns: ColumnsType<KpiDriverBreakdown> = [
    {
      title: 'Tài xế',
      key: 'driver',
      render: (_, record) => (
        <div>
          <Text strong>{record.fullName}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {[record.driverCode, record.phoneNumber].filter(Boolean).join(' · ') || '—'}
            </Text>
          </div>
        </div>
      ),
    },
    { title: 'Số chuyến', dataIndex: 'totalTrips', key: 'totalTrips', width: 100, align: 'right' },
    {
      title: 'Quãng đường',
      dataIndex: 'totalDistanceKm',
      key: 'totalDistanceKm',
      width: 130,
      align: 'right',
      render: (val: number | null) => (val === null ? '—' : `${val.toFixed(1)} km`),
    },
    {
      title: 'Tỷ lệ đúng giờ',
      dataIndex: 'onTimeRatePct',
      key: 'onTimeRatePct',
      width: 170,
      sorter: (a, b) => (a.onTimeRatePct ?? -1) - (b.onTimeRatePct ?? -1),
      render: (val: number | null) => renderRateProgress(val),
    },
    {
      title: 'Sự cố',
      dataIndex: 'totalExceptions',
      key: 'totalExceptions',
      width: 100,
      align: 'right',
      render: (val: number) => <Text strong style={{ color: val > 0 ? palette.danger : undefined }}>{val}</Text>,
    },
  ];

  const vehicleColumns: ColumnsType<KpiVehicleBreakdown> = [
    {
      title: 'Biển số xe',
      dataIndex: 'licensePlate',
      key: 'licensePlate',
      width: 130,
      render: (plate: string) => <StatusBadge icon={<Truck size={12} />}>{plate}</StatusBadge>,
    },
    {
      title: 'Loại xe',
      dataIndex: 'vehicleType',
      key: 'vehicleType',
      width: 130,
      render: (t: string | null) => t || '—',
    },
    {
      title: 'Tải trọng / Thể tích',
      key: 'capacity',
      width: 150,
      render: (_, r) => (
        <Text style={{ fontSize: 12 }}>
          {r.payloadKg ? `${r.payloadKg} kg` : '—'} / {r.maxVolumeM3 ? `${r.maxVolumeM3} m³` : '—'}
        </Text>
      ),
    },
    { title: 'Số chuyến', dataIndex: 'totalTrips', key: 'totalTrips', width: 90, align: 'right' },
    {
      title: 'Quãng đường',
      dataIndex: 'totalDistanceKm',
      key: 'totalDistanceKm',
      width: 120,
      align: 'right',
      render: (val: number | null) => (val === null ? '—' : `${val.toFixed(1)} km`),
    },
    {
      title: 'Lấp đầy thể tích',
      dataIndex: 'avgVolumeUtilPct',
      key: 'avgVolumeUtilPct',
      width: 170,
      sorter: (a, b) => (a.avgVolumeUtilPct ?? -1) - (b.avgVolumeUtilPct ?? -1),
      render: (val: number | null) => renderRateProgress(val),
    },
    {
      title: 'Lấp đầy tải trọng',
      dataIndex: 'avgWeightUtilPct',
      key: 'avgWeightUtilPct',
      width: 170,
      sorter: (a, b) => (a.avgWeightUtilPct ?? -1) - (b.avgWeightUtilPct ?? -1),
      render: (val: number | null) => renderRateProgress(val),
    },
    {
      title: 'Tỷ lệ đúng giờ',
      dataIndex: 'onTimeRatePct',
      key: 'onTimeRatePct',
      width: 170,
      sorter: (a, b) => (a.onTimeRatePct ?? -1) - (b.onTimeRatePct ?? -1),
      render: (val: number | null) => renderRateProgress(val),
    },
    {
      title: 'Sự cố',
      dataIndex: 'totalExceptions',
      key: 'totalExceptions',
      width: 90,
      align: 'right',
      render: (val: number) => <Text strong style={{ color: val > 0 ? palette.danger : undefined }}>{val}</Text>,
    },
  ];

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Breadcrumb items={[{ title: 'Trang chủ' }, { title: 'KPI vận hành' }]} />

        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            padding: '20px 24px',
            borderRadius: 12,
            boxShadow: '0 8px 20px rgba(13, 23, 42, 0.18)',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <Title level={4} style={{ margin: 0, color: '#ffffff' }}>
                Báo cáo KPI & Hiệu suất vận hành
              </Title>
              <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                {summary
                  ? `${dayjs(summary.period.startDate).format('DD/MM/YYYY')} — ${dayjs(summary.period.endDate).format('DD/MM/YYYY')}`
                  : ' '}
              </Text>
            </div>
            <Space wrap size={12}>
              <Select
                value={periodMode}
                onChange={setPeriodMode}
                style={{ width: 180 }}
                options={[...PRESET_OPTIONS, { value: 'CUSTOM', label: 'Tuỳ chỉnh khoảng ngày' }]}
              />
              {periodMode === 'CUSTOM' && (
                <RangePicker
                  value={customRange}
                  onChange={(range) => {
                    if (range && range[0] && range[1]) setCustomRange([range[0], range[1]]);
                  }}
                  format="DD/MM/YYYY"
                  allowClear={false}
                />
              )}
              <Button icon={<RefreshCw size={14} />} onClick={() => fetchAll()} loading={loading}>
                Làm mới
              </Button>
            </Space>
          </div>
        </div>

        {error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={<Button size="small" onClick={() => fetchAll()}>Thử lại</Button>}
          />
        )}

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8} lg={4} style={{ flex: '1 1 180px' }}>
            <Card size="small" style={{ borderRadius: 12, height: '100%', boxShadow: palette.cardShadow, border: `1px solid ${palette.borderSoft}` }} loading={loading && !summary}>
              <Statistic
                title={<Space size={6}><Clock size={14} style={{ color: palette.primary }} /> Tỷ lệ đúng giờ</Space>}
                value={summary ? formatPct(summary.onTimeDelivery.rate) : '—'}
                valueStyle={{ color: utilColor(summary?.onTimeDelivery.rate ?? null), fontWeight: 700 }}
              />
              {summary && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {summary.onTimeDelivery.onTimeStops}/{summary.onTimeDelivery.totalProcessedStops} điểm dừng
                </Text>
              )}
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4} style={{ flex: '1 1 180px' }}>
            <Card size="small" style={{ borderRadius: 12, height: '100%', boxShadow: palette.cardShadow, border: `1px solid ${palette.borderSoft}` }} loading={loading && !summary}>
              <Statistic
                title={<Space size={6}><Package size={14} style={{ color: palette.success }} /> Lấp đầy thể tích</Space>}
                value={summary ? formatPct(summary.fleetUtilization.avgVolumeUtilizationPct) : '—'}
                valueStyle={{ color: utilColor(summary?.fleetUtilization.avgVolumeUtilizationPct ?? null), fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4} style={{ flex: '1 1 180px' }}>
            <Card size="small" style={{ borderRadius: 12, height: '100%', boxShadow: palette.cardShadow, border: `1px solid ${palette.borderSoft}` }} loading={loading && !summary}>
              <Statistic
                title={<Space size={6}><Weight size={14} style={{ color: '#8b5cf6' }} /> Lấp đầy tải trọng</Space>}
                value={summary ? formatPct(summary.fleetUtilization.avgWeightUtilizationPct) : '—'}
                valueStyle={{ color: utilColor(summary?.fleetUtilization.avgWeightUtilizationPct ?? null), fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4} style={{ flex: '1 1 180px' }}>
            <Card size="small" style={{ borderRadius: 12, height: '100%', boxShadow: palette.cardShadow, border: `1px solid ${palette.borderSoft}` }} loading={loading && !summary}>
              <Statistic
                title={<Space size={6}><CheckCircle2 size={14} style={{ color: '#06b6d4' }} /> Chuyến hoàn thành</Space>}
                value={summary ? formatPct(summary.tripCompletion.rate) : '—'}
                valueStyle={{ color: utilColor(summary?.tripCompletion.rate ?? null), fontWeight: 700 }}
              />
              {summary && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {summary.tripCompletion.completedTrips}/{summary.tripCompletion.totalTrips} chuyến
                </Text>
              )}
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8} lg={4} style={{ flex: '1 1 180px' }}>
            <Card size="small" style={{ borderRadius: 12, height: '100%', boxShadow: palette.cardShadow, border: `1px solid ${palette.borderSoft}` }} loading={loading && !summary}>
              <Statistic
                title={<Space size={6}><AlertTriangle size={14} style={{ color: palette.danger }} /> Tỷ lệ sự cố</Space>}
                value={summary ? formatPct(summary.exceptions.exceptionRate) : '—'}
                valueStyle={{ color: summary && summary.exceptions.exceptionRate !== null && summary.exceptions.exceptionRate > 15 ? '#ff4d4f' : undefined, fontWeight: 700 }}
              />
              {summary && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {summary.exceptions.totalTimeExceptions} trễ giờ · {summary.exceptions.totalRejections} từ chối
                </Text>
              )}
            </Card>
          </Col>
        </Row>

        {/* Daily Trend Chart */}
        <Card
          title="Xu hướng vận hành: Tỷ lệ đúng giờ & Tỷ lệ lấp đầy thể tích"
          size="small"
          style={{ borderRadius: 12, boxShadow: palette.cardShadow, border: `1px solid ${palette.borderSoft}` }}
          loading={loading && !trend}
        >
          {chartData.length === 0 ? (
            <Empty description="Không có dữ liệu trong khoảng thời gian này." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit="%" domain={[0, 100]} />
                <RechartsTooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="onTimeRatePct"
                  name="Tỷ lệ đúng giờ"
                  stroke={palette.primary}
                  strokeWidth={2.5}
                  connectNulls={false}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="volumeUtilPct"
                  name="Tỷ lệ lấp đầy thể tích"
                  stroke={palette.success}
                  strokeWidth={2.5}
                  connectNulls={false}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Unified Breakdown Section using Tabs */}
        <Card
          size="small"
          style={{ borderRadius: 12, boxShadow: palette.cardShadow, border: `1px solid ${palette.borderSoft}` }}
          styles={{ body: { padding: '0 16px 16px 16px' } }}
        >
          <Tabs
            defaultActiveKey="by-route"
            items={[
              {
                key: 'by-route',
                label: (
                  <Space size={6}>
                    <MapPin size={16} />
                    <span>Hiệu suất theo Tuyến ({byRoute?.routes.length ?? 0})</span>
                  </Space>
                ),
                children: (
                  <Table<KpiRouteBreakdown>
                    columns={routeColumns}
                    dataSource={byRoute?.routes ?? []}
                    rowKey="routeCode"
                    pagination={{ defaultPageSize: 5, pageSizeOptions: ['5', '10', '20', '50', '100'], showSizeChanger: true }}
                    loading={loading && !byRoute}
                    locale={{ emptyText: <Empty description="Không có tuyến nào có chuyến trong kỳ." /> }}
                    scroll={{ x: 800 }}
                  />
                ),
              },
              {
                key: 'by-driver',
                label: (
                  <Space size={6}>
                    <User size={16} />
                    <span>Hiệu suất theo Tài xế ({byDriver?.drivers.length ?? 0})</span>
                  </Space>
                ),
                children: (
                  <Table<KpiDriverBreakdown>
                    columns={driverColumns}
                    dataSource={byDriver?.drivers ?? []}
                    rowKey="driverId"
                    pagination={{ defaultPageSize: 5, pageSizeOptions: ['5', '10', '20', '50', '100'], showSizeChanger: true }}
                    loading={loading && !byDriver}
                    locale={{ emptyText: <Empty description="Không có tài xế nào có chuyến trong kỳ." /> }}
                    scroll={{ x: 800 }}
                  />
                ),
              },
              {
                key: 'by-vehicle',
                label: (
                  <Space size={6}>
                    <Truck size={16} />
                    <span>Hiệu suất theo Phương tiện / Xe ({byVehicle?.vehicles.length ?? 0})</span>
                  </Space>
                ),
                children: (
                  <Table<KpiVehicleBreakdown>
                    columns={vehicleColumns}
                    dataSource={byVehicle?.vehicles ?? []}
                    rowKey="vehicleId"
                    pagination={{ defaultPageSize: 5, pageSizeOptions: ['5', '10', '20', '50', '100'], showSizeChanger: true }}
                    loading={loading && !byVehicle}
                    locale={{ emptyText: <Empty description="Không có xe nào có chuyến trong kỳ." /> }}
                    scroll={{ x: 1050 }}
                  />
                ),
              },
            ]}
          />
        </Card>

        {summary && summary.exceptions.unresolvedCount > 0 && (
          <Alert
            type="warning"
            showIcon
            message={`Còn ${summary.exceptions.unresolvedCount} ngoại lệ chưa xử lý trong kỳ.`}
            action={
              <Button size="small" onClick={() => navigate('/dispatcher/exceptions')}>
                Xem ngoại lệ
              </Button>
            }
          />
        )}
      </div>
    </AdminShell>
  );
};

export default KpiDashboardPage;
