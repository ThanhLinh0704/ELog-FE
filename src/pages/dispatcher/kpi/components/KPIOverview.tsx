import React from 'react';
import { Col, Row } from 'antd';
import { AlertTriangle, CheckCircle2, Clock, Package, Weight } from 'lucide-react';
import { palette } from '../../../../theme/tokens';
import KPICard from './KPICard';
import { REPORT_THRESHOLDS } from '../../../../constants/reportThresholds';
import { getExceptionStatus, getRateStatus } from '../../../../utils/performanceStatus';
import type { KpiSummaryResponse } from '../../../../types/kpi';

function formatPct(value: number | null): string {
  return value === null ? '—' : `${value.toFixed(1)}%`;
}

interface KPIOverviewProps {
  summary: KpiSummaryResponse | null;
  loading: boolean;
}

const COL_PROPS = { xs: 24, sm: 12, md: 8, lg: 4 } as const;

const KPIOverview: React.FC<KPIOverviewProps> = ({ summary, loading }) => {
  const {
    ON_TIME_TARGET_PCT,
    VOLUME_UTILIZATION_TARGET_PCT,
    WEIGHT_UTILIZATION_TARGET_PCT,
    TRIP_COMPLETION_TARGET_PCT,
  } = REPORT_THRESHOLDS;

  const onTimeRate = summary?.onTimeDelivery.rate ?? null;
  const volumeUtil = summary?.fleetUtilization.avgVolumeUtilizationPct ?? null;
  const weightUtil = summary?.fleetUtilization.avgWeightUtilizationPct ?? null;
  const completionRate = summary?.tripCompletion.rate ?? null;
  const exceptionRate = summary?.exceptions.exceptionRate ?? null;
  const unresolvedCount = summary?.exceptions.unresolvedCount ?? 0;

  const cardLoading = loading && !summary;

  return (
    <Row gutter={[16, 16]}>
      <Col {...COL_PROPS} style={{ flex: '1 1 180px' }}>
        <KPICard
          icon={<Clock size={16} style={{ color: '#3b82f6' }} />}
          label="Tỷ lệ đúng giờ"
          value={formatPct(onTimeRate)}
          status={getRateStatus(onTimeRate, ON_TIME_TARGET_PCT)}
          targetLabel={`Target ≥ ${ON_TIME_TARGET_PCT}%`}
          secondaryText={
            summary ? `${summary.onTimeDelivery.onTimeStops}/${summary.onTimeDelivery.totalProcessedStops} điểm dừng` : undefined
          }
          loading={cardLoading}
          accentColor="#3b82f6"
          numericValue={onTimeRate}
        />
      </Col>
      <Col {...COL_PROPS} style={{ flex: '1 1 180px' }}>
        <KPICard
          icon={<Package size={16} style={{ color: '#10b981' }} />}
          label="Lấp đầy thể tích"
          value={formatPct(volumeUtil)}
          status={getRateStatus(volumeUtil, VOLUME_UTILIZATION_TARGET_PCT)}
          targetLabel={`Target ≥ ${VOLUME_UTILIZATION_TARGET_PCT}%`}
          loading={cardLoading}
          accentColor="#10b981"
          numericValue={volumeUtil}
        />
      </Col>
      <Col {...COL_PROPS} style={{ flex: '1 1 180px' }}>
        <KPICard
          icon={<Weight size={16} style={{ color: '#8b5cf6' }} />}
          label="Lấp đầy tải trọng"
          value={formatPct(weightUtil)}
          status={getRateStatus(weightUtil, WEIGHT_UTILIZATION_TARGET_PCT)}
          targetLabel={`Target ≥ ${WEIGHT_UTILIZATION_TARGET_PCT}%`}
          loading={cardLoading}
          accentColor="#8b5cf6"
          numericValue={weightUtil}
        />
      </Col>
      <Col {...COL_PROPS} style={{ flex: '1 1 180px' }}>
        <KPICard
          icon={<CheckCircle2 size={16} style={{ color: '#06b6d4' }} />}
          label="Chuyến hoàn thành"
          value={formatPct(completionRate)}
          status={getRateStatus(completionRate, TRIP_COMPLETION_TARGET_PCT)}
          targetLabel={`Target ≥ ${TRIP_COMPLETION_TARGET_PCT}%`}
          secondaryText={summary ? `${summary.tripCompletion.completedTrips}/${summary.tripCompletion.totalTrips} chuyến` : undefined}
          loading={cardLoading}
          accentColor="#06b6d4"
          numericValue={completionRate}
        />
      </Col>
      <Col {...COL_PROPS} style={{ flex: '1 1 180px' }}>
        <KPICard
          icon={<AlertTriangle size={16} style={{ color: '#ef4444' }} />}
          label="Tỷ lệ sự cố"
          value={formatPct(exceptionRate)}
          status={getExceptionStatus(exceptionRate, unresolvedCount)}
          secondaryText={
            summary ? `${summary.exceptions.totalTimeExceptions} trễ giờ · ${summary.exceptions.totalRejections} từ chối` : undefined
          }
          loading={cardLoading}
          accentColor="#ef4444"
          numericValue={exceptionRate}
        />
      </Col>
    </Row>
  );
};

export default KPIOverview;
