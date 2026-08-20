import { palette } from '../theme/tokens';
import type { StatusBadgeColor } from '../components/StatusBadge';
import { REPORT_THRESHOLDS } from '../constants/reportThresholds';
import type { KpiRouteBreakdown } from '../types/kpi';

/**
 * Single source of truth for KPI/table severity + color, replacing the three
 * previously-separate, inconsistent threshold schemes that lived inline in
 * KpiDashboardPage.tsx (`utilColor`: 85/60, `renderRateProgress`: 90/70/60,
 * exception-rate: hardcoded 15%/#ff4d4f). Every metric-specific target now
 * comes from `REPORT_THRESHOLDS` — change a number in one place.
 */
export type Severity = 'critical' | 'warning' | 'positive' | 'neutral';

export interface RateStatus {
  severity: Severity;
  /** Short label for a table "Status" column, e.g. "✓ Đạt" / "⚠ Cần theo dõi". */
  shortLabel: string;
  /** Longer label for a KPI overview card, e.g. "Đạt mục tiêu" / "Dưới mục tiêu". */
  label: string;
  color: string;
  badgeColor: StatusBadgeColor;
}

/** For "higher is better" rate metrics (on-time, volume/weight utilization, completion). */
export function getRateStatus(value: number | null, targetPct: number): RateStatus {
  if (value === null) {
    return { severity: 'neutral', shortLabel: '—', label: 'Chưa đủ dữ liệu', color: palette.textFaint, badgeColor: 'default' };
  }
  if (value >= targetPct) {
    return { severity: 'positive', shortLabel: '✓ Đạt', label: 'Đạt mục tiêu', color: palette.statusSuccess, badgeColor: 'success' };
  }
  return { severity: 'warning', shortLabel: '⚠ Cần theo dõi', label: 'Dưới mục tiêu', color: palette.statusWarning, badgeColor: 'warning' };
}

/**
 * Exception KPI is different: lower exception rate is better, and an unresolved
 * exception is treated as CRITICAL (per explicit product decision for this
 * feature — not a backend-declared severity, since `DeliveryException` has no
 * severity field at all).
 */
export function getExceptionStatus(exceptionRatePct: number | null, unresolvedCount: number): RateStatus {
  if (unresolvedCount > 0) {
    return {
      severity: 'critical',
      shortLabel: '🔴 Cần xử lý',
      label: `${unresolvedCount} ngoại lệ chưa xử lý`,
      color: palette.statusDanger,
      badgeColor: 'error',
    };
  }
  if (exceptionRatePct === null) {
    return { severity: 'neutral', shortLabel: '—', label: 'Chưa đủ dữ liệu', color: palette.textFaint, badgeColor: 'default' };
  }
  if (exceptionRatePct > REPORT_THRESHOLDS.EXCEPTION_RATE_WARNING_PCT) {
    return { severity: 'warning', shortLabel: '⚠ Cần theo dõi', label: 'Cao hơn ngưỡng cảnh báo', color: palette.statusWarning, badgeColor: 'warning' };
  }
  return { severity: 'positive', shortLabel: '✓ Ổn định', label: 'Trong ngưỡng bình thường', color: palette.statusSuccess, badgeColor: 'success' };
}

/** Progress-bar stroke color for table cells, driven by the same status derivation (was a 4th ad-hoc scheme before). */
export function getRateProgressColor(value: number | null, targetPct: number): string {
  return getRateStatus(value, targetPct).color;
}

/**
 * Combines several per-metric statuses into one row-level Status column value:
 * any metric below its target -> warning; all present metrics at/above target -> positive;
 * otherwise (no warning, but some metric has no data) -> neutral.
 */
export function combineStatuses(statuses: RateStatus[]): RateStatus {
  if (statuses.some((s) => s.severity === 'warning')) {
    return { severity: 'warning', shortLabel: '⚠ Cần theo dõi', label: 'Cần theo dõi', color: palette.statusWarning, badgeColor: 'warning' };
  }
  if (statuses.length > 0 && statuses.every((s) => s.severity === 'positive')) {
    return { severity: 'positive', shortLabel: '✓ Đạt', label: 'Đạt mục tiêu', color: palette.statusSuccess, badgeColor: 'success' };
  }
  return { severity: 'neutral', shortLabel: '—', label: 'Chưa đủ dữ liệu', color: palette.textFaint, badgeColor: 'default' };
}

/** Combined route-row status, shared by RoutePerformanceTable and RouteDetailDrawer. */
export function getRouteStatus(route: KpiRouteBreakdown): RateStatus {
  return combineStatuses([
    getRateStatus(route.onTimeRatePct, REPORT_THRESHOLDS.ON_TIME_TARGET_PCT),
    getRateStatus(route.avgVolumeUtilPct, REPORT_THRESHOLDS.VOLUME_UTILIZATION_TARGET_PCT),
  ]);
}
