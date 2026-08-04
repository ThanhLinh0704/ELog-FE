import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '',
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Flag và hàng đợi phục vụ tự động Refresh Token khi gặp lỗi 401
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
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
  async (error) => {
    const originalRequest = error.config;

    // Chỉ thực hiện refresh khi nhận mã lỗi 401 và request chưa được thử lại
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Nếu là request gọi trực tiếp tới login hoặc refresh thì clear localStorage và chuyển hướng về /login
      if (originalRequest.url && (originalRequest.url.includes('/api/auth/refresh') || originalRequest.url.includes('/api/auth/login'))) {
        localStorage.clear();
        // Chỉ reload trình duyệt về /login nếu refresh token bị hết hạn
        if (originalRequest.url.includes('/api/auth/refresh')) {
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
          (import.meta.env.VITE_API_BASE_URL ?? '') + '/api/auth/refresh',
          { refreshToken }
        );

        const newAccessToken = response.data.data.accessToken;
        localStorage.setItem('token', newAccessToken);

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
