import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import AdminShell from '../components/AdminShell';
import { useDebounce } from '../hooks/useDebounce';
import { storeApi, type StoreItem, type StorePayload } from '../api/storeApi';
import '../styles/stores/StoresPage.css';

type FormMode = 'create' | 'edit';
type CoordinateFilter = 'all' | 'missing';

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

function getStatus(err: any) {
  return err?.response?.status ?? err?.status;
}

function getApiMessage(err: any, fallback: string) {
  return (
    err?.response?.data?.error?.message ||
    err?.response?.data?.message ||
    err?.response?.data?.errors?.[0]?.message ||
    err?.response?.data?.errors?.[0]?.defaultMessage ||
    err?.body?.error?.message ||
    err?.body?.message ||
    err?.body?.errors?.[0]?.message ||
    err?.body?.errors?.[0]?.defaultMessage ||
    err?.message ||
    fallback
  );
}

function getApiFieldErrors(err: any): Record<string, string> {
  const data = err?.response?.data ?? err?.body;
  const result: Record<string, string> = {};

  const directField = data?.error?.field || data?.field;
  const directMessage = data?.error?.message || data?.message;

  if (directField && directMessage) {
    result[directField] = directMessage;
  }

  if (Array.isArray(data?.errors)) {
    data.errors.forEach((item: any) => {
      const field = item.field || item.name;
      const errorMessage = item.message || item.defaultMessage;

      if (field && errorMessage) {
        result[field] = errorMessage;
      }
    });
  }

  return result;
}

function isCoordinateEmpty(value: any) {
  return value === undefined || value === null || value === '';
}

function hasStoreCoordinates(store: StoreItem) {
  return store.hasCoordinates || (!isCoordinateEmpty(store.latitude) && !isCoordinateEmpty(store.longitude));
}

function StatusTag({ active }: { active: boolean }) {
  return active ? <Tag color="success">Hoạt động</Tag> : <Tag color="default">Đã vô hiệu hoá</Tag>;
}

function RouteTag({ store }: { store: StoreItem }) {
  if (!store.assignedRoute) {
    return <Tag color="warning">— Chưa gắn tuyến</Tag>;
  }

  return (
    <Tooltip title={store.assignedRoute.name}>
      <Tag color="blue">{store.assignedRoute.code}</Tag>
    </Tooltip>
  );
}

function CoordinateIcon({ store }: { store: StoreItem }) {
  if (hasStoreCoordinates(store)) {
    return (
      <Tooltip title="Đã có toạ độ GPS">
        <Tag color="success" icon={<CheckCircle2 size={14} />}>
          Đã có
        </Tag>
      </Tooltip>
    );
  }

  return (
    <Tooltip title="Chưa có lat/lng. ETA có thể không chính xác.">
      <Tag color="warning" icon={<AlertTriangle size={14} />}>
        Thiếu GPS
      </Tag>
    </Tooltip>
  );
}

interface StoreFormModalProps {
  open: boolean;
  mode: FormMode;
  store: StoreItem | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: StorePayload) => Promise<void>;
}

