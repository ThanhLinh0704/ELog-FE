import { USE_MOCK_API } from '../config';
import axiosInstance from './axiosInstance';

/**
 * Confirmed Dispatch Data Export (Xuất Dữ Liệu Điều Phối Đã Xác Nhận).
 * Backend: GET /api/v1/exports/confirmed-dispatch/{tripDraftId} and
 * GET /api/v1/exports/confirmed-dispatch?fromDate=&toDate= — see
 * filemd/CONFIRMED_DISPATCH_EXPORT_BE_SPEC.md for the full BE spec.
 * Both endpoints require trip:coordinate or trip:read.
 */
export const dispatchExportApi = {
  async exportSingleDispatch(tripDraftId: number | string): Promise<Blob> {
    if (USE_MOCK_API) {
      return new Blob(['Mock file content'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    }

    const response = await axiosInstance.get(`/api/v1/exports/confirmed-dispatch/${tripDraftId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportDispatchByDateRange(fromDate: string, toDate: string): Promise<Blob> {
    if (USE_MOCK_API) {
      return new Blob(['Mock file content'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    }

    const response = await axiosInstance.get('/api/v1/exports/confirmed-dispatch', {
      params: { fromDate, toDate },
      responseType: 'blob',
    });
    return response.data;
  },
};
