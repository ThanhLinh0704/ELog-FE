import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Col,
  Empty,
  Modal,
  Popconfirm,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  TimePicker,
} from 'antd';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeft,
  CheckCircle2,
  MapPinned,
  Navigation,
  PackageCheck,
  RefreshCw,
} from 'lucide-react';
import AdminShell from '../components/AdminShell';
import {
  confirmTripDraft,
  getApiErrorMessage,
  getTripDraft,
  getTripDraftApiStatus,
  recalculateEta,
  updateStopStatus,
  type TripDraftDetail,
  type TripDraftStop,
  type TripDraftStopStatus,
} from '../api/tripDraftApi';
import { storeApi } from '../api/storeApi';
import { importApi } from '../api/importApi';
import { productApi } from '../api/productApi';

function getCurrentUser() {
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';

  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) roles = JSON.parse(rolesStr);
  } catch (err) {
    console.error('Failed to parse roles', err);
  }

  return {
    id: Number(userId),
    username,
    fullName: username,
    roles,
  };
}

function formatNumber(value?: number | null, fractionDigits = 0) {
  return Number(value || 0).toLocaleString('vi-VN', {
    maximumFractionDigits: fractionDigits,
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getStopStatusLabel(status: TripDraftStopStatus) {
  return status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã bỏ qua';
}

function getDraftStatusLabel(status?: string | null) {
  const normalizedStatus = String(status || '').toUpperCase();
  const statusMap: Record<string, string> = {
    DRAFT: 'Bản nháp',
    PLANNED: 'Đã lập kế hoạch',
    CONFIRMED: 'Đã xác nhận',
    CANCELLED: 'Đã huỷ',
  };

  return statusMap[normalizedStatus] || normalizedStatus || '-';
}

function hasGps(stop: TripDraftStop) {
  return stop.latitude !== null && stop.longitude !== null;
}

function mergeRecalculatedDraft(
  draft: TripDraftDetail,
  recalculated: Pick<TripDraftDetail, 'estimatedDistanceKm' | 'estimatedDurationMin' | 'stops'>
): TripDraftDetail {
  const recalculatedStops = new Map(recalculated.stops.map((stop) => [stop.id, stop]));

  return {
    ...draft,
    estimatedDistanceKm: recalculated.estimatedDistanceKm,
    estimatedDurationMin: recalculated.estimatedDurationMin,
    stops: draft.stops
      .map((stop) => ({
        ...stop,
        ...recalculatedStops.get(stop.id),
      }))
      .sort((a, b) => a.sequenceNo - b.sequenceNo),
  };
}

const TripDraftReviewPage: React.FC = () => {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [draft, setDraft] = useState<TripDraftDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbiddenMessage, setForbiddenMessage] = useState('');
  const [toggleStopId, setToggleStopId] = useState<number | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [modal, contextHolder] = Modal.useModal();
  const [plannedTime, setPlannedTime] = useState<dayjs.Dayjs | null>(dayjs('07:30:00', 'HH:mm:ss'));

  // Order Details Modal States
  const [activeBatchId, setActiveBatchId] = useState<number | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedStopForDetail, setSelectedStopForDetail] = useState<TripDraftStop | null>(null);
  const [stopOrderItems, setStopOrderItems] = useState<any[]>([]);
  const [detailModalLoading, setDetailModalLoading] = useState(false);

  const showOrderDetails = async (stop: TripDraftStop) => {
    setSelectedStopForDetail(stop);
    setDetailModalVisible(true);
    setDetailModalLoading(true);
    setStopOrderItems([]);

    try {
      const cachedRowsStr = localStorage.getItem(`import_batch_success_rows_${activeBatchId}`);
      if (!cachedRowsStr) {
        setDetailModalLoading(false);
        return;
      }

      const allCachedRows = JSON.parse(cachedRowsStr);
      const stopRows = allCachedRows.filter((r: any) => r.storeCode === stop.storeCode);

      if (stopRows.length === 0) {
        setDetailModalLoading(false);
        return;
      }

      const productsRes = await productApi.getProducts({ size: 1000 });
      const productMap = new Map(productsRes.content.map(p => [p.sku, p]));

      const itemsWithDetails = stopRows.map((row: any) => {
        const product = productMap.get(row.sku);
        const unitWeight = product ? product.weightKg : 0;
        const unitVolume = product ? product.volumeM3 : 0;
        return {
          orderRef: row.orderRef,
          sku: row.sku,
          productName: product ? product.productName : row.sku,
          quantity: row.quantity,
          weightKg: unitWeight * row.quantity,
          volumeM3: unitVolume * row.quantity,
        };
      });

      setStopOrderItems(itemsWithDetails);
    } catch (err) {
      console.error("Failed to load stop order details", err);
      message.error("Không tải được chi tiết đơn hàng của điểm dừng.");
    } finally {
      setDetailModalLoading(false);
    }
  };

  const detailColumns = [
    {
      title: 'Mã đơn hàng',
      dataIndex: 'orderRef',
      key: 'orderRef',
      render: (text: string) => <Typography.Text strong>{text}</Typography.Text>,
    },
    {
      title: 'Mã sản phẩm (SKU)',
      dataIndex: 'sku',
      key: 'sku',
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'productName',
      key: 'productName',
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'right' as const,
      render: (value: number) => <Typography.Text strong>{formatNumber(value)}</Typography.Text>,
    },
    {
      title: 'Khối lượng (kg)',
      dataIndex: 'weightKg',
      key: 'weightKg',
      align: 'right' as const,
      render: (value: number) => formatNumber(value, 1),
    },
    {
      title: 'Thể tích (m³)',
      dataIndex: 'volumeM3',
      key: 'volumeM3',
      align: 'right' as const,
      render: (value: number) => formatNumber(value, 3),
    },
  ];

  const activeStops = useMemo(
    () => draft?.stops.filter((stop) => stop.status === 'ACTIVE') ?? [],
    [draft]
  );
  const isDraftEditable = draft?.status === 'DRAFT';
  const actionDisabled = !isDraftEditable || recalculating || confirming;

  async function fetchDraft() {
    if (!draftId) return;

    setLoading(true);
    setError('');
    setForbiddenMessage('');

    try {
      const result = await getTripDraft(draftId);
      
      // Enrich stops with store information from storeApi
      try {
        const storesRes = await storeApi.getStores({ size: 1000 });
        const storeMap = new Map(storesRes.content.map(s => [s.storeCode, s]));
        result.stops = result.stops.map(stop => {
          const store = storeMap.get(stop.storeCode);
          if (store) {
            return {
              ...stop,
              storeName: stop.storeName && !stop.storeName.includes('?') ? stop.storeName : store.storeName,
              address: stop.address || store.address,
              latitude: stop.latitude || store.latitude || null,
              longitude: stop.longitude || store.longitude || null,
            };
          }
          return stop;
        });
      } catch (storeErr) {
        console.error("Failed to enrich stops with store details", storeErr);
      }
      
      // Get the active import batch for this delivery date to look up cached excel rows
      try {
        const dateStr = result.deliveryDate;
        const batchesRes = await importApi.getImportHistory({ deliveryDate: dateStr, page: 0, size: 100 });
        const activeBatch = batchesRes.content.find((b: any) => b.isActive && b.deliveryDate === dateStr);
        if (activeBatch) {
          setActiveBatchId(activeBatch.id);
        } else if (batchesRes.content.length > 0) {
          setActiveBatchId(batchesRes.content[0].id);
        }
      } catch (batchErr) {
        console.error("Failed to find active batch for delivery date", batchErr);
      }
      
      setDraft(result);
    } catch (err) {
      if (getTripDraftApiStatus(err) === 403) {
        setForbiddenMessage(
          getApiErrorMessage(
            err,
            'Tài khoản hiện tại không có quyền kiểm tra bản nháp chuyến.'
          )
        );
      } else {
        setError(getApiErrorMessage(err, 'Không tải được bản nháp chuyến.'));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  useEffect(() => {
    if (draft?.plannedDepartureTime) {
      setPlannedTime(dayjs(draft.plannedDepartureTime, 'HH:mm:ss'));
    }
  }, [draft?.plannedDepartureTime]);

  async function runRecalculate(currentDraft = draft) {
    if (!draftId || !currentDraft) return;

    setRecalculating(true);

    try {
      const timeStr = plannedTime ? plannedTime.format('HH:mm:ss') : '07:30:00';
      const result = await recalculateEta(draftId, {
        plannedDepartureTime: timeStr,
      });
      setDraft((previous) => (previous ? mergeRecalculatedDraft(previous, result) : previous));
      message.success('Đã tính lại ETA thành công.');
    } catch (err) {
      const apiMessage = getApiErrorMessage(err, 'Không tính lại được ETA.');
      if (getTripDraftApiStatus(err) === 409) {
        message.warning(apiMessage);
      } else {
        message.error(apiMessage);
      }
    } finally {
      setRecalculating(false);
    }
  }

  async function handleToggleStop(stop: TripDraftStop) {
    if (!draftId || !draft) return;

    const nextStatus: TripDraftStopStatus = stop.status === 'ACTIVE' ? 'SKIPPED' : 'ACTIVE';
    setToggleStopId(stop.id);

    try {
      const updatedStop = await updateStopStatus(draftId, stop.id, nextStatus);
      const nextDraft = {
        ...draft,
        stops: draft.stops.map((item) =>
          item.id === stop.id ? { ...item, status: updatedStop.status } : item
        ),
      };
      setDraft(nextDraft);
      await runRecalculate(nextDraft);
    } catch (err) {
      const apiMessage = getApiErrorMessage(err, 'Không cập nhật được trạng thái điểm dừng.');
      if (getTripDraftApiStatus(err) === 409) {
        message.warning(apiMessage);
      } else {
        message.error(apiMessage);
      }
    } finally {
      setToggleStopId(null);
    }
  }

  function handleConfirm() {
    if (!draftId || !draft) return;

    modal.confirm({
      title: 'Xác nhận bản nháp chuyến?',
      content: 'Thao tác này sẽ chuyển bản nháp đã kiểm tra thành chuyến đã lập kế hoạch.',
      okText: 'Xác nhận',
      cancelText: 'Huỷ',
      icon: <CheckCircle2 size={20} color="#1677ff" />,
      onOk: async () => {
        setConfirming(true);

        try {
          await confirmTripDraft(draftId, {
            confirmNote: 'Đã kiểm tra và xác nhận bởi điều phối viên',
          });
          message.success('Đã xác nhận bản nháp chuyến thành công.');
          navigate(`/dispatcher/trip-drafts/${draftId}`);
        } catch (err) {
          const apiMessage = getApiErrorMessage(err, 'Không xác nhận được bản nháp chuyến.');
          if (getTripDraftApiStatus(err) === 409) {
            message.warning(apiMessage);
          } else {
            message.error(apiMessage);
          }
        } finally {
          setConfirming(false);
        }
      },
    });
  }

  const columns: ColumnsType<TripDraftStop> = [
    {
      title: 'Thứ tự',
      dataIndex: 'sequenceNo',
      key: 'sequenceNo',
      width: 100,
      sorter: (a, b) => a.sequenceNo - b.sequenceNo,
      render: (value: number) => <Typography.Text strong>#{value}</Typography.Text>,
    },
    {
      title: 'Cửa hàng',
      key: 'store',
      width: 240,
      render: (_value, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.storeName || '-'}</Typography.Text>
          <Typography.Text type="secondary">{record.storeCode || '-'}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      width: 280,
      render: (value: string) => value || '-',
    },
    {
      title: 'Đơn hàng',
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: 100,
      align: 'right' as const,
      render: (count: number, record: TripDraftStop) => {
        if (count === 0) return '0';
        return (
          <Button 
            type="link" 
            onClick={() => showOrderDetails(record)}
            style={{ padding: 0, fontWeight: 'bold' }}
          >
            {count}
          </Button>
        );
      }
    },
    {
      title: 'Khối lượng / Thể tích',
      key: 'capacity',
      width: 170,
      render: (_value, record) => (
        <Space direction="vertical" size={0}>
          <span>{formatNumber(record.weightKg)} kg</span>
          <Typography.Text type="secondary">
            {formatNumber(record.volumeM3, 2)} m3
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'GPS',
      key: 'gps',
      width: 120,
      render: (_value, record) =>
        hasGps(record) ? (
          <Tooltip title={`${record.latitude}, ${record.longitude}`}>
            <Tag color="blue">Đã có GPS</Tag>
          </Tooltip>
        ) : (
          <Tag color="orange">Thiếu GPS</Tag>
        ),
    },
    {
      title: 'ETA',
      key: 'eta',
      width: 190,
      render: (_value, record) =>
        record.status === 'SKIPPED' ? (
          <Typography.Text type="secondary">Không tính ETA</Typography.Text>
        ) : (
          <Space direction="vertical" size={0}>
            <Typography.Text>{formatDateTime(record.eta)}</Typography.Text>
            <Typography.Text type="secondary">
              {record.estimatedTravelMin ?? 0} phút, {formatNumber(record.estimatedDistanceKm, 1)} km
            </Typography.Text>
          </Space>
        ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      render: (_value, record) =>
        record.status === 'ACTIVE' ? (
          <Tag color="green">{getStopStatusLabel(record.status)}</Tag>
        ) : (
          <Tag color="default">{getStopStatusLabel(record.status)}</Tag>
        ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 140,
      fixed: 'right',
      render: (_value, record) => {
        const isActive = record.status === 'ACTIVE';
        const label = isActive ? 'Bỏ qua' : 'Kích hoạt';

        return (
          <Popconfirm
            title={`${label} điểm dừng này?`}
            description="Tuyến đường và ETA sẽ được tính lại sau thay đổi này."
            okText={label}
            cancelText="Huỷ"
            onConfirm={() => handleToggleStop(record)}
            disabled={actionDisabled}
          >
            <Button
              danger={isActive}
              loading={toggleStopId === record.id}
              disabled={actionDisabled}
              type={isActive ? 'default' : 'primary'}
            >
              {label}
            </Button>
          </Popconfirm>
        );
      },
    },
  ];

  return (
    <AdminShell currentUser={currentUser}>
      {contextHolder}
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Breadcrumb
            items={[
              { title: 'Quản trị' },
              { title: 'Kiểm tra bản nháp chuyến' },
            ]}
          />
          <Typography.Title level={2} style={{ margin: '8px 0 0 0' }}>
            Kiểm tra bản nháp chuyến
          </Typography.Title>
          <Typography.Text type="secondary">
            Kiểm tra điểm dừng đang hoạt động, điểm bị bỏ qua và ETA trước khi xác nhận chuyến.
          </Typography.Text>
        </div>

        {forbiddenMessage ? (
          <Alert
            type="warning"
            showIcon
            message="Không có quyền truy cập"
            description={
              <Space direction="vertical" size={4}>
                <span>{forbiddenMessage}</span>
                <span>
                  Vai trò hiện tại:{' '}
                  {currentUser.roles.length > 0 ? currentUser.roles.join(', ') : 'Không tìm thấy vai trò'}
                </span>
                <span>
                  Vui lòng đăng nhập bằng tài khoản được backend cấp quyền kiểm tra bản nháp chuyến,
                  thường là DISPATCHER hoặc LOGISTICS_MANAGER.
                </span>
              </Space>
            }
          />
        ) : null}

        {error ? <Alert type="error" showIcon message={error} /> : null}

        {draft && draft.status !== 'DRAFT' ? (
          <Alert
            type="warning"
            showIcon
            message={`Bản nháp hiện có trạng thái ${getDraftStatusLabel(draft.status)}. Không thể đổi trạng thái điểm dừng hoặc xác nhận.`}
          />
        ) : null}

        <Spin spinning={loading}>
          {draft ? (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic title="Mã bản nháp" value={draft.draftCode || draft.id} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic
                      title="Xe giao hàng"
                      value={draft.vehicle?.plateNumber || '-'}
                      suffix={draft.vehicle?.vehicleType ? ` / ${draft.vehicle.vehicleType}` : ''}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic title="Điểm dừng hoạt động" value={activeStops.length} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic title="Tổng đơn hàng" value={draft.totalOrders} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic
                      title="Tổng khối lượng"
                      value={draft.totalWeightKg}
                      suffix="kg"
                      formatter={(value) => formatNumber(Number(value))}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic
                      title="Tổng thể tích"
                      value={draft.totalVolumeM3}
                      suffix="m3"
                      precision={2}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic
                      title="Quãng đường dự kiến"
                      value={draft.estimatedDistanceKm}
                      suffix="km"
                      precision={1}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic
                      title="Thời lượng dự kiến"
                      value={draft.estimatedDurationMin}
                      suffix="phút"
                    />
                  </Card>
                </Col>
              </Row>

              <Card
                bordered={false}
                title={
                  <Space>
                    <MapPinned size={18} />
                    <span>Điểm dừng</span>
                  </Space>
                }
                extra={
                  <Space wrap>
                    <Tag color="green">{activeStops.length} hoạt động</Tag>
                    <Tag color="default">
                      {draft.stops.length - activeStops.length} bỏ qua
                    </Tag>
                  </Space>
                }
              >
                <Table
                  columns={columns}
                  dataSource={draft.stops}
                  rowKey="id"
                  loading={recalculating}
                  scroll={{ x: 1420 }}
                  pagination={false}
                  onRow={(record) => ({
                    style:
                      record.status === 'SKIPPED'
                        ? { opacity: 0.62, backgroundColor: '#fafafa' }
                        : undefined,
                  })}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Chưa có điểm dừng"
                      />
                    ),
                  }}
                />
              </Card>

              <Card bordered={false}>
                <Row justify="space-between" gutter={[12, 12]}>
                  <Col>
                    <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
                      Quay lại
                    </Button>
                  </Col>
                  <Col>
                    <Space wrap>
                      <TimePicker
                        format="HH:mm"
                        value={plannedTime}
                        onChange={(val) => setPlannedTime(val)}
                        allowClear={false}
                        disabled={!isDraftEditable || confirming}
                        placeholder="Giờ đi"
                        style={{ width: 100 }}
                      />
                      <Button
                        icon={<RefreshCw size={16} />}
                        loading={recalculating}
                        disabled={!isDraftEditable || confirming}
                        onClick={() => runRecalculate()}
                      >
                        Tính lại ETA
                      </Button>
                      <Button
                        icon={<PackageCheck size={16} />}
                        onClick={() => navigate(`/trip-drafts/${draft.id}/loading-manifest`)}
                      >
                        LIFO Manifest
                      </Button>
                      <Button
                        type="primary"
                        icon={<Navigation size={16} />}
                        loading={confirming}
                        disabled={
                          loading ||
                          !isDraftEditable ||
                          activeStops.length === 0 ||
                          recalculating
                        }
                        onClick={handleConfirm}
                      >
                        Xác nhận bản nháp
                      </Button>
                    </Space>
                  </Col>
                </Row>
              </Card>
            </Space>
          ) : !loading ? (
            <Card bordered={false}>
              <Empty description="Không tìm thấy bản nháp chuyến" />
            </Card>
          ) : null}
        </Spin>
      </Space>

      {/* Order Items Detail Modal */}
      <Modal
        title={
          <Space>
            <PackageCheck size={20} style={{ color: '#1677ff' }} />
            <span>Chi tiết đơn hàng điểm dừng: {selectedStopForDetail?.storeName || selectedStopForDetail?.storeCode}</span>
          </Space>
        }
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setDetailModalVisible(false)}>
            Đóng
          </Button>
        ]}
        width={800}
        destroyOnClose
      >
        {detailModalLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin tip="Đang tải chi tiết đơn hàng..." />
          </div>
        ) : stopOrderItems.length > 0 ? (
          <Table
            dataSource={stopOrderItems}
            columns={detailColumns}
            rowKey={(record, idx) => `${record.orderRef}-${record.sku}-${idx}`}
            pagination={false}
            bordered
            size="small"
            summary={(pageData) => {
              let totalQty = 0;
              let totalWeight = 0;
              let totalVolume = 0;
              pageData.forEach(({ quantity, weightKg, volumeM3 }) => {
                totalQty += quantity;
                totalWeight += weightKg;
                totalVolume += volumeM3;
              });
              return (
                <Table.Summary fixed>
                  <Table.Summary.Row style={{ backgroundColor: '#fafafa', fontWeight: 600 }}>
                    <Table.Summary.Cell index={0} colSpan={3}>Tổng cộng</Table.Summary.Cell>
                    <Table.Summary.Cell index={1} align="right">{formatNumber(totalQty)}</Table.Summary.Cell>
                    <Table.Summary.Cell index={2} align="right">{formatNumber(totalWeight, 1)} kg</Table.Summary.Cell>
                    <Table.Summary.Cell index={3} align="right">{formatNumber(totalVolume, 3)} m³</Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              );
            }}
          />
        ) : (
          <Alert
            type="info"
            message="Không tìm thấy chi tiết sản phẩm"
            description="Dữ liệu chi tiết sản phẩm từ file Excel nhập cho batch này không tồn tại trên trình duyệt này."
            showIcon
          />
        )}
      </Modal>
    </AdminShell>
  );
};

export default TripDraftReviewPage;
