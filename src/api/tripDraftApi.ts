import axiosInstance from './axiosInstance';
import type { TripDraft, ConsolidateResponse } from '../types/tripDraft';

export class ApiError extends Error {
  status?: number;
  body?: any;

  constructor(message: string, status?: number, body?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function handleAxiosCall<T>(call: () => Promise<any>): Promise<T> {
  try {
    const response = await call();
    return response.data;
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const body = error.response.data;
      const message = body?.message || body?.error?.message || `API error ${status}`;
      throw new ApiError(message, status, body);
    }
    throw new ApiError(error.message || 'Network Error');
  }
}

export const tripDraftApi = {
  async consolidate(deliveryDate: string): Promise<ConsolidateResponse> {
    const res = await handleAxiosCall<any>(() =>
      axiosInstance.post('/api/trip-drafts/consolidate', { deliveryDate })
    );
    return res.data;
  },

  async getTripDrafts(params: {
    deliveryDate: string;
    page: number;
    size: number;
  }): Promise<{ content: TripDraft[]; totalElements: number; totalPages: number }> {
    const query = new URLSearchParams();
    query.set('deliveryDate', params.deliveryDate);
    query.set('page', String(params.page));
    query.set('size', String(params.size));
    query.set('sort', 'route.code,asc');

    const res = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/trip-drafts?${query.toString()}`)
    );

    return {
      content: res?.data || [],
      totalElements: res?.pagination?.totalElements ?? 0,
      totalPages: res?.pagination?.totalPages ?? 0,
    };
  },

  async getTripDraftById(id: number): Promise<TripDraft> {
    const res = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/trip-drafts/${id}`)
    );
    return res.data;
  }
};
