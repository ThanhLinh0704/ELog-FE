# Hướng dẫn chạy E2E Test — US-02 Authentication

## Yêu cầu trước khi chạy

| # | Yêu cầu | Kiểm tra |
|---|---------|----------|
| 1 | Node.js >= 18 | `node -v` |
| 2 | Frontend đang chạy tại `http://localhost:5173` | `npm run dev` ở thư mục gốc |
| 3 | Backend đang chạy tại `http://localhost:8080` | Kiểm tra Spring Boot |
| 4 | Tài khoản test đã có trong DB | Xem mục "Chuẩn bị dữ liệu" bên dưới |

---

## Chuẩn bị dữ liệu test

Cần 3 tài khoản trong DB trước khi chạy test:

| Username | Password | Role | Trạng thái |
|----------|----------|------|------------|
| `admin` | `Admin@2025` | SYSTEM_ADMIN | active (có sẵn) |
| `driver01` | `Driver@2025` | DRIVER | active |
| `locked_user` | `Locked@2025` | DISPATCHER | **inactive** |

Chạy script SQL sau để tạo `driver01` và `locked_user` (thay hash bằng hash BCrypt thật):

```sql
-- Lấy hash BCrypt bằng Java:
-- System.out.println(new BCryptPasswordEncoder(12).encode("Driver@2025"));
-- System.out.println(new BCryptPasswordEncoder(12).encode("Locked@2025"));

INSERT IGNORE INTO roles (name) VALUES ('DRIVER'), ('DISPATCHER');

INSERT INTO users (username, password_hash, full_name, email, is_active)
VALUES ('driver01', '<BCrypt_Driver@2025>', 'Driver Test', 'driver01@elog.vn', true);

INSERT INTO users (username, password_hash, full_name, email, is_active)
VALUES ('locked_user', '<BCrypt_Locked@2025>', 'Locked User Test', 'locked@elog.vn', false);

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'driver01' AND r.name = 'DRIVER';

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'locked_user' AND r.name = 'DISPATCHER';
```

> **Lưu ý:** Các test dùng `cy.intercept()` để mock API nên **không cần backend thật** để chạy TC-01 đến TC-03 và các test Validation. Chỉ TC-04 đến TC-09 mới cần backend thật.

---

## Cài đặt

Folder `src/Test/` là một project độc lập. Chạy lệnh sau **một lần duy nhất**:

```bash
cd src/Test
npm install
```

---

## Chạy test

### Cách 1 — Giao diện đồ họa (khuyên dùng khi dev)

```bash
cd src/Test
npm run cy:open
```

1. Cypress mở ra, chọn **E2E Testing**
2. Chọn trình duyệt (Chrome khuyên dùng)
3. Click vào file `us02-auth.cy.ts`
4. Test chạy trực tiếp trên trình duyệt, thấy từng bước

### Cách 2 — Headless (dùng cho CI hoặc chạy nhanh)

```bash
cd src/Test
npm run cy:run
```

Kết quả in ra terminal, có tổng kết pass/fail ở cuối.

---

## Cấu trúc file test

```
src/Test/
├── package.json               ← dependencies của test (độc lập với frontend)
├── cypress.config.ts          ← cấu hình Cypress
├── README.md                  ← file này
└── e2e/
    ├── us02-auth.cy.ts        ← 15 test cases chính
    ├── us02-auth-e2e-spec.md  ← đặc tả gốc
    ├── us02-auth-fix-report.md← báo cáo lỗi cần sửa
    ├── tsconfig.json          ← TypeScript cho Cypress
    └── support/
        └── e2e.ts             ← support file (tự động load trước mỗi test)
```

---

## Danh sách test cases

| Test Case | Mô tả | Cần backend? | Trạng thái |
|-----------|-------|-------------|------------|
| TC-01 | Login đúng → token lưu, redirect /dashboard | Mock | ✅ Sẵn sàng |
| TC-02 | Sai password → 401, hiện lỗi | Mock | ✅ Sẵn sàng |
| TC-03 | Tài khoản bị khóa → 403, hiện lỗi khác TC-02 | Mock | ✅ Sẵn sàng |
| TC-04 | Có token → vào được /dashboard | Mock | ✅ Sẵn sàng |
| TC-05 | Không có token → redirect /login | Không | ⚠️ Cần PrivateRoute |
| TC-06 | Sai role → 403, không thấy nội dung | Mock | ⚠️ Cần RBAC guard |
| TC-07 | Refresh token hợp lệ → token mới | Mock | ⚠️ Cần axios interceptor |
| TC-08 | Refresh sau logout → 401, redirect | Mock | ⚠️ Cần route guard |
| TC-09 | Token bị tamper → 401, redirect | Mock | ⚠️ Cần error interceptor |
| VAL-01 | Bỏ trống cả 2 trường → 2 lỗi validate | Không | ✅ Sẵn sàng |
| VAL-02 | Bỏ trống username → lỗi username | Không | ✅ Sẵn sàng |
| VAL-03 | Bỏ trống password → lỗi password | Không | ✅ Sẵn sàng |
| VAL-04 | Username toàn khoảng trắng | Mock | ✅ Sẵn sàng |
| VAL-05 | Password toàn khoảng trắng | Mock | ✅ Sẵn sàng |
| VAL-06 | Password quá ngắn (1 ký tự) | Mock | ✅ Sẵn sàng |

> Các test ⚠️ sẽ **fail** cho đến khi frontend implement đủ. Xem `us02-auth-fix-report.md` để biết cần sửa gì.

---

## Xử lý lỗi thường gặp

**Cypress không mở được:**
```bash
# Thử xóa cache và cài lại
rm -rf node_modules
npm install
```

**Lỗi "Cannot find baseUrl":**
- Đảm bảo frontend đang chạy: `npm run dev` ở thư mục gốc `ELog-FE/`

**Test TC-01 fail với lỗi token:**
- Key token trong code đang là `localStorage.token`, spec yêu cầu `localStorage.accessToken`
- Xem hướng dẫn sửa trong `us02-auth-fix-report.md` — Lỗi 1

**Tất cả test fail với "cy.visit() failed":**
- Frontend chưa chạy, chạy `npm run dev` trước
