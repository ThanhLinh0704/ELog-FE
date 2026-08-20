import React from 'react';
import { Card, Empty, Typography } from 'antd';
import dayjs from 'dayjs';
import { TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { palette } from '../../../../theme/tokens';
import type { KpiDailyTrendResponse } from '../../../../types/kpi';

const { Title } = Typography;

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
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color }} />
              {item.name}:
            </span>
            <span style={{ fontWeight: 700, color: item.color }}>
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
            backgroundColor: '#eff6ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TrendingUp size={18} style={{ color: '#2563eb' }} />
        </div>
        <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
          Xu hướng vận hành: Tỷ lệ đúng giờ & Tỷ lệ lấp đầy
        </Title>
      </div>

      {chartData.length === 0 ? (
        <Empty description="Không có dữ liệu trong khoảng thời gian này." />
      ) : (
        <ResponsiveContainer width="100%" height={290}>
          <AreaChart data={chartData} margin={{ top: 12, right: 16, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorOnTime" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#e2e8f0' }} />
            <YAxis tick={{ fontSize: 12, fill: '#64748b' }} unit="%" domain={[0, 100]} axisLine={{ stroke: '#e2e8f0' }} />
            <RechartsTooltip content={<CustomDarkTooltip />} />
            <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12.5 }} />
            <Area
              type="monotone"
              dataKey="onTimeRatePct"
              name="Tỷ lệ đúng giờ"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorOnTime)"
              strokeWidth={3}
              connectNulls={false}
              dot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
              activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2, fill: '#ffffff' }}
            />
            <Area
              type="monotone"
              dataKey="volumeUtilPct"
              name="Tỷ lệ lấp đầy thể tích"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorVolume)"
              strokeWidth={3}
              connectNulls={false}
              dot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#ffffff' }}
              activeDot={{ r: 6, stroke: '#059669', strokeWidth: 2, fill: '#ffffff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default TrendChart;
