import React, { useCallback, useEffect, useState } from 'react';
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Divider,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import { EyeOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { ClipboardList } from 'lucide-react';
import dayjs from 'dayjs';
import AdminShell from '../../../components/AdminShell';
import PageHeader from '../../../components/PageHeader';
import { palette } from '../../../theme/tokens';
import { searchOrders, getOrderById } from '../../../api/orderApi';
import { routeApi } from '../../../api/routeApi';
import type { OrderDetail, SearchOrdersParams } from '../../../types/order';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../../types/order';

const { Text } = Typography;
const PAGE_SIZE_DEFAULT = 20;
const SORT_DEFAULT = 'createdAt,desc';

function getCurrentUser() {
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';
  let roles: string[] = [];
  try {
    const r = localStorage.getItem('roles');
    if (r) roles = JSON.parse(r);
  } catch {}
  return { id: Number(userId), username, fullName: username, roles };
}

const statusOptions = (Object.keys(ORDER_STATUS_LABELS) as Array<keyof typeof ORDER_STATUS_LABELS>).map(
  (k) => ({ value: k, label: ORDER_STATUS_LABELS[k] })
);

const OrderManagementPage: React.FC = () => {
  const currentUser = getCurrentUser();

  // Filter state
  const [search, setSearch] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [routeId, setRouteId] = useState<number | undefined>();
  const [routeOptions, setRouteOptions] = useState<{ value: number; label: string }[]>([]);

  // Data state
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0); // 0-based
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [loading, setLoading] = useState(false);

  // Detail modal state
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);

  // Fetch routes list for filter dropdown
  useEffect(() => {
    routeApi
      .getRoutes({ page: 0, size: 200, status: 'ALL' })
      .then((res) => {
        const list = res.content || [];
        setRouteOptions(list.map((r) => ({ value: Number(r.id), label: `${r.code} - ${r.name}` })));
      })
      .catch((err) => console.error('Failed to load routes for filter', err));
  }, []);

  const fetchOrders = useCallback(
    async (params: SearchOrdersParams) => {
      setLoading(true);
      try {
        const result = await searchOrders(params);
        setOrders(result.data);
        setTotalElements(result.totalElements);
      } catch (err: any) {
        console.error('Failed to fetch orders', err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchOrders({ search, deliveryDate, status, routeId, page, size: pageSize, sort: SORT_DEFAULT });
  }, [fetchOrders, search, deliveryDate, status, routeId, page, pageSize]);

  // When filter changes, reset to page 0
  const handleSearch = (value: string) => {
    setPage(0);
    setSearch(value);
  };
  const handleDateChange = (date: dayjs.Dayjs | null) => {
    setPage(0);
    setDeliveryDate(date ? date.format('YYYY-MM-DD') : undefined);
  };
  const handleStatusChange = (value: string | undefined) => {
    setPage(0);
    setStatus(value);
  };
  const handleRouteChange = (value: number | undefined) => {
    setPage(0);
    setRouteId(value);
  };
  const handleReset = () => {
    setSearch('');
    setDeliveryDate(undefined);
    setStatus(undefined);
    setRouteId(undefined);
    setPage(0);
    setPageSize(PAGE_SIZE_DEFAULT);
  };

  const handleTableChange = (pagination: TablePaginationConfig) => {
    const newPage = (pagination.current ?? 1) - 1;
    const newSize = pagination.pageSize ?? PAGE_SIZE_DEFAULT;
    setPage(newPage);
    setPageSize(newSize);
  };

  const handleViewDetail = async (record: OrderDetail) => {
    setDetailVisible(true);
    setDetailLoading(true);
    try {
      const detail = await getOrderById(record.id);
      setSelectedOrder(detail);
    } catch {
      setSelectedOrder(record);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: ColumnsType<OrderDetail> = [
    {
      title: 'Mã đơn',
      dataIndex: 'orderRef',
      key: 'orderRef',
      width: 160,
      render: (text: string) => <Text strong style={{ fontFamily: 'monospace' }}>{text}</Text>,
    },
    {
      title: 'Ngày giao',
      dataIndex: 'deliveryDate',
      key: 'deliveryDate',
      width: 120,
      render: (d: string) => dayjs(d).format('DD/MM/YYYY'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (s: string) => (
        <Tag color={ORDER_STATUS_COLORS[s as keyof typeof ORDER_STATUS_COLORS] ?? 'default'}>
          {ORDER_STATUS_LABELS[s as keyof typeof ORDER_STATUS_LABELS] ?? s}
        </Tag>
      ),
    },
    {
      title: 'Tuyến',
      key: 'route',
      width: 160,
      render: (_: unknown, r: OrderDetail) =>
        r.route ? (
          <Tooltip title={r.route.name}>
            <Tag color="geekblue">{r.route.code}</Tag>
          </Tooltip>
        ) : (
          <Text type="secondary" style={{ fontStyle: 'italic' }}>Chưa phân tuyến</Text>
        ),
    },
    {
      title: 'Cửa hàng',
      key: 'store',
      ellipsis: true,
      render: (_: unknown, r: OrderDetail) =>
        r.store ? (
          <span>
            <Text strong>{r.store.code}</Text>
            <Text type="secondary" style={{ marginLeft: 6 }}>{r.store.name}</Text>
          </span>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: 'Người nhận',
      key: 'recipient',
      width: 180,
      render: (_: unknown, r: OrderDetail) => (
        <span>
          <div>{r.recipientName || '-'}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.recipientPhone || ''}</Text>
        </span>
      ),
    },
    {
      title: 'KL (kg) / TT (m³)',
      key: 'weight',
      width: 140,
      align: 'right',
      render: (_: unknown, r: OrderDetail) => (
        <Space direction="vertical" size={0} style={{ textAlign: 'right' }}>
          <Text>{r.totalWeightKg.toFixed(2)} kg</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.totalVolumeM3.toFixed(3)} m³</Text>
        </Space>
      ),
    },
    {
      title: 'Số sản phẩm',
      dataIndex: 'totalItems',
      key: 'totalItems',
      width: 110,
      align: 'center',
      render: (v: number) => <Badge count={v} showZero overflowCount={999} style={{ backgroundColor: palette.textMuted }} />,
    },
    {
      title: 'Batch',
      dataIndex: 'batchId',
      key: 'batchId',
      width: 80,
      align: 'center',
      render: (v?: number) => (v ? <Text code>#{v}</Text> : '-'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      align: 'center',
      fixed: 'right' as const,
      render: (_: unknown, record: OrderDetail) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
          style={{ padding: 0 }}
        >
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ marginBottom: 16 }}>
        <Breadcrumb
          items={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Quản lý đơn hàng' },
          ]}
        />
      </div>

      <PageHeader
        title="Quản lý đơn hàng"
        subtitle="Tra cứu, lọc và theo dõi toàn bộ đơn hàng trong hệ thống."
        icon={<ClipboardList size={20} />}
      />

      {/* Filter Bar */}
      <Card
        style={{ borderRadius: 12, boxShadow: palette.cardShadow, marginBottom: 16 }}
        bodyStyle={{ paddingBottom: 12 }}
      >
        <Space wrap size={12}>
          <Input.Search
            placeholder="Tìm theo mã đơn, cửa hàng, người nhận..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={handleSearch}
            allowClear
            style={{ width: 300 }}
            prefix={<SearchOutlined />}
          />
          <DatePicker
            placeholder="Ngày giao hàng"
            format="DD/MM/YYYY"
            value={deliveryDate ? dayjs(deliveryDate) : null}
            onChange={handleDateChange}
            style={{ width: 160 }}
          />
          <Select
            placeholder="Trạng thái"
            options={statusOptions}
            value={status}
            onChange={handleStatusChange}
            allowClear
            style={{ width: 160 }}
          />
          <Select
            placeholder="Tuyến giao hàng"
            options={routeOptions}
            value={routeId}
            onChange={handleRouteChange}
            allowClear
            showSearch
            optionFilterProp="label"
            style={{ width: 220 }}
          />
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            Đặt lại
          </Button>
        </Space>
      </Card>

      {/* Table */}
      <Card
        style={{ borderRadius: 12, boxShadow: palette.cardShadow }}
        title={
          <span style={{ fontWeight: 600 }}>
            Danh sách đơn hàng{' '}
            <Text type="secondary" style={{ fontWeight: 'normal', fontSize: 13 }}>
              ({totalElements.toLocaleString()} kết quả)
            </Text>
          </span>
        }
      >
        <Table<OrderDetail>
          dataSource={orders}
          columns={columns}
          rowKey="id"
          loading={loading}
          scroll={{ x: 'max-content' }}
          pagination={{
            current: page + 1,
            pageSize,
            total: totalElements,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `Tổng ${total} đơn hàng`,
          }}
          onChange={handleTableChange}
          locale={{ emptyText: 'Không có đơn hàng nào phù hợp.' }}
        />
      </Card>

      {/* Order Detail Modal */}
      <Modal
        open={detailVisible}
        title={selectedOrder ? `Chi tiết đơn — ${selectedOrder.orderRef}` : 'Chi tiết đơn hàng'}
        onCancel={() => { setDetailVisible(false); setSelectedOrder(null); }}
        footer={null}
        width={720}
        loading={detailLoading}
      >
        {selectedOrder && (
          <>
            <Descriptions
              bordered
              size="small"
              column={{ xs: 1, sm: 2 }}
              style={{ marginBottom: 16 }}
            >
              <Descriptions.Item label="Mã đơn">
                <Text strong style={{ fontFamily: 'monospace' }}>{selectedOrder.orderRef}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={ORDER_STATUS_COLORS[selectedOrder.status as keyof typeof ORDER_STATUS_COLORS] ?? 'default'}>
                  {ORDER_STATUS_LABELS[selectedOrder.status as keyof typeof ORDER_STATUS_LABELS] ?? selectedOrder.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày giao">
                {dayjs(selectedOrder.deliveryDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Khung giờ">
                {selectedOrder.deliveryTimeWindow || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Tuyến">
                {selectedOrder.route ? (
                  <Tooltip title={selectedOrder.route.name}>
                    <Tag color="geekblue">{selectedOrder.route.code}</Tag>
                  </Tooltip>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Batch">
                {selectedOrder.batchId ? <Text code>#{selectedOrder.batchId}</Text> : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Cửa hàng" span={2}>
                {selectedOrder.store
                  ? `${selectedOrder.store.code} — ${selectedOrder.store.name}` +
                    (selectedOrder.store.address ? ` (${selectedOrder.store.address})` : '')
                  : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Người nhận">
                {selectedOrder.recipientName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="SĐT">
                {selectedOrder.recipientPhone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Tổng KL">
                {selectedOrder.totalWeightKg.toFixed(2)} kg
              </Descriptions.Item>
              <Descriptions.Item label="Tổng TT">
                {selectedOrder.totalVolumeM3.toFixed(3)} m³
              </Descriptions.Item>
              <Descriptions.Item label="Ghi chú" span={2}>
                {selectedOrder.notes || '-'}
              </Descriptions.Item>
            </Descriptions>

            {selectedOrder.items && selectedOrder.items.length > 0 && (
              <>
                <Divider style={{ margin: '16px 0' }} />
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: palette.textDark }}>
                  Danh sách sản phẩm ({selectedOrder.items.length})
                </div>
                <Table
                  dataSource={selectedOrder.items}
                  rowKey="id"
                  size="small"
                  pagination={false}
                  scroll={{ x: 600 }}
                  columns={[
                    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 130, render: (v: string) => <Text code>{v}</Text> },
                    { title: 'Tên sản phẩm', dataIndex: 'productName', key: 'productName', ellipsis: true },
                    { title: 'Số lượng', dataIndex: 'quantity', key: 'quantity', width: 80, align: 'center' as const },
                    { title: 'KL/đv (kg)', dataIndex: 'unitWeightKg', key: 'unitWeightKg', width: 100, align: 'right' as const, render: (v?: number) => (v != null ? v.toFixed(3) : '-') },
                    { title: 'KL dòng (kg)', dataIndex: 'lineWeightKg', key: 'lineWeightKg', width: 110, align: 'right' as const, render: (v?: number) => (v != null ? v.toFixed(3) : '-') },
                  ]}
                />
              </>
            )}
          </>
        )}
      </Modal>
    </AdminShell>
  );
};

export default OrderManagementPage;


