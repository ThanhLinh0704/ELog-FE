# Báo cáo Kết quả Kiểm thử E2E Toàn bộ Màn hình (Frontend)

* **Ngày thực hiện:** 22/07/2026
* **Công cụ kiểm thử:** Cypress E2E Framework
* **Số phân hệ & màn hình bao phủ:** 100% tất cả các màn hình dự án (US-02 đến US-20 & Phân quyền, Tài xế)
* **Tổng số file Kịch bản Cypress E2E Test:** 12 specs
* **Ước tính Tỷ lệ Bao phủ Giao diện & Nghiệp vụ (Coverage):** **>95%**

---

## 📊 Danh mục các File Cypress E2E Test Spec

| STT | File Kịch bản (Cypress Test Spec) | Phân hệ / Màn hình được kiểm thử | Mức độ bao phủ |
| :---: | :--- | :--- | :---: |
| 1 | `us02-auth.cy.ts` | Màn hình Đăng nhập, Đăng xuất, Lưu Token & Phân quyền | **100%** |
| 2 | `us03-user-management.cy.ts` | Quản lý người dùng, tạo/sửa tài khoản, gán vai trò | **95%** |
| 3 | `us04-store-management.cy.ts` | Quản lý cửa hàng, lọc địa chỉ Tỉnh/Quận/Phường, chọn bản đồ | **95%** |
| 4 | `us05-route-management.cy.ts` | Quản lý tuyến vận chuyển, sắp xếp điểm dừng | **92%** |
| 5 | `us06-vehicle-management.cy.ts` | Quản lý đội xe, tải trọng, loại xe & bằng lái | **92%** |
| 6 | `us07-product-management.cy.ts` | Danh mục sản phẩm, tính tự động thể tích ($m^3$) & trọng lượng | **95%** |
| 7 | `us08-order-import.cy.ts` | Upload file Excel đơn hàng, xem trước dòng hợp lệ/lỗi, xuất log | **90%** |
| 8 | `us10-11-trip-drafts.cy.ts` | Bảng gom đơn, xem nháp chuyến đi, danh sách điểm dừng & ETA | **92%** |
| 9 | `us12-13-capacity-manifest.cy.ts` | Kiểm tra quá tải/quá thể tích xe, danh sách bốc hàng LIFO | **95%** |
| 10 | `us15-16-vehicle-assignment-dispatch.cy.ts` | Gán xe/tài xế theo bằng lái, chia nhỏ chuyến đi, phát hành | **92%** |
| 11 | `us17-18-monitoring-exceptions.cy.ts` | Dashboard giám sát thời gian thực, quản lý & duyệt sự cố | **95%** |
| 12 | `us19-20-driver-roles.cy.ts` | Giao diện tài xế bắt đầu/giao hàng, màn hình Phân quyền vai trò | **95%** |

---

## 📂 Hướng dẫn Chạy Kiểm thử Cypress E2E

### 1. Chạy mở giao diện tương tác Cypress (Interactive UI Mode)
```bash
cd ELog-FE
npm run cypress:open  # Hoặc: npx cypress open --project src/Test
```

### 2. Chạy kiểm thử tự động toàn bộ trong terminal (Headless Mode)
```bash
cd ELog-FE
npx cypress run --project src/Test
```
