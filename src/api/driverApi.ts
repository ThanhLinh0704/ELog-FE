import axiosInstance from './axiosInstance';
import type { Driver, DriverInactiveReasonCode, DriverStatus, DriverStatusHistoryEntry } from '../types/driver';

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

export interface DriverPage {
  items: Driver[];
  pagination: ApiPagination;
}

export interface DriverStatusHistoryPage {
  items: DriverStatusHistoryEntry[];
  pagination: ApiPagination;
}

export interface DriverStatusUpdatePayload {
  status: DriverStatus;
  reasonCode?: DriverInactiveReasonCode;
  reasonNote?: string;
}

const DEFAULT_PAGINATION: ApiPagination = { page: 0, size: 20, totalElements: 0, totalPages: 0 };

function unwrap<T>(body: ApiResponse<T>): T {
  return body?.data as T;
}

function toErrorMessage(error: unknown, fallback: string): string {
  const err = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
  return err.response?.data?.error?.message || err.message || fallback;
}

export async function getDrivers(params: {
  keyword?: string;
  status?: DriverStatus;
  page?: number;
  size?: number;
} = {}): Promise<DriverPage> {
  try {
    const response = await axiosInstance.get<ApiResponse<Driver[]>>('/api/drivers', { params });
    return {
      items: unwrap(response.data) ?? [],
      pagination: response.data.pagination ?? DEFAULT_PAGINATION,
    };
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Không tải được danh sách tài xế.'), { cause: error });
  }
}

export async function getDriverById(id: number | string): Promise<Driver> {
  try {
    const response = await axiosInstance.get<ApiResponse<Driver>>(`/api/drivers/${id}`);
    return unwrap(response.data);
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Không tải được thông tin tài xế.'), { cause: error });
  }
}

export async function updateDriverStatus(
  id: number | string,
  payload: DriverStatusUpdatePayload
): Promise<Driver> {
  try {
    const response = await axiosInstance.patch<ApiResponse<Driver>>(`/api/drivers/${id}/status`, payload);
    return unwrap(response.data);
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Không cập nhật được trạng thái tài xế.'), { cause: error });
  }
}

export async function getDriverStatusHistory(
  id: number | string,
  params: { page?: number; size?: number } = {}
): Promise<DriverStatusHistoryPage> {
  try {
    const response = await axiosInstance.get<ApiResponse<DriverStatusHistoryEntry[]>>(
      `/api/drivers/${id}/status-history`,
      { params }
    );
    return {
      items: unwrap(response.data) ?? [],
      pagination: response.data.pagination ?? DEFAULT_PAGINATION,
    };
  } catch (error) {
    throw new Error(toErrorMessage(error, 'Không tải được lịch sử trạng thái.'), { cause: error });
  }
}
