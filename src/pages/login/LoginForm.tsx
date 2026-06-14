import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();

  // Form states (empty by default)
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [obscurePassword, setObscurePassword] = useState<boolean>(true);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Validation errors state
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset errors
    const newErrors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      newErrors.username = 'Please enter email or username';
    }
    if (!password) {
      newErrors.password = 'Please enter password';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    // Simulate 800ms network delay (matching Flutter's Future.delayed)
    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsLoading(false);
    // Redirect to dashboard page
    navigate('/dashboard', { state: { userName: username.trim() } });
  };

  // Demo shortcut login handler
  const handleDemoSignIn = async () => {
    setUsername('demo_user');
    setIsLoading(true);
    setErrors({});

    // Simulate 800ms network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsLoading(false);
    navigate('/dashboard', { state: { userName: 'demo_user' } });
  };

  return (
    <div className="elog-login-card-wrapper">
      <div className="elog-login-card">
        {/* Brand Header */}
        <div className="elog-form-header">
          <div className="elog-form-logo-box">
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

        <form onSubmit={handleSubmit} noValidate>
          {/* Email / Username field */}
          <div className="elog-form-group">
            <label className="elog-form-label">Email / Username</label>
            <div className="elog-input-wrapper">
              <span className="elog-input-icon-prefix">
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
              <input
                type="text"
                className={`elog-input ${errors.username ? 'elog-input-error' : ''}`}
                placeholder="Enter your email or username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errors.username) setErrors((prev) => ({ ...prev, username: undefined }));
                }}
                disabled={isLoading}
              />
            </div>
            {errors.username && <span className="elog-error-message">{errors.username}</span>}
          </div>

          {/* Password field */}
          <div className="elog-form-group">
            <label className="elog-form-label">Password</label>
            <div className="elog-input-wrapper">
              <span className="elog-input-icon-prefix">
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
              <input
                type={obscurePassword ? 'password' : 'text'}
                className={`elog-input elog-input-with-suffix ${errors.password ? 'elog-input-error' : ''}`}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                disabled={isLoading}
              />
              <button
                type="button"
                className="elog-input-icon-suffix"
                onClick={() => setObscurePassword(!obscurePassword)}
                tabIndex={-1}
              >
                {obscurePassword ? (
                  /* Custom eye icon matching visibility_outlined */
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
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  /* Custom eye-off icon matching visibility_off_outlined */
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
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && <span className="elog-error-message">{errors.password}</span>}
          </div>

          {/* Remember me + Forgot password */}
          <div className="elog-form-options">
            <label className="elog-checkbox-wrapper">
              <input
                type="checkbox"
                className="elog-checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
              />
              <span className="elog-checkbox-label">Remember me</span>
            </label>
            <a href="#forgot" className="elog-forgot-link" onClick={(e) => e.preventDefault()}>
              Forgot password?
            </a>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            className="elog-btn-submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="elog-spinner" />
            ) : (
              <>
                Sign In
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* OR Divider */}
        <div className="elog-divider">
          <span className="elog-divider-line" />
          <span className="elog-divider-text">OR</span>
          <span className="elog-divider-line" />
        </div>

        {/* Demo Button */}
        <button
          type="button"
          className="elog-btn-demo"
          onClick={handleDemoSignIn}
          disabled={isLoading}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          Continue as Demo
        </button>
      </div>
    </div>
  );
};

export default LoginForm;
