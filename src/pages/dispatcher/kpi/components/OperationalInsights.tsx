import React from 'react';
import { Card, Empty, Typography } from 'antd';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { palette } from '../../../../theme/tokens';
import InsightCard from './InsightCard';
import type { OperationalInsight } from '../../../../utils/insightGenerator';

const { Title } = Typography;

interface OperationalInsightsProps {
  insights: OperationalInsight[];
  loading: boolean;
  onRouteAction: (routeCode: string) => void;
  onVehicleAction: (vehicleId: number) => void;
  onExceptionAction: () => void;
}

const OperationalInsights: React.FC<OperationalInsightsProps> = ({ insights, loading, onRouteAction, onVehicleAction, onExceptionAction }) => {
  const attentionCount = insights.filter((i) => i.severity !== 'positive').length;

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
      loading={loading && insights.length === 0}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: attentionCount > 0 ? '#fffbeb' : '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {attentionCount > 0 ? (
              <AlertTriangle size={18} style={{ color: '#d97706' }} />
            ) : (
              <ShieldCheck size={18} style={{ color: '#059669' }} />
            )}
          </div>
          <Title level={5} style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
            Cảnh báo Vận hành
          </Title>
        </div>
        <span
          style={{
            backgroundColor: attentionCount > 0 ? '#fef3c7' : '#ecfdf5',
            color: attentionCount > 0 ? '#b45309' : '#047857',
            padding: '3px 12px',
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            border: `1px solid ${attentionCount > 0 ? '#fde68a' : '#a7f3d0'}`,
          }}
        >
          {attentionCount > 0 ? `${attentionCount} vấn đề cần theo dõi` : 'Hệ thống vận hành tốt'}
        </span>
      </div>

      {insights.length === 0 ? (
        <Empty description="Chưa có đủ dữ liệu để phát hiện vấn đề trong kỳ này." />
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {insights.map((insight) => (
            <InsightCard
              key={insight.id}
              severity={insight.severity}
              title={insight.title}
              detail={insight.detail}
              actionLabel={
                insight.type === 'route-low-utilization'
                  ? 'Xem tuyến'
                  : insight.type === 'vehicle-low-utilization'
                    ? 'Xem phương tiện'
                    : insight.type === 'exception-unresolved'
                      ? 'Xem ngoại lệ'
                      : undefined
              }
              onAction={
                insight.type === 'route-low-utilization' && insight.routeCode
                  ? () => onRouteAction(insight.routeCode!)
                  : insight.type === 'vehicle-low-utilization' && insight.vehicleId !== undefined
                    ? () => onVehicleAction(insight.vehicleId!)
                    : insight.type === 'exception-unresolved'
                      ? onExceptionAction
                      : undefined
              }
            />
          ))}
        </div>
      )}
    </Card>
  );
};

export default OperationalInsights;
