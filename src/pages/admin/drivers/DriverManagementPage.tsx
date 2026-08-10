import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Table, Card, Space, Button, Input, Select, Breadcrumb,
  message, Alert, Tooltip, Typography,
} from 'antd';
import { History, RefreshCw, Search, Lock, Unlock, Users } from 'lucide-react';
import { useDebounce } from '../../../hooks/useDebounce';
import { usePermissions } from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../constants/permissions';
import AdminShell from '../../../components/AdminShell';
import PageHeader from '../../../components/PageHeader';
import StatusBadge from '../../../components/StatusBadge';
import { palette } from '../../../theme/tokens';
import { getDrivers, updateDriverStatus, type DriverStatusUpdatePayload } from '../../../api/driverApi';
import { getAvailableDrivers } from '../../../api/tripApi';
import type { AvailableDriver } from '../../../types/trip';
import {
  DRIVER_STATUS_LABEL,
  REASON_CODE_LABEL,
  type Driver,
  type DriverStatus,
} from '../../../types/driver';
import DriverStatusModal from './components/DriverStatusModal';
import DriverStatusHistoryDrawer from './components/DriverStatusHistoryDrawer';

const { Text } = Typography;

const DriverManagementPage: React.FC = () => {
  const username = localStorage.getItem('username') || '';
  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) roles = JSON.parse(rolesStr);
  } catch {
    // ignore malformed roles in storage
  }
  const currentUser = { id: Number(localStorage.getItem('userId') || 0), username, fullName: username, roles };

  const { can } = usePermissions();
  const canWrite = can(PERMISSIONS.DRIVER_WRITE);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<DriverStatus | ''>('');
  // "Đang rảnh/bận" không phải cột do BE phân trang (đến từ API /drivers/available riêng),
  // nên khi lọc theo cột này ta phải kéo toàn bộ danh sách khớp keyword/status rồi tự phân trang ở FE.
  const [availabilityFilter, setAvailabilityFilter] = useState<'' | 'AVAILABLE' | 'BUSY'>('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [pageMeta, setPageMeta] = useState({ totalElements: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusModalDriver, setStatusModalDriver] = useState<Driver | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [historyDriver, setHistoryDriver] = useState<Driver | null>(null);

  // Đang chạy/bận/rảnh hôm nay — tách biệt với "Trạng thái" (khóa/mở tài khoản).
  // Dùng lại đúng logic busy đã có ở màn phân công chuyến (Trip.status DISPATCHED/IN_PROGRESS
  // hôm nay, hoặc còn xe chưa xác nhận về kho từ chuyến trước).
  const [availability, setAvailability] = useState<Record<number, AvailableDriver>>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(true);

  const debouncedKeyword = useDebounce(keyword, 350);

  const queryParams = useMemo(
    () =>
      availabilityFilter
        ? { keyword: debouncedKeyword || undefined, status: status || undefined, page: 0, size: 1000 }
        : { keyword: debouncedKeyword || undefined, status: status || undefined, page, size },
    [debouncedKeyword, status, page, size, availabilityFilter]
  );

  async function fetchDrivers(params = queryParams) {
    setLoading(true);
    setError('');
    try {
      const result = await getDrivers(params);
      setDrivers(result.items);
      setPageMeta({ totalElements: result.pagination.totalElements, totalPages: result.pagination.totalPages });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDrivers(queryParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  async function fetchAvailability() {
    setAvailabilityLoading(true);
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const result = await getAvailableDrivers(today);
      const map: Record<number, AvailableDriver> = {};
      result.forEach((d) => {
        map[d.userId] = d;
      });
      setAvailability(map);
    } catch {
      // Không chặn hiển thị danh sách tài xế nếu API này lỗi — cột sẽ hiện "—".
      setAvailability({});
    } finally {
      setAvailabilityLoading(false);
    }
  }

  useEffect(() => {
    fetchAvailability();
  }, []);

  function resetToFirstPage<T>(setter: (val: T) => void, value: T) {
    setter(value);
    setPage(0);
  }

  const filteredDrivers = useMemo(() => {
    if (!availabilityFilter) return drivers;
    return drivers.filter((d) => {
      const avail = availability[d.id];
      if (!avail) return false;
      return availabilityFilter === 'AVAILABLE' ? avail.available : !avail.available;
    });
  }, [drivers, availability, availabilityFilter]);

  const displayedDrivers = useMemo(() => {
    if (!availabilityFilter) return filteredDrivers;
    return filteredDrivers.slice(page * size, page * size + size);
  }, [filteredDrivers, availabilityFilter, page, size]);

  const displayTotal = availabilityFilter ? filteredDrivers.length : pageMeta.totalElements;

  async function handleConfirmStatusChange(payload: DriverStatusUpdatePayload) {
    if (!statusModalDriver) return;
    setStatusUpdating(true);
    try {
      const updated = await updateDriverStatus(statusModalDriver.id, payload);
      setDrivers((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      message.success(
        updated.driverStatus === 'INACTIVE'
          ? `Đã chuyển tài xế ${updated.fullName} sang Ngừng hoạt động.`
          : `Đã kích hoạt lại tài xế ${updated.fullName}.`
      );
      setStatusModalDriver(null);
    } catch (err) {
      message.error((err as Error).message);
    } finally {
      setStatusUpdating(false);
    }
  }

  const columns = [
    {
      title: 'Họ tên',
      dataIndex: 'fullName',
      key: 'fullName',
    },
    {
      title: 'Liên hệ',
      key: 'contact',
      render: (_: unknown, record: Driver) => (
        <>
          <div>{record.phoneNumber || '—'}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
        </>
      ),
    },
    {
      title: 'Bằng lái xe',
      key: 'licenseClass',
      render: (_: unknown, record: Driver) =>
        record.licenseClass ? <StatusBadge color="blue">{`Hạng ${record.licenseClass}`}</StatusBadge> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Trạng thái',
      key: 'driverStatus',
      render: (_: unknown, record: Driver) => {
        const meta = DRIVER_STATUS_LABEL[record.driverStatus];
        const badge = <StatusBadge color={meta.color as any}>{meta.label}</StatusBadge>;
        if (record.driverStatus === 'INACTIVE' && record.reasonCode) {
          return (
            <Tooltip
              title={
                <>
                  {REASON_CODE_LABEL[record.reasonCode]}
                  {record.reasonNote ? ` — ${record.reasonNote}` : ''}
                </>
              }
            >
              {badge}
            </Tooltip>
          );
        }
        return badge;
      },
    },
    {
      title: 'Đang chạy hôm nay',
      key: 'availability',
      render: (_: unknown, record: Driver) => {
        if (record.driverStatus === 'INACTIVE') {
          return <Text type="secondary">—</Text>;
        }
        const avail = availability[record.id];
        if (!avail) {
          return availabilityLoading ? <Text type="secondary">Đang tải...</Text> : <Text type="secondary">—</Text>;
        }
        if (avail.available) {
          return <StatusBadge color="success">Đang rảnh</StatusBadge>;
        }
        const badge = <StatusBadge color="error">Đang bận</StatusBadge>;
        return avail.busyReason ? <Tooltip title={avail.busyReason}>{badge}</Tooltip> : badge;
      },
    },
    {
      title: 'Cập nhật lần cuối',
      key: 'statusUpdatedAt',
      render: (_: unknown, record: Driver) => (
        <>
          <div>{record.statusUpdatedAt || '—'}</div>
          {record.statusUpdatedByName ? (
            <Text type="secondary" style={{ fontSize: 12 }}>bởi {record.statusUpdatedByName}</Text>
          ) : null}
        </>
      ),
    },
    {
      title: 'Chuyến đang hoạt động',
      key: 'activeTripsWarning',
      render: (_: unknown, record: Driver) =>
        record.activeTripsWarning?.length ? (
          <StatusBadge color="warning">{record.activeTripsWarning.length} chuyến</StatusBadge>
        ) : (
          '—'
        ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: unknown, record: Driver) => (
        <Space size="small">
          <Button
            type="text"
            icon={<History size={16} />}
            title="Lịch sử trạng thái"
            onClick={() => setHistoryDriver(record)}
          />
          {canWrite ? (
            <Button
              type="text"
              danger={record.driverStatus === 'ACTIVE'}
              style={{ color: record.driverStatus === 'ACTIVE' ? undefined : palette.success }}
              icon={record.driverStatus === 'ACTIVE' ? <Lock size={16} /> : <Unlock size={16} />}
              title={record.driverStatus === 'ACTIVE' ? 'Ngừng hoạt động' : 'Kích hoạt lại'}
              onClick={() => setStatusModalDriver(record)}
            />
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <Breadcrumb items={[{ title: 'Admin' }, { title: 'Quản lý tài xế' }]} style={{ marginBottom: 12, fontSize: 13 }} />
          <PageHeader
            title="Quản lý tài xế"
            subtitle="Bật/tắt trạng thái hoạt động của tài xế và xem lịch sử thay đổi."
            icon={<Users size={20} />}
          />
        </div>

        <Card bordered={false} style={{ borderRadius: 14, boxShadow: palette.cardShadow }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <Space size="middle" wrap>
              <Input
                placeholder="Tìm theo họ tên..."
                value={keyword}
                onChange={(e) => resetToFirstPage(setKeyword, e.target.value)}
                prefix={<Search size={16} style={{ color: palette.textFaint }} />}
                style={{ width: 260 }}
                allowClear
              />
              <Select
                placeholder="Tất cả trạng thái"
                value={status || undefined}
                onChange={(val) => resetToFirstPage(setStatus, (val || '') as DriverStatus | '')}
                style={{ width: 200 }}
                allowClear
                options={[
                  { value: 'ACTIVE', label: 'Đang hoạt động' },
                  { value: 'INACTIVE', label: 'Ngừng hoạt động' },
                ]}
              />
              <Select
                placeholder="Tất cả (rảnh/bận)"
                value={availabilityFilter || undefined}
                onChange={(val) =>
                  resetToFirstPage(setAvailabilityFilter, (val || '') as '' | 'AVAILABLE' | 'BUSY')
                }
                style={{ width: 180 }}
                allowClear
                loading={availabilityLoading}
                options={[
                  { value: 'AVAILABLE', label: 'Đang rảnh' },
                  { value: 'BUSY', label: 'Đang bận' },
                ]}
              />
            </Space>

            <Button
              icon={<RefreshCw size={14} />}
              onClick={() => {
                fetchDrivers();
                fetchAvailability();
              }}
            >
              Tải lại
            </Button>
          </div>

          {error ? <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} /> : null}

          <Table
            columns={columns}
            dataSource={displayedDrivers}
            rowKey="id"
            loading={loading || (availabilityFilter ? availabilityLoading : false)}
            pagination={{
              current: page + 1,
              pageSize: size,
              total: displayTotal,
              showSizeChanger: true,
              pageSizeOptions: ['5', '10', '20', '50'],
              onChange: (p, s) => {
                setPage(p - 1);
                if (s) setSize(s);
              },
              showTotal: (total) => `Tổng cộng ${total} tài xế`,
              position: ['bottomRight'],
            }}
          />
        </Card>
      </div>

      <DriverStatusModal
        visible={!!statusModalDriver}
        driver={statusModalDriver}
        loading={statusUpdating}
        onCancel={() => setStatusModalDriver(null)}
        onConfirm={handleConfirmStatusChange}
      />

      <DriverStatusHistoryDrawer
        visible={!!historyDriver}
        driverId={historyDriver?.id ?? null}
        driverName={historyDriver?.fullName ?? ''}
        onClose={() => setHistoryDriver(null)}
      />
    </AdminShell>
  );
};

export default DriverManagementPage;
