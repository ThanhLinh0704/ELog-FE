import React, { useState } from 'react';
import { Eye, EyeOff, Mail, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { USER_ROLES } from '../config';
import { buildCreateUserPayload, buildUpdateUserPayload, type User, type CreateUserPayload, type UpdateUserPayload } from '../utils/userMapper';

interface UserFormModalProps {
  mode: 'create' | 'edit';
  user: User | null;
  onClose: () => void;
  onCreate: (payload: CreateUserPayload) => Promise<void>;
  onUpdateProfile: (id: number, payload: UpdateUserPayload) => Promise<void>;
  onUpdateRoles: (id: number, roles: string[]) => Promise<void>;
  apiFieldErrors?: Record<string, string>;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

const UserFormModal: React.FC<UserFormModalProps> = ({
  mode,
  user,
  onClose,
  onCreate,
  onUpdateProfile,
  onUpdateRoles,
  apiFieldErrors = {},
}) => {
  const isEdit = mode === 'edit';
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetNotice, setResetNotice] = useState('');
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
    roles: user?.roles || [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function setField(name: string, value: any) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function toggleRole(role: string) {
    setForm((prev) => {
      const exists = prev.roles.includes(role);
      return {
        ...prev,
        roles: exists ? prev.roles.filter((item) => item !== role) : [...prev.roles, role],
      };
    });
    setErrors((prev) => ({ ...prev, roles: '' }));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!form.fullName.trim()) next.fullName = 'Họ và tên là bắt buộc.';
    if (!isEdit && !form.username.trim()) next.username = 'Username là bắt buộc.';
    if (!form.email.trim()) next.email = 'Email là bắt buộc.';
    if (form.email && !isValidEmail(form.email.trim())) next.email = 'Email không đúng định dạng.';

    if (!isEdit) {
      if (!form.password) next.password = 'Mật khẩu là bắt buộc.';
      if (form.password && form.password.length < 8) next.password = 'Mật khẩu cần ít nhất 8 ký tự.';
      if (!form.confirmPassword) next.confirmPassword = 'Cần xác nhận mật khẩu.';
      if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
        next.confirmPassword = 'Mật khẩu xác nhận không khớp.';
      }
    }

    if (!form.roles.length) next.roles = 'Cần chọn ít nhất một vai trò.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (isEdit && user) {
        await onUpdateProfile(user.id, buildUpdateUserPayload(form));
        await onUpdateRoles(user.id, form.roles);
      } else {
        await onCreate(buildCreateUserPayload(form));
      }
    } catch (err) {
      // Errors handled by callers, keep modal open
    } finally {
      setSubmitting(false);
    }
  }

  const mergedErrors = { ...errors, ...apiFieldErrors };

  return (
    <div className="modal-backdrop">
      <div className="user-modal">
        <div className="modal-head">
          <div>
            <p className="eyebrow">{isEdit ? 'Chỉnh sửa người dùng' : 'Tạo người dùng mới'}</p>
            <h2>{isEdit ? user?.fullName : 'Thêm tài khoản nội bộ'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <form className="form-grid" onSubmit={handleSubmit} noValidate>
          <label>
            Họ và tên <span>*</span>
            <input
              value={form.fullName}
              onChange={(e) => setField('fullName', e.target.value)}
              placeholder="Nguyễn Văn A"
            />
            {mergedErrors.fullName ? <small>{mergedErrors.fullName}</small> : null}
          </label>

          <label>
            Username <span>*</span>
            <input
              value={form.username}
              onChange={(e) => setField('username', e.target.value)}
              readOnly={isEdit}
              className={isEdit ? 'readonly' : ''}
              placeholder="dispatcher01"
            />
            {mergedErrors.username ? <small>{mergedErrors.username}</small> : null}
            {isEdit ? <em>Username không được sửa theo API Contract.</em> : null}
          </label>

          <label>
            Email <span>*</span>
            <input
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
              placeholder="user@elog.vn"
            />
            {mergedErrors.email ? <small>{mergedErrors.email}</small> : null}
          </label>

          {!isEdit ? (
            <>
              <label>
                Mật khẩu <span>*</span>
                <div className="password-box">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                  />
                  <button type="button" onClick={() => setShowPassword((prev) => !prev)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {mergedErrors.password ? <small>{mergedErrors.password}</small> : null}
              </label>

              <label>
                Xác nhận mật khẩu <span>*</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={(e) => setField('confirmPassword', e.target.value)}
                />
                {mergedErrors.confirmPassword ? <small>{mergedErrors.confirmPassword}</small> : null}
              </label>
            </>
          ) : (
            <div className="reset-card">
              <div>
                <b>Mật khẩu</b>
                <p>API Contract hiện chưa có endpoint reset password riêng. Nút này chỉ hiển thị UI scope.</p>
                {resetNotice ? <small className="info-text">{resetNotice}</small> : null}
              </div>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setResetNotice('Chưa gọi API vì contract hiện chưa khai báo endpoint reset password.')}
              >
                <Mail size={16} /> Đặt lại mật khẩu
              </button>
            </div>
          )}

          <div className="full">
            <p className="field-title">
              Vai trò <span>*</span>
            </p>
            <div className="role-grid">
              {USER_ROLES.map((role) => (
                <button
                  type="button"
                  key={role.value}
                  className={form.roles.includes(role.value) ? 'role-option active' : 'role-option'}
                  onClick={() => toggleRole(role.value)}
                >
                  <ShieldCheck size={15} /> {role.label}
                </button>
              ))}
            </div>
            {mergedErrors.roles ? <small className="error-text">{mergedErrors.roles}</small> : null}
          </div>

          <div className="modal-actions full">
            <button type="button" className="btn ghost" onClick={onClose} disabled={submitting}>
              Huỷ
            </button>
            <button className="btn primary" disabled={submitting} type="submit">
              {submitting ? <RefreshCw className="spin" size={16} /> : null}
              {isEdit ? 'Lưu thay đổi' : 'Tạo người dùng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
