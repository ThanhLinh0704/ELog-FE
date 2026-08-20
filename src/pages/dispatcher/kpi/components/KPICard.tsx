import React from 'react';
import { Card, Progress, Typography } from 'antd';
import { palette } from '../../../../theme/tokens';
import StatusBadge from '../../../../components/StatusBadge';
import type { RateStatus } from '../../../../utils/performanceStatus';

const { Text } = Typography;

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  /** Already-formatted display value, e.g. "72.0%" or "—". */
  value: string;
  status: RateStatus;
  /** e.g. "Target ≥ 85%" — omit for KPIs with no defined target. */
  targetLabel?: string;
  /** e.g. "62/86 điểm dừng" — omit when not applicable / no data. */
  secondaryText?: string;
  loading?: boolean;
  /** Primary accent color for card top border & icon badge background */
  accentColor?: string;
  /** Numeric value for progress bar calculation, e.g. 55.3 */
  numericValue?: number | null;
}

const KPICard: React.FC<KPICardProps> = ({
  icon,
  label,
  value,
  status,
  targetLabel,
  secondaryText,
  loading,
  accentColor = '#3b82f6',
  numericValue = null,
}) => {
  const isTargetPctAvailable = numericValue !== null && !isNaN(numericValue);
  const pctPercent = isTargetPctAvailable ? Math.min(100, Math.max(0, numericValue)) : 0;

  return (
    <Card
      size="small"
      style={{
        borderRadius: 14,
        height: '100%',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
        border: `1px solid ${palette.borderSoft}`,
        borderTop: `3.5px solid ${accentColor}`,
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
      bodyStyle={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}
      loading={loading}
    >
      <div>
        {/* Top Header: Label & Icon Badge */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>{label}</Text>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              backgroundColor: `${accentColor}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        </div>

        {/* Main Metric Value */}
        <div style={{ fontSize: 26, fontWeight: 700, color: status.color === palette.textMuted ? '#0f172a' : status.color, lineHeight: 1.1, marginBottom: 8 }}>
          {value}
        </div>

        {/* Mini Progress Bar if available */}
        {isTargetPctAvailable && (
          <div style={{ marginBottom: 10 }}>
            <Progress
              percent={pctPercent}
              showInfo={false}
              size="small"
              strokeColor={status.color}
              trailColor="#f1f5f9"
              style={{ margin: 0 }}
            />
          </div>
        )}
      </div>

      {/* Footer Info: Target / Secondary Text / Status Badge */}
      <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 6, borderTop: '1px stroke #f8fafc' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {targetLabel ? (
            <Text type="secondary" style={{ fontSize: 11, fontWeight: 500, color: '#94a3b8' }}>
              {targetLabel}
            </Text>
          ) : (
            <div />
          )}
          <StatusBadge color={status.badgeColor}>{status.label}</StatusBadge>
        </div>

        {secondaryText && (
          <Text type="secondary" style={{ fontSize: 11, color: '#64748b' }}>
            {secondaryText}
          </Text>
        )}
      </div>
    </Card>
  );
};

export default KPICard;
