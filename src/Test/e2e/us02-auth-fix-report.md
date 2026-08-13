# Báo cáo: Các lỗi & Thiếu sót cần sửa — US-02 Authentication

> Soạn sau khi viết E2E test suite `us02-auth.cy.ts`.  
> Dành cho: Frontend developer phụ trách US-02.

---

## Tóm tắt nhanh

| # | Vấn đề | Mức độ | File cần sửa |
|---|--------|--------|--------------|
| 1 | Sai key lưu token vào localStorage | 🔴 Nghiêm trọng | `LoginForm.tsx` |
| 2 | Thiếu PrivateRoute — trang bảo vệ không chặn được | 🔴 Nghiêm trọng | `App.tsx` (mới) |
| 3 | Thiếu axios interceptor xử lý 401 + tự động refresh | 🟠 Quan trọng | `axiosInstance.ts` |
| 4 | Thiếu xử lý lỗi 401 trả về từ API bị tamper token | 🟠 Quan trọng | `axiosInstance.ts` |
| 5 | Thiếu trang 403 / RBAC guard theo role | 🟡 Cần có | `App.tsx` (mới) |

---

## Lỗi 1 — Sai key lưu token vào localStorage

### Vấn đề

Trong `src/pages/login/LoginForm.tsx` dòng 27, token được lưu với key `'token'`:

```ts
// ❌ Hiện tại
localStorage.setItem('token', tokenData.accessToken);
```

Nhưng spec US-02 và `axiosInstance.ts` cần đọc bằng key `'accessToken'`:

```ts
// axiosInstance.ts — đang dùng key 'token'
const token = localStorage.getItem('token');   // ← không khớp với spec
```

Spec quy định:

> `localStorage.getItem('accessToken')` → Bearer token (JWT string)

### Cách sửa

**Option A — Đổi key trong LoginForm** (khuyên dùng, đồng bộ theo spec):

```ts
// LoginForm.tsx — sửa dòng 27
localStorage.setItem('accessToken', tokenData.accessToken);  // ✅
localStorage.setItem('refreshToken', tokenData.refreshToken);
```

Đồng thời sửa `axiosInstance.ts` dòng 9:

```ts
const token = localStorage.getItem('accessToken');  // ✅ đồng bộ với spec
```

---

## Lỗi 2 — Thiếu PrivateRoute (Route Guard)

### Vấn đề

`src/App.tsx` hiện tại không có bảo vệ route. Bất kỳ ai cũng có thể vào `/dashboard` mà không cần đăng nhập:

```tsx
// ❌ Hiện tại — không có bảo vệ
<Route path="/dashboard" element={<DashboardPage />} />
```

TC-05 yêu cầu: vào `/dashboard` khi chưa đăng nhập → phải redirect về `/login`.

### Cách sửa

**Bước 1** — Tạo file `src/components/PrivateRoute.tsx`:

```tsx
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute: React.FC = () => {
  const token = localStorage.getItem('accessToken');
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
```

**Bước 2** — Bọc các route cần bảo vệ trong `App.tsx`:

```tsx
import PrivateRoute from './components/PrivateRoute';

// ✅ Sau khi sửa
<Route element={<PrivateRoute />}>
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/users"     element={<UsersPage />} />
</Route>
```

---

## Lỗi 3 — Thiếu Axios Interceptor tự động Refresh Token

### Vấn đề

`src/api/axiosInstance.ts` hiện tại chỉ có response interceptor rỗng, không xử lý 401:

```ts
// ❌ Hiện tại — bỏ qua lỗi, không refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error),   // ← không làm gì cả
);
```

TC-07 yêu cầu: khi API trả 401 vì token hết hạn → tự động gọi `/api/auth/refresh` → cập nhật token mới → retry request ban đầu.

### Cách sửa

Thay thế response interceptor trong `axiosInstance.ts`:

```ts
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Chỉ xử lý 401, không retry nếu đã thử rồi
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Nếu đang refresh, xếp hàng chờ
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token) => { original.headers.Authorization = `Bearer ${token}`; resolve(axiosInstance(original)); },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    try {
      const { data } = await axiosInstance.post('/api/auth/refresh', { refreshToken });
      const newToken = data.data.accessToken;
      localStorage.setItem('accessToken', newToken);
      axiosInstance.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return axiosInstance(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearAuthAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

function clearAuthAndRedirect() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('username');
  localStorage.removeItem('roles');
  window.location.href = '/login';
}
```

---

## Lỗi 4 — Thiếu xử lý khi token bị tamper/thu hồi

### Vấn đề

TC-09: Khi user có token bị giả mạo, gọi API trả 401 với code `AUTHENTICATION_FAILED`. Hiện tại frontend không xóa token cũ → user bị kẹt, không ra được trang login.

### Cách sửa

Đã được xử lý chung trong hàm `clearAuthAndRedirect()` ở **Lỗi 3** — khi interceptor nhận 401 và refresh cũng thất bại → xóa localStorage → redirect `/login`.

---

## Lỗi 5 — Thiếu trang 403 và RBAC Route Guard

### Vấn đề

TC-06: DRIVER vào `/users` → API trả 403. Hiện tại không có trang `/users` và không có phân quyền theo role trên frontend.

### Cách sửa

**Bước 1** — Tạo `src/components/RoleRoute.tsx`:

```tsx
import { Navigate, Outlet } from 'react-router-dom';

interface Props {
  allowedRoles: string[];
}

const RoleRoute: React.FC<Props> = ({ allowedRoles }) => {
  const roles: string[] = JSON.parse(localStorage.getItem('roles') ?? '[]');
  const hasAccess = roles.some((r) => allowedRoles.includes(r));
  return hasAccess ? <Outlet /> : <Navigate to="/403" replace />;
};

export default RoleRoute;
```

**Bước 2** — Tạo `src/pages/ForbiddenPage.tsx` (trang 403):

```tsx
const ForbiddenPage: React.FC = () => (
  <div style={{ textAlign: 'center', marginTop: 80 }}>
    <h2>403 — Không có quyền truy cập</h2>
    <p>Tài khoản của bạn không có quyền xem trang này.</p>
  </div>
);
export default ForbiddenPage;
```

**Bước 3** — Cập nhật `App.tsx`:

```tsx
<Route path="/403" element={<ForbiddenPage />} />
<Route element={<PrivateRoute />}>
  <Route element={<RoleRoute allowedRoles={['SYSTEM_ADMIN']} />}>
    <Route path="/users" element={<UsersPage />} />
  </Route>
  <Route path="/dashboard" element={<DashboardPage />} />
</Route>
```

---

## Checklist — Để tất cả 9 TC pass

- [ ] Sửa localStorage key từ `'token'` → `'accessToken'` (LoginForm + axiosInstance)
- [ ] Tạo `PrivateRoute` và bọc `/dashboard`, `/users`
- [ ] Implement axios refresh interceptor + `clearAuthAndRedirect`
- [ ] Tạo trang `ForbiddenPage` (403)
- [ ] Tạo `RoleRoute` và bảo vệ `/users` chỉ cho `SYSTEM_ADMIN`
- [ ] Tạo `UsersPage` (dù chỉ là placeholder) để TC-04/06 có endpoint để test

---

*Báo cáo sinh bởi: Claude Code — dựa trên phân tích `LoginForm.tsx`, `App.tsx`, `axiosInstance.ts` và đặc tả `us02-auth-e2e-spec.md`.*
