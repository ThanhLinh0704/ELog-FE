import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Import các component cần thiết từ thư viện Ant Design
import { Form, Input, Button, Checkbox, Alert, message } from 'antd';
import axiosInstance from '../../api/axiosInstance';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Xử lý đăng nhập thông thường (Khi người dùng submit Form)
  const onFinish = async (values: any) => {
    setIsLoading(true);
    setApiError(null); // Reset lại lỗi cũ trước đó

    try {
      // Gửi yêu cầu đăng nhập lên API Backend
      const response = await axiosInstance.post('/api/auth/login', {
        username: values.username.trim(),
        password: values.password,
      });

      const tokenData = response.data.data;

      // Lưu trữ Access Token, Refresh Token và thông tin user vào localStorage
      localStorage.setItem('token', tokenData.accessToken);
      localStorage.setItem('refreshToken', tokenData.refreshToken);
      localStorage.setItem('username', tokenData.username);
      localStorage.setItem('roles', JSON.stringify(tokenData.roles));
      localStorage.setItem('userId', String(tokenData.userId));

      message.success('Đăng nhập thành công!');
      
      // Điều hướng người dùng sang trang Dashboard hoạt động
      navigate('/dashboard', { state: { userName: tokenData.username } });
    } catch (err: any) {
      // Lấy thông báo lỗi trả về từ API Backend, nếu không có thì dùng thông báo mặc định
      const errorMsg = err.response?.data?.error?.message 
        || err.response?.data?.message 
        || 'Kết nối thất bại. Vui lòng kiểm tra lại server Backend.';
      setApiError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="elog-login-card-wrapper">
      <div className="elog-login-card">
        {/* Phần Logo thương hiệu ELog */}
        <div className="elog-form-header">
          <div className="elog-form-logo-box">
            {/* SVG Logo hình chiếc xe tải */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="1" y="3" width="15" height="13" rx="2" ry="2" fill="currentColor" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" fill="currentColor" />
              <circle cx="5.5" cy="18.5" r="2.5" fill="currentColor" />
              <circle cx="18.5" cy="18.5" r="2.5" fill="currentColor" />
            </svg>
          </div>
          <div className="elog-form-logo-text">
            <h2 className="elog-form-logo-title">ELog</h2>
            <span className="elog-form-logo-subtitle">SYSTEM</span>
          </div>
        </div>

        <h3 className="elog-welcome-title">Welcome Back</h3>
        <p className="elog-welcome-subtitle">Sign in to access your management dashboard</p>

        {/* Khung hiển thị thông báo lỗi khi đăng nhập không thành công */}
        {apiError && (
          <Alert
            message={apiError}
            type="error"
            showIcon
            style={{ marginBottom: '18px', borderRadius: '8px' }}
          />
        )}

        {/* Sử dụng Form của Ant Design thay thế thẻ form HTML truyền thống */}
        <Form
          name="login_form"
          layout="vertical"
          onFinish={onFinish}
          requiredMark={false} // Ẩn các ký tự hoa thị đỏ (*) cạnh label
        >
          {/* Ô nhập Email / Username */}
          <Form.Item
            label={<span className="elog-form-label">Email / Username</span>}
            name="username"
            // Định nghĩa quy tắc validate: bắt buộc nhập
            rules={[{ required: true, message: 'Please enter email or username' }]}
            style={{ marginBottom: '18px' }}
          >
            <Input
              placeholder="Enter your email or username"
              disabled={isLoading}
              style={{
                height: '46px',
                borderRadius: '11px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '13.5px'
              }}
              // Icon đại diện đặt ở phía trước ô nhập
              prefix={
                <span style={{ color: '#94a3b8', marginRight: '8px', display: 'flex', alignItems: 'center' }}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
              }
            />
          </Form.Item>

          {/* Ô nhập Mật khẩu */}
          <Form.Item
            label={<span className="elog-form-label">Password</span>}
            name="password"
            rules={[{ required: true, message: 'Please enter password' }]}
            style={{ marginBottom: '18px' }}
          >
            {/* Sử dụng Input.Password của Antd giúp tích hợp sẵn chức năng ẩn/hiện mật khẩu */}
            <Input.Password
              placeholder="Enter your password"
              disabled={isLoading}
              style={{
                height: '46px',
                borderRadius: '11px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontSize: '13.5px'
              }}
              prefix={
                <span style={{ color: '#94a3b8', marginRight: '8px', display: 'flex', alignItems: 'center' }}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
              }
            />
          </Form.Item>

          {/* Tùy chọn nhớ mật khẩu và quên mật khẩu */}
          <div className="elog-form-options">
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox disabled={isLoading} className="elog-checkbox-label">
                Remember me
              </Checkbox>
            </Form.Item>
            <a href="#forgot" className="elog-forgot-link" onClick={(e) => e.preventDefault()}>
              Forgot password?
            </a>
          </div>

          {/* Nút gửi thông tin Đăng nhập */}
          <Button
            type="primary"
            htmlType="submit"
            loading={isLoading} // Tự động hiển thị spinner khi isLoading = true
            className="elog-btn-submit"
            style={{ width: '100%', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none' }}
          >
            {!isLoading && 'Sign In'}
          </Button>
        </Form>

      </div>
    </div>
  );
};

export default LoginForm;
