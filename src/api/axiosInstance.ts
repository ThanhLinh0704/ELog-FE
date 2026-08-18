import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use((config) => {
  if (config.url && config.url.startsWith('/api/') && !config.url.startsWith('/api/v1/')) {
    config.url = config.url.replace('/api/', '/api/v1/');
  }
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Flag và hàng đợi phục vụ tự động Refresh Token khi gặp lỗi 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Chỉ thực hiện refresh khi nhận mã lỗi 401 và request chưa được thử lại
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Nếu là request gọi trực tiếp tới login hoặc refresh thì clear localStorage và chuyển hướng về /login
      if (originalRequest.url && (originalRequest.url.includes('/api/v1/auth/refresh') || originalRequest.url.includes('/api/v1/auth/login'))) {
        localStorage.clear();
        // Chỉ reload trình duyệt về /login nếu refresh token bị hết hạn
        if (originalRequest.url.includes('/api/v1/auth/refresh')) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(
          (import.meta.env.VITE_API_BASE_URL ?? '') + '/api/v1/auth/refresh',
          { refreshToken }
        );

        const tokenData = response.data.data;
        const userData = tokenData.user ?? tokenData;
        const newAccessToken = tokenData.accessToken ?? userData.accessToken;
        const newRefreshToken = tokenData.refreshToken;
        localStorage.setItem('token', newAccessToken);
        localStorage.setItem('accessToken', newAccessToken);

        if (newRefreshToken) {
          localStorage.setItem('refreshToken', newRefreshToken);
        }

        if (Array.isArray(userData.permissions)) {
          localStorage.setItem('permissions', JSON.stringify(userData.permissions));
        }

        if (Array.isArray(userData.roles)) {
          localStorage.setItem('roles', JSON.stringify(userData.roles));
        }

        if (userData.username) {
          localStorage.setItem('username', userData.username);
        }

        if (userData.userId || userData.id) {
          localStorage.setItem('userId', String(userData.userId ?? userData.id));
        }

        // Cập nhật token mới cho request hiện tại
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);
        isRefreshing = false;

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;

        // Refresh token cũng hết hạn -> Xóa session và yêu cầu đăng nhập lại
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
