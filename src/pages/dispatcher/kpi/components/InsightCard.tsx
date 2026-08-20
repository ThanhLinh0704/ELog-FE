import React from 'react';
import { Button, Card, Typography } from 'antd';
import { AlertTriangle, ArrowRight, CheckCircle2, MapPin, ShieldAlert, Truck } from 'lucide-react';
import { palette } from '../../../../theme/tokens';
import type { InsightSeverity } from '../../../../utils/insightGenerator';

const { Text } = Typography;

const SEVERITY_STYLE: Record<
  InsightSeverity,
  { border: string; iconColor: string; bg: string; defaultIcon: React.ReactNode }
> = {
  critical: {
    border: '#ef4444',
    iconColor: '#ef4444',
    bg: '#fef2f2',
    defaultIcon: <ShieldAlert size={16} />,
  },
  warning: {
    border: '#f59e0b',
    iconColor: '#d97706',
    bg: '#fffbeb',
    defaultIcon: <AlertTriangle size={16} />,
  },
  positive: {
    border: '#10b981',
    iconColor: '#059669',
    bg: '#f0fdf4',
    defaultIcon: <CheckCircle2 size={16} />,
  },
};

interface InsightCardProps {
  severity: InsightSeverity;
  title: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
}

const InsightCard: React.FC<InsightCardProps> = ({ severity, title, detail, actionLabel, onAction }) => {
  const style = SEVERITY_STYLE[severity];

  // Select appropriate icon based on title text content
  let categoryIcon = style.defaultIcon;
  if (title.toLowerCase().includes('tuyến')) {
    categoryIcon = <MapPin size={16} />;
  } else if (title.toLowerCase().includes('phương tiện') || title.toLowerCase().includes('xe')) {
    categoryIcon = <Truck size={16} />;
  }

  return (
    <Card
      size="small"
      style={{
        borderRadius: 12,
        borderLeft: `4px solid ${style.border}`,
        borderTop: `1px solid ${palette.borderSoft}`,
        borderRight: `1px solid ${palette.borderSoft}`,
        borderBottom: `1px solid ${palette.borderSoft}`,
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        background: '#ffffff',
        flex: '1 1 270px',
        minWidth: 250,
        transition: 'all 0.2s ease',
      }}
      bodyStyle={{ padding: '14px 16px' }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: style.bg,
            color: style.iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          {categoryIcon}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          <Text strong style={{ fontSize: 13, color: '#0f172a' }}>
            {title}
          </Text>
          <Text type="secondary" style={{ fontSize: 12, color: '#475569', lineHeight: 1.4 }}>
            {detail}
          </Text>
          {actionLabel && onAction && (
            <Button
              size="small"
              onClick={onAction}
              style={{
                alignSelf: 'flex-start',
                marginTop: 6,
                borderRadius: 6,
                fontSize: 11.5,
                fontWeight: 600,
                color: '#2563eb',
                borderColor: '#bfdbfe',
                background: '#eff6ff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 10px',
                height: 26,
              }}
            >
              {actionLabel} <ArrowRight size={12} />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default InsightCard;
