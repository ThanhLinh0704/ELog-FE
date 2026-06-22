import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  Edit3,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Unlock,
} from 'lucide-react';
import { USER_ROLES } from '../config';
import { useDebounce } from '../hooks/useDebounce';
import { userApi } from '../api/userApi';
import { type User } from '../utils/userMapper';
import UserFormModal from '../components/UserFormModal';
import AdminShell from '../components/AdminShell';
import '../styles/users/UsersPage.css';

function getCurrentUser() {
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

  return {
    id: Number(userId),
    username,
    fullName: username,
    roles,
  };
}

function getStatus(err: any) {
  return err?.response?.status ?? err?.status;
}

function getApiMessage(err: any, fallback: string) {
  return (
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.response?.data?.errors?.[0]?.message ||
    err?.response?.data?.errors?.[0]?.defaultMessage ||
    err?.body?.error?.message ||
    err?.body?.message ||
    err?.body?.errors?.[0]?.message ||
    err?.body?.errors?.[0]?.defaultMessage ||
    err?.message ||
    fallback
  );
}

function getApiFieldErrors(err: any): Record<string, string> {
  const data = err?.response?.data ?? err?.body;
  const result: Record<string, string> = {};

  const directField = data?.error?.field || data?.field;
  const directMessage = data?.error?.message || data?.message;

  if (directField && directMessage) {
    result[directField] = directMessage;
  }

  if (Array.isArray(data?.errors)) {
    data.errors.forEach((item: any) => {
      const field = item.field || item.name;
      const errorMessage = item.message || item.defaultMessage;

      if (field && errorMessage) {
        result[field] = errorMessage;
      }
    });
  }

  return result;
}

function RoleTag({ role }: { role: string }) {
  const label = USER_ROLES.find((item) => item.value === role)?.label || role;

  const colorMap: Record<string, string> = {
    SYSTEM_ADMIN: 'purple',
    DISPATCHER: 'blue',
    WAREHOUSE_STAFF: 'orange',
    DRIVER: 'green',
    LOGISTICS_MANAGER: 'cyan',
  };

  return (
    <Tag color={colorMap[role] || 'default'} className="user-role-tag">
      {label}
    </Tag>
  );
}

function StatusTag({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Tag color="success" className="user-status-tag">
      Hoạt động
    </Tag>
  ) : (
    <Tag color="default" className="user-status-tag">
      Đã khoá
    </Tag>
  );
}

