/**
 * UI display thresholds for the KPI & Operational Performance Dashboard.
 *
 * These are NOT backend-enforced business rules. `docs/business-rules.md` defines
 * no numeric target for on-time rate, volume/weight utilization, or exception rate —
 * the only related backend concept is BR-09's ETA grace-period minutes
 * (`SystemConfig.ETA_THRESHOLD_MINUTES`, default 15 min), which is a different thing
 * (how late counts as "late") from a reporting target (what % on-time counts as "good").
 * The 90% capacity safety buffer (`CAPACITY_SAFETY_BUFFER_RATIO`) is also unrelated —
 * that gates whether a load fits a vehicle during dispatch planning, not whether a
 * period's average utilization is "good" on this report.
 *
 * Values below are configuration, adjust freely — do not present them to users as
 * contractual SLAs.
 */
export const REPORT_THRESHOLDS = {
  ON_TIME_TARGET_PCT: 85,
  VOLUME_UTILIZATION_TARGET_PCT: 70,
  WEIGHT_UTILIZATION_TARGET_PCT: 60,
  TRIP_COMPLETION_TARGET_PCT: 90,
  EXCEPTION_RATE_WARNING_PCT: 15,
  /** Cap on how many low-performing routes/vehicles surface as Operational Insights, to avoid clutter. */
  MAX_INSIGHTS_PER_CATEGORY: 3,
} as const;
