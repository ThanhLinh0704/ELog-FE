import React from 'react';
import { Card, Empty, Typography } from 'antd';
import dayjs from 'dayjs';
import { TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  type LineProps,
} from 'recharts';
import { palette } from '../../../../theme/tokens';
import type { KpiDailyTrendResponse } from '../../../../types/kpi';

const { Title } = Typography;

// Two-line comparison: color's job here is identity (which series), not
// magnitude — so both lines get a fixed categorical hue, never a gradient
// fill. Series 2 uses `chartSeries2` (a real violet) rather than the
// success/warning/danger hues, since neither line inherently means "good" —
// reusing a status color here would make the reader misread the line as a
// pass/fail signal instead of a plain trend.
const SERIES_1_COLOR = palette.primary;
const SERIES_2_COLOR = palette.chartSeries2;

interface TrendChartProps {
  trend: KpiDailyTrendResponse | null;
  loading: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number | null;
    color: string;
    payload: { date: string; tripCount: number };
  }>;
  label?: string;
}

const CustomDarkTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const tripCount = payload[0]?.payload?.tripCount ?? 0;

  return (
    <div
      style={{
        backgroundColor: '#0f172a',
        border: '1px solid #334155',
        borderRadius: 8,
        padding: '10px 14px',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
        color: '#ffffff',
        fontSize: 12.5,
      }}
    >
      <div style={{ fontWeight: 700, color: '#94a3b8', marginBottom: 6, borderBottom: '1px solid #1e293b', paddingBottom: 4 }}>
        Ngày {label} ({tripCount} chuyến)
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {payload.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#cbd5e1' }}>
              {/* Identity rides the dot, never the text color — the value stays neutral ink below. */}
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color, flexShrink: 0 }} />
              {item.name}:
            </span>
            <span style={{ fontWeight: 700, color: '#f8fafc' }}>
              {item.value !== null && item.value !== undefined ? `${Number(item.value).toFixed(1)}%` : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TrendChart: React.FC<TrendChartProps> = ({ trend, loading }) => {
  const chartData = (trend?.data ?? []).map((point) => ({
    date: dayjs(point.date).format('DD/MM'),
    tripCount: point.tripCount,
    onTimeRatePct: point.onTimeRatePct,
    volumeUtilPct: point.volumeUtilPct,
  }));
  const lastIndex = chartData.length - 1;

  // Direct end-label: label the last point of each line only (never every
  // point) so the reader sees the current value without a tooltip. Anchored
  // beside that series' own end-dot — a fixed vertical offset per series
  // (not a dynamic collision search) keeps the two labels apart even when
  // the lines converge at the right edge.
  // Recharts' typed `label` render-prop signature doesn't line up cleanly with what it
  // actually passes at runtime for a Line's per-point label (x/y/value/index) — cast at
  // the two call sites below rather than losing type safety inside this function.
  const renderEndLabel = (dy: number) => (props: { x?: number; y?: number; value?: number | null; index?: number }) => {
    const { x, y, value, index } = props;
    if (index !== lastIndex || value === null || value === undefined || x === undefined || y === undefined) return null;
    return (
      <text x={x + 10} y={y} dy={dy} fontSize={12} fontWeight={700} fill={palette.textDark} textAnchor="start">
        {Number(value).toFixed(1)}%
      </text>
    );
  };

  return (
    <Card
      size="small"
      style={{
        borderRadius: 14,
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
        border: `1px solid ${palette.borderSoft}`,
        background: '#ffffff',
      }}
      bodyStyle={{ padding: '18px 20px' }}
      loading={loading && !trend}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: palette.primaryBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TrendingUp size={18} style={{ color: palette.primary }} />
        </div>
        <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
          Xu hướng vận hành: Tỷ lệ đúng giờ & Tỷ lệ lấp đầy
        </Title>
      </div>

      {chartData.length === 0 ? (
        <Empty description="Không có dữ liệu trong khoảng thời gian này." />
      ) : (
        <ResponsiveContainer width="100%" height={290}>
          <LineChart data={chartData} margin={{ top: 12, right: 46, left: -10, bottom: 0 }}>
            {/* Hairline, solid, one step off the surface — never dashed (dashes read as a
                second data series, not chrome). */}
            <CartesianGrid stroke={palette.borderSoft} vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: palette.textMuted }} axisLine={{ stroke: palette.border }} />
            <YAxis tick={{ fontSize: 12, fill: palette.textMuted }} unit="%" domain={[0, 100]} axisLine={{ stroke: palette.border }} />
            <RechartsTooltip content={<CustomDarkTooltip />} />
            <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12.5 }} />
            <Line
              type="monotone"
              dataKey="onTimeRatePct"
              name="Tỷ lệ đúng giờ"
              stroke={SERIES_1_COLOR}
              strokeWidth={2}
              connectNulls={false}
              dot={{ r: 4, stroke: SERIES_1_COLOR, strokeWidth: 2, fill: '#ffffff' }}
              activeDot={{ r: 6, stroke: SERIES_1_COLOR, strokeWidth: 2, fill: '#ffffff' }}
              label={renderEndLabel(-10) as unknown as LineProps['label']}
            />
            <Line
              type="monotone"
              dataKey="volumeUtilPct"
              name="Tỷ lệ lấp đầy thể tích"
              stroke={SERIES_2_COLOR}
              strokeWidth={2}
              connectNulls={false}
              dot={{ r: 4, stroke: SERIES_2_COLOR, strokeWidth: 2, fill: '#ffffff' }}
              activeDot={{ r: 6, stroke: SERIES_2_COLOR, strokeWidth: 2, fill: '#ffffff' }}
              label={renderEndLabel(18) as unknown as LineProps['label']}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default TrendChart;
