/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Typography,
  Breadcrumb,
  DatePicker,
  Select,
  Drawer,
  Spin,
  Empty,
  Alert,
  message,
  Popconfirm,
  Statistic,
  Input,
  Descriptions,
  Divider,
  Row,
  Col,
  Badge,
} from 'antd';
import {
  RefreshCw,
  Clock,
  XCircle,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Filter,
} from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import {
  getExceptions,
  getExceptionById,
  resolveException,
} from '../../../api/exceptionApi';
import type {
  ExceptionListResponse,
  ExceptionListItem,
  DeliveryExceptionResponse,
  ExceptionTypeFilter,
  ExceptionResolvedFilter,
} from '../../../types/exception';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { TextArea } = Input;

const REFRESH_INTERVAL_MS = 60_000; // 60s — same as US-17

// ── Vietnamese labels ────────────────────────────────────────────────────────

const EXCEPTION_TYPE_LABELS: Record<string, string> = {
  TIME_EXCEPTION: 'Trễ ETA',
  DELIVERY_REJECTION: 'Từ chối giao hàng',
};

const REJECTION_TYPE_LABELS: Record<string, string> = {
  STORE_CLOSED: 'Cửa hàng đóng cửa',
  STORE_REFUSED: 'Cửa hàng từ chối nhận',
  WRONG_ITEMS: 'Hàng không đúng đơn',
  DAMAGED_GOODS: 'Hàng bị hư hỏng',
  NO_SPACE: 'Không có chỗ chứa hàng',
  OTHER: 'Lý do khác',
};

function formatDateTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

function formatTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoStr;
  }
}

function formatDelay(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes === 0) return 'Đúng giờ';
  return `Trễ ${minutes} phút`;
}

// ── Error helper ─────────────────────────────────────────────────────────────

interface ApiError {
  response?: {
    status?: number;
    data?: {
      error?: {
        code?: string;
        message?: string;
      };
    };
  };
}

function getErrorInfo(err: unknown): { code: string; message: string } {
  const axErr = err as ApiError;
  const code = axErr?.response?.data?.error?.code || '';
  const msg = axErr?.response?.data?.error?.message || '';

  switch (code) {
    case 'ALREADY_RESOLVED':
      return { code, message: 'Ngoại lệ này đã được giải quyết trước đó.' };
    case 'EXCEPTION_NOT_FOUND':
      return { code, message: 'Không tìm thấy ngoại lệ.' };
    case 'ACCESS_DENIED':
      return { code, message: 'Bạn không có quyền thực hiện thao tác này.' };
    case 'VALIDATION_FAILED':
      return { code, message: msg || 'Dữ liệu không hợp lệ.' };
    default:
      if (axErr?.response?.status === 403) {
        return { code: 'ACCESS_DENIED', message: 'Bạn không có quyền quản lý ngoại lệ.' };
      }
      return { code: 'UNKNOWN', message: msg || 'Đã xảy ra lỗi. Vui lòng thử lại.' };
  }
}

// ── Component ────────────────────────────────────────────────────────────────

