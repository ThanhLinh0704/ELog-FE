import React from 'react';
import { Card, Skeleton } from 'antd';
import { palette } from '../theme/tokens';

export type StatCardAccent = 'primary' | 'teal' | 'gold' | 'violet' | 'success' | 'danger';

const ACCENT_MAP: Record<StatCardAccent, { color: string; bg: string }> = {
  primary: { color: palette.primary, bg: palette.primaryBg },
  teal: { color: palette.teal, bg: palette.tealBg },
  gold: { color: palette.gold, bg: palette.goldBg },
  violet: { color: palette.violet, bg: palette.violetBg },
  success: { color: palette.success, bg: palette.successBg },
  danger: { color: palette.danger, bg: palette.dangerBg },
};

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  accent?: StatCardAccent;
  loading?: boolean;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  caption,
  accent = 'primary',
  loading = false,
  onClick,
}) => {
  const { color, bg } = ACCENT_MAP[accent];

  return (
    <Card
      hoverable={!!onClick}
      onClick={onClick}
      styles={{ body: { padding: '18px 20px' } }}
      style={{
        borderRadius: 12,
        border: `1px solid ${palette.borderSoft}`,
        boxShadow: palette.cardShadow,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 1 }} title={{ width: '60%' }} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
                color: palette.textMuted,
                marginBottom: 10,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {label}
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: palette.textDark, lineHeight: 1.15 }}>
              {value}
            </div>
            {caption && (
              <div style={{ marginTop: 6, fontSize: 12, color: palette.textFaint }}>{caption}</div>
            )}
          </div>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: bg,
              color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        </div>
      )}
    </Card>
  );
};

export default StatCard;
