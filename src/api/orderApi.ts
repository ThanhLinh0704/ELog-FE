// API service for Order Management — GET /api/v1/orders
// Authorization: hasAnyAuthority('order:import', 'trip:read')
// Uses existing axiosInstance (Bearer token handled by request interceptor).

import axiosInstance from './axiosInstance';
import type { OrderDetail, SearchOrdersParams } from '../types/order';

interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

/**
 * GET /api/v1/orders
 * Search, filter and paginate all orders.
 * page is 0-based (matches Backend default).
 */
export async function searchOrders(params: SearchOrdersParams): Promise<{
  data: OrderDetail[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}> {
  const query = new URLSearchParams();
  if (params.deliveryDate) query.set('deliveryDate', params.deliveryDate);
  if (params.status)       query.set('status', params.status);
  if (params.routeId)      query.set('routeId', String(params.routeId));
  if (params.routeCode)    query.set('routeCode', params.routeCode);
  if (params.batchId)      query.set('batchId', String(params.batchId));
  if (params.search)       query.set('search', params.search);
  query.set('page', String(params.page ?? 0));
  query.set('size', String(params.size ?? 20));
  query.set('sort', params.sort ?? 'createdAt,desc');

  const res = await axiosInstance.get<ApiResponseWrapper<OrderDetail[]>>(
    `/api/v1/orders?${query.toString()}`
  );

  const body = res.data;
  return {
    data:          body.data ?? [],
    totalElements: body.pagination?.totalElements ?? 0,
    totalPages:    body.pagination?.totalPages ?? 0,
    page:          body.pagination?.page ?? 0,
    size:          body.pagination?.size ?? 20,
  };
}

/**
 * GET /api/v1/orders/{id}
 * Fetch a single order by ID.
 */
export async function getOrderById(id: number): Promise<OrderDetail> {
  const res = await axiosInstance.get<ApiResponseWrapper<OrderDetail>>(
    `/api/v1/orders/${id}`
  );
  return res.data.data;
}
