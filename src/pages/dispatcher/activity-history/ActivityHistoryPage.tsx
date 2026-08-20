/* eslint-disable react-hooks/set-state-in-effect */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  DatePicker,
  Drawer,
  Empty,
  Input,
  InputNumber,
  message,
  Select,
  Space,
  Table,
  Tabs,
  Timeline,
  Typography,
} from 'antd';
import { AlertTriangle, Download, Eye, Filter, History, RefreshCw, Truck } from 'lucide-react';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import AdminShell from '../../../components/AdminShell';
import StatusBadge from '../../../components/StatusBadge';
import { usePermissions } from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../constants/permissions';
import { dispatchExportApi } from '../../../api/dispatchExportApi';
import { downloadBlob } from '../../../utils/downloadBlob';
import {
  searchPlanningEvents,
  type PlanningEventSearchFilters,
} from '../../../api/planningHistoryApi';
import {
  searchTripOutcomeEvents,
  getTripOutcomeHistory,
  type TripOutcomeEventSearchFilters,
} from '../../../api/tripOutcomeEventApi';
import {
  PLANNING_EVENT_TYPE_LABEL,
  type PlanningEvent,
  type PlanningEventType,
} from '../../../types/planningEvent';
import {
  TRIP_OUTCOME_EVENT_TYPE_LABEL,
  type TripOutcomeEvent,
  type TripOutcomeEventType,
} from '../../../types/tripOutcomeEvent';
import { REASON_CODE_LABELS } from '../../../types/driverTrip';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

const DELIVERY_RESULT_LABEL: Record<string, string> = {
  DELIVERED: 'Giao thành công',
  FAILED: 'Giao thất bại',
  PARTIALLY_DELIVERED: 'Giao một phần',
};

interface ApiError {
  response?: { data?: { error?: { message?: string } } };
  message?: string;
}

function getErrorMessage(err: unknown, fallback: string): string {
  const axErr = err as ApiError;
  return axErr?.response?.data?.error?.message || axErr?.message || fallback;
}

function formatDateTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  return dayjs(isoStr).format('DD/MM/YYYY HH:mm');
}

// ── Tab 1: Trip Outcome Audit Log ───────────────────────────────────────────