const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [users, setUsers] = useState<User[]>([]);
  const [keyword, setKeyword] = useState('');
  const [role, setRole] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(0);
  const [size] = useState(5);
  const [pageMeta, setPageMeta] = useState({
    totalElements: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [apiFieldErrors, setApiFieldErrors] = useState<Record<string, string>>({});
  const [confirmPayload, setConfirmPayload] = useState<{
    user: User;
    nextActive: boolean;
  } | null>(null);
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const debouncedKeyword = useDebounce(keyword, 350);

  const queryParams = useMemo(
    () => ({
      keyword: debouncedKeyword,
      role,
      isActive,
      page,
      size,
      sort: 'id,desc',
    }),
    [debouncedKeyword, role, isActive, page, size]
  );

  async function fetchUsers(params = queryParams) {
    setLoading(true);
    setError('');

    try {
      const result = await userApi.getUsers(params);
      setUsers(result.content);
      setPageMeta({
        totalElements: result.totalElements,
        totalPages: result.totalPages,
      });
    } catch (err: any) {
      if (getStatus(err) === 403) {
        navigate('/dashboard');
      } else {
        setError(getApiMessage(err, 'Không tải được danh sách người dùng.'));
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
    const fieldErrors = getApiFieldErrors(err);

    if (Object.keys(fieldErrors).length > 0) {
      return fieldErrors;
    }

    const status = getStatus(err);
    const messageText = getApiMessage(err, '');

    if (status === 409) {
      if (messageText.toLowerCase().includes('username')) {
        return { username: messageText };
      }

      if (messageText.toLowerCase().includes('email')) {
        return { email: messageText };
      }

      return { username: messageText || 'Dữ liệu đã tồn tại.' };
    }

    return null;
  }

  async function createUser(payload: any) {
    setApiFieldErrors({});

    try {
      await userApi.createUser(payload);
      setFormMode(null);
      message.success('Người dùng mới đã được tạo thành công.');
      setPage(0);
      await fetchUsers({ ...queryParams, page: 0 });
    } catch (err: any) {
      const fieldErrors = mapApiErrorToField(err);

      if (fieldErrors) {
        setApiFieldErrors(fieldErrors);
      } else {
        message.error(getApiMessage(err, 'Không tạo được người dùng.'));
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
        message.error(getApiMessage(err, 'Không cập nhật được thông tin.'));
      }

      throw err;
    }
  }

  async function updateRoles(id: number, rolesPayload: string[]) {
    try {
      await userApi.updateRoles(id, rolesPayload);
      setFormMode(null);
      setEditingUser(null);
      message.success('Thông tin và vai trò người dùng đã được lưu.');
      await fetchUsers();
    } catch (err: any) {
      message.error(getApiMessage(err, 'Không cập nhật được vai trò.'));
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
          user.id === confirmPayload.user.id
            ? { ...user, isActive: confirmPayload.nextActive }
            : user
        )
      );

      message.success(
        confirmPayload.nextActive
          ? 'Đã mở khoá tài khoản.'
          : 'Đã khoá tài khoản.'
      );

      setConfirmPayload(null);
    } catch (err: any) {
      message.error(getApiMessage(err, 'Không cập nhật được trạng thái.'));
    } finally {
      setStatusSubmitting(false);
    }
  }

  function handleTableChange(pagination: TablePaginationConfig) {
    setPage((pagination.current || 1) - 1);
  }

  const columns: ColumnsType<User> = [
    {
      title: 'Họ tên',
      dataIndex: 'fullName',
      width: 230,
      render: (_, record) => {
        const isCurrentUser = record.id === currentUser.id;
        const firstLetter =
          record.fullName?.slice(0, 1)?.toUpperCase() ||
          record.username?.slice(0, 1)?.toUpperCase() ||
          'U';

        return (
          <div className="user-ant-cell">
            <Avatar className="user-ant-avatar">{firstLetter}</Avatar>
            <div>
              <Typography.Text strong>{record.fullName || record.username}</Typography.Text>
              {isCurrentUser ? <small>Bạn đang đăng nhập</small> : null}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Username',
      dataIndex: 'username',
      width: 150,
      render: (value) => <Typography.Text>{value}</Typography.Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      width: 230,
      ellipsis: true,
      render: (value) => (
        <Tooltip title={value}>
          <Typography.Text ellipsis>{value}</Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'roles',
      width: 230,
      render: (roles: string[]) => (
        <Space size={[4, 4]} wrap>
          {(roles || []).map((item) => (
            <RoleTag key={item} role={item} />
          ))}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      width: 130,
      render: (value: boolean) => <StatusTag isActive={value} />,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      width: 170,
      render: (value) => value || '—',
    },
    {
      title: 'Thao tác',
      width: 190,
      fixed: 'right',
      render: (_, record) => {
        const isCurrentUser = record.id === currentUser.id;

        return (
          <Space>
            <Button
              size="small"
              icon={<Edit3 size={15} />}
              onClick={() => {
                setApiFieldErrors({});
                setEditingUser(record);
                setFormMode('edit');
              }}
            >
              Sửa
            </Button>

            {!isCurrentUser ? (
              <Button
                size="small"
                danger={record.isActive}
                icon={record.isActive ? <Lock size={15} /> : <Unlock size={15} />}
                onClick={() =>
                  setConfirmPayload({
                    user: record,
                    nextActive: !record.isActive,
                  })
                }
              >
                {record.isActive ? 'Khoá' : 'Mở khoá'}
              </Button>
            ) : null}
          </Space>
        );
      },
    },
  ];

  return (
    <AdminShell currentUser={currentUser}>
      <div className="user-page">
        <div className="page-title user-page-title">
          <p className="eyebrow">/users</p>
          <h2>Quản lý người dùng</h2>
          <p>Quản lý tài khoản, vai trò và trạng thái truy cập hệ thống ELog.</p>
        </div>

        <div className="user-summary-grid">
          <Card>
            <Typography.Text type="secondary">Tổng kết quả</Typography.Text>
            <h3>{pageMeta.totalElements}</h3>
            <span>Theo bộ lọc hiện tại</span>
          </Card>

          <Card>
            <Typography.Text type="secondary">Trang hiện tại</Typography.Text>
            <h3>{page + 1}</h3>
            <span>Tổng {pageMeta.totalPages} trang</span>
          </Card>

          <Card>
            <Typography.Text type="secondary">Quyền truy cập</Typography.Text>
            <h3>Admin</h3>
            <span>Chỉ SYSTEM_ADMIN</span>
          </Card>
        </div>

        <Card className="user-toolbar-card">
          <div className="user-toolbar">
            <Input
              allowClear
              prefix={<Search size={16} />}
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(0);
              }}
              placeholder="Tìm theo họ tên hoặc username..."
            />

            <Select
              value={role}
              onChange={(value) => resetToFirstPage(setRole, value)}
            >
              <Select.Option value="">Tất cả vai trò</Select.Option>
              {USER_ROLES.map((item) => (
                <Select.Option key={item.value} value={item.value}>
                  {item.label}
                </Select.Option>
              ))}
            </Select>

            <Select
              value={isActive}
              onChange={(value) => resetToFirstPage(setIsActive, value)}
            >
              <Select.Option value="">Tất cả trạng thái</Select.Option>
              <Select.Option value="true">Hoạt động</Select.Option>
              <Select.Option value="false">Đã khoá</Select.Option>
            </Select>

            <Button
              icon={<RefreshCw size={16} />}
              onClick={() => fetchUsers()}
            >
              Tải lại
            </Button>

            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={() => {
                setApiFieldErrors({});
                setEditingUser(null);
                setFormMode('create');
              }}
            >
              Tạo người dùng
            </Button>
          </div>
        </Card>

        {error ? (
          <Alert
            type="error"
            showIcon
            title={error}
          />
        ) : null}

        <Card className="user-table-card">
          <Table
            rowKey="id"
            columns={columns}
            dataSource={users}
            loading={loading}
            scroll={{ x: 1250 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Không tìm thấy người dùng phù hợp"
                />
              ),
            }}
            pagination={{
              current: page + 1,
              pageSize: size,
              total: pageMeta.totalElements,
              showSizeChanger: false,
              showTotal: (total) => `Tổng ${total} người dùng`,
            }}
            onChange={handleTableChange}
          />
        </Card>

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

        <Modal
          title={
            confirmPayload?.nextActive
              ? `Mở khoá tài khoản "${confirmPayload?.user.fullName}"?`
              : `Khoá tài khoản "${confirmPayload?.user.fullName}"?`
          }
          open={!!confirmPayload}
          onCancel={() => setConfirmPayload(null)}
          onOk={confirmStatusChange}
          okText={confirmPayload?.nextActive ? 'Xác nhận mở khoá' : 'Xác nhận khoá'}
          cancelText="Huỷ"
          confirmLoading={statusSubmitting}
          okButtonProps={{ danger: !confirmPayload?.nextActive }}
        >
          {confirmPayload?.nextActive ? (
            <p>Người dùng này sẽ có thể đăng nhập và sử dụng hệ thống trở lại.</p>
          ) : (
            <p>Người dùng này sẽ không thể đăng nhập cho đến khi được mở khoá.</p>
          )}
        </Modal>
      </div>
    </AdminShell>
  );
};

export default UsersPage;