# Frontend Specification — Excel Order Import

## 1. Mục tiêu

Xây dựng giao diện nhập đơn hàng từ file Excel tại route:

```text
/dispatcher/import
```

Module cho phép Dispatcher:

- Chọn ngày giao hàng.
- Chọn file Excel `.xlsx`.
- Tải file lên bằng mock service.
- Xem kết quả tổng kết import.
- Xem danh sách chi tiết các dòng lỗi.
- Tải báo cáo lỗi mô phỏng.
- Tải file Excel mẫu.
- Xem lịch sử import.

Phân quyền:

- `DISPATCHER`: được upload và xem lịch sử.
- `LOGISTICS_MANAGER`: chỉ xem lịch sử.
- `SYSTEM_ADMIN`: chỉ xem lịch sử.
- Role khác: redirect khỏi module.

Tài liệu này chỉ yêu cầu triển khai **frontend**.

> Không xây dựng backend, database, API thật, controller, service backend, repository hoặc migration.

---

## 2. Công nghệ đề xuất

- React
- TypeScript
- React Router
- Ant Design
- `dayjs`
- `xlsx` hoặc `exceljs` để tạo file mẫu phía client
- Mock data
- Mock service bằng `Promise` và `setTimeout`

Ưu tiên tái sử dụng layout, component, route convention và design token hiện có trong project.

---

## 3. Phạm vi frontend

Frontend cần triển khai:

- Form chọn ngày giao hàng.
- Upload file `.xlsx`.
- Validate file trước khi mock submit.
- Dialog xác nhận thay thế batch cùng ngày.
- Mock upload và mock import result.
- Summary card sau import.
- Bảng chi tiết dòng lỗi.
- Download file Excel mẫu phía client.
- Download báo cáo lỗi phía client.
- Lịch sử import.
- Chi tiết một batch import.
- Chế độ read-only theo role.
- Loading, validation, error, empty state và toast.

Frontend không cần:

- Upload file lên server thật.
- Parse nghiệp vụ đơn hàng phía backend.
- Kiểm tra Store hoặc SKU trong database.
- Tạo Order thật.
- Gọi endpoint thật.
- Lưu dữ liệu sau khi refresh trình duyệt.
- Xử lý transaction hoặc thay thế batch thật.

---

## 4. Route đề xuất

```text
/dispatcher/import
/dispatcher/import/history/:batchId
```

| Route | Chức năng |
|---|---|
| `/dispatcher/import` | Upload Excel, xem kết quả gần nhất và lịch sử |
| `/dispatcher/import/history/:batchId` | Chi tiết batch import |

Có thể hiển thị chi tiết batch bằng modal hoặc drawer thay cho route con.

---

## 5. Phân quyền giao diện

| Role | Upload | Xem kết quả | Xem lịch sử | Xem chi tiết |
|---|---:|---:|---:|---:|
| `DISPATCHER` | Có | Có | Có | Có |
| `LOGISTICS_MANAGER` | Không | Không | Có | Có |
| `SYSTEM_ADMIN` | Không | Không | Có | Có |
| Role khác | Redirect | Redirect | Redirect | Redirect |

### 5.1 DISPATCHER

Hiển thị:

- Chọn ngày giao hàng.
- Chọn file.
- Tải file mẫu.
- Nút tải lên.
- Kết quả import.
- Danh sách lỗi.
- Lịch sử import.

### 5.2 LOGISTICS_MANAGER và SYSTEM_ADMIN

Ẩn:

- Form chọn ngày.
- File picker.
- Nút tải file mẫu nếu không cần.
- Nút tải lên.
- Dialog thay thế batch.

Chỉ hiển thị:

- Banner read-only.
- Lịch sử import.
- Chi tiết batch.
- Danh sách lỗi của batch.

Banner:

```text
ℹ️ Bạn đang xem lịch sử nhập đơn hàng ở chế độ chỉ đọc.
Chỉ Dispatcher được phép tải file Excel lên hệ thống.
```

### 5.3 Role khác

Redirect về `/403` hoặc dashboard phù hợp với role.

