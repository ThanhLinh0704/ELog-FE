import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Tag,
  Spin,
  Alert,
  Button,
  Space,
  Typography,
  Empty,
  message,
  Breadcrumb,
  Progress,
  Tabs,
  Table,
  Divider,
  Popconfirm,
  Badge,
} from 'antd';
import {
  Truck,
  CheckCircle2,
  Play,
  PackageCheck,
  List,
  ArrowUpDown,
  RefreshCw,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import AdminShell from '../../components/AdminShell';
import {
  getActiveTrip,
  startExecution,
  updateOrderResult,
  completeExecution,
  returnToWarehouse,
} from '../../api/tripApi';
import OrderResultModal from './OrderResultModal';
import type {
  DriverTripExecution,
  DriverTripStop,
  DriverOrder,
  LifoLoadingItem,
  OrderDeliveryStatus,
  UpdateOrderResultPayload,
} from '../../types/driverTrip';
import {
  EXECUTION_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  STOP_STATUS_LABEL,
} from '../../types/driverTrip';
import type { TripOutcome } from '../../types/tripOutcome';

const { Text, Title } = Typography;

function formatTime(t: string | null | undefined): string {
  if (!t) return '—';
  // "HH:mm:ss" format
  return t.slice(0, 5);
}

// ── Auth helper ───────────────────────────────────────────────────────────────
function getCurrentUser() {
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';
  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) roles = JSON.parse(rolesStr);
  } catch { /* ignore */ }
  return { id: Number(userId), username, fullName: username, roles };
}

