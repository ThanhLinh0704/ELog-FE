import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Form, Input, InputNumber, Button, Card, Row, Col, Breadcrumb,
  Result, Typography, message, Spin, Switch, Select, Space
} from 'antd';
import { ArrowLeft, HelpCircle } from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import { productApi } from '../../../api/productApi';
import { calculateVolumeM3 } from '../../../utils/productCalculations';

const { Paragraph, Text } = Typography;

const ProductFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const isEditMode = !!productId;

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

  const isSystemAdmin = roles.includes('SYSTEM_ADMIN');
  const currentUser = {
    id: Number(userId),
    username,
    fullName: username,
    roles,
  };

  // State definitions
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(isEditMode);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Watch fields for real-time volume calculations
  const length = Form.useWatch('lengthM', form);
  const width = Form.useWatch('widthM', form);
  const height = Form.useWatch('heightM', form);

  const calculatedVolume = calculateVolumeM3(length, width, height);

  // Load product if editing
  useEffect(() => {
    if (isEditMode && productId) {
      const getProduct = async () => {
        setLoading(true);
        setLoadError('');
        try {
          const product = await productApi.getProductById(productId);
          form.setFieldsValue({
            sku: product.sku,
            productName: product.productName,
            lengthM: product.lengthM,
            widthM: product.widthM,
            heightM: product.heightM,
            weightKg: product.weightKg,
            shape: product.shape,
            isFragile: product.isFragile,
            packageImageUrl: product.packageImageUrl,
            description: product.description,
          });
        } catch (err: any) {
          setLoadError(err.message === '404' ? 'Không tìm thấy sản phẩm yêu cầu.' : 'Không thể tải dữ liệu sản phẩm.');
        } finally {
          setLoading(false);
        }
      };
      getProduct();
    } else {
      // Create mode: reset form
      form.resetFields();
    }
  }, [isEditMode, productId, form]);

  // Handle Form submission
  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const payload = {
        sku: values.sku.toUpperCase().trim(),
        productName: values.productName.trim(),
        lengthM: values.lengthM,
        widthM: values.widthM,
        heightM: values.heightM,
        weightKg: values.weightKg,
        shape: values.shape || null,
        isFragile: !!values.isFragile,
        packageImageUrl: values.packageImageUrl?.trim() || null,
        description: values.description?.trim() || null,
      };

      if (isEditMode && productId) {
        await productApi.updateProduct(productId, payload);
        message.success('Thông tin sản phẩm đã được lưu');
        navigate(`/admin/products/${productId}`);
      } else {
        const newProduct = await productApi.createProduct(payload);
        message.success(`Sản phẩm [${newProduct.sku}] đã được thêm vào danh mục`);
        navigate('/admin/products');
      }
    } catch (err: any) {
      if (err.status === 409 && err.field === 'sku') {
        form.setFields([
          {
            name: 'sku',
            errors: [err.message || 'SKU này đã tồn tại trong danh mục'],
          },
        ]);
        // Focus back to SKU field on error
        form.scrollToField('sku');
      } else {
        message.error(err.message || 'Đã xảy ra lỗi trong quá trình lưu thông tin.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Render 403 page if not authorized
  if (!isSystemAdmin) {
    return (
      <AdminShell currentUser={currentUser}>
        <Result
          status="403"
          title="403"
          subTitle="Bạn không có quyền thực hiện thao tác này."
          extra={
            <Button type="primary" onClick={() => navigate('/admin/products')}>
              Quay lại danh mục sản phẩm
            </Button>
          }
        />
      </AdminShell>
    );
  }

  // Render 404 page if product loading fails
  if (loadError) {
    return (
      <AdminShell currentUser={currentUser}>
        <Result
          status="404"
          title="Không tìm thấy sản phẩm"
          subTitle={loadError}
          extra={
            <Button type="primary" onClick={() => navigate('/admin/products')}>
              Quay lại danh mục sản phẩm
            </Button>
          }
        />
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
              { title: <Link to="/admin/products">Quản lý sản phẩm</Link> },
              { title: isEditMode ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm' }
            ]}
          />
          <h2 style={{ margin: '8px 0 0 0', fontSize: 24, fontWeight: 700, color: '#1f1f1f' }}>
            {isEditMode ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'}
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>
            {isEditMode
              ? 'Cập nhật thông tin và thông số vật lý của sản phẩm.'
              : 'Khai báo thông tin và kích thước bao bì của sản phẩm.'}
          </p>
        </div>

        {/* Back Link */}
        <div>
          <Button
            type="text"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate(isEditMode ? `/admin/products/${productId}` : '/admin/products')}
            style={{ paddingLeft: 0, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            Quay lại
          </Button>
        </div>

        {loading ? (
          <Card bordered={false} style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: 16 }}>Đang tải dữ liệu sản phẩm...</Paragraph>
          </Card>
        ) : (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            scrollToFirstError
            requiredMark={false}
            initialValues={{ isFragile: false }}
          >
            <Row gutter={[24, 24]}>
              {/* Left Column: Basic Info & Packaging */}
              <Col xs={24} lg={12}>
                <Space direction="vertical" size={24} style={{ width: '100%' }}>
                  <Card
                    title="Thông tin cơ bản"
                    bordered={false}
                    style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}
                  >
                    {/* SKU input */}
                    <Form.Item
                      label={
                        <span style={{ fontWeight: 600, color: '#475569' }}>
                          SKU <span style={{ color: '#ff4d4f' }}>*</span>
                        </span>
                      }
                      name="sku"
                      rules={[
                        { required: true, message: 'Vui lòng nhập SKU' },
                        {
                          validator: (_, value) => {
                            if (value && value.trim().length === 0) {
                              return Promise.reject(new Error('SKU không thể chỉ chứa khoảng trắng'));
                            }
                            return Promise.resolve();
                          }
                        }
                      ]}
                    >
                      <Input
                        placeholder="Ví dụ: TV-SAM-55"
                        disabled={isEditMode || submitting}
                        onChange={(e) => {
                          // Automatically make uppercase
                          form.setFieldValue('sku', e.target.value.toUpperCase());
                        }}
                        maxLength={100}
                      />
                    </Form.Item>

                    {/* Product Name input */}
                    <Form.Item
                      label={
                        <span style={{ fontWeight: 600, color: '#475569' }}>
                          Tên sản phẩm <span style={{ color: '#ff4d4f' }}>*</span>
                        </span>
                      }
                      name="productName"
                      rules={[
                        { required: true, message: 'Vui lòng nhập tên sản phẩm' },
                        {
                          validator: (_, value) => {
                            if (value && value.trim().length === 0) {
                              return Promise.reject(new Error('Tên sản phẩm không thể chỉ chứa khoảng trắng'));
                            }
                            return Promise.resolve();
                          }
                        }
                      ]}
                    >
                      <Input
                        placeholder="Nhập tên sản phẩm"
                        disabled={submitting}
                        maxLength={200}
                      />
                    </Form.Item>
                  </Card>

                  <Card
                    title="Đặc tính & Mô tả đóng gói"
                    bordered={false}
                    style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}
                  >
                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          label={<span style={{ fontWeight: 600, color: '#475569' }}>Hình dáng đóng gói</span>}
                          name="shape"
                        >
                          <Select placeholder="Chọn hình dáng đóng gói" allowClear>
                            <Select.Option value="FLAT_BOX">Hộp phẳng (FLAT_BOX)</Select.Option>
                            <Select.Option value="UPRIGHT_BOX">Hộp đứng (UPRIGHT_BOX)</Select.Option>
                            <Select.Option value="RECTANGULAR_BOX">Hộp chữ nhật (RECTANGULAR_BOX)</Select.Option>
                            <Select.Option value="CUBOID">Hình hộp (CUBOID)</Select.Option>
                          </Select>
                        </Form.Item>
                      </Col>

                      <Col xs={24} sm={12}>
                        <Form.Item
                          label={<span style={{ fontWeight: 600, color: '#475569' }}>Hàng dễ vỡ</span>}
                          name="isFragile"
                          valuePropName="checked"
                        >
                          <Switch checkedChildren="Dễ vỡ" unCheckedChildren="Thông thường" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item
                      label={<span style={{ fontWeight: 600, color: '#475569' }}>Đường dẫn ảnh đóng gói (URL)</span>}
                      name="packageImageUrl"
                      rules={[{ max: 512, message: 'Đường dẫn ảnh không quá 512 ký tự.' }]}
                    >
                      <Input placeholder="VD: /images/products/tv-box.png" />
                    </Form.Item>

                    <Form.Item
                      label={<span style={{ fontWeight: 600, color: '#475569' }}>Mô tả sản phẩm</span>}
                      name="description"
                    >
                      <Input.TextArea placeholder="Nhập mô tả sản phẩm..." rows={3} />
                    </Form.Item>
                  </Card>
                </Space>
              </Col>

              {/* Right Column: Physical Specs */}
              <Col xs={24} lg={12}>
                <Card
                  title="Thông số vật lý"
                  bordered={false}
                  style={{ height: '100%', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}
                >
                  <Row gutter={[16, 12]}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        label={<span style={{ fontWeight: 600, color: '#475569' }}>Dài (m) <span style={{ color: '#ff4d4f' }}>*</span></span>}
                        name="lengthM"
                        rules={[
                          { required: true, message: 'Vui lòng nhập chiều dài' },
                          { type: 'number', min: 0.0001, message: 'Giá trị phải lớn hơn hoặc bằng 0.0001' }
                        ]}
                      >
                        <InputNumber
                          placeholder="Dài"
                          style={{ width: '100%' }}
                          min={0.0001}
                          disabled={submitting}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={12}>
                      <Form.Item
                        label={<span style={{ fontWeight: 600, color: '#475569' }}>Trọng lượng (kg) <span style={{ color: '#ff4d4f' }}>*</span></span>}
                        name="weightKg"
                        rules={[
                          { required: true, message: 'Vui lòng nhập trọng lượng' },
                          { type: 'number', min: 0.001, message: 'Giá trị phải lớn hơn hoặc bằng 0.001' }
                        ]}
                      >
                        <InputNumber
                          placeholder="Nặng"
                          style={{ width: '100%' }}
                          min={0.001}
                          disabled={submitting}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={12}>
                      <Form.Item
                        label={<span style={{ fontWeight: 600, color: '#475569' }}>Rộng (m) <span style={{ color: '#ff4d4f' }}>*</span></span>}
                        name="widthM"
                        rules={[
                          { required: true, message: 'Vui lòng nhập chiều rộng' },
                          { type: 'number', min: 0.0001, message: 'Giá trị phải lớn hơn hoặc bằng 0.0001' }
                        ]}
                      >
                        <InputNumber
                          placeholder="Rộng"
                          style={{ width: '100%' }}
                          min={0.0001}
                          disabled={submitting}
                        />
                      </Form.Item>
                    </Col>

                    <Col xs={24} sm={12}>
                      <Form.Item
                        label={<span style={{ fontWeight: 600, color: '#475569' }}>Cao (m) <span style={{ color: '#ff4d4f' }}>*</span></span>}
                        name="heightM"
                        rules={[
                          { required: true, message: 'Vui lòng nhập chiều cao' },
                          { type: 'number', min: 0.0001, message: 'Giá trị phải lớn hơn hoặc bằng 0.0001' }
                        ]}
                      >
                        <InputNumber
                          placeholder="Cao"
                          style={{ width: '100%' }}
                          min={0.0001}
                          disabled={submitting}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  {/* Volume Preview Field */}
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary" style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                      Thể tích (m³)
                    </Text>
                    <div style={{
                      backgroundColor: '#f8fafc',
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      fontSize: 16,
                      fontWeight: 700,
                      color: calculatedVolume != null ? '#0f172a' : '#94a3b8'
                    }}>
                      {calculatedVolume != null ? `${calculatedVolume.toFixed(6)} m³` : '—'}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                      <HelpCircle size={14} style={{ color: '#64748b', marginTop: 2, flexShrink: 0 }} />
                      <span style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.3 }}>
                        Nhập kích thước bao bì thực tế, bao gồm hộp đóng gói, không phải kích thước sản phẩm trần.
                      </span>
                    </div>
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
              padding: '16px 24px',
              backgroundColor: '#fff',
              borderRadius: 12,
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)'
            }}>
              <Button
                disabled={submitting}
                onClick={() => navigate(isEditMode ? `/admin/products/${productId}` : '/admin/products')}
              >
                Huỷ
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                disabled={submitting}
              >
                {isEditMode ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
              </Button>
            </div>
          </Form>
        )}
      </div>
    </AdminShell>
  );
};

export default ProductFormPage;
