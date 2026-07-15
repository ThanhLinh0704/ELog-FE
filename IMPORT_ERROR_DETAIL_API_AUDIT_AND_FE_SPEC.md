# IMPORT ERROR DETAIL — API Audit & Frontend Implementation Spec

## 1. Mục tiêu

Nâng cấp màn hình **Kết quả import đơn hàng Excel** để thay bảng lỗi tối giản bằng màn hình lỗi đầy đủ:

- Filter theo `errorCode`.
- Badge màu theo từng loại lỗi.
- Bảng lỗi chi tiết.
- Pagination.
- Nút tải báo cáo lỗi Excel.
- Gọi API backend thật nếu backend đã có.
- Nếu backend chưa có API, phải ghi rõ thiếu API nào và chỉ mock tạm phần chưa có.

Route chính:

```text
/dispatcher/import
```

Route chi tiết có thể dùng:

```text
/dispatcher/import/history/:batchId
```

---

## 2. Yêu cầu quan trọng cho AI Coding

Không được code ngay.

Trước tiên phải audit code hiện tại:

1. Check backend đã có API import chưa.
2. Check backend đã có API lấy lỗi theo batch chưa.
3. Check backend đã có API export lỗi chưa.
4. Check backend đã có API lịch sử import batch chưa.
5. Check frontend `/dispatcher/import` đã làm đến đâu.
6. Check frontend đang dùng mock hay đã gọi API thật.
7. Nếu đã làm rồi, kiểm tra mapping field có đúng API contract không.
8. Nếu chưa làm, triển khai FE theo contract.
9. Nếu backend thiếu API, không được tự bịa endpoint.

---

## 3. Phạm vi

### 3.1 Backend

Task này **không yêu cầu viết backend mới**.

Nhưng AI phải kiểm tra backend đã có chưa:

- `POST /api/imports`
- `GET /api/imports/{batchId}/errors`
- `GET /api/imports/{batchId}/errors/export`
- API lấy lịch sử import batch, ví dụ `GET /api/imports`
- DTO response
- Error code
- Permission role
- Export Excel response

Nếu backend có đủ, frontend phải gọi API thật.

Nếu backend thiếu, ghi rõ:

```text
Missing backend API:
- GET /api/imports/{batchId}/errors/export
```

Nếu backend khác contract, ghi rõ:

```text
Backend mismatch:
- API returns createdOrders but spec expects ordersCreated
```

### 3.2 Frontend

Frontend cần kiểm tra hoặc triển khai:

- Upload Excel.
- Confirm replace khi trùng ngày.
- Result summary.
- Error detail table.
- ErrorCode filter.
- Error badge màu.
- Export error report.
- Read-only role.
- Loading/error/empty states.

---

## 4. Phân quyền

| Role | Quyền |
|---|---|
| `DISPATCHER` | Upload, xem kết quả, xem lỗi, tải báo cáo lỗi, xem lịch sử |
| `LOGISTICS_MANAGER` | Chỉ xem lịch sử, xem lỗi, tải báo cáo lỗi |
| `SYSTEM_ADMIN` | Chỉ xem lịch sử, xem lỗi, tải báo cáo lỗi |
| Role khác | Redirect hoặc 403 |

`LOGISTICS_MANAGER` và `SYSTEM_ADMIN` không được thấy form upload.

---

# 5. API Contract cần kiểm tra

## 5.1 Upload file Excel để nhập đơn hàng

### Endpoint

```http
POST /api/imports
```

### Role

```text
DISPATCHER
```

### Request

Dùng `multipart/form-data`.

| Field | Type | Required | Description |
|---|---|---:|---|
| `file` | File | Yes | File Excel `.xlsx` |
| `deliveryDate` | String | Yes | Format `YYYY-MM-DD` |
| `confirmReplace` | Boolean | No | Mặc định `false` |

### Response 201

```json
{
  "success": true,
  "data": {
    "batchId": 12,
    "deliveryDate": "2026-06-27",
    "fileName": "don_hang_binh_thanh.xlsx",
    "totalRows": 150,
    "acceptedRows": 145,
    "rejectedRows": 5,
    "ordersCreated": 42,
    "status": "COMPLETED",
    "isActive": true,
    "createdAt": "2026-06-27T16:15:30"
  },
  "message": "Import hoàn tất"
}
```

### Response 400 — FILE_TOO_LARGE

