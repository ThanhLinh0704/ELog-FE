import React from 'react';
import { palette } from '../theme/tokens';

/**
 * Renders a status pill using ELog's own status palette instead of antd's
 * fixed preset Tag colors (which don't follow theme tokens). Accepts the
 * same preset-style color keys already used across `types/*.ts` status
 * dictionaries (e.g. `EXECUTION_STATUS_LABEL`, `DRIVER_STATUS_LABEL`) so
 * existing dictionaries can be reused as-is — only the render call site
 * changes from `<Tag color={x.color}>` to `<StatusBadge color={x.color}>`.
 */
export type StatusBadgeColor =
  | 'success'
  | 'processing'
  | 'warning'
  | 'error'
  | 'default'
  | 'blue'
  | 'purple'
  | 'cyan'
  | 'geekblue'
  | 'gold'
  | 'green'
  | 'red';

const COLOR_MAP: Record<StatusBadgeColor, { color: string; bg: string }> = {
  success: { color: palette.statusSuccess, bg: palette.statusSuccessBg },
  green: { color: palette.statusSuccess, bg: palette.statusSuccessBg },
  processing: { color: palette.statusInfo, bg: palette.statusInfoBg },
  blue: { color: palette.statusInfo, bg: palette.statusInfoBg },
  geekblue: { color: palette.statusInfo, bg: palette.statusInfoBg },
  warning: { color: palette.statusWarning, bg: palette.statusWarningBg },
  gold: { color: palette.statusWarning, bg: palette.statusWarningBg },
  error: { color: palette.statusDanger, bg: palette.statusDangerBg },
  red: { color: palette.statusDanger, bg: palette.statusDangerBg },
  purple: { color: palette.violet, bg: palette.violetBg },
  cyan: { color: palette.teal, bg: palette.tealBg },
  default: { color: palette.statusNeutral, bg: palette.statusNeutralBg },
};

interface StatusBadgeProps {
  color?: StatusBadgeColor;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ color = 'default', children, icon }) => {
  const { color: fg, bg } = COLOR_MAP[color] ?? COLOR_MAP.default;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        lineHeight: '18px',
        color: fg,
        background: bg,
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {children}
    </span>
  );
};

export default StatusBadge;
