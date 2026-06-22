# Frontend Specification — Product Catalog Management

## 1. Mục tiêu

Xây dựng giao diện quản lý danh mục sản phẩm tại route:

```text
/admin/products
```

Điểm đặc trưng quan trọng nhất của màn hình là tính năng **tự động tính thể tích theo thời gian thực** khi người dùng nhập ba chiều:

```text
volume_m3 = (length_cm × width_cm × height_cm) / 1,000,000
```

Tài liệu này chỉ yêu cầu triển khai **giao diện frontend**.

> Không xây dựng backend, database, API thực tế, authentication thực tế hoặc server-side calculation trong phạm vi task này.

---

## 2. Phạm vi frontend

### 2.1 Công nghệ ưu tiên

- React
- TypeScript
- Ant Design
- React Router
- Có thể sử dụng CSS Module, SCSS hoặc style hiện có của dự án
- Ưu tiên tái sử dụng component, layout, typography và design token đang có trong project

### 2.2 Chỉ triển khai phía client

Frontend cần:

- Hiển thị danh sách sản phẩm bằng mock data
- Tìm kiếm và lọc dữ liệu ở client
- Mở form thêm hoặc chỉnh sửa sản phẩm
- Tự động tính preview thể tích
- Hiển thị chi tiết sản phẩm
- Hiển thị dialog xác nhận vô hiệu hoá hoặc kích hoạt
- Giả lập trạng thái loading, submit, success và error
- Ẩn hoặc hiện thao tác theo role được truyền từ mock user hoặc context hiện có

Frontend không cần:

- Gọi API thật
- Tạo endpoint
- Viết controller, service hoặc repository backend
- Kết nối database
- Xử lý token hoặc phân quyền phía server
- Upload hoặc import file Excel
- Tính toán volume phía server
- Lưu dữ liệu sau khi refresh trình duyệt

Có thể tạo một lớp mock service dùng `Promise` và `setTimeout` để mô phỏng response.

---

## 3. Phân quyền giao diện

| Role | Quyền trên màn hình |
|---|---|
| `SYSTEM_ADMIN` | Xem danh sách, xem chi tiết, thêm, sửa, vô hiệu hoá và kích hoạt sản phẩm |
| `DISPATCHER` | Chỉ xem danh sách và chi tiết |
| `LOGISTICS_MANAGER` | Chỉ xem danh sách và chi tiết |
| `WAREHOUSE_STAFF` | Chỉ xem danh sách và chi tiết |

### 3.1 Quy tắc hiển thị theo role

Với `SYSTEM_ADMIN`:

- Hiện nút `+ Thêm sản phẩm`
- Hiện nút `Sửa`
- Hiện nút `Vô hiệu hoá` hoặc `Kích hoạt`
- Cho phép truy cập form thêm và chỉnh sửa

Với các role read-only:

- Không hiện nút `+ Thêm sản phẩm`
- Không hiện nút `Sửa`
- Không hiện nút `Vô hiệu hoá`
- Không hiện nút `Kích hoạt`
- Vẫn cho phép mở màn hình chi tiết sản phẩm
- Nếu người dùng truy cập trực tiếp route form bằng URL, frontend phải hiển thị trang `403` hoặc điều hướng về `/admin/products`

> Đây chỉ là kiểm soát hiển thị frontend, không thay thế phân quyền backend.

---

## 4. Cấu trúc route đề xuất

```text
/admin/products
/admin/products/new
/admin/products/:productId
/admin/products/:productId/edit
```

| Route | Chức năng |
|---|---|
| `/admin/products` | Danh sách sản phẩm |
| `/admin/products/new` | Thêm sản phẩm |
| `/admin/products/:productId` | Chi tiết sản phẩm |
| `/admin/products/:productId/edit` | Chỉnh sửa sản phẩm |

---

## 5. Kiểu dữ liệu frontend

```ts
export type ProductStatus = "ACTIVE" | "INACTIVE";

export interface Product {
  id: string;
  sku: string;
  productName: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  volumeM3: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export type UserRole =
  | "SYSTEM_ADMIN"
  | "DISPATCHER"
  | "LOGISTICS_MANAGER"
  | "WAREHOUSE_STAFF";
```