const ExceptionManagementPage: React.FC = () => {
  // Auth
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';
  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) roles = JSON.parse(rolesStr);
  } catch { /* */ }
  const currentUser = { id: Number(userId), username, fullName: username, roles };

  // Filters
  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [typeFilter, setTypeFilter] = useState<ExceptionTypeFilter>('ALL');
  const [resolvedFilter, setResolvedFilter] = useState<ExceptionResolvedFilter>('false');

  // Data
  const [listData, setListData] = useState<ExceptionListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerException, setDrawerException] = useState<DeliveryExceptionResponse | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Resolve form state
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  // Auto-refresh
  const [autoRefreshEnabled] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFetchingRef = useRef(false);

  // ── Fetch exceptions ───────────────────────────────────────────────────────

  const fetchExceptions = useCallback(async (isBackground = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!isBackground) setLoading(true);
    try {
      const result = await getExceptions({
        date: selectedDate.format('YYYY-MM-DD'),
        type: typeFilter,
        resolved: resolvedFilter,
      });
      setListData(result);
      setError(null);
    } catch (err: unknown) {
      if (!isBackground) {
        const { message: errMsg } = getErrorInfo(err);
        setError(errMsg);
      }
      // On background refresh error, keep existing data
    } finally {
      if (!isBackground) setLoading(false);
      isFetchingRef.current = false;
    }
  }, [selectedDate, typeFilter, resolvedFilter]);

  useEffect(() => {
    void fetchExceptions(false);
  }, [fetchExceptions]);

  // Auto-refresh
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (autoRefreshEnabled) {
      intervalRef.current = setInterval(() => {
        void fetchExceptions(true);
      }, REFRESH_INTERVAL_MS);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefreshEnabled, fetchExceptions]);

  // ── Open detail drawer ─────────────────────────────────────────────────────

  const openDetail = async (exceptionId: number) => {
    setDrawerOpen(true);
    setDrawerLoading(true);
    setDrawerException(null);
    setResolutionNotes('');
    try {
      const detail = await getExceptionById(exceptionId);
      setDrawerException(detail);
    } catch (err: unknown) {
      const { message: errMsg } = getErrorInfo(err);
      message.error(errMsg);
    } finally {
      setDrawerLoading(false);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerException(null);
    setResolutionNotes('');
  };

  // ── Resolve exception ──────────────────────────────────────────────────────

  const handleResolve = async () => {
    if (!drawerException) return;
    const notes = resolutionNotes.trim();
    if (!notes) {
      message.warning('Vui lòng nhập ghi chú giải quyết.');
      return;
    }
    if (resolving) return;
    setResolving(true);
    try {
      const result = await resolveException(drawerException.exceptionId, {
        resolutionNotes: notes,
      });
      message.success(result.message || 'Ngoại lệ đã được giải quyết.');
      // Update drawer with resolved info
      setDrawerException(result);
      setResolutionNotes('');
      // Refresh list to update counters and status
      void fetchExceptions(true);
    } catch (err: unknown) {
      const { code, message: errMsg } = getErrorInfo(err);
      if (code === 'ALREADY_RESOLVED') {
        message.info(errMsg);
        // Refresh to show updated state
        void fetchExceptions(true);
        // Re-fetch detail to show who resolved it
        void openDetail(drawerException.exceptionId);
      } else {
        message.error(errMsg);
      }
    } finally {
      setResolving(false);
    }
  };

  // ── Table columns ──────────────────────────────────────────────────────────

  const columns: ColumnsType<ExceptionListItem> = [
    {
      title: 'ID',
      dataIndex: 'exceptionId',
      key: 'exceptionId',
      width: 70,
      render: (id: number) => <Text strong>#{id}</Text>,
    },
    {
      title: 'Loại',
      dataIndex: 'exceptionType',
      key: 'exceptionType',
      width: 180,
      render: (type: string, record) => {
        const isTime = type === 'TIME_EXCEPTION';
        return (
          <Space direction="vertical" size={2}>
            <Tag
              icon={isTime ? <Clock size={12} /> : <XCircle size={12} />}
              color={isTime ? 'orange' : 'red'}
              style={{ fontWeight: 600 }}
            >
              {EXCEPTION_TYPE_LABELS[type] || type}
            </Tag>
            {isTime && record.delayMinutes != null && record.delayMinutes > 0 && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                +{record.delayMinutes} phút
              </Text>
            )}
            {!isTime && record.rejectionType && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {REJECTION_TYPE_LABELS[record.rejectionType] || record.rejectionType}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Chuyến / Xe',
      key: 'trip',
      width: 140,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{record.fixedRouteCode || '—'}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.vehicleCode || '—'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Cửa hàng',
      key: 'store',
      width: 160,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{record.storeCode || '—'}</Text>
          {record.storeName && (
            <Text type="secondary" style={{ fontSize: 12 }}>{record.storeName}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Tài xế',
      dataIndex: 'driverName',
      key: 'driverName',
      width: 140,
      render: (name: string | null) => name || '—',
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 130,
      render: (val: string) => formatDateTime(val),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 140,
      render: (_, record) => {
        if (record.resolvedAt) {
          return (
            <Tag icon={<CheckCircle2 size={12} />} color="success">
              Đã giải quyết
            </Tag>
          );
        }
        return (
          <Badge status="error" text={<Text type="danger" style={{ fontWeight: 600 }}>Chưa xử lý</Text>} />
        );
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<Eye size={14} />}
            onClick={() => openDetail(record.exceptionId)}
            style={{ padding: '4px 8px' }}
          >
            Chi tiết
          </Button>
          {!record.resolvedAt && (
            <Button
              type="primary"
              size="small"
              onClick={() => openDetail(record.exceptionId)}
              style={{ borderRadius: 6 }}
            >
              Giải quyết
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  const exceptions = listData?.exceptions || [];
  const totalCount = listData?.totalCount || 0;
  const unresolvedCount = listData?.unresolvedCount || 0;

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { title: 'Trang chủ' },
            { title: 'Theo dõi chuyến hàng', href: '/dispatcher/monitoring' },
            { title: 'Quản lý ngoại lệ' },
          ]}
        />

        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            padding: '20px 24px',
            borderRadius: 12,
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <Title level={4} style={{ margin: 0, color: '#ffffff' }}>
                <AlertTriangle size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                Quản lý ngoại lệ
              </Title>
              <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                Ngày {selectedDate.format('DD/MM/YYYY')}
              </Text>
            </div>
            <Space size={16}>
              <Statistic
                title={<span style={{ color: '#94a3b8', fontSize: 11 }}>Tổng cộng</span>}
                value={totalCount}
                valueStyle={{ color: '#ffffff', fontSize: 20, fontWeight: 700 }}
              />
              <Statistic
                title={<span style={{ color: '#94a3b8', fontSize: 11 }}>Chưa xử lý</span>}
                value={unresolvedCount}
                valueStyle={{ color: unresolvedCount > 0 ? '#ff7875' : '#95de64', fontSize: 20, fontWeight: 700 }}
              />
            </Space>
          </div>
        </div>

        {/* Filters */}
        <Card size="small" style={{ borderRadius: 10 }}>
          <Space wrap size={12} align="center">
            <Filter size={16} style={{ color: '#8c8c8c' }} />
            <DatePicker
              value={selectedDate}
              onChange={(v) => v && setSelectedDate(v)}
              format="DD/MM/YYYY"
              allowClear={false}
              placeholder="Chọn ngày"
            />
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              style={{ width: 180 }}
              options={[
                { value: 'ALL', label: 'Tất cả loại' },
                { value: 'TIME_EXCEPTION', label: '⏰ Trễ ETA' },
                { value: 'DELIVERY_REJECTION', label: '❌ Từ chối giao hàng' },
              ]}
            />
            <Select
              value={resolvedFilter}
              onChange={setResolvedFilter}
              style={{ width: 180 }}
              options={[
                { value: 'all', label: 'Tất cả trạng thái' },
                { value: 'false', label: '● Chưa giải quyết' },
                { value: 'true', label: '✅ Đã giải quyết' },
              ]}
            />
            <Button
              icon={<RefreshCw size={14} />}
              onClick={() => fetchExceptions(false)}
              loading={loading}
            >
              Làm mới
            </Button>
          </Space>
        </Card>

        {/* Content */}
        {error && !listData ? (
          <Alert
            type="error"
            showIcon
            message={error}
            action={<Button size="small" onClick={() => fetchExceptions(false)}>Thử lại</Button>}
          />
        ) : (
          <Card
            style={{ borderRadius: 10 }}
            styles={{ body: { padding: 0 } }}
          >
            <Table<ExceptionListItem>
              columns={columns}
              dataSource={exceptions}
              rowKey="exceptionId"
              loading={loading}
              pagination={exceptions.length > 20 ? { pageSize: 20, showSizeChanger: false } : false}
              locale={{
                emptyText: (
                  <Empty
                    description={
                      resolvedFilter === 'all' && typeFilter === 'ALL'
                        ? `Không có ngoại lệ nào ngày ${selectedDate.format('DD/MM/YYYY')}.`
                        : 'Không có ngoại lệ nào phù hợp với bộ lọc hiện tại.'
                    }
                  />
                ),
              }}
              scroll={{ x: 1040 }}
              rowClassName={(record) =>
                !record.resolvedAt ? 'exception-row-unresolved' : ''
              }
            />
          </Card>
        )}

        {/* Detail Drawer */}
        <Drawer
          title={
            drawerException ? (
              <Space>
                {drawerException.exceptionType === 'TIME_EXCEPTION' ? (
                  <Tag icon={<Clock size={12} />} color="orange">Trễ ETA</Tag>
                ) : (
                  <Tag icon={<XCircle size={12} />} color="red">Từ chối giao hàng</Tag>
                )}
                <Text strong>Ngoại lệ #{drawerException.exceptionId}</Text>
              </Space>
            ) : (
              'Chi tiết ngoại lệ'
            )
          }
          open={drawerOpen}
          onClose={closeDrawer}
          width={520}
          destroyOnClose
        >
          {drawerLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin tip="Đang tải chi tiết..." />
            </div>
          ) : drawerException ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Exception info */}
              <Descriptions
                column={1}
                size="small"
                bordered
                labelStyle={{ width: 140, fontWeight: 600, fontSize: 13 }}
                contentStyle={{ fontSize: 13 }}
              >
                <Descriptions.Item label="Loại">
                  {drawerException.exceptionType === 'TIME_EXCEPTION' ? (
                    <Tag icon={<Clock size={12} />} color="orange">Trễ ETA</Tag>
                  ) : (
                    <Tag icon={<XCircle size={12} />} color="red">Từ chối giao hàng</Tag>
                  )}
                </Descriptions.Item>

                {drawerException.exceptionType === 'DELIVERY_REJECTION' && drawerException.rejectionType && (
                  <Descriptions.Item label="Lý do từ chối">
                    <Tag color="volcano">
                      {REJECTION_TYPE_LABELS[drawerException.rejectionType] || drawerException.rejectionType}
                    </Tag>
                  </Descriptions.Item>
                )}

                <Descriptions.Item label="Chuyến">
                  {drawerException.fixedRouteCode || '—'}
                </Descriptions.Item>

                <Descriptions.Item label="Xe">
                  {drawerException.vehicleCode || '—'}
                </Descriptions.Item>

                <Descriptions.Item label="Cửa hàng">
                  <Space direction="vertical" size={0}>
                    <Text strong>{drawerException.storeCode || '—'}</Text>
                    {drawerException.storeName && (
                      <Text type="secondary" style={{ fontSize: 12 }}>{drawerException.storeName}</Text>
                    )}
                  </Space>
                </Descriptions.Item>

                {/* Timing section for TIME_EXCEPTION */}
                {drawerException.exceptionType === 'TIME_EXCEPTION' && (
                  <>
                    <Descriptions.Item label="ETA dự kiến">
                      {formatTime(drawerException.plannedEta)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Đến thực tế">
                      {formatTime(drawerException.actualArrivalTime)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Mức trễ">
                      <Text type="danger" strong>
                        {formatDelay(drawerException.delayMinutes)}
                      </Text>
                    </Descriptions.Item>
                  </>
                )}

                <Descriptions.Item label="Mô tả">
                  {drawerException.description || '—'}
                </Descriptions.Item>

                <Descriptions.Item label="Ghi nhận bởi">
                  {drawerException.reportedBy
                    ? `${drawerException.reportedBy.fullName} (ID: ${drawerException.reportedBy.userId})`
                    : '—'}
                </Descriptions.Item>

                <Descriptions.Item label="Thời gian tạo">
                  {formatDateTime(drawerException.createdAt)}
                </Descriptions.Item>

                <Descriptions.Item label="Trạng thái">
                  {drawerException.resolvedAt ? (
                    <Tag icon={<CheckCircle2 size={12} />} color="success">Đã giải quyết</Tag>
                  ) : (
                    <Badge status="error" text={<Text type="danger" style={{ fontWeight: 600 }}>Chưa xử lý</Text>} />
                  )}
                </Descriptions.Item>

                {drawerException.resolvedAt && (
                  <>
                    <Descriptions.Item label="Giải quyết lúc">
                      {formatDateTime(drawerException.resolvedAt)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Giải quyết bởi">
                      {drawerException.resolvedBy
                        ? `${drawerException.resolvedBy.fullName} (ID: ${drawerException.resolvedBy.userId})`
                        : '—'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Ghi chú giải quyết">
                      {drawerException.resolutionNotes || '—'}
                    </Descriptions.Item>
                  </>
                )}
              </Descriptions>

              {/* Resolve form — only if not yet resolved */}
              {!drawerException.resolvedAt && (
                <>
                  <Divider style={{ margin: '8px 0' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Giải quyết ngoại lệ</Text>
                  </Divider>

                  <div>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>
                      Ghi chú giải quyết <Text type="danger">*</Text>
                    </Text>
                    <TextArea
                      rows={4}
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Nhập ghi chú giải quyết ngoại lệ..."
                      maxLength={2000}
                      showCount
                    />
                  </div>

                  <Row gutter={12}>
                    <Col span={12}>
                      <Button
                        block
                        onClick={closeDrawer}
                        style={{ height: 44, borderRadius: 8 }}
                      >
                        Đóng
                      </Button>
                    </Col>
                    <Col span={12}>
                      <Popconfirm
                        title="Xác nhận giải quyết"
                        description="Bạn có chắc chắn muốn đánh dấu ngoại lệ này đã giải quyết?"
                        onConfirm={handleResolve}
                        okText="Xác nhận"
                        cancelText="Hủy"
                        disabled={!resolutionNotes.trim() || resolving}
                      >
                        <Button
                          type="primary"
                          block
                          icon={<CheckCircle2 size={16} />}
                          loading={resolving}
                          disabled={!resolutionNotes.trim()}
                          style={{
                            height: 44,
                            borderRadius: 8,
                            fontWeight: 600,
                            background: '#52c41a',
                            borderColor: '#52c41a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                          }}
                        >
                          Đánh dấu đã giải quyết
                        </Button>
                      </Popconfirm>
                    </Col>
                  </Row>
                </>
              )}
            </div>
          ) : (
            <Empty description="Không thể tải chi tiết ngoại lệ." />
          )}
        </Drawer>
      </div>
    </AdminShell>
  );
};

export default ExceptionManagementPage;