```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File Excel vượt quá giới hạn 5.000 dòng dữ liệu (Số dòng hiện tại: 5025)"
  }
}
```

### Response 409 — DUPLICATE_DELIVERY_DATE

```json
{
  "error": "DUPLICATE_DELIVERY_DATE",
  "message": "Đã có dữ liệu nhập cho ngày 2026-06-27 (batch #11). Gửi lại với confirmReplace=true để thay thế.",
  "existingBatchId": 11
}
```

Frontend xử lý:

- 409 phải mở dialog xác nhận.
- Chưa xác nhận thì không upload lại.
- Xác nhận thì gọi lại `POST /api/imports` với `confirmReplace=true`.

---

## 5.2 Lấy danh sách lỗi theo batch

> Lưu ý: Trong mô tả ban đầu có dòng “Lấy lịch sử danh sách các lô import”, nhưng endpoint đưa ra là `/api/imports/{batchId}/errors`. Đây là API lấy lỗi của batch, không phải API lịch sử batch.

### Endpoint

```http
GET /api/imports/{batchId}/errors
```

### Role

```text
DISPATCHER, LOGISTICS_MANAGER
```

Nên hỗ trợ thêm `SYSTEM_ADMIN` nếu admin được xem lịch sử import.

### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `errorCode` | String | none | Lọc theo mã lỗi |
| `page` | Integer | `0` | Trang 0-indexed |
| `size` | Integer | `20` | Số phần tử/trang |
| `sort` | String | `rowNumber,asc` | Sort |