const OutcomeAuditTab: React.FC = () => {
  const [filters, setFilters] = useState<TripOutcomeEventSearchFilters>({});
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [items, setItems] = useState<TripOutcomeEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [drawerTripId, setDrawerTripId] = useState<number | null>(null);
  const [drawerEvents, setDrawerEvents] = useState<TripOutcomeEvent[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchTripOutcomeEvents(filters, { page, size: pageSize });
      setItems(result.items);
      setTotal(result.pagination.totalElements);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Không tải được lịch sử giao hàng.'));
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const openTimeline = async (tripId: number | null) => {
    if (!tripId) return;
    setDrawerTripId(tripId);
    setDrawerLoading(true);
    setDrawerEvents([]);
    try {
      const result = await getTripOutcomeHistory(tripId, { size: 200 });
      setDrawerEvents(result.items);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Không tải được timeline chuyến giao hàng.'));
    } finally {
      setDrawerLoading(false);
    }
  };

  const columns: ColumnsType<TripOutcomeEvent> = [
    { title: 'Thời gian', dataIndex: 'occurredAt', key: 'occurredAt', width: 150, render: formatDateTime },
    {
      title: 'Sự kiện',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 190,
      render: (type: TripOutcomeEventType) => <StatusBadge color="blue">{TRIP_OUTCOME_EVENT_TYPE_LABEL[type] || type}</StatusBadge>,
    },
    { title: 'Chuyến', dataIndex: 'tripId', key: 'tripId', width: 80, render: (id: number | null) => id ?? '—' },
    { title: 'Tuyến', dataIndex: 'routeCode', key: 'routeCode', width: 100, render: (v: string | null) => v ?? '—' },
    { title: 'Tài xế', dataIndex: 'driverUsername', key: 'driverUsername', width: 120, render: (v: string | null) => v ?? '—' },
    { title: 'Cửa hàng', dataIndex: 'storeCode', key: 'storeCode', width: 100, render: (v: string | null) => v ?? '—' },
    {
      title: 'Kết quả',
      dataIndex: 'deliveryResult',
      key: 'deliveryResult',
      width: 130,
      render: (v: string | null) => (v ? DELIVERY_RESULT_LABEL[v] || v : '—'),
    },
    {
      title: 'Ghi chú',
      key: 'note',
      render: (_, record) => {
        const rawNote = record.exceptionText || record.reasonCode || record.validationNote;
        if (!rawNote) return '—';
        return REASON_CODE_LABELS[rawNote] || rawNote;
      },
    },
    {
      title: '',
      key: 'action',
      width: 60,
      render: (_, record) =>
        record.tripId ? (
          <Button type="link" size="small" icon={<Eye size={14} />} onClick={() => openTimeline(record.tripId)} />
        ) : null,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card size="small" style={{ borderRadius: 10 }}>
        <Space wrap size={12} align="center">
          <Filter size={16} style={{ color: '#8c8c8c' }} />
          <InputNumber
            placeholder="Mã chuyến"
            style={{ width: 110 }}
            value={filters.tripId}
            onChange={(v) => setFilters((f) => ({ ...f, tripId: v ?? undefined }))}
          />
          <Input
            placeholder="Tài xế"
            style={{ width: 130 }}
            value={filters.driverUsername}
            onChange={(e) => setFilters((f) => ({ ...f, driverUsername: e.target.value || undefined }))}
          />
          <Input
            placeholder="Mã tuyến"
            style={{ width: 120 }}
            value={filters.routeCode}
            onChange={(e) => setFilters((f) => ({ ...f, routeCode: e.target.value || undefined }))}
          />
          <DatePicker
            placeholder="Ngày giao"
            format="DD/MM/YYYY"
            value={filters.deliveryDate ? dayjs(filters.deliveryDate) : null}
            onChange={(v) => setFilters((f) => ({ ...f, deliveryDate: v ? v.format('YYYY-MM-DD') : undefined }))}
          />
          <Select
            placeholder="Kết quả giao"
            allowClear
            style={{ width: 160 }}
            value={filters.deliveryResult}
            onChange={(v) => setFilters((f) => ({ ...f, deliveryResult: v }))}
            options={Object.entries(DELIVERY_RESULT_LABEL).map(([value, label]) => ({ value, label }))}
          />
          <Select
            placeholder="Loại sự kiện"
            allowClear
            style={{ width: 200 }}
            value={filters.eventType}
            onChange={(v) => setFilters((f) => ({ ...f, eventType: v }))}
            options={Object.entries(TRIP_OUTCOME_EVENT_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
          />
          <Button
            icon={<RefreshCw size={14} />}
            onClick={() => {
              setPage(0);
              void fetchData();
            }}
            loading={loading}
          >
            Làm mới
          </Button>
        </Space>
      </Card>

      {error && <Alert type="error" showIcon message={error} />}

      <Card style={{ borderRadius: 10 }} styles={{ body: { padding: 0 } }}>
        <Table<TripOutcomeEvent>
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page + 1,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, s) => {
              setPage(p - 1);
              setPageSize(s);
            },
          }}
          locale={{ emptyText: <Empty description="Không có sự kiện nào phù hợp với bộ lọc." /> }}
          scroll={{ x: 1100 }}
        />
      </Card>

      <Drawer
        title={<Space><Truck size={16} /> Timeline chuyến #{drawerTripId}</Space>}
        open={drawerTripId !== null}
        onClose={() => setDrawerTripId(null)}
        width={480}
        destroyOnClose
      >
        {drawerLoading ? (
          <Empty description="Đang tải..." />
        ) : drawerEvents.length === 0 ? (
          <Empty description="Không có dữ liệu timeline." />
        ) : (
          <Timeline
            items={drawerEvents.map((ev) => ({
              children: (
                <div>
                  <Text strong>{TRIP_OUTCOME_EVENT_TYPE_LABEL[ev.eventType] || ev.eventType}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>{formatDateTime(ev.occurredAt)}</Text>
                  {ev.storeCode && <div style={{ fontSize: 13 }}>Cửa hàng: {ev.storeCode}</div>}
                  {ev.deliveryResult && (
                    <div style={{ fontSize: 13 }}>
                      Kết quả: {DELIVERY_RESULT_LABEL[ev.deliveryResult] || ev.deliveryResult}
                    </div>
                  )}
                  {(ev.exceptionText || ev.reasonCode) && (
                    <div style={{ fontSize: 13, color: '#cf1322' }}>
                      {REASON_CODE_LABELS[ev.exceptionText || ''] || REASON_CODE_LABELS[ev.reasonCode || ''] || ev.exceptionText || ev.reasonCode}
                    </div>
                  )}
                  {ev.actorUsername && (
                    <Text type="secondary" style={{ fontSize: 12 }}>bởi {ev.actorUsername}</Text>
                  )}
                </div>
              ),
            }))}
          />
        )}
      </Drawer>
    </div>
  );
};

// ── Tab 2: Planning Audit Log ────────────────────────────────────────────────

const PlanningAuditTab: React.FC = () => {
  const [filters, setFilters] = useState<PlanningEventSearchFilters>({});
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [items, setItems] = useState<PlanningEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Confirmed Dispatch Data Export — date-range mode. Gated separately from the tab's own
  // planning-history:read visibility guard, because the export endpoint itself requires
  // trip:coordinate or trip:read (see filemd/CONFIRMED_DISPATCH_EXPORT_BE_SPEC.md §7) — a
  // user who can see this tab via planning-history:read alone may still lack export access.
  const { canAny } = usePermissions();
  const canExportDispatch = canAny([PERMISSIONS.TRIP_COORDINATE, PERMISSIONS.TRIP_READ]);
  const [exportRange, setExportRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const handleExportRange = async () => {
    if (!exportRange) {
      message.warning('Vui lòng chọn khoảng ngày trước khi xuất.');
      return;
    }
    const [from, to] = exportRange;
    setExportLoading(true);
    try {
      const blob = await dispatchExportApi.exportDispatchByDateRange(
        from.format('YYYY-MM-DD'),
        to.format('YYYY-MM-DD')
      );
      const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
      downloadBlob(blob, `ELog_DispatchExport_${from.format('YYYYMMDD')}_to_${to.format('YYYYMMDD')}_${stamp}.xlsx`);
      message.success('Xuất dữ liệu điều phối thành công');
    } catch (err: unknown) {
      const axErr = err as ApiError & { response?: { data?: { error?: { code?: string } } } };
      const code = axErr?.response?.data?.error?.code;
      if (code === 'DATE_RANGE_TOO_WIDE') {
        message.error('Khoảng ngày quá rộng — tối đa 31 ngày mỗi lần xuất.');
      } else if (code === 'RESOURCE_NOT_FOUND') {
        message.warning('Không có dữ liệu điều phối đã xác nhận trong khoảng ngày đã chọn.');
      } else {
        message.error(getErrorMessage(err, 'Không thể xuất dữ liệu điều phối. Vui lòng thử lại.'));
      }
    } finally {
      setExportLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await searchPlanningEvents(filters, { page, size: pageSize });
      setItems(result.items);
      setTotal(result.pagination.totalElements);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Không tải được lịch sử điều phối.'));
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const columns: ColumnsType<PlanningEvent> = [
    { title: 'Thời gian', dataIndex: 'occurredAt', key: 'occurredAt', width: 150, render: formatDateTime },
    {
      title: 'Sự kiện',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 210,
      render: (type: PlanningEventType) => <StatusBadge color="purple">{PLANNING_EVENT_TYPE_LABEL[type] || type}</StatusBadge>,
    },
    { title: 'Draft', dataIndex: 'tripDraftId', key: 'tripDraftId', width: 80, render: (v: number | null) => v ?? '—' },
    { title: 'Chuyến', dataIndex: 'tripId', key: 'tripId', width: 80, render: (v: number | null) => v ?? '—' },
    { title: 'Tuyến', dataIndex: 'routeCode', key: 'routeCode', width: 100, render: (v: string | null) => v ?? '—' },
    { title: 'Người thực hiện', dataIndex: 'actorUsername', key: 'actorUsername', width: 140, render: (v: string | null) => v ?? 'Hệ thống' },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 180,
      render: (_, record) =>
        record.statusBefore || record.statusAfter ? (
          <Text style={{ fontSize: 13 }}>
            {record.statusBefore ?? '—'} → {record.statusAfter ?? '—'}
          </Text>
        ) : (
          '—'
        ),
    },
    { title: 'Diễn giải', dataIndex: 'changeSummary', key: 'changeSummary', render: (v: string | null) => v ?? '—' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card size="small" style={{ borderRadius: 10 }}>
        <Space wrap size={12} align="center">
          <Filter size={16} style={{ color: '#8c8c8c' }} />
          <InputNumber
            placeholder="Mã draft"
            style={{ width: 110 }}
            value={filters.tripDraftId}
            onChange={(v) => setFilters((f) => ({ ...f, tripDraftId: v ?? undefined }))}
          />
          <InputNumber
            placeholder="Mã chuyến"
            style={{ width: 110 }}
            value={filters.tripId}
            onChange={(v) => setFilters((f) => ({ ...f, tripId: v ?? undefined }))}
          />
          <Input
            placeholder="Mã tuyến"
            style={{ width: 120 }}
            value={filters.routeCode}
            onChange={(e) => setFilters((f) => ({ ...f, routeCode: e.target.value || undefined }))}
          />
          <Input
            placeholder="Người thực hiện"
            style={{ width: 150 }}
            value={filters.actorUsername}
            onChange={(e) => setFilters((f) => ({ ...f, actorUsername: e.target.value || undefined }))}
          />
          <DatePicker
            placeholder="Ngày giao"
            format="DD/MM/YYYY"
            value={filters.deliveryDate ? dayjs(filters.deliveryDate) : null}
            onChange={(v) => setFilters((f) => ({ ...f, deliveryDate: v ? v.format('YYYY-MM-DD') : undefined }))}
          />
          <Select
            placeholder="Loại sự kiện"
            allowClear
            style={{ width: 220 }}
            value={filters.eventType}
            onChange={(v) => setFilters((f) => ({ ...f, eventType: v }))}
            options={Object.entries(PLANNING_EVENT_TYPE_LABEL).map(([value, label]) => ({ value, label }))}
          />
          <Button
            icon={<RefreshCw size={14} />}
            onClick={() => {
              setPage(0);
              void fetchData();
            }}
            loading={loading}
          >
            Làm mới
          </Button>
        </Space>
      </Card>

      {canExportDispatch && (
        <Card size="small" style={{ borderRadius: 10 }}>
          <Space wrap size={12} align="center">
            <Download size={16} style={{ color: '#8c8c8c' }} />
            <Text strong style={{ fontSize: 13 }}>Xuất dữ liệu điều phối đã xác nhận:</Text>
            <RangePicker
              format="DD/MM/YYYY"
              value={exportRange}
              onChange={(v) => setExportRange(v && v[0] && v[1] ? [v[0], v[1]] : null)}
            />
            <Button
              type="primary"
              icon={<Download size={14} />}
              loading={exportLoading}
              onClick={handleExportRange}
            >
              Xuất Excel
            </Button>
            <Text type="secondary" style={{ fontSize: 12 }}>Tối đa 31 ngày mỗi lần xuất.</Text>
          </Space>
        </Card>
      )}

      {error && <Alert type="error" showIcon message={error} />}

      <Card style={{ borderRadius: 10 }} styles={{ body: { padding: 0 } }}>
        <Table<PlanningEvent>
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page + 1,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: (p, s) => {
              setPage(p - 1);
              setPageSize(s);
            },
          }}
          locale={{ emptyText: <Empty description="Không có sự kiện nào phù hợp với bộ lọc." /> }}
          scroll={{ x: 1100 }}
        />
      </Card>
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────

const ActivityHistoryPage: React.FC = () => {
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';
  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) roles = JSON.parse(rolesStr);
  } catch { /* */ }
  const currentUser = { id: Number(userId), username, fullName: username, roles };

  const { can } = usePermissions();
  // Each tab hits a different BE endpoint with its own @PreAuthorize:
  // GET /api/v1/trip-outcome-events needs trip:read, GET /api/v1/planning-events
  // needs planning-history:read specifically (trip:read does NOT satisfy it).
  // The page-level route guard only checks "has at least one of the two" so the
  // page itself stays reachable — gate each tab individually here so a role
  // missing one of the two permissions doesn't see a tab that just 403s.
  const tabItems = [
    can(PERMISSIONS.TRIP_READ)
      ? {
        key: 'outcome',
        label: (
          <Space size={6}>
            <Truck size={14} /> Lịch sử giao hàng
          </Space>
        ),
        children: <OutcomeAuditTab />,
      }
      : null,
    can(PERMISSIONS.PLANNING_HISTORY_READ)
      ? {
        key: 'planning',
        label: (
          <Space size={6}>
            <AlertTriangle size={14} /> Lịch sử điều phối
          </Space>
        ),
        children: <PlanningAuditTab />,
      }
      : null,
  ].filter((item): item is Exclude<typeof item, null> => item !== null);

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Breadcrumb items={[{ title: 'Trang chủ' }, { title: 'Nhật ký hoạt động' }]} />

        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            padding: '20px 24px',
            borderRadius: 12,
            color: '#ffffff',
          }}
        >
          <Title level={4} style={{ margin: 0, color: '#ffffff' }}>
            <History size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Nhật ký hoạt động
          </Title>
          <Text style={{ color: '#94a3b8', fontSize: 13 }}>
            Tra cứu lịch sử giao hàng thực tế và lịch sử điều phối / phân xe
          </Text>
        </div>

        <Tabs defaultActiveKey={tabItems[0]?.key} items={tabItems} />
      </div>
    </AdminShell>
  );
};

export default ActivityHistoryPage;