---

## 6. Mock data mẫu

```ts
export const mockProducts: Product[] = [
  {
    id: "product-001",
    sku: "TV-SAM-55",
    productName: "Samsung Smart TV 55 inch",
    lengthCm: 135,
    widthCm: 18,
    heightCm: 82,
    weightKg: 28.5,
    volumeM3: 0.19926,
    status: "ACTIVE",
    createdAt: "2026-06-10T08:30:00",
    updatedAt: "2026-06-20T14:15:00",
  },
  {
    id: "product-002",
    sku: "REF-LG-450",
    productName: "LG Refrigerator 450L",
    lengthCm: 78,
    widthCm: 74,
    heightCm: 178,
    weightKg: 82,
    volumeM3: 1.027416,
    status: "ACTIVE",
    createdAt: "2026-06-11T09:00:00",
    updatedAt: "2026-06-19T10:20:00",
  },
  {
    id: "product-003",
    sku: "WM-PANA-10",
    productName: "Panasonic Washing Machine 10kg",
    lengthCm: 65,
    widthCm: 70,
    heightCm: 105,
    weightKg: 48,
    volumeM3: 0.47775,
    status: "INACTIVE",
    createdAt: "2026-06-12T11:10:00",
    updatedAt: "2026-06-18T16:40:00",
  },
];
```

> Lưu ý: `135 × 18 × 82 / 1,000,000 = 0.199260 m³`. Frontend phải tính theo công thức, không hard-code kết quả.

---

# 7. Màn hình 1 — Danh sách sản phẩm

## 7.1 Tiêu đề màn hình

```text
Danh mục sản phẩm
Quản lý thông tin và thông số vật lý của các sản phẩm giao vận.
```

## 7.2 Thanh công cụ

Bao gồm:

- Ô tìm kiếm
- Bộ lọc trạng thái
- Nút `+ Thêm sản phẩm` chỉ dành cho `SYSTEM_ADMIN`

### Ô tìm kiếm

Placeholder:

```text
Tìm theo SKU hoặc tên sản phẩm
```

Yêu cầu:

- Tìm kiếm theo `sku`
- Tìm kiếm theo `productName`
- Không phân biệt chữ hoa và chữ thường
- Hỗ trợ partial match
- Có thể debounce khoảng 300 ms hoặc lọc trực tiếp trên mock data

### Bộ lọc trạng thái

Các lựa chọn:

```text
Tất cả
Đang kinh doanh
Ngừng kinh doanh
```

Mapping:

```ts
ALL
ACTIVE
INACTIVE
```

## 7.3 Bảng dữ liệu

| Cột | Nội dung |
|---|---|
| SKU | `sku` |
| Tên sản phẩm | `productName` |
| Trọng lượng | `weightKg` + ` kg` |
| Thể tích | `volumeM3` + ` m³` |
| Trạng thái | Status chip |
| Thao tác | Xem chi tiết, sửa, vô hiệu hoá hoặc kích hoạt |

### Định dạng dữ liệu

- Trọng lượng hiển thị 3 chữ số thập phân, ví dụ `28.500 kg`
- Thể tích hiển thị 6 chữ số thập phân, ví dụ `0.199260 m³`

### Status chip

| Status | Label | Màu |
|---|---|---|
| `ACTIVE` | Đang kinh doanh | Xanh |
| `INACTIVE` | Ngừng kinh doanh | Xám |

### Thao tác từng dòng

Luôn hiển thị:

- `Xem chi tiết`

Chỉ hiển thị với `SYSTEM_ADMIN`:

- `Sửa`
- `Vô hiệu hoá` khi sản phẩm đang `ACTIVE`
- `Kích hoạt` khi sản phẩm đang `INACTIVE`

Có thể sử dụng:

- Button dạng text
- Dropdown action
- Icon button có tooltip

## 7.4 Phân trang

Triển khai phân trang phía client.

Gợi ý:

```text
10 / 20 / 50 sản phẩm mỗi trang
```

Hiển thị tổng số bản ghi:

```text
Tổng cộng 24 sản phẩm
```

## 7.5 Trạng thái UI

### Loading

Hiển thị:

- Skeleton table
- Hoặc Ant Design Table với thuộc tính `loading`

