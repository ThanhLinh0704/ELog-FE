import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Checkbox, Col, List, Row, Space, Spin, Tag, Typography, message } from 'antd';
import AdminShell from '../components/AdminShell';
import { getPermissions, getRoleById, getRoles, updateRolePermissions, type PermissionItem, type RoleItem } from '../api/roleApi';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../constants/permissions';

function getCurrentUser() {
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';
  let roles: string[] = [];

  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) {
      const parsed: unknown = JSON.parse(rolesStr);
      roles = Array.isArray(parsed)
        ? parsed.filter((role): role is string => typeof role === 'string')
        : [];
    }
  } catch (error) {
    console.error('Failed to parse roles', error);
  }

  return {
    id: Number(userId),
    username,
    fullName: username,
    roles,
  };
}

function getApiMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'response' in error) {
    const responseError = error as {
      response?: {
        data?: {
          error?: { details?: string[]; message?: string };
          message?: string;
        };
      };
      message?: string;
    };

    return (
      responseError.response?.data?.error?.details?.[0] ||
      responseError.response?.data?.error?.message ||
      responseError.response?.data?.message ||
      responseError.message ||
      fallback
    );
  }

  return error instanceof Error ? error.message : fallback;
}

const RoleManagementPage: React.FC = () => {
  const currentUser = useMemo(getCurrentUser, []);
  const { can } = usePermissions();
  const canWriteRole = can(PERMISSIONS.ROLE_WRITE);

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null;

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [nextRoles, nextPermissions] = await Promise.all([
        getRoles(),
        getPermissions(),
      ]);

      setRoles(nextRoles);
      setPermissions(nextPermissions);

      const firstRole = nextRoles[0] ?? null;
      setSelectedRoleId((previous) => previous ?? firstRole?.id ?? null);
      if (firstRole) {
        setSelectedPermissionIds(firstRole.permissions.map((permission) => permission.id));
      }
    } catch (err) {
      setError(getApiMessage(err, 'Không tải được dữ liệu phân quyền.'));
    } finally {
      setLoading(false);
    }
  }

  async function selectRole(roleId: number) {
    setSelectedRoleId(roleId);
    setError('');

    try {
      const role = await getRoleById(roleId);
      setRoles((previous) =>
        previous.map((item) => (item.id === role.id ? role : item))
      );
      setSelectedPermissionIds(role.permissions.map((permission) => permission.id));
    } catch (err) {
      setError(getApiMessage(err, 'Không tải được chi tiết vai trò.'));
    }
  }

  async function handleSave() {
    if (!selectedRoleId || !canWriteRole) {
      return;
    }

    setSaving(true);
    try {
      const updatedRole = await updateRolePermissions(selectedRoleId, {
        permissionIds: selectedPermissionIds,
      });
      setRoles((previous) =>
        previous.map((role) => (role.id === updatedRole.id ? updatedRole : role))
      );
      setSelectedPermissionIds(updatedRole.permissions.map((permission) => permission.id));
      message.success('Cập nhật permission cho role thành công.');
      message.info('Permission changes will take effect after the affected user signs in again.');
      await selectRole(selectedRoleId);
    } catch (err) {
      message.error(getApiMessage(err, 'Không cập nhật được permission cho vai trò.'));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <AdminShell currentUser={currentUser}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Typography.Title level={2} style={{ margin: 0 }}>
            Phân quyền
          </Typography.Title>
          <Typography.Text type="secondary">
            Quản lý danh sách quyền được gán cho từng vai trò.
          </Typography.Text>
        </div>

        {error ? <Alert type="error" showIcon message={error} /> : null}

        <Spin spinning={loading}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card title="Vai trò" bordered={false}>
                <List
                  dataSource={roles}
                  locale={{ emptyText: 'Chưa có vai trò' }}
                  renderItem={(role) => (
                    <List.Item
                      onClick={() => void selectRole(role.id)}
                      style={{
                        cursor: 'pointer',
                        background: selectedRoleId === role.id ? '#e6f4ff' : undefined,
                        paddingLeft: 12,
                        paddingRight: 12,
                        borderRadius: 6,
                      }}
                    >
                      <Space direction="vertical" size={2}>
                        <Typography.Text strong>{role.name}</Typography.Text>
                        <Typography.Text type="secondary">
                          {role.permissions.length} quyền
                        </Typography.Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>

            <Col xs={24} md={16}>
              <Card
                bordered={false}
                title={selectedRole ? `Permission của ${selectedRole.name}` : 'Permission'}
                extra={
                  canWriteRole ? (
                    <Button type="primary" loading={saving} onClick={handleSave}>
                      Lưu thay đổi
                    </Button>
                  ) : (
                    <Tag>Chỉ xem</Tag>
                  )
                }
              >
                <Checkbox.Group
                  value={selectedPermissionIds}
                  onChange={(values) => setSelectedPermissionIds(values.map(Number))}
                  disabled={!canWriteRole}
                  style={{ width: '100%' }}
                >
                  <Row gutter={[12, 12]}>
                    {permissions.map((permission) => (
                      <Col xs={24} md={12} key={permission.id}>
                        <Checkbox value={permission.id}>
                          <Space direction="vertical" size={0}>
                            <Typography.Text strong>{permission.name}</Typography.Text>
                            <Typography.Text type="secondary">
                              {permission.description}
                            </Typography.Text>
                          </Space>
                        </Checkbox>
                      </Col>
                    ))}
                  </Row>
                </Checkbox.Group>
              </Card>
            </Col>
          </Row>
        </Spin>
      </Space>
    </AdminShell>
  );
};

export default RoleManagementPage;