> Phân quyền frontend chỉ nhằm kiểm soát giao diện, không thay thế authorization backend.

---

## 6. TypeScript Types

```ts
export type UserRole =
  | "SYSTEM_ADMIN"
  | "DISPATCHER"
  | "LOGISTICS_MANAGER"
  | "WAREHOUSE_STAFF"
  | "DRIVER";

export interface ImportErrorRow {
  rowNumber: number;
  originalContent: string;
  errorReason: string;
}

export interface ImportResult {
  batchId: number;
  deliveryDate: string;
  fileName: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  createdOrders: number;
  errors: ImportErrorRow[];
}

export interface ImportBatchHistory {
  id: number;
  deliveryDate: string;
  fileName: string;
  uploadedBy: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  createdOrders: number;
  isActive: boolean;
  uploadedAt: string;
}

export interface ImportFormValues {
  deliveryDate: string;
  file: File;
}

export interface ImportMockOptions {
  confirmReplace?: boolean;
}
```

---

## 7. Mock Data

### 7.1 Import result mẫu

```ts
export const mockImportResult: ImportResult = {
  batchId: 9,
  deliveryDate: "2026-03-16",
  fileName: "donhang_16-03.xlsx",
  totalRows: 6,
  acceptedRows: 4,
  rejectedRows: 2,
  createdOrders: 3,
  errors: [
    {
      rowNumber: 5,
      originalContent:
        "DH160325-04, ST-HD-099, REF-SAM-300, 1",
      errorReason:
        'Mã cửa hàng "ST-HD-099" không tồn tại',
    },
    {
      rowNumber: 6,
      originalContent:
        "DH160325-05, ST-Q1-001, ACC-HDMI-2M, 5",
      errorReason:
        'SKU "ACC-HDMI-2M" chưa có trong danh mục sản phẩm',
    },
  ],
};
```

### 7.2 Lịch sử import mẫu

```ts
export const mockImportHistory: ImportBatchHistory[] = [
  {
    id: 9,
    deliveryDate: "2026-03-16",
    fileName: "donhang_16-03.xlsx",
    uploadedBy: "Nguyễn Văn Dispatcher",
    totalRows: 6,
    acceptedRows: 4,
    rejectedRows: 2,
    createdOrders: 3,
    isActive: true,
    uploadedAt: "2026-03-15T14:30:00",
  },
  {
    id: 8,
    deliveryDate: "2026-03-16",
    fileName: "donhang_16-03_v1.xlsx",
    uploadedBy: "Nguyễn Văn Dispatcher",
    totalRows: 5,
    acceptedRows: 3,
    rejectedRows: 2,
    createdOrders: 2,
    isActive: false,
    uploadedAt: "2026-03-15T10:20:00",
  },
  {
    id: 7,
    deliveryDate: "2026-03-15",
    fileName: "donhang_15-03.xlsx",
    uploadedBy: "Trần Minh Anh",
    totalRows: 12,
    acceptedRows: 12,
    rejectedRows: 0,
    createdOrders: 8,
    isActive: true,
    uploadedAt: "2026-03-14T16:10:00",
  },
];
```

---

## 8. Bố cục trang

Trang `/dispatcher/import` gồm:

1. Header.
2. Upload card — chỉ dành cho Dispatcher.
3. Import result — hiển thị sau khi mock upload thành công.
4. Lịch sử import — hiển thị với tất cả role hợp lệ.

Desktop:

```text
┌───────────────────────────────────────────────────────────┐
│ Header                                                    │
├───────────────────────────────────────────────────────────┤
│ Upload Excel Card — chỉ Dispatcher                        │
├───────────────────────────────────────────────────────────┤
│ Import Result — nếu vừa upload                             │
├───────────────────────────────────────────────────────────┤
│ Import History                                            │
└───────────────────────────────────────────────────────────┘
```

Read-only role:

```text
┌───────────────────────────────────────────────────────────┐
│ Header                                                    │
├───────────────────────────────────────────────────────────┤
│ Read-only information banner                              │
├───────────────────────────────────────────────────────────┤
│ Import History                                            │
└───────────────────────────────────────────────────────────┘
```

---

