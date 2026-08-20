import React from 'react';
import { Drawer, Space, Statistic, Typography } from 'antd';
import { MapPin } from 'lucide-react';
import { palette } from '../../../../theme/tokens';
import StatusBadge from '../../../../components/StatusBadge';
import { REPORT_THRESHOLDS } from '../../../../constants/reportThresholds';
import { getRateStatus, getRouteStatus } from '../../../../utils/performanceStatus';
import type { KpiRouteBreakdown } from '../../../../types/kpi';

const { Text, Title } = Typography;

function formatPct(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`;
}

interface RouteDetailDrawerProps {
  route: KpiRouteBreakdown | null;
  onClose: () => void;
}

const RouteDetailDrawer: React.FC<RouteDetailDrawerProps> = ({ route, onClose }) => {
  if (!route) {
    return <Drawer open={false} onClose={onClose} />;
  }

  const status = getRouteStatus(route);
  const onTimeStatus = getRateStatus(route.onTimeRatePct, REPORT_THRESHOLDS.ON_TIME_TARGET_PCT);
  const volumeStatus = getRateStatus(route.avgVolumeUtilPct, REPORT_THRESHOLDS.VOLUME_UTILIZATION_TARGET_PCT);

  return (
    <Drawer
      open={!!route}
      onClose={onClose}
      width={420}
      title={
        <Space>
          <MapPin size={16} style={{ color: palette.primary }} />
          <span>{route.routeCode}</span>
        </Space>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Tên tuyến (dữ liệu gốc từ hệ thống)
          </Text>
          <Title level={5} style={{ margin: '2px 0 0' }}>
            {route.routeName}
          </Title>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Statistic title="Số chuyến" value={route.totalTrips} />
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Tỷ lệ đúng giờ
            </Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: onTimeStatus.color }}>{formatPct(route.onTimeRatePct)}</div>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Lấp đầy thể tích
            </Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: volumeStatus.color }}>{formatPct(route.avgVolumeUtilPct)}</div>
          </div>
          <Statistic title="Sự cố" value={route.totalExceptions} valueStyle={{ color: route.totalExceptions > 0 ? palette.danger : undefined }} />
          <Statistic title="Từ chối" value={route.totalRejections} valueStyle={{ color: route.totalRejections > 0 ? palette.danger : undefined }} />
        </div>

        <div
          style={{
            background: status.severity === 'warning' ? palette.statusWarningBg : palette.statusSuccessBg,
            borderRadius: 10,
            padding: '12px 14px',
          }}
        >
          <Space size={6}>
            <StatusBadge color={status.badgeColor}>{status.shortLabel}</StatusBadge>
          </Space>
          <div style={{ marginTop: 6, fontSize: 13, color: palette.textBody }}>
            {status.severity === 'warning'
              ? 'Tỷ lệ đúng giờ hoặc lấp đầy thể tích đang dưới ngưỡng mục tiêu của kỳ báo cáo này.'
              : status.severity === 'positive'
                ? 'Các chỉ số của tuyến đang đạt mục tiêu trong kỳ báo cáo này.'
                : 'Chưa đủ dữ liệu để đánh giá đầy đủ tuyến này trong kỳ báo cáo.'}
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default RouteDetailDrawer;
