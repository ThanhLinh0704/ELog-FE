import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Card, Row, Col } from 'antd';
import { Mail } from 'lucide-react';
import { USER_ROLES } from '../config';
import { 
  buildCreateUserPayload, 
  buildUpdateUserPayload, 
  type User, 
  type CreateUserPayload, 
  type UpdateUserPayload 
} from '../utils/userMapper';

interface UserFormModalProps {
  mode: 'create' | 'edit';
  user: User | null;
  onClose: () => void;
  onCreate: (payload: CreateUserPayload) => Promise<void>;
  onUpdateProfile: (id: number, payload: UpdateUserPayload) => Promise<void>;
  onUpdateRoles: (id: number, roles: string[]) => Promise<void>;
  apiFieldErrors?: Record<string, string>;
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
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [resetNotice, setResetNotice] = useState('');

  // Reset form values when user changes or modal opens
  useEffect(() => {
    form.resetFields();
    setResetNotice('');
  }, [user, mode, form]);

  // Map backend API validation errors to Form fields
  useEffect(() => {
    if (apiFieldErrors && Object.keys(apiFieldErrors).length > 0) {
      const fieldErrors = Object.entries(apiFieldErrors).map(([name, errorMsg]) => ({
        name,
        errors: [errorMsg],
      }));
      form.setFields(fieldErrors);
    }
  }, [apiFieldErrors, form]);

  async function handleSubmit(values: any) {
    setSubmitting(true);
    try {
      if (isEdit && user) {
        await onUpdateProfile(user.id, buildUpdateUserPayload(values));
        await onUpdateRoles(user.id, values.roles);
      } else {
        await onCreate(buildCreateUserPayload(values));
      }
    } catch (err) {
      // The API error mapper will update apiFieldErrors, which sets errors inside the form
    } finally {
      setSubmitting(false);
    }
  }

  const initialValues = {
    fullName: user?.fullName || '',
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    confirmPassword: '',
    roles: user?.roles || [],
  };

  return (
    <Modal
      open={true}
      title={isEdit ? 'Chỉnh sửa người dùng' : 'Thêm tài khoản nội bộ'}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={submitting}>
          Hủy
        </Button>,
        <Button key="submit" type="primary" loading={submitting} onClick={() => form.submit()}>
          {isEdit ? 'Lưu thay đổi' : 'Tạo người dùng'}
        </Button>
      ]}
      width={600}
      destroyOnClose
    >
      <div style={{ padding: '12px 0 0 0' }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={initialValues}
          onFinish={handleSubmit}
          requiredMark="optional"
        >
          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[{ required: true, message: 'Họ và tên là bắt buộc.' }]}
          >
            <Input placeholder="Nguyễn Văn A" size="large" />
          </Form.Item>

          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Username là bắt buộc.' }]}
            extra={isEdit ? 'Username không được sửa theo API Contract.' : null}
          >
            <Input placeholder="dispatcher01" disabled={isEdit} size="large" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Email là bắt buộc.' },
              { type: 'email', message: 'Email không đúng định dạng.' }
            ]}
          >
            <Input placeholder="user@elog.vn" size="large" />
          </Form.Item>

          {!isEdit ? (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="password"
                  label="Mật khẩu"
                  rules={[
                    { required: true, message: 'Mật khẩu là bắt buộc.' },
                    { min: 8, message: 'Mật khẩu cần ít nhất 8 ký tự.' }
                  ]}
                >
                  <Input.Password placeholder="Tối thiểu 8 ký tự" size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="confirmPassword"
                  label="Xác nhận mật khẩu"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: 'Cần xác nhận mật khẩu.' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('Mật khẩu xác nhận không khớp.'));
                      },
                    }),
                  ]}
                >
                  <Input.Password placeholder="Xác nhận mật khẩu" size="large" />
                </Form.Item>
              </Col>
            </Row>
          ) : (
            <Card size="small" style={{ marginBottom: 24, background: '#fafafa', borderRadius: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#1f1f1f' }}>Mật khẩu</div>
                  <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                    API Contract hiện chưa có endpoint reset password riêng. Nút này chỉ hiển thị giả lập UI.
                  </div>
                  {resetNotice ? (
                    <div style={{ fontSize: 12, color: '#1890ff', marginTop: 4 }}>{resetNotice}</div>
                  ) : null}
                </div>
                <Button 
                  icon={<Mail size={16} />} 
                  onClick={() => setResetNotice('Chưa gọi API vì contract hiện chưa khai báo endpoint reset password.')}
                >
                  Đặt lại mật khẩu
                </Button>
              </div>
            </Card>
          )}

          <Form.Item
            name="roles"
            label="Vai trò"
            rules={[{ required: true, message: 'Cần chọn ít nhất một vai trò.' }]}
          >
            <Select
              mode="multiple"
              placeholder="Chọn vai trò..."
              size="large"
              options={USER_ROLES.map((r) => ({ value: r.value, label: r.label }))}
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default UserFormModal;
