import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Form, Input, Button, Card, Row, Col, Breadcrumb, Typography, message
} from 'antd';
import { ArrowLeft } from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import { routeApi } from '../../../api/routeApi';

const { Paragraph } = Typography;

const RouteCreatePage: React.FC = () => {
  const navigate = useNavigate();

  // Retrieve current user roles from localStorage
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

  const isAdmin = roles.includes('SYSTEM_ADMIN');
  const currentUser = {
    id: Number(userId),
    username,
    fullName: username,
    roles,
  };

  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Watch description for character counter
  const description = Form.useWatch('description', form) || '';

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const codeFormatted = values.code.toUpperCase().trim();
      const payload = {
        code: codeFormatted,
        name: values.name.trim(),
        description: values.description ? values.description.trim() : '',
      };

      const newRoute = await routeApi.createRoute(payload);
      
      message.success(`Tuyến ${newRoute.code} đã được tạo. Hãy thêm ít nhất 2 điểm dừng để kích hoạt.`);
      navigate(`/admin/routes/${newRoute.id}`);
    } catch (err: any) {
      if (err.status === 409 && err.field === 'code') {
        form.setFields([
          {
            name: 'code',
            errors: [err.message || 'Mã tuyến này đã tồn tại'],
          },
        ]);
        form.scrollToField('code');
      } else {
        message.error(err.message || 'Đã xảy ra lỗi trong quá trình lưu thông tin.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Render 403 page if not admin (this is a precaution; the guard should also handle it)
  if (!isAdmin) {
    return (
      <AdminShell currentUser={currentUser}>
        <Card bordered={false} style={{ textAlign: 'center', padding: '40px 0' }}>
          <Paragraph type="danger" style={{ fontSize: 16 }}>
            Bạn không có quyền thực hiện thao tác này.
          </Paragraph>
          <Button type="primary" onClick={() => navigate('/admin/routes')}>
            Quay lại danh sách tuyến
          </Button>
        </Card>
      </AdminShell>
    );
  }

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Breadcrumbs & Title */}
        <div>
          <Breadcrumb
            items={[
              { title: 'Admin' },
              { title: <Link to="/admin/routes">Quản lý tuyến</Link> },
              { title: 'Tạo tuyến mới' }
            ]}
          />
          <h2 style={{ margin: '8px 0 0 0', fontSize: 24, fontWeight: 700, color: '#1f1f1f' }}>
            Tạo tuyến mới
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>
            Khai báo thông tin cơ bản cho tuyến giao hàng cố định.
          </p>
        </div>

        {/* Back Link */}
        <div>
          <Button
            type="text"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate('/admin/routes')}
            style={{ paddingLeft: 0, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            Quay lại
          </Button>
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          scrollToFirstError
          requiredMark={false}
        >
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={16}>
              <Card
                title="Thông tin tuyến đường"
                bordered={false}
                style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}
              >
                {/* Code Field */}
                <Form.Item
                  label={
                    <span style={{ fontWeight: 600, color: '#475569' }}>
                      Mã tuyến <span style={{ color: '#ff4d4f' }}>*</span>
                    </span>
                  }
                  name="code"
                  rules={[
                    { required: true, message: 'Vui lòng nhập mã tuyến' },
                    {
                      validator: (_, value) => {
                        if (value) {
                          if (value.trim().length === 0) {
                            return Promise.reject(new Error('Vui lòng nhập mã tuyến'));
                          }
                          const regex = /^[a-zA-Z0-9-_]+$/;
                          if (!regex.test(value.trim())) {
                            return Promise.reject(
                              new Error('Mã tuyến chỉ được chứa chữ in hoa, số, dấu gạch ngang hoặc gạch dưới')
                            );
                          }
                        }
                        return Promise.resolve();
                      }
                    }
                  ]}
                >
                  <Input
                    placeholder="Ví dụ: RT-BT-01"
                    disabled={submitting}
                    onChange={(e) => {
                      form.setFieldValue('code', e.target.value.toUpperCase());
                    }}
                    maxLength={100}
                  />
                </Form.Item>

                {/* Name Field */}
                <Form.Item
                  label={
                    <span style={{ fontWeight: 600, color: '#475569' }}>
                      Tên tuyến <span style={{ color: '#ff4d4f' }}>*</span>
                    </span>
                  }
                  name="name"
                  rules={[
                    { required: true, message: 'Vui lòng nhập tên tuyến' },
                    {
                      validator: (_, value) => {
                        if (value && value.trim().length === 0) {
                          return Promise.reject(new Error('Vui lòng nhập tên tuyến'));
                        }
                        return Promise.resolve();
                      }
                    }
                  ]}
                >
                  <Input
                    placeholder="Nhập tên tuyến"
                    disabled={submitting}
                    maxLength={200}
                  />
                </Form.Item>

                {/* Description Field */}
                <Form.Item
                  label={
                    <span style={{ fontWeight: 600, color: '#475569' }}>Mô tả</span>
                  }
                  name="description"
                >
                  <Input.TextArea
                    placeholder="Mô tả phạm vi hoặc khu vực của tuyến"
                    disabled={submitting}
                    rows={4}
                    maxLength={500}
                  />
                </Form.Item>

                {/* Character Counter */}
                <div style={{ textAlign: 'right', marginTop: -12, marginBottom: 12, color: '#94a3b8', fontSize: 12 }}>
                  {description.length} / 500 ký tự
                </div>
              </Card>
            </Col>
          </Row>

          {/* Footer Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            marginTop: 24,
            maxWidth: 'calc(100% * 16 / 24)', // align with card size
            padding: '16px 24px',
            backgroundColor: '#fff',
            borderRadius: 12,
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)'
          }}>
            <Button
              disabled={submitting}
              onClick={() => navigate('/admin/routes')}
            >
              Huỷ
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              disabled={submitting}
            >
              Tạo tuyến
            </Button>
          </div>
        </Form>
      </div>
    </AdminShell>
  );
};

export default RouteCreatePage;
