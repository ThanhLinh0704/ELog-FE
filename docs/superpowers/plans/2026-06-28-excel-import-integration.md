# Kế hoạch Triển khai — Tích hợp API Excel Nhập đơn hàng

> **Dành cho agent:** KHÔNG ĐƯỢC TỰ Ý sửa đổi code ngoài các bước đã ghi dưới đây. Sử dụng checkbox (`- [ ]`) để theo dõi tiến độ công việc.

**Mục tiêu:** Kết nối giao diện module Excel Nhập đơn hàng ở frontend React với các API thật ở backend Spring Boot, bao gồm upload file, xử lý trùng lịch giao hàng (HTTP 409), hiển thị lịch sử và xem chi tiết lỗi.

**Kiến trúc:** Tạo file mapper `importMapper.ts` để map DTO của backend về FE. Tạo file `importApi.ts` đóng gói các API HTTP gọi qua `axiosInstance`. Điều chỉnh logic xử lý upload của `OrderImportPage.tsx` để bắt mã lỗi 409.

**Công nghệ:** React, TypeScript, Axios, Dayjs.

## Ràng buộc Toàn cục
- Giữ nguyên thiết kế giao diện, layout và components hiện tại.
- Tuân thủ cấu trúc của codebase (các API thật bọc trong thư mục `src/api/`).
- Hỗ trợ biến cấu hình `USE_MOCK_API` từ `src/config.ts` để chuyển đổi qua lại.

---