### Response 200

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "importBatchId": 12,
      "rowNumber": 5,
      "errorCode": "STORE_NOT_FOUND",
      "fieldName": "store_code",
      "rawData": "DH160325-02,ST-INVALID,PRD-001,10",
      "errorReason": "Mã cửa hàng 'ST-INVALID' không tồn tại trong hệ thống",
      "createdAt": "2026-06-27T16:15:30"
    },
    {
      "id": 2,
      "importBatchId": 12,
      "rowNumber": 12,
      "errorCode": "ORDER_REF_STORE_MISMATCH",
      "fieldName": "order_ref",
      "rawData": "DH160325-01,ST-002,PRD-002,5",
      "errorReason": "Mã đơn 'DH160325-01' đã dùng cho cửa hàng 'ST-001' (dòng 2) — không thể dùng lại cho cửa hàng khác",
      "createdAt": "2026-06-27T16:15:30"
    }
  ],
  "pagination": {
    "page": 0,
    "size": 2,
    "totalElements": 2,
    "totalPages": 1
  }
}
```

### Response 404

```json
{
  "success": false,
  "error": {
    "code": "IMPORT_BATCH_NOT_FOUND",
    "message": "Import batch not found: 99"
  }
}
```

---

## 5.3 Export file báo cáo lỗi Excel

### Endpoint

```http
GET /api/imports/{batchId}/errors/export
```

### Response

Binary stream `.xlsx`.

Headers:

```http
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="import-errors-batch{batchId}.xlsx"
```

Frontend phải gọi với:

```ts
responseType: "blob"
```

---

## 5.4 API lịch sử import batch

Frontend cần lịch sử import. Nếu backend có API này thì dùng API thật.

Endpoint đề xuất nếu backend có:

```http
GET /api/imports
```

Query đề xuất:

| Parameter | Description |
|---|---|
| `deliveryDateFrom` | Lọc từ ngày |
| `deliveryDateTo` | Lọc đến ngày |
| `isActive` | Batch hiện hành/đã thay thế |
| `page` | Trang |
| `size` | Số phần tử/trang |
| `sort` | Ví dụ `createdAt,desc` |

Nếu backend chưa có API lịch sử, phải ghi rõ:

```text
Missing backend API: GET /api/imports for import batch history
```

Không được tự bịa endpoint.

---

# 6. Backend Audit Checklist

AI cần search trong backend:

```text
/api/imports
ImportBatch
ImportError
confirmReplace
DUPLICATE_DELIVERY_DATE
FILE_TOO_LARGE
errors/export
ordersCreated
```

Có thể kiểm tra các thư mục:

```text
src/main/java/**/controller
src/main/java/**/service
src/main/java/**/dto
src/main/java/**/entity
src/main/java/**/repository
```

Checklist:

- [ ] Có `POST /api/imports`.
- [ ] API upload dùng `multipart/form-data`.
- [ ] Nhận field `file`.
- [ ] Nhận field `deliveryDate`.
- [ ] Nhận field `confirmReplace`.
- [ ] Có lỗi `FILE_TOO_LARGE`.
- [ ] Có lỗi `DUPLICATE_DELIVERY_DATE`.
- [ ] Response trả `ordersCreated`.
- [ ] Có `GET /api/imports/{batchId}/errors`.
- [ ] API errors hỗ trợ `errorCode`.
- [ ] API errors hỗ trợ `page`, `size`, `sort`.
- [ ] Response errors có `pagination`.
- [ ] Có `GET /api/imports/{batchId}/errors/export`.
- [ ] Export trả file `.xlsx`.
- [ ] Có API lấy lịch sử batch.
- [ ] Permission đúng cho `DISPATCHER`, `LOGISTICS_MANAGER`, `SYSTEM_ADMIN` nếu cần.

Kết quả audit phải ghi rõ:

```text
Backend status:
- POST /api/imports: Found / Missing / Mismatch
- GET /api/imports/{batchId}/errors: Found / Missing / Mismatch
- GET /api/imports/{batchId}/errors/export: Found / Missing / Mismatch
- GET /api/imports history: Found / Missing / Mismatch
```

---

# 7. Frontend Audit Checklist

AI cần search trong frontend:

```text
/dispatcher/import
OrderImportPage
ImportUploadCard
ImportResultCard
ImportErrorsTable
ImportHistoryTable
confirmReplace
ordersCreated
createdOrders
batchId
errorCode
errors/export
```

Checklist:

- [ ] Có route `/dispatcher/import`.
- [ ] Có role guard.
- [ ] `DISPATCHER` thấy upload.
- [ ] `LOGISTICS_MANAGER` không thấy upload.
- [ ] `SYSTEM_ADMIN` không thấy upload.
- [ ] Upload dùng API thật hoặc mock.
- [ ] Nếu có API service, endpoint đúng `/api/imports`.
- [ ] Upload dùng `FormData`.
- [ ] Gửi đúng `file`.
- [ ] Gửi đúng `deliveryDate`.
- [ ] Gửi đúng `confirmReplace`.
- [ ] 409 mở dialog confirm replace.
- [ ] Confirm gọi lại với `confirmReplace=true`.
- [ ] 400 `FILE_TOO_LARGE` hiển thị message từ API.
- [ ] Summary map đúng `ordersCreated`.
- [ ] Có màn hình lỗi đầy đủ.
- [ ] Có filter `errorCode`.
- [ ] Có badge màu theo errorCode.
- [ ] Có server-side pagination cho errors.
- [ ] Có export report bằng blob.
- [ ] Có loading/empty/error state.

Kết quả audit phải ghi rõ:

```text
Frontend status:
- Upload form: Found / Missing
- API service: Found / Missing / Mock only
- Error detail UI: Found / Missing / Incomplete
- Error filter: Found / Missing
- Export button: Found / Missing
- Role guard: Found / Missing
```

---

# 8. Types Frontend

```ts
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ImportBatchSummary {
  batchId: number;
  deliveryDate: string;
  fileName: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  ordersCreated: number;
  status: "COMPLETED" | "FAILED" | "PROCESSING";
  isActive: boolean;
  createdAt: string;
}

export interface ImportErrorItem {
  id: number;
  importBatchId: number;
  rowNumber: number;
  errorCode: string;
  fieldName: string;
  rawData: string;
  errorReason: string;
  createdAt: string;
}