# 9. Màn hình 1 — Tải lên đơn hàng

## 9.1 Header

```text
Nhập đơn hàng từ Excel
Chọn ngày giao hàng và tải file đơn hàng theo đúng định dạng mẫu.
```

## 9.2 Upload Card

```text
┌─────────────────────────────────────────────┐
│ Nhập đơn hàng từ Excel                     │
│                                             │
│ Ngày giao hàng: [16/03/2026 ▾]             │
│ File Excel:     [Chọn file...]              │
│                 📎 donhang_16-03.xlsx       │
│                                             │
│ [Tải xuống file mẫu]       [Tải lên]        │
└─────────────────────────────────────────────┘
```

### Ngày giao hàng

Sử dụng Ant Design `DatePicker`.

Yêu cầu:

- Bắt buộc.
- Format hiển thị `DD/MM/YYYY`.
- Giá trị mock service dùng `YYYY-MM-DD`.
- Có thể disable ngày trong quá khứ nếu phù hợp business rule.

Validation:

```text
Vui lòng chọn ngày giao hàng
```

### File Excel

Sử dụng Ant Design `Upload` hoặc input file tùy chỉnh.

Yêu cầu:

- Chỉ cho chọn một file.
- Chỉ chấp nhận `.xlsx`.
- Không tự upload khi chọn file.
- Hiển thị tên file.
- Cho phép xoá và chọn lại.
- Có thể giới hạn 10 MB.

Validation:

```text
Vui lòng chọn file Excel
Chỉ hỗ trợ file .xlsx
Dung lượng file không được vượt quá 10 MB
```

---

## 9.3 Nút Tải xuống file mẫu

Label:

```text
Tải xuống file mẫu
```

Frontend tạo và download file `.xlsx` phía client.

Tên file:

```text
mau_nhap_don_hang.xlsx
```

Header chuẩn:

| Mã đơn | Mã cửa hàng | SKU | Số lượng |
|---|---|---|---:|

Dữ liệu ví dụ:

| Mã đơn | Mã cửa hàng | SKU | Số lượng |
|---|---|---|---:|
| DH160326-01 | ST-Q1-001 | TV-SAM-55 | 2 |
| DH160326-01 | ST-Q1-001 | ACC-HDMI-2M | 3 |
| DH160326-02 | ST-BT-004 | REF-LG-450 | 1 |

Ví dụ dùng thư viện `xlsx`:

```ts
import * as XLSX from "xlsx";

export const downloadImportTemplate = () => {
  const rows = [
    {
      "Mã đơn": "DH160326-01",
      "Mã cửa hàng": "ST-Q1-001",
      SKU: "TV-SAM-55",
      "Số lượng": 2,
    },
    {
      "Mã đơn": "DH160326-01",
      "Mã cửa hàng": "ST-Q1-001",
      SKU: "ACC-HDMI-2M",
      "Số lượng": 3,
    },
    {
      "Mã đơn": "DH160326-02",
      "Mã cửa hàng": "ST-BT-004",
      SKU: "REF-LG-450",
      "Số lượng": 1,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Orders"
  );

  XLSX.writeFile(
    workbook,
    "mau_nhap_don_hang.xlsx"
  );
};
```

---

## 9.4 Nút Tải lên

Disabled khi:

- Chưa chọn ngày.
- Chưa chọn file.
- File sai định dạng.
- Đang upload.

Khi click:

1. Validate form.
2. Kiểm tra mock xem ngày đã có batch active hay chưa.
3. Nếu chưa có, gọi mock import.
4. Nếu đã có, mở dialog xác nhận thay thế.

---

# 10. Dialog xác nhận thay thế batch

Hiển thị khi ngày đã chọn có batch `isActive=true`.

Tiêu đề:

```text
Ngày 16/03/2026 đã có dữ liệu đơn hàng
```

Nội dung:

```text
Ngày giao hàng này đã có một batch đang hiện hành.

Nếu tiếp tục, batch hiện tại sẽ được đánh dấu là đã thay thế
và dữ liệu từ file mới sẽ trở thành batch hiện hành.

Bạn có chắc chắn muốn tiếp tục?
```

