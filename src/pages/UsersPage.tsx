import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Card, Row, Col, Space, Button, Input, Select, Breadcrumb,
  Statistic, Tag, Badge, Popconfirm, message, Alert, Avatar
} from 'antd';
import { Edit3, Lock, Plus, RefreshCw, Search, Unlock } from 'lucide-react';
import { USER_ROLES } from '../config';
import { useDebounce } from '../hooks/useDebounce';
import { userApi } from '../api/userApi';
import { type User } from '../utils/userMapper';
import UserFormModal from '../components/UserFormModal';
import AdminShell from '../components/AdminShell';

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

  const debouncedKeyword = useDebounce(keyword, 350);

  const queryParams = useMemo(() => ({
    keyword: debouncedKeyword, role, isActive, page, size,
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
    const msg = err.body?.error?.message || err.body?.message || err.message || '';
    const field = err.body?.field;
    const details = err.body?.error?.details;

    if (err.status === 400 && Array.isArray(details)) {
      const fieldErrors: Record<string, string> = {};
      details.forEach((detail: string) => {
        const colonIndex = detail.indexOf(':');
        if (colonIndex > -1) {
          const fieldName = detail.substring(0, colonIndex).trim();
          const errorMsg = detail.substring(colonIndex + 1).trim();
          fieldErrors[fieldName] = errorMsg;
        }
      });
      return fieldErrors;
    }

    if (err.status === 409) {
      if (field) return { [field]: msg };
      if (msg.toLowerCase().includes('username')) return { username: msg };
      if (msg.toLowerCase().includes('email')) return { email: msg };
      return { username: msg };
    }

    return null;
  }

  async function createUser(payload: any) {
    setApiFieldErrors({});
    try {
      await userApi.createUser(payload);
      setFormMode(null);
      message.success('Tạo người dùng mới thành công và đã tải lại danh sách.');
      await fetchUsers({ ...queryParams, page: 0 });
      setPage(0);
    } catch (err: any) {
      const fieldErrors = mapApiErrorToField(err);
      if (fieldErrors) {
        setApiFieldErrors(fieldErrors);
      } else {
        message.error(err.message || 'Không tạo được người dùng, vui lòng thử lại.');
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
        message.error(err.message || 'Không cập nhật được thông tin, vui lòng thử lại.');
      }
      throw err;
    }
  }

  async function updateRoles(id: number, rolesPayload: string[]) {
    try {
      await userApi.updateRoles(id, rolesPayload);
      setFormMode(null);
      setEditingUser(null);
      message.success('Cập nhật thông tin và vai trò người dùng thành công.');
      await fetchUsers();
    } catch (err: any) {
      message.error(err.message || 'Không cập nhật được vai trò, vui lòng thử lại.');
      throw err;
    }
  }

  async function toggleUserStatus(user: User) {
    const nextActive = !user.isActive;
    try {
      await userApi.updateStatus(user.id, nextActive);
      setUsers((prev) =>
        prev.map((item) =>
          item.id === user.id ? { ...item, isActive: nextActive } : item
        )
      );
      message.success(
        nextActive
          ? `Đã mở khoá tài khoản cho ${user.fullName}.`
          : `Đã khoá tài khoản của ${user.fullName}.`
      );
    } catch (err: any) {
      message.error(err.message || 'Không thể cập nhật trạng thái tài khoản.');
    }
  }

  const columns = [
    {
      title: 'Họ tên',
      key: 'fullName',
      render: (_: any, record: User) => {
        const isCurrentUser = record.id === currentUser.id;
        return (
          <Space>
            <Avatar style={{ backgroundColor: '#1677ff' }}>
              {record.fullName.slice(0, 1).toUpperCase()}
            </Avatar>
            <div>
              <div style={{ fontWeight: 600, color: '#1f1f1f' }}>{record.fullName}</div>
              {isCurrentUser ? (
                <small style={{ color: '#8c8c8c' }}>Bạn đang đăng nhập</small>
              ) : null}
            </div>
          </Space>
        );
      }
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Vai trò',
      dataIndex: 'roles',
      key: 'roles',
      render: (rolesList: string[]) => (
        <Space size={[0, 4]} wrap>
          {rolesList.map((roleVal) => {
            const matched = USER_ROLES.find((item) => item.value === roleVal);
            return (
              <Tag color="blue" key={roleVal}>
                {matched ? matched.label : roleVal}
              </Tag>
            );
          })}
        </Space>
      )
    },
    {
      title: 'Trạng thái',
      key: 'isActive',
      render: (_: any, record: User) => (
        <Badge
          status={record.isActive ? 'success' : 'error'}
          text={record.isActive ? 'Hoạt động' : 'Đã khoá'}
        />
      )
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (text: string) => text || '—'
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: User) => {
        const isCurrentUser = record.id === currentUser.id;
        return (
          <Space size="small">
            <Button
              type="text"
              icon={<Edit3 size={16} />}
              onClick={() => {
                setApiFieldErrors({});
                setEditingUser(record);
                setFormMode('edit');
              }}
              title="Chỉnh sửa"
            />
            {!isCurrentUser ? (
              <Popconfirm
                title={record.isActive ? 'Khoá tài khoản?' : 'Mở khoá tài khoản?'}
                description={`Bạn có chắc muốn ${record.isActive ? 'khoá' : 'mở khoá'} tài khoản của ${record.fullName}?`}
                onConfirm={() => toggleUserStatus(record)}
                okText="Đồng ý"
                cancelText="Hủy"
                okButtonProps={{ danger: record.isActive }}
              >
                <Button
                  type="text"
                  danger={record.isActive}
                  style={{ color: record.isActive ? undefined : '#52c41a' }}
                  icon={record.isActive ? <Lock size={16} /> : <Unlock size={16} />}
                  title={record.isActive ? 'Khoá' : 'Mở khoá'}
                />
              </Popconfirm>
            ) : null}
          </Space>
        );
      }
    }
  ];

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <Breadcrumb
            items={[
              { title: 'Admin' },
              { title: 'Quản lý người dùng' }
            ]}
          />
          <h2 style={{ margin: '8px 0 0 0', fontSize: 24, fontWeight: 700, color: '#1f1f1f' }}>
            Quản lý người dùng
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>
            Giao diện quản trị tài khoản người dùng, phân vai trò và quản lý trạng thái kích hoạt.
          </p>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card size="small" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
              <Statistic title="Tổng kết quả" value={pageMeta.totalElements} suffix="người dùng" />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
              <Statistic title="Trang hiện tại" value={page + 1} suffix={`/ ${pageMeta.totalPages} trang`} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
              <Statistic title="Quyền truy cập" value="Admin" suffix="SYSTEM_ADMIN" />
            </Card>
          </Col>
        </Row>

        <Card bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <Space size="middle" wrap>
              <Input
                placeholder="Tìm theo họ tên hoặc username..."
                value={keyword}
                onChange={(e) => resetToFirstPage(setKeyword, e.target.value)}
                prefix={<Search size={16} style={{ color: '#bfbfbf' }} />}
                style={{ width: 260, borderRadius: 6 }}
                allowClear
              />
              <Select
                placeholder="Tất cả vai trò"
                value={role || undefined}
                onChange={(val) => resetToFirstPage(setRole, val || '')}
                style={{ width: 180 }}
                allowClear
                options={USER_ROLES.map((r) => ({ value: r.value, label: r.label }))}
              />
              <Select
                placeholder="Tất cả trạng thái"
                value={isActive || undefined}
                onChange={(val) => resetToFirstPage(setIsActive, val || '')}
                style={{ width: 180 }}
                allowClear
                options={[
                  { value: 'true', label: 'Hoạt động' },
                  { value: 'false', label: 'Đã khoá' }
                ]}
              />
            </Space>

            <Space size="small">
              <Button
                icon={<RefreshCw size={14} />}
                onClick={() => fetchUsers()}
              >
                Tải lại
              </Button>
              <Button
                type="primary"
                icon={<Plus size={14} />}
                onClick={() => {
                  setApiFieldErrors({});
                  setEditingUser(null);
                  setFormMode('create');
                }}
              >
                Tạo người dùng
              </Button>
            </Space>
          </div>

          {error ? (
            <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
          ) : null}

          <Table
            columns={columns}
            dataSource={users}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page + 1,
              pageSize: size,
              total: pageMeta.totalElements,
              onChange: (p) => setPage(p - 1),
              showSizeChanger: false,
              position: ['bottomRight'],
            }}
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
      </div>
    </AdminShell>
  );
};

export default UsersPage;