### Không có dữ liệu tìm kiếm

Hiển thị empty state:

```text
Không tìm thấy sản phẩm phù hợp
```

Có nút phụ:

```text
Xoá bộ lọc
```

### Danh mục chưa có sản phẩm

Với admin:

```text
Danh mục chưa có sản phẩm.
Hãy thêm sản phẩm đầu tiên để bắt đầu quản lý.
```

Nút:

```text
+ Thêm sản phẩm
```

Với read-only role:

```text
Danh mục chưa có sản phẩm.
```

---

# 8. Màn hình 2 — Form thêm hoặc chỉnh sửa sản phẩm

## 8.1 Tiêu đề

Chế độ thêm:

```text
Thêm sản phẩm
Khai báo thông tin và kích thước bao bì của sản phẩm.
```

Chế độ chỉnh sửa:

```text
Chỉnh sửa sản phẩm
Cập nhật thông tin và thông số vật lý của sản phẩm.
```

## 8.2 Bố cục tổng thể

Chia thành hai card hoặc hai section:

1. Thông tin cơ bản
2. Thông số vật lý

Footer form gồm:

- `Huỷ`
- `Thêm sản phẩm` hoặc `Lưu thay đổi`

---

## 8.3 Nhóm 1 — Thông tin cơ bản

### SKU

Loại field:

```text
Text input
```

Yêu cầu:

- Bắt buộc
- Tự động chuyển thành uppercase khi nhập
- Loại bỏ khoảng trắng ở đầu và cuối
- Không cho nhập toàn khoảng trắng
- Readonly hoặc disabled khi chỉnh sửa
- Có thể cho phép ký tự `A-Z`, `0-9`, dấu gạch ngang `-` và dấu gạch dưới `_`

Label:

```text
SKU
```

Placeholder:

```text
Ví dụ: TV-SAM-55
```

Validation:

```text
Vui lòng nhập SKU
```

Khi mock response trả lỗi trùng SKU `409`:

```text
SKU này đã tồn tại trong danh mục
```

Lỗi phải hiển thị inline ngay dưới field SKU.

### Tên sản phẩm

Loại field:

```text
Text input
```

Yêu cầu:

- Bắt buộc
- Trim khoảng trắng
- Gợi ý giới hạn từ 1 đến 200 ký tự

Label:

```text
Tên sản phẩm
```

Placeholder:

```text
Nhập tên sản phẩm
```

Validation:

```text
Vui lòng nhập tên sản phẩm
```

---

## 8.4 Nhóm 2 — Thông số vật lý

Bố cục desktop hai cột:

```text
┌─────────────────────────────┬─────────────────────────────┐
│ Dài (cm)                    │ Trọng lượng (kg)            │
│ Rộng (cm)                   │                             │
│ Cao (cm)                    │                             │
├─────────────────────────────┴─────────────────────────────┤
│ Thể tích (m³) — readonly                                  │
└───────────────────────────────────────────────────────────┘
```

Bố cục mobile:

- Chuyển thành một cột
- Thứ tự:
  1. Dài
  2. Rộng
  3. Cao
  4. Trọng lượng
  5. Thể tích

### Dài

Field:

```text
InputNumber
```

Tên dữ liệu:

```ts
lengthCm
```

Validation:

- Bắt buộc
- Phải là số
- Phải lớn hơn `0`

Thông báo:

```text
Vui lòng nhập chiều dài
Giá trị phải lớn hơn 0
```

### Rộng

Field:

```text
InputNumber
```

Tên dữ liệu:

```ts
widthCm
```

Validation:

- Bắt buộc
- Phải lớn hơn `0`

Thông báo:

```text
Vui lòng nhập chiều rộng
Giá trị phải lớn hơn 0
```

### Cao

Field:

```text
InputNumber
```

Tên dữ liệu:

```ts
heightCm
```

Validation:

- Bắt buộc
- Phải lớn hơn `0`

Thông báo:

```text
Vui lòng nhập chiều cao
Giá trị phải lớn hơn 0
```

### Trọng lượng

Field:

```text
InputNumber
```

Tên dữ liệu:

```ts
weightKg
```

Validation:

