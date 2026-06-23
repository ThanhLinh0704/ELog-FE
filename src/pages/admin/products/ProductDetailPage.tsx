import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Card, Button, Space, Breadcrumb, Row, Col, Descriptions, Tag, Result, Spin, message, Badge, Typography
} from 'antd';
import { ArrowLeft, Edit3, Lock, Unlock, Package, Calendar, BarChart2 } from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import type { Product } from '../../../types/product';
import { productApi } from '../../../api/productApi';
import { formatVolume, formatWeight } from '../../../utils/numberFormat';
import { calculateAccumulation } from '../../../utils/productCalculations';
import DeactivateProductModal from './components/DeactivateProductModal';
import ActivateProductModal from './components/ActivateProductModal';

const { Paragraph, Text } = Typography;

// Helper to format date string to DD/MM/YYYY HH:mm
const formatDate = (isoString?: string): string => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (e) {
    return isoString;
  }
};

const ProductDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();

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
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [deactivateVisible, setDeactivateVisible] = useState(false);
  const [activateVisible, setActivateVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const fetchProductDetails = async () => {
    if (!productId) return;
    setLoading(true);
    setError('');
    try {
      const data = await productApi.getProductById(productId);
      setProduct(data);
    } catch (err: any) {
      setError(err.message === '404' ? 'Không tìm thấy sản phẩm.' : 'Không thể tải chi tiết sản phẩm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductDetails();
  }, [productId]);

  const handleDeactivate = async () => {
    if (!product) return;
    setModalLoading(true);
    try {
      await productApi.updateStatus(product.id, 'INACTIVE');
      message.success('Sản phẩm đã được vô hiệu hoá');
      setDeactivateVisible(false);
      fetchProductDetails();
    } catch (err: any) {
      message.error(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleActivate = async () => {
    if (!product) return;
    setModalLoading(true);
    try {
      await productApi.updateStatus(product.id, 'ACTIVE');
      message.success('Sản phẩm đã được kích hoạt');
      setActivateVisible(false);
      fetchProductDetails();
    } catch (err: any) {
      message.error(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setModalLoading(false);
    }
  };

  // Handle 404/Error
  if (error) {
    return (
      <AdminShell currentUser={currentUser}>
        <Result
          status="404"
          title="404"
          subTitle={error}
          extra={
            <Button type="primary" onClick={() => navigate('/admin/products')}>
              Quay lại danh mục sản phẩm
            </Button>
          }
        />
      </AdminShell>
    );
  }

  // Pre-calculations for accumulated examples
  const accum10 = product ? calculateAccumulation(product.volumeM3, product.weightKg, 10) : null;
  const accum20 = product ? calculateAccumulation(product.volumeM3, product.weightKg, 20) : null;

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Breadcrumb & Navigation */}
        <div>
          <Breadcrumb
            items={[
              { title: 'Admin' },
              { title: <Link to="/admin/products">Quản lý sản phẩm</Link> },
              { title: product ? product.sku : 'Chi tiết sản phẩm' }
            ]}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1f1f1f' }}>
                {product?.productName || 'Chi tiết sản phẩm'}
              </h2>
              {product && (
                <Tag color={product.status === 'ACTIVE' ? 'success' : 'default'} style={{ borderRadius: 6, fontWeight: 500, margin: 0 }}>
                  {product.status === 'ACTIVE' ? 'Đang kinh doanh' : 'Ngừng kinh doanh'}
                </Tag>
              )}
            </div>

            {/* Quick Actions (only for SYSTEM_ADMIN) */}
            {isSystemAdmin && product && (
              <Space>
                <Button
                  icon={<Edit3 size={16} />}
                  onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                >
                  Sửa
                </Button>
                {product.status === 'ACTIVE' ? (
                  <Button
                    danger
                    icon={<Lock size={16} />}
                    onClick={() => setDeactivateVisible(true)}
                  >
                    Vô hiệu hoá
                  </Button>
                ) : (
                  <Button
                    style={{ color: '#52c41a', borderColor: '#52c41a' }}
                    icon={<Unlock size={16} />}
                    onClick={() => setActivateVisible(true)}
                  >
                    Kích hoạt
                  </Button>
                )}
              </Space>
            )}
          </div>
        </div>

        {/* Back Link */}
        <div>
          <Button
            type="text"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate('/admin/products')}
            style={{ paddingLeft: 0, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            Quay lại danh mục
          </Button>
        </div>

        {loading || !product ? (
          <Card bordered={false} style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: 16 }}>Đang tải thông tin chi tiết...</Paragraph>
          </Card>
        ) : (
          <Row gutter={[24, 24]}>
            {/* Card 1: Basic Info */}
            <Col xs={24} md={12}>
              <Card
                title={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Package size={18} style={{ color: '#1677ff' }} />
                    <span>Thông tin sản phẩm</span>
                  </span>
                }
                bordered={false}
                style={{ height: '100%', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}
              >
                <Descriptions column={1} bordered size="small">
                  <Descriptions.Item label={<span style={{ fontWeight: 600 }}>Mã SKU</span>}>
                    <strong style={{ color: '#0f172a' }}>{product.sku}</strong>
                  </Descriptions.Item>
                  <Descriptions.Item label={<span style={{ fontWeight: 600 }}>Tên sản phẩm</span>}>
                    {product.productName}
                  </Descriptions.Item>
                  <Descriptions.Item label={<span style={{ fontWeight: 600 }}>Trạng thái</span>}>
                    <Badge
                      status={product.status === 'ACTIVE' ? 'success' : 'error'}
                      text={product.status === 'ACTIVE' ? 'Đang kinh doanh' : 'Ngừng kinh doanh'}
                    />
                  </Descriptions.Item>
                  <Descriptions.Item label={<span style={{ fontWeight: 600 }}><Calendar size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} /> Ngày tạo</span>}>
                    {formatDate(product.createdAt)}
                  </Descriptions.Item>
                  <Descriptions.Item label={<span style={{ fontWeight: 600 }}><Calendar size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} /> Ngày cập nhật cuối</span>}>
                    {formatDate(product.updatedAt)}
                  </Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>

            {/* Card 2: Physical Specs & Accumulation Examples */}
            <Col xs={24} md={12}>
              <Card
                title={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BarChart2 size={18} style={{ color: '#1677ff' }} />
                    <span>Thông số vật lý (per unit)</span>
                  </span>
                }
                bordered={false}
                style={{ height: '100%', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}
              >
                <Descriptions column={1} bordered size="small" style={{ marginBottom: 20 }}>
                  <Descriptions.Item label={<span style={{ fontWeight: 600 }}>Kích thước</span>}>
                    {product.lengthM} × {product.widthM} × {product.heightM} m
                  </Descriptions.Item>
                  <Descriptions.Item label={<span style={{ fontWeight: 600 }}>Thể tích</span>}>
                    <strong style={{ color: '#1677ff' }}>{formatVolume(product.volumeM3)}</strong>
                  </Descriptions.Item>
                  <Descriptions.Item label={<span style={{ fontWeight: 600 }}>Trọng lượng</span>}>
                    <strong>{formatWeight(product.weightKg)}</strong>
                  </Descriptions.Item>
                </Descriptions>

                {/* Accumulation Examples */}
                {accum10 && accum20 && (
                  <Card
                    type="inner"
                    title={<span style={{ fontSize: 13, color: '#475569', fontWeight: 700 }}>Ví dụ tích luỹ</span>}
                    style={{ backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div>
                        <Text strong style={{ color: '#475569' }}>10 cái</Text>
                        <span style={{ margin: '0 8px', color: '#cbd5e1' }}>→</span>
                        <Text style={{ fontWeight: 600, color: '#0f172a' }}>
                          {accum10.volumeM3.toFixed(3)} m³
                        </Text>
                        <span style={{ margin: '0 6px', color: '#94a3b8' }}>·</span>
                        <Text style={{ fontWeight: 600, color: '#0f172a' }}>
                          {accum10.weightKg.toFixed(3)} kg
                        </Text>
                      </div>
                      <div>
                        <Text strong style={{ color: '#475569' }}>20 cái</Text>
                        <span style={{ margin: '0 8px', color: '#cbd5e1' }}>→</span>
                        <Text style={{ fontWeight: 600, color: '#0f172a' }}>
                          {accum20.volumeM3.toFixed(3)} m³
                        </Text>
                        <span style={{ margin: '0 6px', color: '#94a3b8' }}>·</span>
                        <Text style={{ fontWeight: 600, color: '#0f172a' }}>
                          {accum20.weightKg.toFixed(3)} kg
                        </Text>
                      </div>
                    </div>
                  </Card>
                )}
              </Card>
            </Col>
          </Row>
        )}
      </div>

      {/* Confirmation Modals */}
      <DeactivateProductModal
        visible={deactivateVisible}
        productSku={product?.sku || ''}
        loading={modalLoading}
        onCancel={() => setDeactivateVisible(false)}
        onConfirm={handleDeactivate}
      />

      <ActivateProductModal
        visible={activateVisible}
        productSku={product?.sku || ''}
        loading={modalLoading}
        onCancel={() => setActivateVisible(false)}
        onConfirm={handleActivate}
      />
    </AdminShell>
  );
};

export default ProductDetailPage;