export interface Pagination {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ImportErrorsResponse {
  success: boolean;
  data: ImportErrorItem[];
  pagination: Pagination;
}
```

---

# 9. API Service cần có ở Frontend

## 9.1 Upload

```ts
export async function uploadImportOrders(params: {
  file: File;
  deliveryDate: string;
  confirmReplace?: boolean;
}): Promise<ImportBatchSummary> {
  const formData = new FormData();

  formData.append("file", params.file);
  formData.append("deliveryDate", params.deliveryDate);
  formData.append(
    "confirmReplace",
    String(params.confirmReplace ?? false)
  );

  const response = await apiClient.post<
    ApiResponse<ImportBatchSummary>
  >("/api/imports", formData);

  return response.data.data;
}
```

## 9.2 Get import errors

```ts
export async function getImportErrors(params: {
  batchId: number;
  errorCode?: string;
  page?: number;
  size?: number;
  sort?: string;
}): Promise<ImportErrorsResponse> {
  const response = await apiClient.get<ImportErrorsResponse>(
    `/api/imports/${params.batchId}/errors`,
    {
      params: {
        errorCode: params.errorCode || undefined,
        page: params.page ?? 0,
        size: params.size ?? 20,
        sort: params.sort ?? "rowNumber,asc",
      },
    }
  );

  return response.data;
}
```

## 9.3 Export errors

```ts
export async function exportImportErrors(
  batchId: number
): Promise<Blob> {
  const response = await apiClient.get(
    `/api/imports/${batchId}/errors/export`,
    {
      responseType: "blob",
    }
  );

  return response.data;
}
```

## 9.4 Download blob

```ts
export function downloadBlob(
  blob: Blob,
  fileName: string
) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();

  link.remove();
  window.URL.revokeObjectURL(url);
}
```

---

# 10. Error Handling

## 10.1 Duplicate delivery date

Nếu API trả `409 DUPLICATE_DELIVERY_DATE`:

- Không hiện lỗi chung.
- Mở dialog xác nhận.
- Hiển thị message từ API.
- Khi user xác nhận, gọi lại upload với `confirmReplace=true`.

## 10.2 File too large

Nếu API trả `400 FILE_TOO_LARGE`:

- Hiển thị message từ API trong upload card.
- Không mở dialog replace.

## 10.3 Batch not found

Nếu API lỗi 404:

```text
Không tìm thấy lô import. Vui lòng tải lại trang hoặc quay về lịch sử import.
```

## 10.4 Export failed

```text
Không thể tải báo cáo lỗi. Vui lòng thử lại.
```

---

# 11. UI nâng cấp màn hình lỗi import

## 11.1 Layout

```text
┌───────────────────────────────────────────────────┐
│ ⚠️ 4 dòng lỗi — Batch #9 — 16/03/2026             │
│                                                   │
│ Lọc theo loại lỗi: [ Tất cả ▾ ]     [Tải báo cáo] │
│ ┌─────┬──────────────────────┬─────────────────┐ │
│ │Dòng │ Loại lỗi             │ Lý do           │ │
│ ├─────┼──────────────────────┼─────────────────┤ │
│ │ 5   │ 🔴 Cửa hàng không có │ ST-HD-099...    │ │
│ │ 6   │ 🔴 SKU không có      │ ACC-HDMI-2M...  │ │
│ │ 7   │ 🟡 Thiếu dữ liệu     │ Thiếu Số lượng  │ │
│ │ 8   │ 🟠 Trùng mã đơn      │ DH160325-03...  │ │
│ └─────┴──────────────────────┴─────────────────┘ │
└───────────────────────────────────────────────────┘
```

## 11.2 Filter dropdown

Label:

```text
Lọc theo loại lỗi
```

Options:

| Label | Value |
|---|---|
| Tất cả | empty |
| Cửa hàng không tồn tại | `STORE_NOT_FOUND` |
| SKU không tồn tại | `SKU_NOT_FOUND` |
| Thiếu dữ liệu | `REQUIRED_FIELD_MISSING` |
| Trùng dòng đơn hàng | `DUPLICATE_ORDER_LINE` |
| Mã đơn sai cửa hàng | `ORDER_REF_STORE_MISMATCH` |
| Số lượng không hợp lệ | `INVALID_QUANTITY` |
| Khác | `UNKNOWN_ERROR` |

Khi đổi filter:

- Reset page về `0`.
- Gọi lại API errors với `errorCode`.

---

# 12. Error Badge Mapping

```ts
export const IMPORT_ERROR_META: Record<
  string,
  {
    label: string;
    color: string;
    icon?: string;
  }