- Bắt buộc
- Phải lớn hơn `0`

Thông báo:

```text
Vui lòng nhập trọng lượng
Giá trị phải lớn hơn 0
```

---

## 8.5 Tự động tính thể tích

### Công thức

```ts
const volumeM3 =
  (lengthCm * widthCm * heightCm) / 1_000_000;
```

### Hành vi

Khi admin thay đổi một trong ba field:

- `lengthCm`
- `widthCm`
- `heightCm`

Frontend phải:

1. Đọc giá trị mới nhất của cả ba chiều
2. Kiểm tra cả ba đều là số hợp lệ và lớn hơn `0`
3. Tính thể tích ngay lập tức
4. Hiển thị kết quả trong field `Thể tích`
5. Không cần nhấn nút submit
6. Không cho người dùng chỉnh sửa field thể tích

### Field thể tích

Label:

```text
Thể tích (m³)
```

Yêu cầu:

- Readonly
- Không bind như một input người dùng có thể chỉnh sửa
- Hiển thị 6 chữ số thập phân
- Có suffix `m³`

Ví dụ:

```text
0.199260 m³
```

Khi thiếu một trong ba chiều:

```text
—
```

Không hiển thị `0.000000` nếu dữ liệu chưa đầy đủ.

### Hint text

Hiển thị ngay dưới field thể tích:

```text
💡 Nhập kích thước bao bì thực tế, bao gồm hộp đóng gói,
không phải kích thước sản phẩm trần.
```

### Lưu ý frontend-only

Khi submit, frontend chỉ gửi:

```ts
{
  sku,
  productName,
  lengthCm,
  widthCm,
  heightCm,
  weightKg
}
```

Không gửi `volumeM3` như dữ liệu đáng tin cậy.

Trong mock service, có thể tính lại `volumeM3` từ ba chiều để mô phỏng hành vi backend.

---

## 8.6 Submit form

### Chế độ thêm mới

Nút:

```text
Thêm sản phẩm
```

Khi mock submit thành công:

```text
Sản phẩm [TV-SAM-55] đã được thêm vào danh mục
```

Sau đó:

- Điều hướng về `/admin/products`
- Refresh danh sách từ mock state

### Chế độ chỉnh sửa

Nút:

```text
Lưu thay đổi
```

Khi mock submit thành công:

```text
Thông tin sản phẩm đã được lưu
```

Sau đó:

- Điều hướng về màn hình chi tiết hoặc danh sách
- Dữ liệu hiển thị phải dùng thể tích được tính lại từ kích thước mới

### Trạng thái đang submit

- Disable toàn bộ nút submit
- Hiển thị spinner
- Không cho submit lặp lại
- Có thể disable nút huỷ trong lúc đang submit để tránh trạng thái không nhất quán

### Mock lỗi SKU trùng

Có thể giả lập lỗi khi SKU nhập là:

```text
TV-SAM-55
```

và SKU này đã tồn tại trong mock data.

Mock service trả:

```ts
{
  status: 409,
  field: "sku",
  message: "SKU này đã tồn tại trong danh mục"
}
```

Frontend phải map lỗi vào đúng field SKU.

---

# 9. Màn hình 3 — Chi tiết sản phẩm

## 9.1 Header

Hiển thị:

- Nút quay lại
- Tên sản phẩm
- SKU
- Status chip
- Nút `Sửa` chỉ dành cho `SYSTEM_ADMIN`
- Nút `Vô hiệu hoá` hoặc `Kích hoạt` chỉ dành cho `SYSTEM_ADMIN`

---

## 9.2 Card 1 — Thông tin sản phẩm

Tiêu đề:

```text
Thông tin sản phẩm
```

Các field:

| Field | Nội dung |
|---|---|
| SKU | Mã SKU |
| Tên sản phẩm | Tên đầy đủ |
| Trạng thái | Status chip |
| Ngày tạo | Định dạng `DD/MM/YYYY HH:mm` |
| Ngày cập nhật cuối | Định dạng `DD/MM/YYYY HH:mm` |

Có thể dùng:

- Ant Design `Descriptions`
- Grid thông tin
- Definition list

---

## 9.3 Card 2 — Thông số vật lý

Tiêu đề:

```text
Thông số vật lý (per unit)
```

Nội dung:

```text
Kích thước : 135 × 18 × 82 cm
Thể tích   : 0.199260 m³
Trọng lượng: 28.500 kg
```

Yêu cầu format:

- Kích thước dùng ký hiệu `×`
- Thể tích 6 chữ số thập phân
- Trọng lượng 3 chữ số thập phân

---

## 9.4 Ví dụ tích luỹ

Hiển thị trong card thông số vật lý.

Tiêu đề phụ:

```text
Ví dụ tích luỹ
```

Công thức:

```ts
const accumulatedVolume = volumeM3 * quantity;
const accumulatedWeight = weightKg * quantity;
```

Các quantity cố định:

```ts
10
20
```

Ví dụ:

```text
10 cái → 1.993 m³ · 285.000 kg
20 cái → 3.985 m³ · 570.000 kg
```

Yêu cầu:

- Thể tích tích luỹ hiển thị 3 chữ số thập phân
- Trọng lượng tích luỹ hiển thị 3 chữ số thập phân
- Luôn tính từ dữ liệu sản phẩm hiện tại
- Khi kích thước hoặc trọng lượng thay đổi, phần này phải cập nhật theo dữ liệu mới sau khi lưu mock state

> Không hard-code giá trị ví dụ. Phải tính từ `volumeM3` và `weightKg`.

---

# 10. Dialog vô hiệu hoá sản phẩm

## 10.1 Điều kiện hiển thị

Chỉ `SYSTEM_ADMIN` được mở dialog.

## 10.2 Nội dung dialog

Tiêu đề:

```text
Vô hiệu hoá sản phẩm "TV-SAM-55"?
```

Nội dung:

```text
Sản phẩm này sẽ không còn được chấp nhận trong file Excel đơn hàng.
Các đơn hàng lịch sử sử dụng sản phẩm này vẫn được giữ nguyên.
```

Nút:

```text
Xác nhận vô hiệu hoá
Huỷ
```

Nút xác nhận nên dùng danger style.

## 10.3 Khi xác nhận

- Hiển thị loading trên nút xác nhận
- Giả lập request bằng Promise
- Cập nhật status mock từ `ACTIVE` thành `INACTIVE`
- Đóng dialog
- Hiển thị toast:

```text
Sản phẩm đã được vô hiệu hoá
```

---

# 11. Dialog kích hoạt sản phẩm

Tiêu đề:

```text
Kích hoạt lại sản phẩm "TV-SAM-55"?
```

Nội dung:

```text
Sản phẩm sẽ được phép sử dụng lại trong các đơn hàng mới.
```

Nút:

```text
Xác nhận kích hoạt
Huỷ
```

Khi thành công:

```text
Sản phẩm đã được kích hoạt
```

---

# 12. Xử lý lỗi và trạng thái UI

| Tình huống | Hiển thị |
|---|---|
| Đang tải danh sách | Skeleton loader hoặc table loading |
| Không có kết quả tìm kiếm | `Không tìm thấy sản phẩm phù hợp` |
| SKU trùng | Lỗi inline dưới field SKU |
| Chiều bằng 0 hoặc âm | `Giá trị phải lớn hơn 0` |
| Trọng lượng bằng 0 hoặc âm | `Giá trị phải lớn hơn 0` |
| Một chiều bị bỏ trống | Field thể tích hiển thị `—` |
| Submit đang chờ response | Nút disabled và có spinner |
| Không tìm thấy productId | Trang `404 - Không tìm thấy sản phẩm` |
| Role không có quyền vào form | Trang `403 - Bạn không có quyền thực hiện thao tác này` |
| Mock service thất bại | Toast `Đã xảy ra lỗi. Vui lòng thử lại.` |

---

# 13. Component đề xuất

