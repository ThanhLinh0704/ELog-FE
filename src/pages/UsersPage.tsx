import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Edit3, Lock, Plus, RefreshCw, Search, Unlock, Users } from 'lucide-react';
import { USER_ROLES } from '../config';
import { useDebounce } from '../hooks/useDebounce';
import { userApi } from '../api/userApi';
import { type User } from '../utils/userMapper';
import UserFormModal from '../components/UserFormModal';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';
import AdminShell from '../components/AdminShell';
import '../styles/users/UsersPage.css';

function RoleBadge({ role }: { role: string }) {
  const label = USER_ROLES.find((item) => item.value === role)?.label || role;
  return <span className={`badge role-${role.toLowerCase()}`}>{label}</span>;
}

function StatusChip({ isActive }: { isActive: boolean }) {
  return <span className={isActive ? 'chip active' : 'chip locked'}>{isActive ? 'Hoạt động' : 'Đã khoá'}</span>;
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, row) => (
        <tr key={row}>
          {Array.from({ length: 7 }).map((__, col) => (
            <td key={col}>
              <span className="skeleton" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

const UsersPage: React.FC = () => {
  const navigate = useNavigate();

  // Retrieve current user details from localStorage
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';
  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) {
      roles = JSON.parse(rolesStr);
    }
  } catch (e) {
    console.error('Failed to parse roles', e);
  }

  const currentUser = {
    id: Number(userId),
    username,
    fullName: username,
    roles,
  };

  const [users, setUsers] = useState<User[]>([]);
  const [keyword, setKeyword] = useState('');
  const [role, setRole] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(0);
  const [size] = useState(5);
  const [pageMeta, setPageMeta] = useState({ totalElements: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [apiFieldErrors, setApiFieldErrors] = useState<Record<string, string>>({});
  const [confirmPayload, setConfirmPayload] = useState<{ user: User; nextActive: boolean } | null>(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [toast, setToast] = useState<{ title: string; message: string; type?: 'success' | 'error' } | null>(null);

  const debouncedKeyword = useDebounce(keyword, 350);

  function showToast(title: string, message: string, type: 'success' | 'error' = 'success') {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 3200);
  }

  const queryParams = useMemo(() => ({
    keyword: debouncedKeyword,
    role,
    isActive,
    page,
    size,
    sort: 'id,desc',
  }), [debouncedKeyword, role, isActive, page, size]);

  async function fetchUsers(params = queryParams) {
    setLoading(true);
    setError('');
    try {
      const result = await userApi.getUsers(params);
      setUsers(result.content);
      setPageMeta({ totalElements: result.totalElements, totalPages: result.totalPages });
    } catch (err: any) {
      if (err.status === 403 || err.response?.status === 403) {
        // CYPRESS TC-06: DRIVER visits /users -> API returns 403 -> redirect to /dashboard
        navigate('/dashboard');
      } else {
        setError(err.message || 'Không tải được danh sách người dùng.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers(queryParams);
  }, [queryParams]);

  function resetToFirstPage(setter: (val: string) => void, value: string) {
    setter(value);
    setPage(0);
  }

  function mapApiErrorToField(err: any): Record<string, string> | null {
    const message = err.body?.message || err.message || '';
    const field = err.body?.field;

    if (err.status === 409) {
      if (field) return { [field]: message };
      if (message.toLowerCase().includes('username')) return { username: message };
      if (message.toLowerCase().includes('email')) return { email: message };
      return { username: message };
    }

    return null;
  }

  async function createUser(payload: any) {
    setApiFieldErrors({});
    try {
      await userApi.createUser(payload);
      setFormMode(null);
      showToast('Tạo người dùng thành công', 'Người dùng mới đã được tạo và danh sách đã được tải lại.');
      await fetchUsers({ ...queryParams, page: 0 });
      setPage(0);
    } catch (err: any) {
      const fieldErrors = mapApiErrorToField(err);
      if (fieldErrors) {
        setApiFieldErrors(fieldErrors);
      } else {
        showToast('Không tạo được người dùng', err.message || 'API lỗi, vui lòng thử lại.', 'error');
      }
      throw err;
    }
  }

  async function updateProfile(id: number, payload: any) {
    setApiFieldErrors({});
    try {
      await userApi.updateUser(id, payload);
    } catch (err: any) {
      const fieldErrors = mapApiErrorToField(err);
      if (fieldErrors) {
        setApiFieldErrors(fieldErrors);
      } else {
        showToast('Không cập nhật được thông tin', err.message || 'API lỗi, vui lòng thử lại.', 'error');
      }
      throw err;
    }
  }

  async function updateRoles(id: number, rolesPayload: string[]) {
    try {
      await userApi.updateRoles(id, rolesPayload);
      setFormMode(null);
      setEditingUser(null);
      showToast('Cập nhật người dùng thành công', 'Thông tin và vai trò đã được lưu.');
      await fetchUsers();
    } catch (err: any) {
      showToast('Không cập nhật được vai trò', err.message || 'API lỗi, vui lòng thử lại.', 'error');
      throw err;
    }
  }

  async function confirmStatusChange() {
    if (!confirmPayload) return;
    setStatusSubmitting(true);
    try {
      await userApi.updateStatus(confirmPayload.user.id, confirmPayload.nextActive);
      setUsers((prev) =>
        prev.map((user) =>
          user.id === confirmPayload.user.id ? { ...user, isActive: confirmPayload.nextActive } : user
        )
      );
      showToast(
        confirmPayload.nextActive ? 'Đã mở khoá tài khoản' : 'Đã khoá tài khoản',
        `${confirmPayload.user.fullName} đã được cập nhật trạng thái.`
      );
      setConfirmPayload(null);
    } catch (err: any) {
      showToast('Không cập nhật được trạng thái', err.message || 'API lỗi, vui lòng thử lại.', 'error');
    } finally {
      setStatusSubmitting(false);
    }
  }

  return (
    <AdminShell currentUser={currentUser}>
      <div className="user-page">
        <div className="page-title">
          <p className="eyebrow">/admin/users</p>
          <h2>Quản lý người dùng</h2>
          <p>Giao diện tuân thủ API Contract: GET/POST/PUT/PATCH cho User Management.</p>
        </div>

        <section className="summary-grid">
          <div className="summary-card">
            <span>Tổng kết quả</span>
            <strong>{pageMeta.totalElements}</strong>
            <p>Theo filter hiện tại.</p>
          </div>
          <div className="summary-card">
            <span>Trang hiện tại</span>
            <strong>{page + 1}</strong>
            <p>Tổng {pageMeta.totalPages} trang.</p>
          </div>
          <div className="summary-card">
            <span>Quyền truy cập</span>
            <strong>Admin</strong>
            <p>Chỉ SYSTEM_ADMIN.</p>
          </div>
        </section>

        <section className="panel">
          <div className="toolbar">
            <div className="search-box">
              <Search size={17} />
              <input
                value={keyword}
                onChange={(e) => resetToFirstPage(setKeyword, e.target.value)}
                placeholder="Tìm theo họ tên hoặc username..."
              />
            </div>

            <select value={role} onChange={(e) => resetToFirstPage(setRole, e.target.value)}>
              <option value="">Tất cả vai trò</option>
              {USER_ROLES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select value={isActive} onChange={(e) => resetToFirstPage(setIsActive, e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              <option value="true">Hoạt động</option>
              <option value="false">Đã khoá</option>
            </select>

            <button className="btn ghost" onClick={() => fetchUsers()} type="button">
              <RefreshCw size={16} /> Tải lại
            </button>
            <button
              className="btn primary"
              onClick={() => {
                setApiFieldErrors({});
                setEditingUser(null);
                setFormMode('create');
              }}
              type="button"
            >
              <Plus size={16} /> Tạo người dùng
            </button>
          </div>

          {error ? <div className="error-banner">{error}</div> : null}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows />
                ) : users.length ? (
                  users.map((user) => {
                    const isCurrentUser = user.id === currentUser.id;
                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="user-cell">
                            <div className="avatar">{user.fullName.slice(0, 1)}</div>
                            <div>
                              <b>{user.fullName}</b>
                              {isCurrentUser ? <small>Bạn đang đăng nhập</small> : null}
                            </div>
                          </div>
                        </td>
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td>
                          <div className="role-list">
                            {user.roles.map((item) => (
                              <RoleBadge key={item} role={item} />
                            ))}
                          </div>
                        </td>
                        <td>
                          <StatusChip isActive={user.isActive} />
                        </td>
                        <td>{user.createdAt || '—'}</td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="icon-btn edit"
                              onClick={() => {
                                setApiFieldErrors({});
                                setEditingUser(user);
                                setFormMode('edit');
                              }}
                              title="Chỉnh sửa"
                              type="button"
                            >
                              <Edit3 size={16} />
                            </button>
                            {!isCurrentUser ? (
                              <button
                                className={user.isActive ? 'icon-btn danger' : 'icon-btn success'}
                                onClick={() => setConfirmPayload({ user, nextActive: !user.isActive })}
                                title={user.isActive ? 'Khoá' : 'Mở khoá'}
                                type="button"
                              >
                                {user.isActive ? <Lock size={16} /> : <Unlock size={16} />}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <Users size={38} />
                        <h3>Không có kết quả</h3>
                        <p>Thử đổi từ khoá, role hoặc trạng thái.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <footer className="pagination">
            <span>Hiển thị {users.length} / {pageMeta.totalElements} kết quả</span>
            <div>
              <button
                className="btn ghost sm"
                disabled={page <= 0}
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                type="button"
              >
                <ChevronLeft size={15} /> Trước
              </button>
              <b>Trang {page + 1} / {pageMeta.totalPages}</b>
              <button
                className="btn ghost sm"
                disabled={page + 1 >= pageMeta.totalPages}
                onClick={() => setPage((prev) => prev + 1)}
                type="button"
              >
                Sau <ChevronRight size={15} />
              </button>
            </div>
          </footer>
        </section>

        {formMode ? (
          <UserFormModal
            mode={formMode}
            user={editingUser}
            apiFieldErrors={apiFieldErrors}
            onClose={() => {
              setFormMode(null);
              setEditingUser(null);
              setApiFieldErrors({});
            }}
            onCreate={createUser}
            onUpdateProfile={updateProfile}
            onUpdateRoles={updateRoles}
          />
        ) : null}

        <ConfirmDialog
          payload={confirmPayload}
          onCancel={() => setConfirmPayload(null)}
          onConfirm={confirmStatusChange}
          submitting={statusSubmitting}
        />
        <Toast toast={toast} onClose={() => setToast(null)} />
      </div>
    </AdminShell>
  );
};

export default UsersPage;