const StoreFormModal: React.FC<StoreFormModalProps> = ({
  open,
  mode,
  store,
  submitting,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm();
  const isEdit = mode === 'edit';

  useEffect(() => {
    if (!open) return;

    if (isEdit && store) {
      form.setFieldsValue({
        storeCode: store.storeCode,
        storeName: store.storeName,
        address: store.address,
        contactName: store.contactName,
        contactPhone: store.contactPhone,
        latitude: store.latitude,
        longitude: store.longitude,
      });
    } else {
      form.resetFields();
    }
  }, [open, isEdit, store, form]);

  async function handleFinish(values: any) {
    const payload: StorePayload = {
      storeName: values.storeName?.trim(),
      address: values.address?.trim(),
      contactName: values.contactName?.trim() || null,
      contactPhone: values.contactPhone?.trim() || null,
      latitude: isCoordinateEmpty(values.latitude) ? null : Number(values.latitude),
      longitude: isCoordinateEmpty(values.longitude) ? null : Number(values.longitude),
    };

    if (!isEdit) {
      payload.storeCode = values.storeCode?.trim()?.toUpperCase();
    }

    try {
      await onSubmit(payload);
    } catch (err: any) {
      const status = getStatus(err);
      const apiMessage = getApiMessage(err, 'Không lưu được thông tin cửa hàng.');
      const fieldErrors = getApiFieldErrors(err);

      if (Object.keys(fieldErrors).length > 0) {
        form.setFields(
          Object.entries(fieldErrors).map(([name, errorMessage]) => ({
            name,
            errors: [errorMessage],
          }))
        );
        return;
      }

      if (status === 409) {
        form.setFields([
          {
            name: 'storeCode',
            errors: [apiMessage || 'Mã cửa hàng đã tồn tại.'],
          },
        ]);
        return;
      }

      message.error(apiMessage);
    }
  }

  const coordinateValidator = ({ getFieldValue }: any) => ({
    validator() {
      const lat = getFieldValue('latitude');
      const lng = getFieldValue('longitude');

      const hasLat = !isCoordinateEmpty(lat);
      const hasLng = !isCoordinateEmpty(lng);

      if (hasLat !== hasLng) {
        return Promise.reject(new Error('Vui lòng nhập cả Vĩ độ và Kinh độ, hoặc để trống cả hai.'));
      }

      return Promise.resolve();
    },
  });

  return (
    <Modal
      title={isEdit ? 'Chỉnh sửa cửa hàng' : 'Tạo cửa hàng mới'}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={760}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          label="Mã cửa hàng"
          name="storeCode"
          getValueFromEvent={(event) => event.target.value?.toUpperCase()}
          rules={[
            { required: true, message: 'Vui lòng nhập mã cửa hàng.' },
            { max: 30, message: 'Mã cửa hàng không quá 30 ký tự.' },
          ]}
        >
          <Input placeholder="VD: ST-GV-005" readOnly={isEdit} />
        </Form.Item>

        <Form.Item
          label="Tên cửa hàng"
          name="storeName"
          rules={[
            { required: true, message: 'Vui lòng nhập tên cửa hàng.' },
            { max: 150, message: 'Tên cửa hàng không quá 150 ký tự.' },
          ]}
        >
          <Input placeholder="VD: Điện Máy Phúc Anh" />
        </Form.Item>

        <Form.Item
          label="Địa chỉ"
          name="address"
          rules={[
            { required: true, message: 'Vui lòng nhập địa chỉ.' },
            { max: 255, message: 'Địa chỉ không quá 255 ký tự.' },
          ]}
        >
          <Input.TextArea rows={3} placeholder="VD: 120 Nguyễn Oanh, P.17, Q.Gò Vấp" />
        </Form.Item>

        <div className="store-form-grid">
          <Form.Item label="Người liên hệ" name="contactName">
            <Input placeholder="VD: Phúc Anh" />
          </Form.Item>

          <Form.Item
            label="Số điện thoại"
            name="contactPhone"
            rules={[
              {
                pattern: /^0\d{9}$/,
                message: 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0.',
              },
            ]}
          >
            <Input placeholder="VD: 0901234567" />
          </Form.Item>
        </div>

        <div className="store-form-grid">
          <Form.Item
            label="Vĩ độ (Latitude)"
            name="latitude"
            dependencies={['longitude']}
            rules={[coordinateValidator]}
            tooltip="Tra trên Google Maps, chuột phải → copy toạ độ"
          >
            <InputNumber className="full-width" placeholder="VD: 10.8384" />
          </Form.Item>

          <Form.Item
            label="Kinh độ (Longitude)"
            name="longitude"
            dependencies={['latitude']}
            rules={[coordinateValidator]}
          >
            <InputNumber className="full-width" placeholder="VD: 106.6644" />
          </Form.Item>
        </div>

        <Form.Item noStyle shouldUpdate>
          {({ getFieldValue }) => {
            const lat = getFieldValue('latitude');
            const lng = getFieldValue('longitude');

            if (isCoordinateEmpty(lat) && isCoordinateEmpty(lng)) {
              return (
                <Alert
                  type="warning"
                  showIcon
                  className="coord-warning"
                  title="Chưa có toạ độ GPS."
                  description="Cửa hàng này vẫn lưu được, nhưng ETA có thể không chính xác khi hệ thống tính toán hành trình."
                />
              );
            }

            return null;
          }}
        </Form.Item>

        <div className="modal-actions">
          <Button onClick={onCancel}>Huỷ</Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {isEdit ? 'Lưu thay đổi' : 'Tạo cửa hàng'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

const StoresPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const isAdmin = currentUser.roles.includes('SYSTEM_ADMIN');
  const canRead = currentUser.roles.some((role) =>
    ['SYSTEM_ADMIN', 'DISPATCHER', 'LOGISTICS_MANAGER', 'WAREHOUSE_STAFF'].includes(role)
  );

  const [stores, setStores] = useState<StoreItem[]>([]);
  const [statStores, setStatStores] = useState<StoreItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [isActive, setIsActive] = useState('');
  const [hasRoute, setHasRoute] = useState('');
  const [coordFilter, setCoordFilter] = useState<CoordinateFilter>('all');
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [pageMeta, setPageMeta] = useState({ totalElements: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [formOpen, setFormOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [confirmStatusStore, setConfirmStatusStore] = useState<StoreItem | null>(null);
  const [blockedStore, setBlockedStore] = useState<StoreItem | null>(null);
  const [blockedStoreMessage, setBlockedStoreMessage] = useState('');

  const debouncedKeyword = useDebounce(keyword, 350);

  const baseParams = useMemo(
    () => ({
      keyword: debouncedKeyword,
      isActive,
      hasRoute,
      sort: 'id,desc',
    }),
    [debouncedKeyword, isActive, hasRoute]
  );

  const queryParams = useMemo(
    () => ({
      ...baseParams,
      page,
      size,
    }),
    [baseParams, page, size]
  );

  const missingCoordinateStores = useMemo(
    () => statStores.filter((item) => !hasStoreCoordinates(item)),
    [statStores]
  );

  const tableData = useMemo(() => {
    if (coordFilter === 'missing') {
      const start = page * size;
      return missingCoordinateStores.slice(start, start + size);
    }

    return stores;
  }, [coordFilter, missingCoordinateStores, page, size, stores]);

  const tableTotal = coordFilter === 'missing' ? missingCoordinateStores.length : pageMeta.totalElements;

  async function fetchStores(params = queryParams) {
    setLoading(true);
    setError('');

    try {
      const result = await storeApi.getStores(params);
      setStores(result.content);
      setPageMeta({
        totalElements: result.totalElements,
        totalPages: result.totalPages,
      });
    } catch (err: any) {
      if (getStatus(err) === 403) {
        navigate('/dashboard');
      } else {
        setError(getApiMessage(err, 'Không tải được danh sách cửa hàng.'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchStoreStats() {
    try {
      const result = await storeApi.getStores({
        ...baseParams,
        page: 0,
        size: 500,
      });
      setStatStores(result.content);
    } catch (err: any) {
      const apiMessage = getApiMessage(err, 'Không tải được thống kê cửa hàng.');
      console.error('Failed to load store statistics', err);
      setError(apiMessage);
    }
  }

  useEffect(() => {
    if (!canRead) {
      navigate('/dashboard');
      return;
    }

    fetchStores(queryParams);
  }, [canRead, navigate, queryParams]);

  useEffect(() => {
    if (!canRead) return;
    fetchStoreStats();
  }, [canRead, baseParams]);

  function resetToFirstPage(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(0);
  }

  function openCreateModal() {
    setFormMode('create');
    setEditingStore(null);
    setFormOpen(true);
  }

  async function openEditModal(store: StoreItem) {
    setFormMode('edit');

    try {
      const detail = await storeApi.getStore(store.id);
      setEditingStore(detail);
    } catch (err: any) {
      message.error(getApiMessage(err, 'Không tải được chi tiết cửa hàng.'));
      setEditingStore(store);
    }

    setFormOpen(true);
  }

  async function handleSubmit(payload: StorePayload) {
    setSubmitting(true);

    try {
      if (formMode === 'create') {
        const created = await storeApi.createStore(payload);
        message.success(`Cửa hàng ${created.storeCode || payload.storeCode} đã được tạo thành công.`);
        setFormOpen(false);
        setPage(0);
        await fetchStores({ ...queryParams, page: 0 });
        await fetchStoreStats();
      } else if (editingStore) {
        await storeApi.updateStore(editingStore.id, payload);
        message.success('Thông tin cửa hàng đã được lưu.');
        setFormOpen(false);
        setEditingStore(null);
        await fetchStores();
        await fetchStoreStats();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmStatusChange() {
    if (!confirmStatusStore) return;

    const nextActive = !confirmStatusStore.isActive;
    setStatusSubmitting(true);

    try {
      await storeApi.updateStatus(confirmStatusStore.id, nextActive);

      message.success(
        nextActive
          ? `Đã kích hoạt ${confirmStatusStore.storeName}.`
          : `Đã vô hiệu hoá ${confirmStatusStore.storeName}.`
      );

      setConfirmStatusStore(null);
      await fetchStores();
      await fetchStoreStats();
    } catch (err: any) {
      const apiMessage = getApiMessage(err, 'Không cập nhật được trạng thái cửa hàng.');

      if (getStatus(err) === 409) {
        setBlockedStoreMessage(apiMessage);
        setBlockedStore(confirmStatusStore);
        setConfirmStatusStore(null);
        return;
      }

      message.error(apiMessage);
    } finally {
      setStatusSubmitting(false);
    }
  }

  const columns: ColumnsType<StoreItem> = [
    {
      title: 'Mã cửa hàng',
      dataIndex: 'storeCode',
      width: 130,
      render: (value) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Tên cửa hàng',
      dataIndex: 'storeName',
      width: 210,
      render: (value) => <Typography.Text>{value}</Typography.Text>,
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      ellipsis: true,
      render: (value) => (
        <Tooltip title={value}>
          <Typography.Text ellipsis>{value}</Typography.Text>
        </Tooltip>
      ),
    },
    {
      title: 'Tuyến',
      width: 160,
      render: (_, record) => <RouteTag store={record} />,
    },
    {
      title: 'Toạ độ',
      width: 130,
      render: (_, record) => <CoordinateIcon store={record} />,
    },
    {
      title: 'Trạng thái',
      width: 140,
      render: (_, record) => <StatusTag active={record.isActive} />,
    },
    {
      title: 'Thao tác',
      width: 190,
      fixed: 'right',
      render: (_, record) => {
        if (!isAdmin) {
          return <Typography.Text type="secondary">Chỉ xem</Typography.Text>;
        }

        return (
          <Space>
            <Button size="small" icon={<Edit3 size={15} />} onClick={() => openEditModal(record)}>
              Sửa
            </Button>

            <Button
              size="small"
              danger={record.isActive}
              icon={record.isActive ? <ToggleLeft size={15} /> : <ToggleRight size={15} />}
              onClick={() => setConfirmStatusStore(record)}
            >
              {record.isActive ? 'Vô hiệu hoá' : 'Kích hoạt'}
            </Button>
          </Space>
        );
      },
    },
  ];

  function handleTableChange(pagination: TablePaginationConfig) {
    setPage((pagination.current || 1) - 1);
  }

  return (
    <AdminShell currentUser={currentUser}>
      <div className="store-page">
        <div className="store-page-title">
          <p className="eyebrow">/stores</p>
          <h2>Quản lý cửa hàng</h2>
          <span>Quản lý cửa hàng điện máy, trạng thái tuyến và toạ độ GPS phục vụ tính ETA.</span>
        </div>

        <div className="store-summary-grid">
          <Card>
            <Typography.Text type="secondary">Tổng kết quả</Typography.Text>
            <h3>{tableTotal}</h3>
            <span>Theo bộ lọc hiện tại</span>
          </Card>

          <Card>
            <Typography.Text type="secondary">Thiếu toạ độ GPS</Typography.Text>
            <h3>{missingCoordinateStores.length}</h3>
            <span>Cần bổ sung trước khi tính ETA</span>
          </Card>

          <Card>
            <Typography.Text type="secondary">Quyền truy cập</Typography.Text>
            <h3>{isAdmin ? 'Admin' : 'Read-only'}</h3>
            <span>{isAdmin ? 'Có quyền tạo, sửa, vô hiệu hoá' : 'Chỉ được xem danh sách'}</span>
          </Card>
        </div>

        {missingCoordinateStores.length > 0 ? (
          <Alert
            showIcon
            type="warning"
            icon={<AlertTriangle size={18} />}
            title={`${missingCoordinateStores.length} cửa hàng chưa có toạ độ GPS.`}
            description="Tính năng tính ETA sẽ không hoạt động chính xác cho các cửa hàng này."
            action={
              <Button size="small" onClick={() => {
                setCoordFilter('missing');
                setPage(0);
              }}>
                Xem danh sách
              </Button>
            }
          />
        ) : null}

        <Card className="store-toolbar-card">
          <div className="store-toolbar">
            <Input
              allowClear
              prefix={<Search size={16} />}
              value={keyword}
              onChange={(event) => {
                setKeyword(event.target.value);
                setPage(0);
              }}
              placeholder="Tìm theo mã hoặc tên cửa hàng..."
            />

            <Select value={isActive} onChange={(value) => resetToFirstPage(setIsActive, value)}>
              <Select.Option value="">Tất cả trạng thái</Select.Option>
              <Select.Option value="true">Đang hoạt động</Select.Option>
              <Select.Option value="false">Đã vô hiệu hoá</Select.Option>
            </Select>

            <Select value={hasRoute} onChange={(value) => resetToFirstPage(setHasRoute, value)}>
              <Select.Option value="">Tất cả tuyến</Select.Option>
              <Select.Option value="true">Đã gắn tuyến</Select.Option>
              <Select.Option value="false">Chưa gắn tuyến</Select.Option>
            </Select>

            <Select
              value={coordFilter}
              onChange={(value) => {
                setCoordFilter(value);
                setPage(0);
              }}
            >
              <Select.Option value="all">Tất cả toạ độ</Select.Option>
              <Select.Option value="missing">Chưa có toạ độ</Select.Option>
            </Select>

            <Button icon={<RefreshCw size={16} />} onClick={() => {
              fetchStores();
              fetchStoreStats();
            }}>
              Tải lại
            </Button>

            {isAdmin ? (
              <Button type="primary" icon={<Plus size={16} />} onClick={openCreateModal}>
                Thêm cửa hàng
              </Button>
            ) : null}
          </div>
        </Card>

        {error ? <Alert type="error" showIcon title={error} /> : null}

        <Card>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={tableData}
            loading={loading}
            scroll={{ x: 1100 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Không tìm thấy cửa hàng phù hợp"
                />
              ),
            }}
            pagination={{
              current: page + 1,
              pageSize: size,
              total: tableTotal,
              showSizeChanger: false,
              showTotal: (total) => `Tổng ${total} cửa hàng`,
            }}
            onChange={handleTableChange}
          />
        </Card>

        <StoreFormModal
          open={formOpen}
          mode={formMode}
          store={editingStore}
          submitting={submitting}
          onCancel={() => {
            setFormOpen(false);
            setEditingStore(null);
          }}
          onSubmit={handleSubmit}
        />

        <Modal
          title={
            confirmStatusStore?.isActive
              ? `Vô hiệu hoá "${confirmStatusStore?.storeName}" (${confirmStatusStore?.storeCode})?`
              : `Kích hoạt "${confirmStatusStore?.storeName}" (${confirmStatusStore?.storeCode})?`
          }
          open={!!confirmStatusStore}
          onCancel={() => setConfirmStatusStore(null)}
          onOk={confirmStatusChange}
          okText={confirmStatusStore?.isActive ? 'Xác nhận vô hiệu hoá' : 'Xác nhận kích hoạt'}
          cancelText="Huỷ"
          confirmLoading={statusSubmitting}
          okButtonProps={{ danger: confirmStatusStore?.isActive }}
        >
          {confirmStatusStore?.isActive ? (
            <>
              <p>Cửa hàng này sẽ không còn nhận đơn hàng từ hệ thống.</p>
              <p>Các dữ liệu lịch sử vẫn được giữ nguyên.</p>
            </>
          ) : (
            <p>Cửa hàng sẽ được mở lại để nhận đơn hàng trong hệ thống.</p>
          )}
        </Modal>

        <Modal
          title={`Không thể vô hiệu hoá "${blockedStore?.storeName}" (${blockedStore?.storeCode})`}
          open={!!blockedStore}
          onCancel={() => {
            setBlockedStore(null);
            setBlockedStoreMessage('');
          }}
          footer={
            <Space>
              <Button
                onClick={() => {
                  setBlockedStore(null);
                  setBlockedStoreMessage('');
                }}
              >
                Huỷ
              </Button>
              <Button
                type="primary"
                icon={<MapPin size={15} />}
                onClick={() => {
                  const routeId = blockedStore?.assignedRoute?.id;
                  setBlockedStore(null);
                  setBlockedStoreMessage('');
                  navigate(routeId ? `/admin/routes/${routeId}` : '/admin/routes');
                }}
              >
                Đến trang quản lý tuyến {blockedStore?.assignedRoute?.code || ''}
              </Button>
            </Space>
          }
        >
          <Alert
            type="warning"
            showIcon
            title={
              blockedStoreMessage ||
              (blockedStore?.assignedRoute
                ? `Cửa hàng này đang là điểm dừng của tuyến ${blockedStore.assignedRoute.code}.`
                : 'Cửa hàng này đang thuộc tuyến hoặc chuyến đang vận hành.')
            }
            description="Bạn cần xoá cửa hàng khỏi tuyến hoặc hoàn tất chuyến liên quan trước khi vô hiệu hoá."
          />
        </Modal>
      </div>
    </AdminShell>
  );
};

export default StoresPage;