import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Breadcrumb, Button, Card, Col, Form, Input, Row, message } from 'antd';
import { ArrowLeft } from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import { routeApi } from '../../../api/routeApi';

const RouteCreatePage: React.FC = () => {
  const navigate = useNavigate();

  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';
  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) {
      roles = JSON.parse(rolesStr);
    }
  } catch (error) {
    console.error('Failed to parse roles', error);
  }

  const currentUser = {
    id: Number(userId),
    username,
    fullName: username,
    roles,
  };

  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const description = Form.useWatch('description', form) || '';

  const handleSubmit = async (values: { code: string; name: string; description?: string }) => {
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

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <Breadcrumb
            items={[
              { title: 'Admin' },
              { title: <Link to="/admin/routes">Quản lý tuyến</Link> },
              { title: 'Tạo tuyến mới' },
            ]}
          />
          <h2 style={{ margin: '8px 0 0 0', fontSize: 24, fontWeight: 700, color: '#1f1f1f' }}>
            Tạo tuyến mới
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>
            Khai báo thông tin cơ bản cho tuyến giao hàng cố định.
          </p>
        </div>

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
                <Form.Item
                  label={<span style={{ fontWeight: 600, color: '#475569' }}>Mã tuyến <span style={{ color: '#ff4d4f' }}>*</span></span>}
                  name="code"
                  rules={[
                    { required: true, message: 'Vui lòng nhập mã tuyến' },
                    {
                      validator: (_, value) => {
                        if (value) {
                          if (value.trim().length === 0) {
                            return Promise.reject(new Error('Vui lòng nhập mã tuyến'));
                          }
                          if (!/^[a-zA-Z0-9-_]+$/.test(value.trim())) {
                            return Promise.reject(
                              new Error('Mã tuyến chỉ được chứa chữ in hoa, số, dấu gạch ngang hoặc gạch dưới')
                            );
                          }
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input
                    placeholder="Ví dụ: RT-BT-01"
                    disabled={submitting}
                    onChange={(event) => {
                      form.setFieldValue('code', event.target.value.toUpperCase());
                    }}
                    maxLength={100}
                  />
                </Form.Item>

                <Form.Item
                  label={<span style={{ fontWeight: 600, color: '#475569' }}>Tên tuyến <span style={{ color: '#ff4d4f' }}>*</span></span>}
                  name="name"
                  rules={[
                    { required: true, message: 'Vui lòng nhập tên tuyến' },
                    {
                      validator: (_, value) => {
                        if (value && value.trim().length === 0) {
                          return Promise.reject(new Error('Vui lòng nhập tên tuyến'));
                        }
                        return Promise.resolve();
                      },
                    },
                  ]}
                >
                  <Input placeholder="Nhập tên tuyến" disabled={submitting} maxLength={200} />
                </Form.Item>

                <Form.Item
                  label={<span style={{ fontWeight: 600, color: '#475569' }}>Mô tả</span>}
                  name="description"
                >
                  <Input.TextArea
                    placeholder="Mô tả phạm vi hoặc khu vực của tuyến"
                    disabled={submitting}
                    rows={4}
                    maxLength={500}
                  />
                </Form.Item>

                <div style={{ textAlign: 'right', marginTop: -12, marginBottom: 12, color: '#94a3b8', fontSize: 12 }}>
                  {description.length} / 500 ký tự
                </div>
              </Card>
            </Col>
          </Row>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              marginTop: 24,
              maxWidth: 'calc(100% * 16 / 24)',
              padding: '16px 24px',
              backgroundColor: '#fff',
              borderRadius: 12,
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
            }}
          >
            <Button disabled={submitting} onClick={() => navigate('/admin/routes')}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting}>
              Tạo tuyến
            </Button>
          </div>
        </Form>
      </div>
    </AdminShell>
  );
};

export default RouteCreatePage;
