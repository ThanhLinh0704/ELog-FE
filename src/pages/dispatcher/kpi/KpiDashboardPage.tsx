/* eslint-disable react-hooks/set-state-in-effect */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Breadcrumb, Button, DatePicker, Select, Space, Typography } from 'antd';
import { RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import AdminShell from '../../../components/AdminShell';
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
  KpiPreset,
  KpiQueryParams,
  KpiRouteBreakdown,
  KpiSummaryResponse,
} from '../../../types/kpi';
import { generateOperationalInsights } from '../../../utils/insightGenerator';
import KPIOverview from './components/KPIOverview';
import OperationalInsights from './components/OperationalInsights';
import TrendChart from './components/TrendChart';
import PerformanceTabs from './components/PerformanceTabs';
import RouteDetailDrawer from './components/RouteDetailDrawer';

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

/**
 * Role-based information priority (spec §14). Both `/dispatcher/kpi` and `/manager/kpi`
 * render this same page/permission (`kpi:read` — see filemd inspection report), so the
 * distinction is made client-side from the stored role list, not a different route/page.
 * Dispatcher gets Operational Insights surfaced above the trend chart (operational,
 * "what needs attention now" framing); Manager/Admin get the trend chart first
 * (overall-performance framing), with Insights still present, just lower.
 */
function getIsDispatcherFocus(roles: string[]): boolean {
  const has = (r: string) => roles.includes(r);
  if (has('LOGISTICS_MANAGER') || has('ADMIN')) return false;
  return has('DISPATCHER');
}

const KpiDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';
  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) roles = JSON.parse(rolesStr);
  } catch {
    /* */
  }
  const currentUser = { id: Number(userId), username, fullName: username, roles };
  const isDispatcherFocus = getIsDispatcherFocus(roles);

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
  const [vehicleLoadFailed, setVehicleLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [performanceTab, setPerformanceTab] = useState<'by-route' | 'by-driver' | 'by-vehicle'>('by-route');
  const [selectedRoute, setSelectedRoute] = useState<KpiRouteBreakdown | null>(null);

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
    setVehicleLoadFailed(false);
    try {
      const [summaryRes, trendRes, byRouteRes, byDriverRes, byVehicleRes] = await Promise.all([
        getKpiSummary(query),
        getKpiDailyTrend(query),
        getKpiByRoute(query),
        getKpiByDriver(query),
        getKpiByVehicle(query).catch((err) => {
          console.warn('Failed to load vehicle KPI breakdown:', err);
          setVehicleLoadFailed(true);
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

  const insights = useMemo(
    () =>
      generateOperationalInsights({
        routes: byRoute?.routes ?? null,
        vehicles: byVehicle?.vehicles ?? null,
        summary,
      }),
    [byRoute, byVehicle, summary]
  );

  const handleRouteAction = useCallback(
    (routeCode: string) => {
      const route = byRoute?.routes.find((r) => r.routeCode === routeCode) ?? null;
      if (route) setSelectedRoute(route);
    },
    [byRoute]
  );

  const handleVehicleAction = useCallback(() => {
    setPerformanceTab('by-vehicle');
    document.getElementById('performance-tabs-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleExceptionAction = useCallback(() => {
    // Deep-link straight to the exceptions the KPI period is actually reporting on —
    // without this, the page always opened on "today", which usually isn't where the
    // unresolved exceptions the alert is warning about actually are.
    if (summary?.period.startDate && summary?.period.endDate) {
      navigate(
        `/dispatcher/exceptions?fromDate=${summary.period.startDate}&toDate=${summary.period.endDate}&resolved=false`
      );
      return;
    }
    navigate('/dispatcher/exceptions');
  }, [navigate, summary]);

  const insightsSection = (
    <OperationalInsights
      insights={insights}
      loading={loading}
      onRouteAction={handleRouteAction}
      onVehicleAction={handleVehicleAction}
      onExceptionAction={handleExceptionAction}
    />
  );

  const trendSection = <TrendChart trend={trend} loading={loading} />;

  const performanceSection = (
    <div id="performance-tabs-section">
      <PerformanceTabs
        byRoute={byRoute}
        byDriver={byDriver}
        byVehicle={byVehicle}
        vehicleLoadFailed={vehicleLoadFailed}
        loading={loading}
        activeKey={performanceTab}
        onTabChange={(key) => setPerformanceTab(key as typeof performanceTab)}
        onRouteRowClick={(route) => setSelectedRoute(route)}
      />
    </div>
  );

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Breadcrumb items={[{ title: 'Trang chủ' }, { title: 'KPI vận hành' }]} />

        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            padding: '22px 28px',
            borderRadius: 16,
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 300,
              height: '100%',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(0,0,0,0) 70%)',
              pointerEvents: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, position: 'relative', zIndex: 1 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Title level={4} style={{ margin: 0, color: '#ffffff', fontWeight: 700, letterSpacing: '-0.3px' }}>
                  Báo cáo KPI & Hiệu suất vận hành
                </Title>
                <span
                  style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    border: '1px solid rgba(96, 165, 250, 0.3)',
                    padding: '2px 10px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Live Monitoring
                </span>
              </div>
              <Text style={{ color: '#94a3b8', fontSize: 13, display: 'inline-block', marginTop: 4 }}>
                {summary
                  ? `Kỳ báo cáo: ${dayjs(summary.period.startDate).format('DD/MM/YYYY')} — ${dayjs(summary.period.endDate).format('DD/MM/YYYY')}`
                  : 'Đang kết nối dữ liệu...'}
              </Text>
            </div>
            <Space wrap size={12}>
              <Select
                value={periodMode}
                onChange={setPeriodMode}
                style={{ width: 190 }}
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
              <Button
                type="primary"
                icon={<RefreshCw size={14} />}
                onClick={() => fetchAll()}
                loading={loading}
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  borderColor: '#2563eb',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                }}
              >
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
            action={
              <Button size="small" onClick={() => fetchAll()}>
                Thử lại
              </Button>
            }
          />
        )}

        <KPIOverview summary={summary} loading={loading} />

        {isDispatcherFocus ? (
          <>
            {insightsSection}
            {performanceSection}
            {trendSection}
          </>
        ) : (
          <>
            {trendSection}
            {performanceSection}
            {insightsSection}
          </>
        )}

        {summary && summary.exceptions.unresolvedCount > 0 && (
          <Alert
            type="warning"
            showIcon
            message={`Còn ${summary.exceptions.unresolvedCount} ngoại lệ chưa xử lý trong kỳ.`}
            action={
              <Button size="small" onClick={handleExceptionAction}>
                Xem ngoại lệ
              </Button>
            }
          />
        )}
      </div>

      <RouteDetailDrawer route={selectedRoute} onClose={() => setSelectedRoute(null)} />
    </AdminShell>
  );
};

export default KpiDashboardPage;
