// Mirrors Backend DTOs: KpiSummaryResponse / KpiDailyTrendResponse / KpiByRouteResponse
// (KpiController — /api/v1/kpi/summary, /api/v1/kpi/daily-trend, /api/v1/kpi/by-route). US-19.
// Exact match with Backend DTOs — do NOT add fields not in the DTO.

export type KpiPreset = 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS';

export interface KpiPeriodInfo {
  startDate: string;
  endDate: string;
  preset: KpiPreset | null;
}

export interface OnTimeDeliveryKpi {
  rate: number | null;
  onTimeStops: number;
  totalProcessedStops: number;
}

export interface FleetUtilizationKpi {
  avgVolumeUtilizationPct: number | null;
  avgWeightUtilizationPct: number | null;
}

export interface TripCompletionKpi {
  rate: number | null;
  completedTrips: number;
  totalTrips: number;
}

export interface ExceptionKpi {
  exceptionRate: number | null;
  totalExceptions: number;
  totalTimeExceptions: number;
  totalRejections: number;
  unresolvedCount: number;
}

export interface KpiSummaryResponse {
  period: KpiPeriodInfo;
  generatedAt: string;
  onTimeDelivery: OnTimeDeliveryKpi;
  fleetUtilization: FleetUtilizationKpi;
  tripCompletion: TripCompletionKpi;
  exceptions: ExceptionKpi;
}

export interface KpiDailyDataPoint {
  date: string;
  tripCount: number;
  onTimeRatePct: number | null;
  volumeUtilPct: number | null;
}

export interface KpiDailyTrendResponse {
  period: KpiPeriodInfo;
  data: KpiDailyDataPoint[];
}

export interface KpiRouteBreakdown {
  routeCode: string;
  routeName: string;
  totalTrips: number;
  onTimeRatePct: number | null;
  avgVolumeUtilPct: number | null;
  totalExceptions: number;
  totalRejections: number;
}

export interface KpiByRouteResponse {
  period: KpiPeriodInfo;
  routes: KpiRouteBreakdown[];
}

// Backend: KpiByDriverResponse.DriverKpi (KpiController — /api/v1/kpi/by-driver)
export interface KpiDriverBreakdown {
  driverId: number;
  driverCode: string | null;
  fullName: string;
  phoneNumber: string | null;
  totalTrips: number;
  totalDistanceKm: number | null;
  onTimeRatePct: number | null;
  totalExceptions: number;
}

// Backend: KpiByDriverResponse — no `totalDrivers` field, derive the count from `drivers.length`.
export interface KpiByDriverResponse {
  period: KpiPeriodInfo;
  drivers: KpiDriverBreakdown[];
}

export interface KpiQueryParams {
  startDate?: string;
  endDate?: string;
  preset?: KpiPreset;
}