Nút:

```text
Huỷ
Xác nhận thay thế
```

Khi xác nhận:

```ts
uploadOrdersMock(
  deliveryDate,
  file,
  { confirmReplace: true }
);
```

Khi huỷ:

- Đóng dialog.
- Giữ nguyên ngày và file đã chọn.
- Không upload.

---

# 11. Mock Upload Flow

## 11.1 Trạng thái xử lý

Trong lúc mock request:

- Disable DatePicker.
- Disable file picker.
- Disable nút tải lên.
- Hiển thị spinner.
- Hiển thị:

```text
Đang xử lý file, vui lòng đợi...
```

## 11.2 Mock service

```ts
const delay = (ms = 1200) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function uploadOrdersMock(
  deliveryDate: string,
  file: File,
  options: ImportMockOptions = {}
): Promise<ImportResult> {
  await delay();

  const hasActiveBatch = mockImportHistory.some(
    (batch) =>
      batch.deliveryDate === deliveryDate &&
      batch.isActive
  );

  if (
    hasActiveBatch &&
    !options.confirmReplace
  ) {
    throw {
      status: 409,
      code: "ACTIVE_BATCH_EXISTS",
      message:
        "Ngày giao hàng đã có batch hiện hành",
    };
  }

  return {
    ...mockImportResult,
    deliveryDate,
    fileName: file.name,
  };
}
```

Có thể tạo mock case 100% lỗi nếu tên file là:

```text
all-errors.xlsx
```

---

# 12. Màn hình 2 — Kết quả Import

## 12.1 Header

Ví dụ:

```text
✅ Hoàn tất — Batch #9 — 16/03/2026
```

## 12.2 Summary

| Chỉ số | Giá trị |
|---|---:|
| Tổng dòng | `totalRows` |
| Thành công | `acceptedRows` |
| Lỗi | `rejectedRows` |
| Đơn hàng tạo | `createdOrders` |

Có thể dùng bốn `Statistic` card.

## 12.3 Cảnh báo dòng lỗi

Hiện khi:

```ts
rejectedRows > 0
```

Nội dung:

```text
⚠️ 2 dòng lỗi
```

Nút:

```text
Xem danh sách
Tải báo cáo
```

Nếu không có lỗi:

```text
Tất cả các dòng đã được xử lý thành công.
```

## 12.4 Batch 100% lỗi

Điều kiện:

```ts
acceptedRows === 0 &&
createdOrders === 0 &&
rejectedRows === totalRows
```

Hiển thị banner đỏ:

```text
Không có đơn hàng nào được tạo — vui lòng kiểm tra lại file
```

Vẫn cho phép xem và tải báo cáo lỗi.

---

# 13. Bảng chi tiết dòng lỗi

Có thể hiển thị bằng Collapse, Drawer hoặc section expandable.

Cột:

| Cột | Nội dung |
|---|---|
| Dòng | `rowNumber` |
| Nội dung gốc | `originalContent` |
| Lý do lỗi | `errorReason` |

Ví dụ:

| Dòng | Nội dung gốc | Lý do lỗi |
|---:|---|---|
| 5 | DH160325-04, ST-HD-099, REF-SAM-300, 1 | Mã cửa hàng "ST-HD-099" không tồn tại |
| 6 | DH160325-05, ST-Q1-001, ACC-HDMI-2M, 5 | SKU "ACC-HDMI-2M" chưa có trong danh mục sản phẩm |

Yêu cầu UX:

- `rowNumber` rõ ràng.
- Nội dung gốc dùng monospace.
- `errorReason` có icon lỗi.
- Hỗ trợ wrap text.
- Nhiều lỗi thì phân trang.

---

# 14. Tải báo cáo lỗi

Frontend tạo file `.xlsx` từ `errors`.

Tên file:

```text
bao_cao_loi_batch_9.xlsx
```

Header:

| Dòng | Nội dung gốc | Lý do lỗi |
|---|---|---|

Ví dụ:

