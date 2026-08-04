// API cho ELOG-141 (audit trail chỉ-đọc, /api/trip-outcome-events, /api/trips/{id}/outcome-history).
// KHÁC với tripOutcomeApi.ts (feature validate/amend outcome cũ, /api/trip-outcomes).
import axiosInstance from './axiosInstance';
import type { TripOutcomeEvent } from '../types/tripOutcomeEvent';

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

export interface TripOutcomeEventPage {
  items: TripOutcomeEvent[];
  pagination: ApiPagination;
}

const DEFAULT_PAGINATION: ApiPagination = { page: 0, size: 20, totalElements: 0, totalPages: 0 };

function toErrorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
  return err.response?.data?.error?.message || err.message || fallback;
}

export async function getTripOutcomeHistory(
  tripId: number | string,
  params: { page?: number; size?: number } = {}
): Promise<TripOutcomeEventPage> {
  try {
    const response = await axiosInstance.get<ApiResponse<TripOutcomeEvent[]>>(
      `/api/trips/${tripId}/outcome-history`,
      { params }
    );
    return {
      items: response.data.data ?? [],
      pagination: response.data.pagination ?? DEFAULT_PAGINATION,
    };
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Không tải được lịch sử thực thi chuyến giao hàng.'), { cause: error });
  }
}