// ── Error helper ──────────────────────────────────────────────────────────────
interface ApiErr {
  response?: { data?: { error?: { code?: string; message?: string } } };
}
function getErrMsg(err: unknown): string {
  const axErr = err as ApiErr;
  return axErr?.response?.data?.error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

// ── Component ─────────────────────────────────────────────────────────────────

const DriverMyTripsPage: React.FC = () => {
  const currentUser = getCurrentUser();

  const [trip, setTrip] = useState<DriverTripExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [returningWarehouse, setReturningWarehouse] = useState(false);
  const [outcome, setOutcome] = useState<TripOutcome | null>(null);

  // Order result modal state
  const [orderModal, setOrderModal] = useState<{
    open: boolean;
    executionId: number;
    orderId: number;
    orderRef: string;
    currentStatus: OrderDeliveryStatus;
  }>({ open: false, executionId: 0, orderId: 0, orderRef: '', currentStatus: 'PENDING' });

  // ── Fetch active trip ────────────────────────────────────────────────────

  const fetchActiveTrip = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getActiveTrip();
      if (data) {
        setTrip(data);
        return;
      }
      // Backend's GET /api/driver/trips/active only matches ASSIGNED/IN_PROGRESS
      // executions, so a trip that was just completed but not yet confirmed back
      // at the warehouse will never come back from this call. Keep it locally so
      // the driver can still reach "Xác nhận xe đã về kho".
      setTrip((prev) =>
        prev &&
        (prev.status === 'COMPLETED' || prev.status === 'COMPLETED_WITH_EXCEPTIONS') &&
        !prev.returnedToWarehouseAt
          ? prev
          : null
      );
    } catch (err) {
      setError(getErrMsg(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchActiveTrip(); }, [fetchActiveTrip]);

  // ── Start execution ──────────────────────────────────────────────────────

  const handleStart = async () => {
    if (!trip) return;
    setStarting(true);
    try {
      const updated = await startExecution(trip.executionId);
      setTrip(updated);
      message.success('Bắt đầu chuyến thành công!');
    } catch (err) {
      message.error(getErrMsg(err));
    } finally {
      setStarting(false);
    }
  };

  // ── Complete execution ───────────────────────────────────────────────────

  const handleComplete = async () => {
    if (!trip) return;
    setCompleting(true);
    try {
      const result = await completeExecution(trip.executionId);
      setOutcome(result);
      message.success('Chuyến đã hoàn thành và nộp kết quả thành công!');
      // Backend's GET /active would no longer return this execution (it only
      // matches ASSIGNED/IN_PROGRESS), so derive the post-complete trip state
      // locally instead of refetching — otherwise the "Xác nhận xe đã về kho"
      // step becomes unreachable.
      const hasExceptions = result.failedCount > 0 || result.partialCount > 0;
      setTrip((prev) =>
        prev
          ? {
              ...prev,
              status: hasExceptions ? 'COMPLETED_WITH_EXCEPTIONS' : 'COMPLETED',
              completedOrdersCount: result.totalOrders,
              pendingOrdersCount: 0,
            }
          : prev
      );
    } catch (err) {
      message.error(getErrMsg(err));
    } finally {
      setCompleting(false);
    }
  };

  // ── Return to warehouse ─────────────────────────────────────────────────

  const handleReturnToWarehouse = async () => {
    if (!trip) return;
    setReturningWarehouse(true);
    try {
      const updated = await returnToWarehouse(trip.executionId);
      setTrip(updated);
      message.success('Đã xác nhận xe về tới kho thành công!');
    } catch (err: any) {
      const msg = getErrMsg(err);
      if (msg.includes('chưa hoàn thành')) {
        message.error('Chuyến xe chưa hoàn thành nên chưa thể xác nhận về kho.');
        fetchActiveTrip();
      } else if (msg.includes('đã được xác nhận về kho')) {
        message.info(msg);
        fetchActiveTrip();
      } else {
        message.error(msg);
      }
    } finally {
      setReturningWarehouse(false);
    }
  };

  // ── Order result update ──────────────────────────────────────────────────

  const handleOrderResult = async (
    executionId: number,
    orderId: number,
    payload: UpdateOrderResultPayload
  ) => {
    const updated = await updateOrderResult(executionId, orderId, payload);
    setTrip(updated);
  };

  // ── Render: No trip ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <AdminShell currentUser={currentUser}>
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <Spin size="large" tip="Đang tải thông tin chuyến xe..." />
        </div>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell currentUser={currentUser}>
        <Alert
          type="error"
          showIcon
          message={error}
          action={<Button size="small" onClick={fetchActiveTrip}>Thử lại</Button>}
        />
      </AdminShell>
    );
  }

  // ── Render: Outcome (trip just completed) ────────────────────────────────

  if (outcome) {
    return (
      <AdminShell currentUser={currentUser}>
        <Breadcrumb style={{ marginBottom: 12 }} items={[{ title: 'Trang chủ' }, { title: 'Chuyến giao hàng' }]} />
        <Card style={{ borderRadius: 12, textAlign: 'center', padding: '40px 20px' }}>
          <CheckCircle2 size={56} color="#52c41a" style={{ marginBottom: 16 }} />
          <Title level={3} style={{ color: '#52c41a' }}>Chuyến hoàn thành!</Title>
          <Text type="secondary">Kết quả đã được nộp cho Dispatcher nghiệm thu.</Text>
          <Divider />
          <Space direction="vertical" size={4}>
            <Text>Mã chuyến: <strong>{outcome.tripCode}</strong></Text>
            <Text>Đã giao: <strong style={{ color: '#52c41a' }}>{outcome.deliveredCount}/{outcome.totalOrders}</strong></Text>
            {outcome.failedCount > 0 && <Text>Thất bại: <strong style={{ color: '#ff4d4f' }}>{outcome.failedCount}</strong></Text>}
          </Space>
          <div style={{ marginTop: 24 }}>
            <Button onClick={() => { setOutcome(null); fetchActiveTrip(); }}>
              Xem chuyến tiếp theo
            </Button>
          </div>
        </Card>
      </AdminShell>
    );
  }

  // ── Render: No active trip ───────────────────────────────────────────────

  if (!trip) {
    return (
      <AdminShell currentUser={currentUser}>
        <Breadcrumb style={{ marginBottom: 12 }} items={[{ title: 'Trang chủ' }, { title: 'Chuyến giao hàng' }]} />
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          padding: '20px 24px',
          borderRadius: 12,
          color: '#fff',
          marginBottom: 20,
        }}>
          <Title level={4} style={{ margin: 0, color: '#fff' }}>
            <Truck size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Chuyến giao hàng của tôi
          </Title>
          <Text style={{ color: '#94a3b8', fontSize: 13 }}>Xin chào {currentUser.username}!</Text>
        </div>
        <Card style={{ borderRadius: 12, textAlign: 'center', padding: '40px 0' }}>
          <Empty description="Bạn chưa có chuyến xe nào được phân công hôm nay." />
          <Button icon={<RefreshCw size={14} />} onClick={fetchActiveTrip} style={{ marginTop: 16 }}>
            Làm mới
          </Button>
        </Card>
      </AdminShell>
    );
  }

  // ── Render: Active trip ──────────────────────────────────────────────────

  const statusInfo = EXECUTION_STATUS_LABEL[trip.status] || { color: 'default', label: trip.status };
  const progressPercent = trip.totalOrders > 0
    ? Math.round((trip.completedOrdersCount / trip.totalOrders) * 100)
    : 0;
  const canComplete = trip.status === 'IN_PROGRESS' && trip.pendingOrdersCount === 0;

  // ── LIFO tab ──────────────────────────────────────────────────────────────

  const lifoColumns = [
    {
      title: 'Thứ tự xếp',
      dataIndex: 'loadingOrder',
      key: 'loadingOrder',
      width: 90,
      render: (n: number) => <Badge count={n} style={{ backgroundColor: '#1677ff' }} />,
    },
    {
      title: 'Điểm dừng',
      dataIndex: 'stopSequenceNo',
      key: 'stopSequenceNo',
      width: 90,
      render: (n: number, row: LifoLoadingItem) => (
        <span><Text type="secondary">#{n} </Text><Text strong>{row.storeName}</Text></span>
      ),
    },
    {
      title: 'Đơn hàng',
      dataIndex: 'orderRef',
      key: 'orderRef',
      render: (ref: string) => <Tag color="blue">{ref}</Tag>,
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (sku: string, row: LifoLoadingItem) => (
        <span><Text code>{sku}</Text> <Text style={{ fontSize: 12 }}>{row.productName}</Text></span>
      ),
    },
    {
      title: 'SL',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 60,
      align: 'center' as const,
      render: (n: number) => <Text strong>{n}</Text>,
    },
    {
      title: 'Hướng dẫn',
      dataIndex: 'instruction',
      key: 'instruction',
      render: (instr: string) => <Text type="secondary" style={{ fontSize: 12 }}>{instr}</Text>,
    },
  ];

  // ── Schedule tab ─────────────────────────────────────────────────────────

  const renderStop = (stop: DriverTripStop) => {
    const stopInfo = STOP_STATUS_LABEL[stop.aggregatedStatus] || { color: 'default', label: stop.aggregatedStatus };
    return (
      <Card
        key={stop.stopId}
        size="small"
        style={{
          borderRadius: 10,
          marginBottom: 12,
          border: stop.aggregatedStatus === 'FAILED' ? '1px solid #ffa39e'
            : stop.aggregatedStatus === 'DELIVERED' ? '1px solid #b7eb8f'
            : stop.aggregatedStatus === 'PARTIAL' ? '1px solid #ffe58f'
            : '1px solid #f0f0f0',
        }}
        bodyStyle={{ padding: 16 }}
      >
        {/* Stop header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Badge count={stop.sequenceNo} style={{ backgroundColor: '#1677ff' }} />
            <div>
              <Text strong style={{ fontSize: 14 }}>{stop.storeCode}</Text>
              <Text style={{ display: 'block', fontSize: 12, color: '#595959' }}>{stop.storeName}</Text>
            </div>
          </div>
          <Tag color={stopInfo.color}>{stopInfo.label}</Tag>
        </div>

        {/* Time info */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 8, fontSize: 12 }}>
          {stop.plannedEta && (
            <span><Text type="secondary">ETA: </Text><Text strong>{formatTime(stop.plannedEta)}</Text></span>
          )}
          {stop.closingTime && (
            <span><Text type="secondary">Đóng cửa: </Text><Text strong>{formatTime(stop.closingTime)}</Text></span>
          )}
          {stop.address && (
            <span><MapPin size={12} style={{ verticalAlign: 'middle', color: '#8c8c8c' }} /> <Text style={{ fontSize: 12 }}>{stop.address}</Text></span>
          )}
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* Orders */}
        {stop.orders.map((order: DriverOrder) => {
          const orderInfo = ORDER_STATUS_LABEL[order.deliveryStatus] || { color: 'default', label: order.deliveryStatus };
          const isPending = order.deliveryStatus === 'PENDING' && trip.status === 'IN_PROGRESS';

          return (
            <div
              key={order.orderId}
              style={{
                padding: '10px 12px',
                marginBottom: 8,
                borderRadius: 8,
                background: order.deliveryStatus === 'DELIVERED' ? '#f6ffed'
                  : order.deliveryStatus === 'FAILED' ? '#fff1f0'
                  : order.deliveryStatus === 'PARTIALLY_DELIVERED' ? '#fffbe6'
                  : '#fafafa',
                border: '1px solid',
                borderColor: order.deliveryStatus === 'DELIVERED' ? '#b7eb8f'
                  : order.deliveryStatus === 'FAILED' ? '#ffa39e'
                  : order.deliveryStatus === 'PARTIALLY_DELIVERED' ? '#ffe58f'
                  : '#f0f0f0',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Tag color="blue">{order.orderRef}</Tag>
                  {order.recipientName && <Text style={{ fontSize: 12, marginLeft: 4 }}>{order.recipientName}</Text>}
                </div>
                <Tag color={orderInfo.color}>{orderInfo.label}</Tag>
              </div>

              {/* Reason for failed/partial */}
              {order.exceptionReason && (
                <div style={{ marginTop: 6 }}>
                  <Alert
                    type="warning"
                    showIcon
                    icon={<AlertTriangle size={12} />}
                    message={order.exceptionReason}
                    style={{ borderRadius: 6, fontSize: 11 }}
                  />
                </div>
              )}

              {/* Items summary */}
              {order.items.length > 0 && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#595959' }}>
                  {order.items.slice(0, 2).map((item, i) => (
                    <span key={i} style={{ marginRight: 8 }}>
                      <Text code style={{ fontSize: 11 }}>{item.sku}</Text> × {item.quantity}
                    </span>
                  ))}
                  {order.items.length > 2 && <Text type="secondary">+{order.items.length - 2} SKU</Text>}
                </div>
              )}

              {/* Action button */}
              {isPending && (
                <div style={{ marginTop: 10 }}>
                  <Button
                    type="primary"
                    size="small"
                    block
                    icon={<PackageCheck size={14} />}
                    style={{ borderRadius: 8, height: 36, fontWeight: 600 }}
                    onClick={() => setOrderModal({
                      open: true,
                      executionId: trip.executionId,
                      orderId: order.orderId,
                      orderRef: order.orderRef,
                      currentStatus: order.deliveryStatus,
                    })}
                  >
                    Cập nhật kết quả
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </Card>
    );
  };

  const sortedStops = [...trip.stops].sort((a, b) => a.sequenceNo - b.sequenceNo);

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <Breadcrumb
          style={{ marginBottom: 12 }}
          items={[{ title: 'Trang chủ' }, { title: 'Chuyến giao hàng' }]}
        />

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          padding: '20px 24px',
          borderRadius: 12,
          color: '#fff',
          marginBottom: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <Title level={4} style={{ margin: 0, color: '#fff' }}>
                <Truck size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                {trip.tripCode}
              </Title>
              <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                {trip.plateNumber && `Xe: ${trip.plateNumber}`}
                {trip.deliveryDate && ` · Ngày: ${trip.deliveryDate}`}
              </Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag color={statusInfo.color} style={{ fontWeight: 600, fontSize: 13, padding: '4px 12px' }}>
                {statusInfo.label}
              </Tag>
              <Button
                icon={<RefreshCw size={13} />}
                size="small"
                onClick={fetchActiveTrip}
                style={{ color: '#94a3b8', borderColor: '#334155', background: 'transparent' }}
              />
            </div>
          </div>
        </div>

        {/* Progress */}
        <Card style={{ borderRadius: 10, marginBottom: 16 }} bodyStyle={{ padding: '12px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>Tiến độ giao hàng</Text>
            <Text strong>{trip.completedOrdersCount}/{trip.totalOrders} đơn</Text>
          </div>
          <Progress
            percent={progressPercent}
            status={progressPercent === 100 ? 'success' : 'active'}
            strokeColor={{ '0%': '#1677ff', '100%': '#52c41a' }}
          />
          {trip.pendingOrdersCount > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Còn lại: {trip.pendingOrdersCount} đơn chờ giao
            </Text>
          )}
        </Card>

        {/* Start button */}
        {trip.status === 'ASSIGNED' && (
          <Popconfirm
            title="Bắt đầu chuyến"
            description="Bạn có muốn bắt đầu chuyến giao hàng này không?"
            onConfirm={handleStart}
            okText="Bắt đầu"
            cancelText="Hủy"
          >
            <Button
              type="primary"
              block
              size="large"
              icon={<Play size={18} />}
              loading={starting}
              style={{
                marginBottom: 16,
                height: 52,
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 10,
                background: '#1677ff',
              }}
            >
              Bắt đầu chuyến
            </Button>
          </Popconfirm>
        )}

        {/* Complete button */}
        {canComplete && (
          <Popconfirm
            title="Hoàn thành chuyến"
            description="Tất cả đơn hàng đã được cập nhật. Xác nhận hoàn thành chuyến và nộp kết quả?"
            onConfirm={handleComplete}
            okText="Hoàn thành"
            cancelText="Hủy"
          >
            <Button
              type="primary"
              block
              size="large"
              icon={<CheckCircle2 size={18} />}
              loading={completing}
              style={{
                marginBottom: 16,
                height: 52,
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 10,
                background: '#52c41a',
                borderColor: '#52c41a',
              }}
            >
              Hoàn thành chuyến
            </Button>
          </Popconfirm>
        )}

        {/* Return to Warehouse UI */}
        {(trip.status === 'COMPLETED' || trip.status === 'COMPLETED_WITH_EXCEPTIONS') && (
          <div style={{ marginBottom: 16 }}>
            {trip.returnedToWarehouseAt ? (
              <Alert
                type="success"
                showIcon
                message={`Đã về kho lúc ${trip.returnedToWarehouseAt}`}
                description="Xe đã được chuyển sang trạng thái sẵn sàng để phân cho chuyến mới."
                style={{ borderRadius: 10 }}
              />
            ) : (
              <>
                <Alert
                  type="warning"
                  showIcon
                  message="Chuyến giao hàng đã hoàn tất."
                  description="Xe vẫn đang trong trạng thái trở về kho."
                  style={{ marginBottom: 12, borderRadius: 10 }}
                />
                <Popconfirm
                  title="Xác nhận xe đã về kho"
                  description="Bạn có chắc chắn xe đã về đến kho? Sau khi xác nhận, xe sẽ được chuyển sang trạng thái sẵn sàng để phân cho chuyến mới."
                  onConfirm={handleReturnToWarehouse}
                  okText="Xác nhận"
                  cancelText="Hủy"
                >
                  <Button
                    type="primary"
                    block
                    size="large"
                    icon={<Truck size={18} />}
                    loading={returningWarehouse}
                    style={{
                      height: 52,
                      fontSize: 16,
                      fontWeight: 700,
                      borderRadius: 10,
                      background: '#fa8c16',
                      borderColor: '#fa8c16',
                    }}
                  >
                    Xác nhận xe đã về kho
                  </Button>
                </Popconfirm>
              </>
            )}
          </div>
        )}

        {/* Tabs: LIFO + Delivery Schedule */}
        <Tabs
          defaultActiveKey="lifo"
          items={[
            {
              key: 'lifo',
              label: (
                <Space>
                  <ArrowUpDown size={14} />
                  Hướng dẫn xếp hàng LIFO
                </Space>
              ),
              children: trip.lifoLoadingGuidance.length === 0 ? (
                <Empty description="Không có dữ liệu hướng dẫn xếp hàng." />
              ) : (
                <Card style={{ borderRadius: 10 }} bodyStyle={{ padding: 0 }}>
                  <Alert
                    type="info"
                    showIcon
                    message="Xếp hàng theo thứ tự từ trên xuống (loadingOrder = 1 xếp vào đầu tiên — nằm sâu nhất trong xe, dỡ sau cùng)."
                    style={{ borderRadius: '10px 10px 0 0', borderBottom: '1px solid #e8f4ff' }}
                  />
                  <Table
                    columns={lifoColumns}
                    dataSource={[...trip.lifoLoadingGuidance].sort((a, b) => a.loadingOrder - b.loadingOrder)}
                    rowKey={(r) => `${r.loadingOrder}-${r.sku}`}
                    pagination={false}
                    size="small"
                    style={{ borderRadius: '0 0 10px 10px' }}
                  />
                </Card>
              ),
            },
            {
              key: 'schedule',
              label: (
                <Space>
                  <List size={14} />
                  Lịch giao hàng
                  <Badge count={trip.pendingOrdersCount} style={{ backgroundColor: '#1677ff' }} />
                </Space>
              ),
              children: sortedStops.length === 0 ? (
                <Empty description="Không có điểm dừng nào." />
              ) : (
                <div>
                  {sortedStops.map(renderStop)}
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Order Result Modal */}
      <OrderResultModal
        open={orderModal.open}
        executionId={orderModal.executionId}
        orderId={orderModal.orderId}
        orderRef={orderModal.orderRef}
        currentStatus={orderModal.currentStatus}
        onClose={() => setOrderModal(prev => ({ ...prev, open: false }))}
        onSuccess={handleOrderResult}
      />
    </AdminShell>
  );
};

export default DriverMyTripsPage;