```text
src/
├── pages/
│   └── admin/
│       └── products/
│           ├── ProductListPage.tsx
│           ├── ProductFormPage.tsx
│           ├── ProductDetailPage.tsx
│           └── components/
│               ├── ProductTable.tsx
│               ├── ProductFilters.tsx
│               ├── ProductStatusTag.tsx
│               ├── ProductBasicInfoCard.tsx
│               ├── ProductPhysicalInfoCard.tsx
│               ├── ProductForm.tsx
│               ├── VolumePreviewField.tsx
│               ├── AccumulationExamples.tsx
│               ├── DeactivateProductModal.tsx
│               └── ActivateProductModal.tsx
├── mocks/
│   ├── productData.ts
│   └── productService.ts
├── types/
│   └── product.ts
└── utils/
    ├── productCalculations.ts
    └── numberFormat.ts
```

---

# 14. Utility function đề xuất

```ts
export const calculateVolumeM3 = (
  lengthCm?: number,
  widthCm?: number,
  heightCm?: number
): number | null => {
  if (
    lengthCm == null ||
    widthCm == null ||
    heightCm == null ||
    lengthCm <= 0 ||
    widthCm <= 0 ||
    heightCm <= 0
  ) {
    return null;
  }

  return (lengthCm * widthCm * heightCm) / 1_000_000;
};
```

```ts
export const formatVolume = (value: number): string =>
  `${value.toFixed(6)} m³`;

export const formatWeight = (value: number): string =>
  `${value.toFixed(3)} kg`;

export const calculateAccumulation = (
  volumeM3: number,
  weightKg: number,
  quantity: number
) => ({
  volumeM3: volumeM3 * quantity,
  weightKg: weightKg * quantity,
});
```

---

# 15. Mock service đề xuất

```ts
const delay = (ms = 600) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function createProductMock(
  payload: Omit<
    Product,
    "id" | "volumeM3" | "status" | "createdAt" | "updatedAt"
  >
): Promise<Product> {
  await delay();

  const duplicated = mockProducts.some(
    (product) => product.sku === payload.sku
  );

  if (duplicated) {
    throw {
      status: 409,
      field: "sku",
      message: "SKU này đã tồn tại trong danh mục",
    };
  }

  const volumeM3 =
    (payload.lengthCm * payload.widthCm * payload.heightCm) /
    1_000_000;

  return {
    ...payload,
    id: crypto.randomUUID(),
    volumeM3,
    status: "ACTIVE",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
```

> Mock service chỉ dùng để trình diễn frontend. Không coi đây là backend thật.

---

# 16. Yêu cầu responsive

## Desktop

- Toolbar tìm kiếm và bộ lọc nằm cùng hàng
- Form thông số vật lý dùng hai cột
- Bảng hiển thị đầy đủ cột
- Detail page hiển thị hai card rõ ràng

## Tablet

- Toolbar được wrap nếu thiếu không gian
- Form có thể giữ hai cột nếu đủ rộng
- Action có thể chuyển sang dropdown

## Mobile

- Toolbar chuyển sang dạng dọc
- Form chuyển một cột
- Table cho phép horizontal scroll
- Có thể ẩn cột ngày hoặc đưa action vào dropdown
- Nút submit có thể full width

---

# 17. Accessibility và UX

- Mọi input phải có label
- Nút icon phải có tooltip hoặc `aria-label`
- Không chỉ dùng màu sắc để thể hiện trạng thái
- Dialog phải focus đúng khi mở
- Nút submit phải phản ánh trạng thái loading
- Readonly volume phải có style khác input thường
- Thông báo lỗi phải nằm gần field liên quan
- Khi submit lỗi, scroll hoặc focus đến field lỗi đầu tiên
- Hỗ trợ thao tác bằng bàn phím cơ bản

---

# 18. Acceptance Criteria

## Danh sách sản phẩm

- [ ] Route `/admin/products` hiển thị danh sách từ mock data
- [ ] Tìm kiếm theo SKU hoặc tên sản phẩm hoạt động
- [ ] Tìm kiếm hỗ trợ partial match
- [ ] Filter trạng thái hoạt động
- [ ] Trạng thái sản phẩm hiển thị đúng chip
- [ ] Có loading state
- [ ] Có empty state
- [ ] Có phân trang client-side

## Phân quyền giao diện