### Nhiệm vụ 1: Tạo tệp Mapper Utility
**File tạo mới:**
- [importMapper.ts](file:///c:/SEP_490/ELOG/ELOG_FE/ELog-FE/src/utils/importMapper.ts)

**Mô tả:** Chuyển đổi cấu trúc dữ liệu trả về từ backend API sang các định dạng mà UI components của frontend đang dùng.

- [ ] **Bước 1: Viết code cho `src/utils/importMapper.ts`**

```typescript
import type { ImportBatchHistory, ImportResult, ImportErrorRow } from '../types/import';

export const mapBatchResponseToHistory = (raw: any): ImportBatchHistory => {
  return {
    id: raw.batchId,
    deliveryDate: raw.deliveryDate,
    fileName: raw.fileName,
    uploadedBy: 'N/A',
    totalRows: raw.totalRows ?? 0,
    acceptedRows: raw.acceptedRows ?? 0,
    rejectedRows: raw.rejectedRows ?? 0,
    createdOrders: Number(raw.ordersCreated ?? 0),
    isActive: raw.isActive ?? false,
    uploadedAt: raw.createdAt,
  };
};

export const mapBatchResponseToResult = (raw: any, errors: ImportErrorRow[] = []): ImportResult => {
  return {
    batchId: raw.batchId,
    deliveryDate: raw.deliveryDate,
    fileName: raw.fileName,
    totalRows: raw.totalRows ?? 0,
    acceptedRows: raw.acceptedRows ?? 0,
    rejectedRows: raw.rejectedRows ?? 0,
    createdOrders: Number(raw.ordersCreated ?? 0),
    errors: errors,
  };
};

export const mapErrorResponseToRow = (raw: any): ImportErrorRow => {
  return {
    rowNumber: raw.rowNumber,
    originalContent: raw.rawData,
    errorReason: raw.errorReason,
  };
};
```

---

### Nhiệm vụ 2: Tạo tệp Dịch vụ API Tích hợp
**File tạo mới:**
- [importApi.ts](file:///c:/SEP_490/ELOG/ELOG_FE/ELog-FE/src/api/importApi.ts)

**Mô tả:** Đóng gói các hàm gọi API HTTP thông qua `axiosInstance` liên kết với backend.

- [ ] **Bước 1: Viết code cho `src/api/importApi.ts`**

```typescript
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

    const res = await handleAxiosCall<any>(() =>
      axiosInstance.post('/api/imports', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
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
```

---

### Nhiệm vụ 3: Cập nhật Trang Cockpit Giao diện Nhập đơn
**File chỉnh sửa:**
- [OrderImportPage.tsx](file:///c:/SEP_490/ELOG/ELOG_FE/ELog-FE/src/pages/dispatcher/import/OrderImportPage.tsx)

**Mô tả:** Đổi API sang gọi `importApi`, xử lý bắt mã lỗi HTTP 409 từ API upload để bật modal trùng ngày giao hàng.

- [ ] **Bước 1: Chỉnh sửa phần import và logic upload trong `OrderImportPage.tsx`**
  Thay đổi import mock thành import API, sửa logic `executeUpload` bắt mã lỗi `409` từ backend:

```typescript
// Sửa import mock ở dòng 11-12
import { importApi, ApiError } from '../../../api/importApi';

// Sửa hàm executeUpload
const executeUpload = async (deliveryDate: string, file: File, confirmReplace: boolean) => {
  setUploadLoading(true);
  setCurrentResult(null);
  setErrorTableOpen(false);

  try {
    const result = await importApi.uploadOrders(deliveryDate, file, confirmReplace);
    message.success(`Tải lên file thành công. Tạo Batch #${result.batchId}`);
    setCurrentResult(result);
    if (result.rejectedRows > 0) {
      setErrorTableOpen(true);
    }
    
    await loadHistory(0, pageSize);
    setCurrentPage(0);

    setTimeout(() => {
      const resultCard = document.getElementById('import-result-card');
      if (resultCard) {
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

  } catch (error: any) {
    console.error('Upload failed', error);
    if (error instanceof ApiError && error.status === 409) {
      // Bắt lỗi trùng lịch giao hàng HTTP 409
      setPendingUpload({ deliveryDate, file });
      setReplaceModalOpen(true);
    } else {
      message.error(error?.message || 'Không thể xử lý file. Vui lòng thử lại.');
    }
  } finally {
    setUploadLoading(false);
  }
};

// Sửa hàm loadHistory gọi importApi
const loadHistory = async (page = currentPage, size = pageSize) => {
  setHistoryLoading(true);
  try {
    const response = await importApi.getImportHistory({ page, size });
    setHistoryData(response.content);
    setTotalElements(response.totalElements);
  } catch (error) {
    console.error('Failed to load import history', error);
    message.error('Không thể tải lịch sử import. Vui lòng thử lại.');
  } finally {
    setHistoryLoading(false);
  }
};

// Sửa hàm handleUploadInitiated bỏ check local mock trùng ngày
const handleUploadInitiated = async (deliveryDate: string, file: File) => {
  await executeUpload(deliveryDate, file, false);
};
```

---

### Nhiệm vụ 4: Cập nhật Trang Chi tiết Batch Import
**File chỉnh sửa:**
- [ImportBatchDetailPage.tsx](file:///c:/SEP_490/ELOG/ELOG_FE/ELog-FE/src/pages/dispatcher/import/ImportBatchDetailPage.tsx)

**Mô tả:** Gọi API `getBatchDetail` và API `getBatchErrors` từ `importApi`.

- [ ] **Bước 1: Chỉnh sửa trang chi tiết để kết nối dữ liệu thật**
  Thay thế hàm mock bằng gọi dịch vụ `importApi`:

```typescript
// Sửa import mock ở dòng 10
import { importApi } from '../../../api/importApi';

// Sửa hàm loadBatchDetails
const loadBatchDetails = async () => {
  if (!batchId) return;
  setLoading(true);
  try {
    const data = await importApi.getBatchDetail(Number(batchId));
    if (data) {
      setBatch(data);
      // Lấy thông tin uploader và thời gian
      try {
        const historyResponse = await importApi.getImportHistory({ page: 0, size: 50 });
        const found = historyResponse.content.find((b: any) => b.id === Number(batchId));
        if (found) {
          setIsActive(found.isActive);
          setUploader(found.uploadedBy);
          setUploadedAt(found.uploadedAt);
        }
      } catch (e) {
        console.error("Error reading extra history item from API", e);
      }
    } else {
      setBatch(null);
    }
  } catch (error) {
    console.error('Error fetching batch detail', error);
    message.error('Không thể tải chi tiết batch import');
  } finally {
    setLoading(false);
  }
};
```

---

### Nhiệm vụ 5: Xác minh
- [ ] **Bước 1: Chạy build dự án**
  Chạy lệnh `npm run build` để kiểm tra compile lỗi TypeScript.