```ts
export const downloadErrorReport = (
  result: ImportResult
) => {
  const rows = result.errors.map((error) => ({
    Dòng: error.rowNumber,
    "Nội dung gốc": error.originalContent,
    "Lý do lỗi": error.errorReason,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Errors"
  );

  XLSX.writeFile(
    workbook,
    `bao_cao_loi_batch_${result.batchId}.xlsx`
  );
};
```

---

# 15. Màn hình 3 — Lịch sử Import

## 15.1 Header

```text
Lịch sử nhập đơn hàng
Theo dõi các batch Excel đã được tải lên theo ngày giao hàng.
```

## 15.2 Bảng dữ liệu

| Cột | Nội dung |
|---|---|
| Ngày giao hàng | `deliveryDate` |
| Tên file | `fileName` |
| Người tải lên | `uploadedBy` |
| Tổng / Thành công / Lỗi | `totalRows / acceptedRows / rejectedRows` |
| Trạng thái | `isActive` |
| Thời gian tải lên | `uploadedAt` |
| Thao tác | Xem chi tiết |

### Trạng thái

| Giá trị | Label | Màu |
|---|---|---|
| `isActive=true` | Hiện hành | Xanh |
| `isActive=false` | Đã thay thế | Xám |

### Thao tác

```text
Xem chi tiết
```

Tất cả role hợp lệ đều xem được.

### Phân trang

```text
10 / 20 / 50 batch mỗi trang
```

---

# 16. Chi tiết Batch

Hiển thị:

- Batch ID.
- Ngày giao hàng.
- Tên file.
- Người tải lên.
- Thời gian upload.
- Trạng thái.
- Tổng dòng.
- Thành công.
- Lỗi.
- Số đơn hàng tạo.
- Danh sách lỗi.
- Nút tải báo cáo nếu có lỗi.

Màn hình hoàn toàn read-only.

---

# 17. Xử lý lỗi và trạng thái UI

| Tình huống | Hiển thị |
|---|---|
| Đang upload/xử lý | Spinner và `Đang xử lý file, vui lòng đợi...` |
| Chưa chọn ngày | Inline error dưới DatePicker |
| Chưa chọn file | Inline error dưới Upload |
| File sai định dạng | `Chỉ hỗ trợ file .xlsx` |
| File quá dung lượng | `Dung lượng file không được vượt quá 10 MB` |
| Trùng ngày | Dialog xác nhận thay thế |
| Batch 100% lỗi | Banner đỏ |
| Mock upload lỗi | Toast lỗi chung |
| Đang tải lịch sử | Skeleton table hoặc Table loading |
| Không có lịch sử | Empty state |
| Không có quyền upload | Ẩn toàn bộ upload form |
| Role không hợp lệ | Redirect |
| Batch không tồn tại | `404 - Không tìm thấy batch import` |

Toast lỗi chung:

```text
Không thể xử lý file. Vui lòng thử lại.
```

---

# 18. Empty States

## Chưa có lịch sử

```text
Chưa có batch import nào.
```

Với Dispatcher:

```text
Hãy chọn ngày giao hàng và tải file Excel đầu tiên.
```

## Batch không có lỗi

```text
Batch này không có dòng lỗi.
```

---

# 19. Component đề xuất

```text
src/
├── pages/
│   └── dispatcher/
│       └── import/
│           ├── OrderImportPage.tsx
│           ├── ImportBatchDetailPage.tsx
│           └── components/
│               ├── ImportUploadCard.tsx
│               ├── DeliveryDateField.tsx
│               ├── ExcelFilePicker.tsx
│               ├── ReplaceBatchModal.tsx
│               ├── ImportProcessingOverlay.tsx
│               ├── ImportResultCard.tsx
│               ├── ImportSummaryStats.tsx
│               ├── ImportErrorsTable.tsx
│               ├── ImportHistoryTable.tsx
│               ├── ImportStatusTag.tsx
│               └── ImportReadOnlyBanner.tsx
├── mocks/
│   ├── importData.ts
│   └── importService.ts
├── types/
│   └── import.ts
├── utils/
│   ├── importPermissions.ts
│   ├── excelTemplate.ts
│   ├── errorReport.ts
│   └── dateFormat.ts
└── guards/
    └── ImportModuleGuard.tsx
```

