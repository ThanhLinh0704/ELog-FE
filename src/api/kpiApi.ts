// API service for US-19 KPI Dashboard
// Uses existing axiosInstance — Bearer token is handled by request interceptor.
// Error format from Backend: { success: false, error: { code, message } }

import axiosInstance from './axiosInstance';
import type {
  KpiByDriverResponse,
  KpiByRouteResponse,
  KpiByVehicleResponse,
  KpiDailyTrendResponse,
  KpiQueryParams,
  KpiSummaryResponse,
} from '../types/kpi';

interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
}

function unwrap<T>(res: { data: ApiResponseWrapper<T> }): T {
  return res.data.data;
}

function toParams(query?: KpiQueryParams): Record<string, string> {
  const params: Record<string, string> = {};
  if (query?.preset) {
    params.preset = query.preset;
  } else {
    if (query?.startDate) params.startDate = query.startDate;
    if (query?.endDate) params.endDate = query.endDate;
  }
  return params;
}

export async function getKpiSummary(query?: KpiQueryParams): Promise<KpiSummaryResponse> {
  const res = await axiosInstance.get<ApiResponseWrapper<KpiSummaryResponse>>('/api/v1/kpi/summary', {
    params: toParams(query),
  });
  return unwrap(res);
}

export async function getKpiDailyTrend(query?: KpiQueryParams): Promise<KpiDailyTrendResponse> {
  const res = await axiosInstance.get<ApiResponseWrapper<KpiDailyTrendResponse>>('/api/v1/kpi/daily-trend', {
    params: toParams(query),
  });
  return unwrap(res);
}

export async function getKpiByRoute(query?: KpiQueryParams): Promise<KpiByRouteResponse> {
  const res = await axiosInstance.get<ApiResponseWrapper<KpiByRouteResponse>>('/api/v1/kpi/by-route', {
    params: toParams(query),
  });
  return unwrap(res);
}

export async function getKpiByDriver(query?: KpiQueryParams): Promise<KpiByDriverResponse> {
  const res = await axiosInstance.get<ApiResponseWrapper<KpiByDriverResponse>>('/api/v1/kpi/by-driver', {
    params: toParams(query),
  });
  return unwrap(res);
}

export async function getKpiByVehicle(query?: KpiQueryParams): Promise<KpiByVehicleResponse> {
  const res = await axiosInstance.get<ApiResponseWrapper<KpiByVehicleResponse>>('/api/v1/kpi/by-vehicle', {
    params: toParams(query),
  });
  return unwrap(res);
}
