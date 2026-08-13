import axiosInstance from './axiosInstance';
import type { PlanningEvent, PlanningEventType } from '../types/planningEvent';

interface ApiPagination {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  message?: string;
  pagination?: ApiPagination;
}

export interface PlanningEventPage {
  items: PlanningEvent[];
  pagination: ApiPagination;
}

const DEFAULT_PAGINATION: ApiPagination = { page: 0, size: 20, totalElements: 0, totalPages: 0 };

function toErrorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
  return err.response?.data?.error?.message || err.message || fallback;
}

export async function getTripDraftPlanningHistory(
  tripDraftId: number | string,
  params: { page?: number; size?: number } = {}
): Promise<PlanningEventPage> {
  try {
    const response = await axiosInstance.get<ApiResponse<PlanningEvent[]>>(
      `/api/v1/trip-drafts/${tripDraftId}/history`,
      { params }
    );
    return {
      items: response.data.data ?? [],
      pagination: response.data.pagination ?? DEFAULT_PAGINATION,
    };
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Không tải được lịch sử lập kế hoạch.'), { cause: error });
  }
}

export interface PlanningEventSearchFilters {
  tripDraftId?: number;
  tripId?: number;
  routeCode?: string;
  deliveryDate?: string;
  eventType?: PlanningEventType;
  actorUsername?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
}

export async function searchPlanningEvents(
  filters: PlanningEventSearchFilters = {},
  params: { page?: number; size?: number } = {}
): Promise<PlanningEventPage> {
  try {
    const response = await axiosInstance.get<ApiResponse<PlanningEvent[]>>('/api/v1/planning-events', {
      params: { ...filters, ...params },
    });
    return {
      items: response.data.data ?? [],
      pagination: response.data.pagination ?? DEFAULT_PAGINATION,
    };
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Không tải được nhật ký điều phối.'), { cause: error });
  }
}