> = {
  STORE_NOT_FOUND: {
    label: "Cửa hàng không tồn tại",
    color: "red",
    icon: "🔴",
  },
  SKU_NOT_FOUND: {
    label: "SKU không tồn tại",
    color: "red",
    icon: "🔴",
  },
  REQUIRED_FIELD_MISSING: {
    label: "Thiếu dữ liệu",
    color: "gold",
    icon: "🟡",
  },
  DUPLICATE_ORDER_LINE: {
    label: "Trùng dòng đơn hàng",
    color: "orange",
    icon: "🟠",
  },
  ORDER_REF_STORE_MISMATCH: {
    label: "Mã đơn sai cửa hàng",
    color: "orange",
    icon: "🟠",
  },
  INVALID_QUANTITY: {
    label: "Số lượng không hợp lệ",
    color: "volcano",
    icon: "🔴",
  },
  UNKNOWN_ERROR: {
    label: "Lỗi khác",
    color: "default",
    icon: "⚪",
  },
};
```

Nếu backend trả errorCode chưa map:

- Hiển thị `Lỗi khác`.
- Tooltip hiển thị raw errorCode.

---

# 13. Error Table Columns

| Cột | Data | UI |
|---|---|---|
| Dòng | `rowNumber` | Align center |
| Loại lỗi | `errorCode` | Badge màu |
| Field | `fieldName` | Tag nhỏ |
| Dữ liệu gốc | `rawData` | Monospace, wrap |
| Lý do | `errorReason` | Text chính |

Bảng tối thiểu phải có:

- `rowNumber`
- `errorCode`
- `errorReason`

Khuyến nghị thêm:

- `fieldName`
- `rawData`

---

# 14. Export Button

Nút:

```text
Tải báo cáo
```

Hành vi:

1. Disable khi đang export.
2. Hiển thị spinner.
3. Gọi:

```http
GET /api/imports/{batchId}/errors/export
```

4. Dùng `responseType: "blob"`.
5. Tải file `.xlsx`.
6. Tên file fallback:

```text
import-errors-batch{batchId}.xlsx
```

Nếu response có `Content-Disposition`, ưu tiên filename trong header.

---

# 15. Lưu ý field mapping quan trọng

API upload trả:

```json
"ordersCreated": 42
```

Nếu frontend cũ đang dùng:

```ts
createdOrders
```

thì phải sửa.

Có thể dùng mapper tương thích:

```ts
const normalizeImportSummary = (raw: any): ImportBatchSummary => ({
  batchId: raw.batchId,
  deliveryDate: raw.deliveryDate,
  fileName: raw.fileName,
  totalRows: raw.totalRows,
  acceptedRows: raw.acceptedRows,
  rejectedRows: raw.rejectedRows,
  ordersCreated: raw.ordersCreated ?? raw.createdOrders ?? 0,
  status: raw.status,
  isActive: raw.isActive,
  createdAt: raw.createdAt,
});
```

---

# 16. Implementation Plan

## Bước 1 — Audit backend

Kết luận rõ:

```text
Backend status:
- POST /api/imports: Found / Missing / Mismatch
- GET /api/imports/{batchId}/errors: Found / Missing / Mismatch
- GET /api/imports/{batchId}/errors/export: Found / Missing / Mismatch
- GET /api/imports history: Found / Missing / Mismatch
```

## Bước 2 — Audit frontend

Kết luận rõ:

```text
Frontend status:
- Upload form: Found / Missing
- API service: Found / Missing / Mock only
- Error detail UI: Found / Missing / Incomplete
- Error filter: Found / Missing
- Export button: Found / Missing
- Role guard: Found / Missing
```

## Bước 3 — Implement

Nếu backend API đã có:

- FE gọi API thật.
- Không dùng mock cho phần đã có API.
- Implement service layer.
- Implement error detail UI.
- Implement export blob.

Nếu backend thiếu:

- Ghi rõ thiếu API nào.
- Mock tạm phần thiếu.
- Không bịa endpoint.

## Bước 4 — Verify

Test:

- Upload file `.xlsx`.
- File sai định dạng.
- 409 duplicate date.
- Confirm replace.
- 400 file quá 5.000 dòng.
- Batch có lỗi.
- Filter errorCode.
- Pagination.
- Export blob.
- LOGISTICS_MANAGER read-only.
- SYSTEM_ADMIN read-only.
- Role khác redirect.

---

# 17. Acceptance Criteria

## API Audit

- [ ] Check `POST /api/imports`.
- [ ] Check `GET /api/imports/{batchId}/errors`.
- [ ] Check `GET /api/imports/{batchId}/errors/export`.
- [ ] Check API lịch sử import batch.
- [ ] Ghi rõ API found/missing/mismatch.
- [ ] Không bịa endpoint nếu backend chưa có.

## Upload

- [ ] Upload dùng `multipart/form-data`.
- [ ] Field file là `file`.
- [ ] Field ngày là `deliveryDate`.
- [ ] Field xác nhận là `confirmReplace`.
- [ ] `confirmReplace` mặc định false.
- [ ] 409 duplicate mở dialog.
- [ ] Confirm gọi lại với `confirmReplace=true`.
- [ ] 400 `FILE_TOO_LARGE` hiển thị message từ API.

## Result Summary

- [ ] Hiển thị `batchId`.
- [ ] Hiển thị `deliveryDate`.
- [ ] Hiển thị `fileName`.
- [ ] Hiển thị `totalRows`.
- [ ] Hiển thị `acceptedRows`.
- [ ] Hiển thị `rejectedRows`.
- [ ] Hiển thị `ordersCreated`.
- [ ] Không map sai sang `createdOrders`.

## Error Detail

- [ ] Gọi đúng `GET /api/imports/{batchId}/errors`.
- [ ] Gửi đúng `errorCode`.
- [ ] Gửi đúng `page`.
- [ ] Gửi đúng `size`.
- [ ] Gửi đúng `sort`.
- [ ] Dropdown filter hoạt động.
- [ ] Đổi filter reset page về 0.
- [ ] Table hiển thị `rowNumber`.
- [ ] Table hiển thị `errorCode`.
- [ ] Table hiển thị `fieldName`.
- [ ] Table hiển thị `rawData`.
- [ ] Table hiển thị `errorReason`.
- [ ] Pagination dùng response `pagination`.

## Error Badge

- [ ] Mỗi `errorCode` có badge màu riêng.
- [ ] Badge nhất quán giữa các batch.
- [ ] ErrorCode chưa map hiển thị `Lỗi khác`.

## Export

- [ ] Nút `Tải báo cáo` gọi đúng API export.
- [ ] Request dùng `responseType: "blob"`.
- [ ] File `.xlsx` tải về được.
- [ ] Ưu tiên filename từ `Content-Disposition`.
- [ ] Export lỗi hiển thị toast.

## Permission

- [ ] `DISPATCHER` upload được.
- [ ] `LOGISTICS_MANAGER` không thấy upload.
- [ ] `SYSTEM_ADMIN` không thấy upload.
- [ ] `LOGISTICS_MANAGER` xem được errors.
- [ ] `SYSTEM_ADMIN` xem được errors nếu backend cho phép.
- [ ] Role khác redirect hoặc 403.

---

# 18. Prompt ngắn giao cho AI Coding

```text
Hãy đọc file IMPORT_ERROR_DETAIL_API_AUDIT_AND_FE_SPEC.md.