---

# 20. Permission Utilities

```ts
export const canUploadOrders = (
  role: UserRole
): boolean => role === "DISPATCHER";
```

```ts
export const canViewImportHistory = (
  role: UserRole
): boolean =>
  [
    "DISPATCHER",
    "LOGISTICS_MANAGER",
    "SYSTEM_ADMIN",
  ].includes(role);
```

---

# 21. File Validation Utility

```ts
export const validateExcelFile = (
  file?: File
): string | null => {
  if (!file) {
    return "Vui lòng chọn file Excel";
  }

  const isXlsx = file.name
    .toLowerCase()
    .endsWith(".xlsx");

  if (!isXlsx) {
    return "Chỉ hỗ trợ file .xlsx";
  }

  const maxSize = 10 * 1024 * 1024;

  if (file.size > maxSize) {
    return "Dung lượng file không được vượt quá 10 MB";
  }

  return null;
};
```

---

# 22. Mock Active Batch Check

```ts
export const findActiveBatchByDate = (
  deliveryDate: string
): ImportBatchHistory | undefined =>
  mockImportHistory.find(
    (batch) =>
      batch.deliveryDate === deliveryDate &&
      batch.isActive
  );
```

Submit flow:

```ts
const handleSubmit = async () => {
  const values = await form.validateFields();

  const activeBatch = findActiveBatchByDate(
    values.deliveryDate
  );

  if (activeBatch) {
    setPendingValues(values);
    setReplaceModalOpen(true);
    return;
  }

  await executeUpload(values, false);
};
```

Confirm replace:

```ts
const handleConfirmReplace = async () => {
  if (!pendingValues) return;

  setReplaceModalOpen(false);

  await executeUpload(
    pendingValues,
    true
  );
};
```

---

# 23. Responsive

## Desktop

- Upload card theo hàng.
- Summary dùng bốn cột.
- History table hiển thị đầy đủ.

## Tablet

- Upload fields wrap.
- Summary dùng hai cột.
- Action chuyển dropdown nếu cần.

## Mobile

- Form một cột.
- DatePicker full width.
- Upload button full width.
- Hai nút action xếp dọc.
- Summary một hoặc hai cột.
- Table horizontal scroll.
- Error table có thể dạng card.
- Drawer full width.

---

# 24. Accessibility và UX

- DatePicker và Upload có label.
- Nút icon có tooltip hoặc `aria-label`.
- Loading ngăn submit lặp.
- Focus vào lỗi đầu tiên.
- Dialog thay thế mặc định focus nút Huỷ.
- Không chỉ dùng màu biểu thị trạng thái.
- Tên file dài có ellipsis và tooltip.
- Cho phép xoá file đã chọn.
- Sau upload thành công, scroll tới result card.
- Giữ kết quả cho đến lần upload tiếp theo.

---

# 25. Acceptance Criteria

## Phân quyền

- [ ] `DISPATCHER` thấy form upload.
- [ ] `DISPATCHER` xem được lịch sử.
- [ ] `LOGISTICS_MANAGER` không thấy form upload.
- [ ] `LOGISTICS_MANAGER` chỉ xem lịch sử.
- [ ] `SYSTEM_ADMIN` không thấy form upload.
- [ ] `SYSTEM_ADMIN` chỉ xem lịch sử.
- [ ] Role khác bị redirect.

## Upload Form

- [ ] Có DatePicker chọn ngày giao hàng.
- [ ] Có file picker.
- [ ] Chỉ chấp nhận một file.
- [ ] File không phải `.xlsx` hiển thị lỗi inline.
- [ ] Chưa chọn ngày không được submit.
- [ ] Chưa chọn file không được submit.
- [ ] Nút submit disabled khi đang xử lý.
- [ ] Có spinner và text xử lý.

## File mẫu

- [ ] Nút tải file mẫu tạo file `.xlsx`.
- [ ] Có header `Mã đơn`.
- [ ] Có header `Mã cửa hàng`.
- [ ] Có header `SKU`.
- [ ] Có header `Số lượng`.
- [ ] Có một vài dòng ví dụ.
- [ ] Không cần backend.

