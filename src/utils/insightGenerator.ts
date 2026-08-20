import { REPORT_THRESHOLDS } from '../constants/reportThresholds';
import type { KpiRouteBreakdown, KpiVehicleBreakdown, KpiSummaryResponse } from '../types/kpi';

/**
 * Derives "Operational Insights" purely from already-fetched KPI API data —
 * no new API calls, no fabricated severity, no business-rule claims the
 * backend doesn't make. Each insight type mirrors an explicit rule the
 * product owner specified for this feature (route/vehicle under the
 * utilization target, unresolved exceptions) — nothing beyond that scope
 * (no "recommendation" text telling the user what business action to take).
 */
export type InsightType = 'route-low-utilization' | 'vehicle-low-utilization' | 'exception-unresolved' | 'exception-status';
export type InsightSeverity = 'critical' | 'warning' | 'positive';

export interface OperationalInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  detail: string;
  routeCode?: string;
  vehicleId?: number;
}

export function generateOperationalInsights(params: {
  routes: KpiRouteBreakdown[] | null;
  vehicles: KpiVehicleBreakdown[] | null;
  summary: KpiSummaryResponse | null;
}): OperationalInsight[] {
  const insights: OperationalInsight[] = [];
  const { MAX_INSIGHTS_PER_CATEGORY, VOLUME_UTILIZATION_TARGET_PCT, WEIGHT_UTILIZATION_TARGET_PCT } = REPORT_THRESHOLDS;

  if (params.routes) {
    const lowRoutes = params.routes
      .filter((r) => r.avgVolumeUtilPct !== null && r.avgVolumeUtilPct < VOLUME_UTILIZATION_TARGET_PCT)
      .sort((a, b) => (a.avgVolumeUtilPct ?? 0) - (b.avgVolumeUtilPct ?? 0))
      .slice(0, MAX_INSIGHTS_PER_CATEGORY);
    for (const r of lowRoutes) {
      insights.push({
        id: `route-${r.routeCode}`,
        type: 'route-low-utilization',
        severity: 'warning',
        title: 'Tuyến có mức sử dụng thấp',
        detail: `${r.routeName} — Lấp đầy thể tích ${r.avgVolumeUtilPct!.toFixed(1)}%`,
        routeCode: r.routeCode,
      });
    }
  }

  if (params.vehicles) {
    const lowVehicles = params.vehicles
      .filter(
        (v) =>
          (v.avgVolumeUtilPct !== null && v.avgVolumeUtilPct < VOLUME_UTILIZATION_TARGET_PCT) ||
          (v.avgWeightUtilPct !== null && v.avgWeightUtilPct < WEIGHT_UTILIZATION_TARGET_PCT)
      )
      .sort((a, b) => {
        const worstA = Math.min(a.avgVolumeUtilPct ?? 100, a.avgWeightUtilPct ?? 100);
        const worstB = Math.min(b.avgVolumeUtilPct ?? 100, b.avgWeightUtilPct ?? 100);
        return worstA - worstB;
      })
      .slice(0, MAX_INSIGHTS_PER_CATEGORY);
    for (const v of lowVehicles) {
      const volText = v.avgVolumeUtilPct !== null ? `${v.avgVolumeUtilPct.toFixed(1)}%` : '—';
      const weightText = v.avgWeightUtilPct !== null ? `${v.avgWeightUtilPct.toFixed(1)}%` : '—';
      insights.push({
        id: `vehicle-${v.vehicleId}`,
        type: 'vehicle-low-utilization',
        severity: 'warning',
        title: 'Phương tiện có mức sử dụng thấp',
        detail: `${v.licensePlate} — Thể tích ${volText} · Tải trọng ${weightText}`,
        vehicleId: v.vehicleId,
      });
    }
  }

  if (params.summary) {
    const { unresolvedCount, totalExceptions } = params.summary.exceptions;
    if (unresolvedCount > 0) {
      insights.push({
        id: 'exception-unresolved',
        type: 'exception-unresolved',
        severity: 'critical',
        title: 'Có ngoại lệ chưa xử lý',
        detail: `${unresolvedCount} ngoại lệ cần kiểm tra`,
      });
    } else if (totalExceptions === 0) {
      insights.push({
        id: 'exception-none',
        type: 'exception-status',
        severity: 'positive',
        title: 'Không có sự cố nghiêm trọng',
        detail: '0 sự cố trong kỳ báo cáo.',
      });
    } else {
      insights.push({
        id: 'exception-resolved',
        type: 'exception-status',
        severity: 'positive',
        title: 'Không có ngoại lệ tồn đọng',
        detail: `${totalExceptions} sự cố trong kỳ, tất cả đã được xử lý.`,
      });
    }
  }

  return insights;
}