Đầu tiên, không code ngay. Hãy audit backend và frontend hiện tại:
1. Check backend có POST /api/imports chưa.
2. Check backend có GET /api/imports/{batchId}/errors chưa.
3. Check backend có GET /api/imports/{batchId}/errors/export chưa.
4. Check backend có API lịch sử import batch chưa.
5. Check frontend /dispatcher/import đã làm gì rồi.
6. Check frontend đang mock hay gọi API thật.
7. Check mapping ordersCreated/createdOrders.

Sau audit:
- Nếu backend API đã có, làm FE gọi API thật.
- Nếu FE đã làm rồi, sửa cho đúng contract.
- Nếu FE chưa làm, triển khai phần còn thiếu.
- Nếu backend thiếu API nào, ghi rõ thiếu API đó và chỉ mock tạm phần chưa có.
- Không tạo backend, không bịa endpoint, không thay đổi module không liên quan.

Yêu cầu FE:
- Upload POST /api/imports bằng multipart/form-data.
- Gửi file, deliveryDate, confirmReplace.
- 409 DUPLICATE_DELIVERY_DATE mở dialog xác nhận.
- Xác nhận thì gọi lại với confirmReplace=true.
- 400 FILE_TOO_LARGE hiển thị message từ API.
- Màn hình lỗi gọi GET /api/imports/{batchId}/errors.
- Dropdown lọc theo errorCode.
- Badge màu riêng cho từng errorCode.
- Table hiển thị rowNumber, errorCode, fieldName, rawData, errorReason.
- Pagination dùng response pagination.
- Nút Tải báo cáo gọi GET /api/imports/{batchId}/errors/export với responseType blob.
- LOGISTICS_MANAGER/SYSTEM_ADMIN chỉ xem lịch sử và lỗi, không upload.
```
