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
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Package,
  RefreshCw,
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
import { getKpiByRoute, getKpiDailyTrend, getKpiSummary } from '../../../api/kpiApi';
import type {
  KpiByRouteResponse,
  KpiDailyTrendResponse,
  KpiPreset,
  KpiQueryParams,
  KpiRouteBreakdown,
  KpiSummaryResponse,
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
  if (value === null) return '#8c8c8c';
  if (value >= 85) return '#52c41a';
  if (value >= 60) return '#1677ff';
  return '#faad14';
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
      const [summaryRes, trendRes, byRouteRes] = await Promise.all([
        getKpiSummary(query),
        getKpiDailyTrend(query),
        getKpiByRoute(query),
      ]);
      setSummary(summaryRes);
      setTrend(trendRes);
      setByRoute(byRouteRes);
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
    { title: 'Mã tuyến', dataIndex: 'routeCode', key: 'routeCode', width: 110 },
    { title: 'Tên tuyến', dataIndex: 'routeName', key: 'routeName' },
    { title: 'Số chuyến', dataIndex: 'totalTrips', key: 'totalTrips', width: 100, align: 'right' },
    {
      title: 'Tỷ lệ đúng giờ',
      dataIndex: 'onTimeRatePct',
      key: 'onTimeRatePct',
      width: 150,
      sorter: (a, b) => (a.onTimeRatePct ?? -1) - (b.onTimeRatePct ?? -1),
      defaultSortOrder: 'ascend',
      render: (val: number | null) => (
        <Tag color={val === null ? 'default' : val < 70 ? 'error' : val < 90 ? 'warning' : 'success'}>
          {formatPct(val)}
        </Tag>
      ),
    },
    {
      title: 'Tỷ lệ lấp đầy',
      dataIndex: 'avgVolumeUtilPct',
      key: 'avgVolumeUtilPct',
      width: 130,
      render: (val: number | null) => formatPct(val),
    },
    {
      title: 'Sự cố',
      key: 'exceptions',
      width: 140,
      render: (_, record) => (
        <Space size={4}>
          <Text>{record.totalExceptions}</Text>
          {record.totalRejections > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              ({record.totalRejections} từ chối)
            </Text>
          )}
        </Space>
      ),
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
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <Title level={4} style={{ margin: 0, color: '#ffffff' }}>
                KPI vận hành
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

        <Row gutter={16}>
          <Col xs={24} sm={12} lg={4} style={{ marginBottom: 16 }}>
            <Card size="small" style={{ borderRadius: 10, height: '100%' }} loading={loading && !summary}>
              <Statistic
                title={<Space size={6}><Clock size={14} /> Tỷ lệ đúng giờ</Space>}
                value={summary ? formatPct(summary.onTimeDelivery.rate) : '—'}
                valueStyle={{ color: utilColor(summary?.onTimeDelivery.rate ?? null) }}
              />
              {summary && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {summary.onTimeDelivery.onTimeStops}/{summary.onTimeDelivery.totalProcessedStops} điểm dừng
                </Text>
              )}
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5} style={{ marginBottom: 16 }}>
            <Card size="small" style={{ borderRadius: 10, height: '100%' }} loading={loading && !summary}>
              <Statistic
                title={<Space size={6}><Package size={14} /> Lấp đầy thể tích</Space>}
                value={summary ? formatPct(summary.fleetUtilization.avgVolumeUtilizationPct) : '—'}
                valueStyle={{ color: utilColor(summary?.fleetUtilization.avgVolumeUtilizationPct ?? null) }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5} style={{ marginBottom: 16 }}>
            <Card size="small" style={{ borderRadius: 10, height: '100%' }} loading={loading && !summary}>
              <Statistic
                title={<Space size={6}><Weight size={14} /> Lấp đầy tải trọng</Space>}
                value={summary ? formatPct(summary.fleetUtilization.avgWeightUtilizationPct) : '—'}
                valueStyle={{ color: utilColor(summary?.fleetUtilization.avgWeightUtilizationPct ?? null) }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5} style={{ marginBottom: 16 }}>
            <Card size="small" style={{ borderRadius: 10, height: '100%' }} loading={loading && !summary}>
              <Statistic
                title={<Space size={6}><CheckCircle2 size={14} /> Chuyến hoàn thành</Space>}
                value={summary ? formatPct(summary.tripCompletion.rate) : '—'}
                valueStyle={{ color: utilColor(summary?.tripCompletion.rate ?? null) }}
              />
              {summary && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {summary.tripCompletion.completedTrips}/{summary.tripCompletion.totalTrips} chuyến
                </Text>
              )}
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={5} style={{ marginBottom: 16 }}>
            <Card size="small" style={{ borderRadius: 10, height: '100%' }} loading={loading && !summary}>
              <Statistic
                title={<Space size={6}><AlertTriangle size={14} /> Tỷ lệ sự cố</Space>}
                value={summary ? formatPct(summary.exceptions.exceptionRate) : '—'}
                valueStyle={{ color: summary && summary.exceptions.exceptionRate !== null && summary.exceptions.exceptionRate > 15 ? '#ff4d4f' : undefined }}
              />
              {summary && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {summary.exceptions.totalTimeExceptions} trễ giờ · {summary.exceptions.totalRejections} từ chối
                  {summary.exceptions.unresolvedCount > 0 && (
                    <>
                      {' · '}
                      <Text type="danger">{summary.exceptions.unresolvedCount} chưa xử lý</Text>
                    </>
                  )}
                </Text>
              )}
            </Card>
          </Col>
        </Row>

        <Card
          title="Xu hướng: Tỷ lệ đúng giờ & Tỷ lệ lấp đầy thể tích"
          size="small"
          style={{ borderRadius: 10 }}
          loading={loading && !trend}
        >
          {chartData.length === 0 ? (
            <Empty description="Không có dữ liệu trong khoảng thời gian này." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
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
                  stroke="#1677ff"
                  connectNulls={false}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="volumeUtilPct"
                  name="Tỷ lệ lấp đầy thể tích"
                  stroke="#52c41a"
                  connectNulls={false}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card
          title="Hiệu suất theo tuyến"
          size="small"
          style={{ borderRadius: 10 }}
          styles={{ body: { padding: 0 } }}
          loading={loading && !byRoute}
        >
          <Table<KpiRouteBreakdown>
            columns={routeColumns}
            dataSource={byRoute?.routes ?? []}
            rowKey="routeCode"
            pagination={false}
            locale={{ emptyText: <Empty description="Không có tuyến nào có chuyến trong kỳ." /> }}
            scroll={{ x: 760 }}
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
