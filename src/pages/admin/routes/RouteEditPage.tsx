import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Breadcrumb, Button, Card, Col, Form, Input, Result, Row, Spin, Typography, message } from 'antd';
import { ArrowLeft } from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import { routeApi } from '../../../api/routeApi';

const { Paragraph } = Typography;

const RouteEditPage: React.FC = () => {
  const navigate = useNavigate();
  const { routeId } = useParams<{ routeId: string }>();

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
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const description = Form.useWatch('description', form) || '';

  useEffect(() => {
    if (!routeId) {
      return;
    }

    const fetchRoute = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const route = await routeApi.getRouteById(routeId);
        form.setFieldsValue({
          code: route.code,
          name: route.name,
          description: route.description,
        });
      } catch (err: any) {
        setLoadError(
          err.message === '404'
            ? 'Không tìm thấy tuyến đường yêu cầu.'
            : 'Không thể tải dữ liệu tuyến đường.'
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchRoute();
  }, [routeId, form]);

  const handleSubmit = async (values: { name: string; description?: string }) => {
    if (!routeId) return;

    setSubmitting(true);
    try {
      const payload = {
        name: values.name.trim(),
        description: values.description ? values.description.trim() : '',
      };

      await routeApi.updateRoute(routeId, payload);
      message.success('Thông tin tuyến đã được cập nhật');
      navigate(`/admin/routes/${routeId}`);
    } catch (err: any) {
      message.error(err.message || 'Đã xảy ra lỗi trong quá trình lưu thông tin.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <AdminShell currentUser={currentUser}>
        <Result
          status="404"
          title="Không tìm thấy tuyến đường"
          subTitle={loadError}
          extra={
            <Button type="primary" onClick={() => navigate('/admin/routes')}>
              Quay lại danh sách tuyến
            </Button>
          }
        />
      </AdminShell>
    );
  }

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <Breadcrumb
            items={[
              { title: 'Admin' },
              { title: <Link to="/admin/routes">Quản lý tuyến</Link> },
              { title: 'Chỉnh sửa tuyến' },
            ]}
          />
          <h2 style={{ margin: '8px 0 0 0', fontSize: 24, fontWeight: 700, color: '#1f1f1f' }}>
            Chỉnh sửa tuyến
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>
            Cập nhật thông tin chi tiết cho tuyến giao hàng.
          </p>
        </div>

        <div>
          <Button
            type="text"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate(`/admin/routes/${routeId}`)}
            style={{ paddingLeft: 0, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            Quay lại chi tiết tuyến
          </Button>
        </div>

        {loading ? (
          <Card bordered={false} style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: 16 }}>Đang tải dữ liệu tuyến đường...</Paragraph>
          </Card>
        ) : (
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
                    label={<span style={{ fontWeight: 600, color: '#475569' }}>Mã tuyến</span>}
                    name="code"
                  >
                    <Input disabled style={{ backgroundColor: '#f1f5f9', color: '#64748b' }} />
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
              <Button disabled={submitting} onClick={() => navigate(`/admin/routes/${routeId}`)}>
                Hủy
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting} disabled={submitting}>
                Lưu thay đổi
              </Button>
            </div>
          </Form>
        )}
      </div>
    </AdminShell>
  );
};

export default RouteEditPage;
