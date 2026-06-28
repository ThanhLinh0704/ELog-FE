import { USE_MOCK_API } from '../config';
import axiosInstance from './axiosInstance';
import { 
  uploadOrdersMock, 
  getImportHistoryMock, 
  getImportBatchDetailMock 
} from '../mocks/importService';
import { 
  mapBatchResponseToHistory, 
  mapBatchResponseToResult, 
  mapErrorResponseToRow 
} from '../utils/importMapper';
import type { ImportBatchHistory, ImportResult, ImportErrorRow } from '../types/import';

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

export const importApi = {
  async uploadOrders(
    deliveryDate: string,
    file: File,
    confirmReplace: boolean = false
  ): Promise<ImportResult> {
    if (USE_MOCK_API) {
      return uploadOrdersMock(deliveryDate, file, { confirmReplace });
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('deliveryDate', deliveryDate);
    formData.append('confirmReplace', String(confirmReplace));

    const queryParams = new URLSearchParams();
    queryParams.set('deliveryDate', deliveryDate);
    queryParams.set('confirmReplace', String(confirmReplace));

    const res = await handleAxiosCall<any>(() =>
      axiosInstance.post(`/api/imports?${queryParams.toString()}`, formData, {
        headers: {
          'Content-Type': undefined,
        },
      })
    );

    const batchData = res?.data;
    
    let errorRows: ImportErrorRow[] = [];
    if (batchData && batchData.rejectedRows > 0) {
      try {
        errorRows = await this.getBatchErrors(batchData.batchId);
      } catch (e) {
        console.error('Failed to pre-fetch errors for uploaded batch', e);
      }
    }

    return mapBatchResponseToResult(batchData, errorRows);
  },

  async getImportHistory(
    params: {
      deliveryDate?: string;
      page: number;
      size: number;
    }
  ): Promise<{ content: ImportBatchHistory[]; totalElements: number }> {
    if (USE_MOCK_API) {
      return getImportHistoryMock(params.page, params.size);
    }

    const { deliveryDate, page = 0, size = 10 } = params;
    const query = new URLSearchParams();
    query.set('page', String(page));
    query.set('size', String(size));
    query.set('sort', 'createdAt,desc');
    if (deliveryDate) {
      query.set('deliveryDate', deliveryDate);
    }

    const res = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/imports?${query.toString()}`)
    );

    const rawList = res?.data || [];
    const content = rawList.map(mapBatchResponseToHistory);
    const totalElements = res?.pagination?.totalElements ?? rawList.length;

    return {
      content,
      totalElements,
    };
  },

  async getBatchDetail(batchId: number): Promise<ImportResult | null> {
    if (USE_MOCK_API) {
      return getImportBatchDetailMock(batchId);
    }

    const res = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/imports/${batchId}`)
    );

    const batchData = res?.data;
    if (!batchData) return null;

    let errorRows: ImportErrorRow[] = [];
    if (batchData.rejectedRows > 0) {
      try {
        errorRows = await this.getBatchErrors(batchId);
      } catch (e) {
        console.error(`Failed to fetch errors for batch ${batchId}`, e);
      }
    }

    return mapBatchResponseToResult(batchData, errorRows);
  },

  async getBatchErrors(batchId: number): Promise<ImportErrorRow[]> {
    if (USE_MOCK_API) {
      const detail = await getImportBatchDetailMock(batchId);
      return detail?.errors || [];
    }

    const res = await handleAxiosCall<any>(() =>
      axiosInstance.get(`/api/imports/${batchId}/errors`)
    );

    const rawErrors = res?.data || [];
    return rawErrors.map(mapErrorResponseToRow);
  }
};
