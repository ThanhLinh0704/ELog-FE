import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Card, Row, Col, Space, Button, Input, Select, Breadcrumb,
  Statistic, Tag, message, Alert, Tooltip, Empty, Typography
} from 'antd';
import { Edit3, Eye, Lock, Unlock, Plus, RefreshCw, Search } from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import type { Product, ProductStatus } from '../../../types/product';
import { productApi } from '../../../api/productApi';
import { formatVolume, formatWeight } from '../../../utils/numberFormat';
import DeactivateProductModal from './components/DeactivateProductModal';
import ActivateProductModal from './components/ActivateProductModal';

const { Paragraph } = Typography;

const ProductListPage: React.FC = () => {
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

  const isSystemAdmin = roles.includes('SYSTEM_ADMIN');
  const currentUser = {
    id: Number(userId),
    username,
    fullName: username,
    roles,
  };

  // State definitions
  const [products, setProducts] = useState<Product[]>([]);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [pageMeta, setPageMeta] = useState({ totalElements: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [actionProduct, setActionProduct] = useState<Product | null>(null);
  const [deactivateVisible, setDeactivateVisible] = useState(false);
  const [activateVisible, setActivateVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Debounced search / directly fetched
  const queryParams = useMemo(() => ({
    keyword,
    status,
    page,
    size,
  }), [keyword, status, page, size]);

  const fetchProducts = async (params = queryParams) => {
    setLoading(true);
    setError('');
    try {
      const response = await productApi.getProducts(params);
      setProducts(response.content);
      setPageMeta({
        totalElements: response.totalElements,
        totalPages: response.totalPages,
      });
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách sản phẩm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(queryParams);
  }, [queryParams]);

  const handleResetFilters = () => {
    setKeyword('');
    setStatus('ALL');
    setPage(0);
  };

  // Action handlers
  const handleOpenDeactivate = (product: Product) => {
    setActionProduct(product);
    setDeactivateVisible(true);
  };

  const handleOpenActivate = (product: Product) => {
    setActionProduct(product);
    setActivateVisible(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!actionProduct) return;
    setModalLoading(true);
    try {
      await productApi.updateStatus(actionProduct.id, 'INACTIVE');
      message.success(`Sản phẩm [${actionProduct.sku}] đã được vô hiệu hoá`);
      setDeactivateVisible(false);
      setActionProduct(null);
      fetchProducts();
    } catch (err: any) {
      message.error(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmActivate = async () => {
    if (!actionProduct) return;
    setModalLoading(true);
    try {
      await productApi.updateStatus(actionProduct.id, 'ACTIVE');
      message.success(`Sản phẩm [${actionProduct.sku}] đã được kích hoạt`);
      setActivateVisible(false);
      setActionProduct(null);
      fetchProducts();
    } catch (err: any) {
      message.error(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setModalLoading(false);
    }
  };

  // Table columns definition
  const columns = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (sku: string) => <strong style={{ color: '#0f172a' }}>{sku}</strong>,
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'productName',
      key: 'productName',
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: 'Trọng lượng',
      dataIndex: 'weightKg',
      key: 'weightKg',
      render: (weight: number) => formatWeight(weight),
    },
    {
      title: 'Thể tích',
      dataIndex: 'volumeM3',
      key: 'volumeM3',
      render: (volume: number) => formatVolume(volume),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (prodStatus: ProductStatus) => {
        const isActive = prodStatus === 'ACTIVE';
        return (
          <Tag color={isActive ? 'success' : 'default'} style={{ borderRadius: 6, fontWeight: 500 }}>
            {isActive ? 'Đang kinh doanh' : 'Ngừng kinh doanh'}
          </Tag>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: Product) => (
        <Space size="small">
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              icon={<Eye size={16} />}
              onClick={() => navigate(`/admin/products/${record.id}`)}
            />
          </Tooltip>

          {isSystemAdmin && (
            <>
              <Tooltip title="Chỉnh sửa">
                <Button
                  type="text"
                  icon={<Edit3 size={16} />}
                  onClick={() => navigate(`/admin/products/${record.id}/edit`)}
                />
              </Tooltip>

              {record.status === 'ACTIVE' ? (
                <Tooltip title="Vô hiệu hoá">
                  <Button
                    type="text"
                    danger
                    icon={<Lock size={16} />}
                    onClick={() => handleOpenDeactivate(record)}
                  />
                </Tooltip>
              ) : (
                <Tooltip title="Kích hoạt">
                  <Button
                    type="text"
                    style={{ color: '#52c41a' }}
                    icon={<Unlock size={16} />}
                    onClick={() => handleOpenActivate(record)}
                  />
                </Tooltip>
              )}
            </>
          )}
        </Space>
      ),
    },
  ];

  // Helper check for fully empty list (before filter) vs filter empty
  const isFullyEmpty = products.length === 0 && keyword === '' && status === 'ALL' && !loading;

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Header Breadcrumb & Title */}
        <div>
          <Breadcrumb
            items={[
              { title: 'Admin' },
              { title: 'Quản lý sản phẩm' }
            ]}
          />
          <h2 style={{ margin: '8px 0 0 0', fontSize: 24, fontWeight: 700, color: '#1f1f1f' }}>
            Danh mục sản phẩm
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>
            Quản lý thông tin và thông số vật lý của các sản phẩm giao vận.
          </p>
        </div>

        {/* Statistic Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card size="small" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
              <Statistic title="Tổng sản phẩm phù hợp" value={pageMeta.totalElements} suffix="sản phẩm" />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
              <Statistic title="Trang hiện tại" value={page + 1} suffix={`/ ${pageMeta.totalPages} trang`} />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
              <Statistic title="Quyền truy cập" value={isSystemAdmin ? 'Quản trị viên' : 'Chỉ xem'} suffix={isSystemAdmin ? 'SYSTEM_ADMIN' : 'READ_ONLY'} />
            </Card>
          </Col>
        </Row>

        {/* Main List Card */}
        <Card bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
          {/* Filters and Toolbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <Space size="middle" wrap style={{ flex: 1 }}>
              <Input
                placeholder="Tìm theo SKU hoặc tên sản phẩm..."
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  setPage(0);
                }}
                prefix={<Search size={16} style={{ color: '#bfbfbf' }} />}
                style={{ width: 280, borderRadius: 6 }}
                allowClear
              />
              <Select
                placeholder="Trạng thái"
                value={status}
                onChange={(val) => {
                  setStatus(val);
                  setPage(0);
                }}
                style={{ width: 180 }}
                options={[
                  { value: 'ALL', label: 'Tất cả trạng thái' },
                  { value: 'ACTIVE', label: 'Đang kinh doanh' },
                  { value: 'INACTIVE', label: 'Ngừng kinh doanh' }
                ]}
              />
            </Space>

            <Space size="small">
              <Button
                icon={<RefreshCw size={14} />}
                onClick={() => fetchProducts()}
              >
                Tải lại
              </Button>
              {isSystemAdmin && (
                <Button
                  type="primary"
                  icon={<Plus size={14} />}
                  onClick={() => navigate('/admin/products/new')}
                >
                  Thêm sản phẩm
                </Button>
              )}
            </Space>
          </div>

          {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />}

          {/* Table list */}
          {isFullyEmpty ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  isSystemAdmin ? (
                    <div>
                      <Paragraph strong style={{ fontSize: 16, margin: 0 }}>Danh mục chưa có sản phẩm.</Paragraph>
                      <Paragraph style={{ color: '#8c8c8c' }}>Hãy thêm sản phẩm đầu tiên để bắt đầu quản lý.</Paragraph>
                    </div>
                  ) : (
                    <Paragraph strong style={{ fontSize: 16 }}>Danh mục chưa có sản phẩm.</Paragraph>
                  )
                }
              >
                {isSystemAdmin && (
                  <Button type="primary" icon={<Plus size={14} />} onClick={() => navigate('/admin/products/new')}>
                    Thêm sản phẩm
                  </Button>
                )}
              </Empty>
            </div>
          ) : (
            <Table
              columns={columns}
              dataSource={products}
              rowKey="id"
              loading={loading}
              scroll={{ x: 'max-content' }}
              pagination={{
                current: page + 1,
                pageSize: size,
                total: pageMeta.totalElements,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50'],
                onChange: (p, s) => {
                  setPage(p - 1);
                  if (s) setSize(s);
                },
                showTotal: (total) => `Tổng cộng ${total} sản phẩm`,
                position: ['bottomRight'],
              }}
              locale={{
                emptyText: (
                  <Empty
                    description="Không tìm thấy sản phẩm phù hợp"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  >
                    <Button onClick={handleResetFilters}>Xoá bộ lọc</Button>
                  </Empty>
                )
              }}
            />
          )}
        </Card>
      </div>

      {/* Confirmation Modals */}
      <DeactivateProductModal
        visible={deactivateVisible}
        productSku={actionProduct?.sku || ''}
        loading={modalLoading}
        onCancel={() => {
          setDeactivateVisible(false);
          setActionProduct(null);
        }}
        onConfirm={handleConfirmDeactivate}
      />

      <ActivateProductModal
        visible={activateVisible}
        productSku={actionProduct?.sku || ''}
        loading={modalLoading}
        onCancel={() => {
          setActivateVisible(false);
          setActionProduct(null);
        }}
        onConfirm={handleConfirmActivate}
      />
    </AdminShell>
  );
};

export default ProductListPage;