- [ ] `SYSTEM_ADMIN` thấy nút thêm, sửa, vô hiệu hoá và kích hoạt
- [ ] `DISPATCHER` chỉ xem
- [ ] `LOGISTICS_MANAGER` chỉ xem
- [ ] `WAREHOUSE_STAFF` chỉ xem
- [ ] Read-only role không thấy nút thêm
- [ ] Read-only role không thấy nút sửa
- [ ] Read-only role không thấy nút vô hiệu hoá hoặc kích hoạt
- [ ] Read-only role truy cập trực tiếp route form sẽ bị chặn ở frontend

## Form sản phẩm

- [ ] SKU bắt buộc
- [ ] SKU tự động uppercase
- [ ] SKU readonly khi chỉnh sửa
- [ ] Tên sản phẩm bắt buộc
- [ ] Dài, rộng, cao và trọng lượng phải lớn hơn `0`
- [ ] Lỗi validation hiển thị inline
- [ ] Mock lỗi SKU trùng hiển thị dưới field SKU
- [ ] Submit loading làm nút disabled và hiện spinner

## Auto-calculate volume

- [ ] Preview volume cập nhật real-time khi đổi chiều dài
- [ ] Preview volume cập nhật real-time khi đổi chiều rộng
- [ ] Preview volume cập nhật real-time khi đổi chiều cao
- [ ] Công thức là `(length × width × height) / 1,000,000`
- [ ] Field thể tích là readonly
- [ ] Không cho nhập tay vào field thể tích
- [ ] Khi thiếu một chiều, field thể tích hiển thị `—`
- [ ] Khi giá trị không hợp lệ, không hiển thị preview sai
- [ ] Mock service tính lại volume từ ba chiều khi submit
- [ ] Sau khi chỉnh sửa kích thước, volume mới hiển thị đúng

## Chi tiết sản phẩm

- [ ] Hiển thị SKU, tên, trạng thái, ngày tạo và ngày cập nhật
- [ ] Hiển thị kích thước theo định dạng `Dài × Rộng × Cao cm`
- [ ] Hiển thị volume với 6 chữ số thập phân
- [ ] Hiển thị weight với 3 chữ số thập phân
- [ ] Ví dụ tích luỹ tính đúng cho quantity `10`
- [ ] Ví dụ tích luỹ tính đúng cho quantity `20`
- [ ] Giá trị tích luỹ không được hard-code

## Vô hiệu hoá và kích hoạt

- [ ] Chỉ admin thấy thao tác
- [ ] Dialog xác nhận hiển thị đúng nội dung
- [ ] Nút xác nhận có loading state
- [ ] Status mock được cập nhật sau thao tác
- [ ] Hiển thị toast thành công

---

# 19. Kết quả đầu ra mong muốn từ AI code

AI cần tạo hoặc cập nhật:

- Các page cần thiết
- Các component dùng chung
- Route
- TypeScript interface
- Mock data
- Mock service
- Client-side role guard
- Validation form
- Real-time volume preview
- Detail card và accumulation examples
- Loading, empty, error và success states
- Responsive layout

AI không được:

- Tạo backend
- Tạo API server
- Tạo migration database
- Tạo entity backend
- Thay đổi cấu trúc backend
- Giả định endpoint chưa được cung cấp
- Viết logic phân quyền server
- Gửi `volumeM3` như dữ liệu người dùng tự nhập
- Hard-code kết quả volume hoặc accumulation

---

# 20. Prompt ngắn giao cho AI coding

```text
Hãy triển khai module Product Catalog Management theo tài liệu này bằng React,
TypeScript và Ant Design trong project frontend hiện tại.

Chỉ làm frontend. Không tạo backend, API, database hoặc server.

Sử dụng mock data và mock service có Promise/setTimeout để mô phỏng loading,
success, lỗi 409 trùng SKU, deactivate và activate.

Bắt buộc triển khai:
- Product list
- Search theo SKU hoặc tên
- Status filter
- Client-side pagination
- Product create/edit form
- SKU uppercase và readonly khi edit
- Validation số lớn hơn 0
- Volume preview real-time:
  (lengthCm * widthCm * heightCm) / 1_000_000
- Volume field readonly
- Product detail
- Accumulation examples cho 10 và 20 sản phẩm
- UI permissions theo role
- Loading, empty, error, success và responsive states

Hãy tái sử dụng layout, component, route convention và design token đang có
trong project. Không hard-code volume hoặc accumulated values.
```