## Trùng ngày

- [ ] Ngày có batch active hiển thị dialog.
- [ ] Chưa xác nhận thì không gọi mock upload.
- [ ] Xác nhận mới upload với `confirmReplace=true`.
- [ ] Huỷ dialog giữ nguyên form.
- [ ] Không upload lặp.

## Kết quả Import

- [ ] Hiển thị batch ID.
- [ ] Hiển thị ngày giao hàng.
- [ ] Hiển thị tổng dòng.
- [ ] Hiển thị số dòng thành công.
- [ ] Hiển thị số dòng lỗi.
- [ ] Hiển thị số đơn hàng tạo.
- [ ] Có nút xem danh sách lỗi.
- [ ] Có nút tải báo cáo lỗi.
- [ ] Batch 100% lỗi hiển thị banner đỏ.

## Danh sách lỗi

- [ ] Hiển thị đúng `rowNumber`.
- [ ] Hiển thị đúng `originalContent`.
- [ ] Hiển thị đúng `errorReason`.
- [ ] Nội dung dài wrap đúng.
- [ ] Có thể tải báo cáo `.xlsx`.
- [ ] Không hard-code số lượng lỗi.

## Lịch sử

- [ ] Hiển thị ngày giao hàng.
- [ ] Hiển thị tên file.
- [ ] Hiển thị người upload.
- [ ] Hiển thị tổng/thành công/lỗi.
- [ ] Hiển thị chip `Hiện hành`.
- [ ] Hiển thị chip `Đã thay thế`.
- [ ] Có thao tác xem chi tiết.
- [ ] Có loading state.
- [ ] Có empty state.
- [ ] Có client-side pagination.

---

# 26. Kết quả đầu ra mong muốn từ AI

AI cần tạo hoặc cập nhật:

- Route configuration.
- Permission guard.
- Upload form.
- DatePicker.
- Excel file picker.
- Replace batch dialog.
- Processing state.
- Import result card.
- Error detail table.
- Error report download.
- Template Excel download.
- Import history table.
- Batch detail.
- Mock data.
- Mock service.
- Responsive UI.
- Loading, error, empty và toast states.

AI không được:

- Tạo backend.
- Tạo API endpoint.
- Tạo database.
- Tạo migration.
- Tạo entity backend.
- Tạo controller.
- Gọi API thật chưa tồn tại.
- Parse nghiệp vụ đơn hàng thật.
- Thay đổi module không liên quan.
- Cho role read-only upload file.
- Hard-code số liệu tổng kết ngoài mock response.

---

# 27. Prompt ngắn giao cho AI Coding

```text
Hãy đọc file ORDER_IMPORT_FRONTEND_SPEC.md và triển khai module
Excel Order Import trong project frontend hiện tại bằng React,
TypeScript, Ant Design và React Router.

Chỉ làm frontend. Không tạo backend, API server, database, entity,
controller, repository hoặc migration.

Sử dụng mock data và mock service bằng Promise/setTimeout để mô phỏng:
- Kiểm tra batch hiện hành theo ngày
- Upload và xử lý file
- Lỗi trùng ngày
- Xác nhận thay thế với confirmReplace=true
- Import thành công
- Import có lỗi
- Import 100% lỗi
- Lịch sử import

Bắt buộc triển khai:
- Route /dispatcher/import
- DISPATCHER được upload và xem lịch sử
- LOGISTICS_MANAGER/SYSTEM_ADMIN chỉ xem lịch sử
- Role khác redirect
- DatePicker ngày giao hàng
- Upload chỉ nhận file .xlsx
- File mẫu .xlsx được tạo phía client với header chuẩn
- Dialog xác nhận nếu ngày có batch active
- Summary kết quả import
- Bảng lỗi gồm rowNumber, originalContent, errorReason
- Tải báo cáo lỗi .xlsx phía client
- Bảng lịch sử import
- Status Hiện hành/Đã thay thế
- Loading, empty, validation, error và responsive states

Tái sử dụng layout, component, route convention và design token hiện có.
Không gọi API thật và không xử lý backend.
```
