import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Lock,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Unlock,
} from 'lucide-react';
import AdminShell from '../components/AdminShell';
import { useDebounce } from '../hooks/useDebounce';
import { storeApi, type StoreItem, type StorePayload } from '../api/storeApi';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../constants/permissions';

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
  return (
    store.hasCoordinates ||
    (!isCoordinateEmpty(store.latitude) && !isCoordinateEmpty(store.longitude))
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      status={active ? 'success' : 'error'}
      text={active ? 'Hoạt động' : 'Đã vô hiệu hoá'}
    />
  );
}

function RouteTag({ store }: { store: StoreItem }) {
  if (!store.assignedRoute) {
    return <Tag color="default">Chưa gắn tuyến</Tag>;
  }

  return (
    <Tooltip title={store.assignedRoute.name}>
      <Tag color="blue">{store.assignedRoute.code}</Tag>
    </Tooltip>
  );
}

function CoordinateTag({ store }: { store: StoreItem }) {
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
        return Promise.reject(
          new Error('Vui lòng nhập cả Vĩ độ và Kinh độ, hoặc để trống cả hai.')
        );
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

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item label="Người liên hệ" name="contactName">
              <Input placeholder="VD: Phúc Anh" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
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
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Vĩ độ (Latitude)"
              name="latitude"
              dependencies={['longitude']}
              rules={[coordinateValidator]}
              tooltip="Tra trên Google Maps, chuột phải → copy toạ độ"
            >
              <InputNumber style={{ width: '100%' }} placeholder="VD: 10.8384" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Kinh độ (Longitude)"
              name="longitude"
              dependencies={['latitude']}
              rules={[coordinateValidator]}
            >
              <InputNumber style={{ width: '100%' }} placeholder="VD: 106.6644" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item noStyle shouldUpdate>
          {({ getFieldValue }) => {
            const lat = getFieldValue('latitude');
            const lng = getFieldValue('longitude');

            if (isCoordinateEmpty(lat) && isCoordinateEmpty(lng)) {
              return (
                <Alert
                  type="warning"
                  showIcon
                  message="Chưa có toạ độ GPS."
                  description="Cửa hàng này vẫn lưu được, nhưng ETA có thể không chính xác khi hệ thống tính toán hành trình."
                  style={{ marginBottom: 18 }}
                />
              );
            }

            return null;
          }}
        </Form.Item>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
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
  const { can } = usePermissions();

  const canRead = can(PERMISSIONS.STORE_READ);
  const canWriteStore = can(PERMISSIONS.STORE_WRITE);

  const [stores, setStores] = useState<StoreItem[]>([]);
  const [statStores, setStatStores] = useState<StoreItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [isActive, setIsActive] = useState('');
  const [hasRoute, setHasRoute] = useState('');
  const [coordFilter, setCoordFilter] = useState<CoordinateFilter>('all');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [pageMeta, setPageMeta] = useState({ totalElements: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [formOpen, setFormOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusSubmittingId, setStatusSubmittingId] = useState<number | null>(null);
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

  const tableTotal =
    coordFilter === 'missing' ? missingCoordinateStores.length : pageMeta.totalElements;

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
    if (!canWriteStore) {
      message.warning('Bạn không có quyền tạo cửa hàng.');
      return;
    }

    setFormMode('create');
    setEditingStore(null);
    setFormOpen(true);
  }

  async function openEditModal(store: StoreItem) {
    if (!canWriteStore) {
      message.warning('Bạn không có quyền chỉnh sửa cửa hàng.');
      return;
    }

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
    if (!canWriteStore) {
      message.warning('Bạn không có quyền lưu thông tin cửa hàng.');
      return;
    }

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

  async function toggleStoreStatus(store: StoreItem) {
    if (!canWriteStore) {
      message.warning('Bạn không có quyền cập nhật trạng thái cửa hàng.');
      return;
    }

    const nextActive = !store.isActive;
    setStatusSubmittingId(store.id);

    try {
      await storeApi.updateStatus(store.id, nextActive);

      message.success(
        nextActive
          ? `Đã kích hoạt ${store.storeName}.`
          : `Đã vô hiệu hoá ${store.storeName}.`
      );

      await fetchStores();
      await fetchStoreStats();
    } catch (err: any) {
      const apiMessage = getApiMessage(err, 'Không cập nhật được trạng thái cửa hàng.');

      if (getStatus(err) === 409) {
        setBlockedStoreMessage(apiMessage);
        setBlockedStore(store);
        return;
      }

      message.error(apiMessage);
    } finally {
      setStatusSubmittingId(null);
    }
  }

  const columns: ColumnsType<StoreItem> = [
    {
      title: 'Mã cửa hàng',
      dataIndex: 'storeCode',
      key: 'storeCode',
      width: 130,
      render: (value: string) => <strong>{value}</strong>,
    },
    {
      title: 'Tên cửa hàng',
      dataIndex: 'storeName',
      key: 'storeName',
      width: 210,
      render: (value: string) => (
        <Space>
          <Avatar style={{ backgroundColor: '#1677ff' }}>
            {value?.slice(0, 1)?.toUpperCase() || 'S'}
          </Avatar>
          <span style={{ fontWeight: 600, color: '#1f1f1f' }}>{value}</span>
        </Space>
      ),
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      render: (value: string) => (
        <Tooltip title={value}>
          <span>{value}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Tuyến',
      key: 'route',
      width: 150,
      render: (_: any, record: StoreItem) => <RouteTag store={record} />,
    },
    {
      title: 'Toạ độ',
      key: 'coordinates',
      width: 130,
      render: (_: any, record: StoreItem) => <CoordinateTag store={record} />,
    },
    {
      title: 'Trạng thái',
      key: 'isActive',
      width: 150,
      render: (_: any, record: StoreItem) => <StatusBadge active={record.isActive} />,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      render: (_: any, record: StoreItem) => {
        if (!canWriteStore) {
          return <span style={{ color: '#8c8c8c' }}>Chỉ xem</span>;
        }

        return (
          <Space size="small">
            <Button
              type="text"
              icon={<Edit3 size={16} />}
              onClick={() => openEditModal(record)}
              title="Chỉnh sửa"
            />

            <Popconfirm
              title={record.isActive ? 'Vô hiệu hoá cửa hàng?' : 'Kích hoạt cửa hàng?'}
              description={`Bạn có chắc muốn ${
                record.isActive ? 'vô hiệu hoá' : 'kích hoạt'
              } cửa hàng ${record.storeName}?`}
              onConfirm={() => toggleStoreStatus(record)}
              okText="Đồng ý"
              cancelText="Hủy"
              okButtonProps={{ danger: record.isActive }}
            >
              <Button
                type="text"
                danger={record.isActive}
                loading={statusSubmittingId === record.id}
                style={{ color: record.isActive ? undefined : '#52c41a' }}
                icon={record.isActive ? <Lock size={16} /> : <Unlock size={16} />}
                title={record.isActive ? 'Vô hiệu hoá' : 'Kích hoạt'}
              />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <Breadcrumb
            items={[
              { title: 'Admin' },
              { title: 'Quản lý cửa hàng' },
            ]}
          />
          <h2 style={{ margin: '8px 0 0 0', fontSize: 24, fontWeight: 700, color: '#1f1f1f' }}>
            Quản lý cửa hàng
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>
            Quản lý cửa hàng điện máy, trạng thái tuyến và toạ độ GPS phục vụ tính ETA.
          </p>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card
              size="small"
              bordered={false}
              style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}
            >
              <Statistic title="Tổng kết quả" value={tableTotal} suffix="cửa hàng" />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card
              size="small"
              bordered={false}
              style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}
            >
              <Statistic
                title="Thiếu toạ độ GPS"
                value={missingCoordinateStores.length}
                suffix="cửa hàng"
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card
              size="small"
              bordered={false}
              style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}
            >
              <Statistic
                title="Quyền truy cập"
                value={canWriteStore ? 'Có thể chỉnh sửa' : 'Chỉ xem'}
              />
            </Card>
          </Col>
        </Row>

        {missingCoordinateStores.length > 0 ? (
          <Alert
            showIcon
            type="warning"
            message={`${missingCoordinateStores.length} cửa hàng chưa có toạ độ GPS.`}
            description="Tính năng tính ETA sẽ không hoạt động chính xác cho các cửa hàng này."
            action={
              <Button
                size="small"
                onClick={() => {
                  setCoordFilter('missing');
                  setPage(0);
                }}
              >
                Xem danh sách
              </Button>
            }
          />
        ) : null}

        <Card bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 16,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <Space size="middle" wrap>
              <Input
                placeholder="Tìm theo mã hoặc tên cửa hàng..."
                value={keyword}
                onChange={(event) => {
                  setKeyword(event.target.value);
                  setPage(0);
                }}
                prefix={<Search size={16} style={{ color: '#bfbfbf' }} />}
                style={{ width: 260, borderRadius: 6 }}
                allowClear
              />

              <Select
                placeholder="Tất cả trạng thái"
                value={isActive || undefined}
                onChange={(value) => resetToFirstPage(setIsActive, value || '')}
                style={{ width: 180 }}
                allowClear
                options={[
                  { value: 'true', label: 'Hoạt động' },
                  { value: 'false', label: 'Đã vô hiệu hoá' },
                ]}
              />

              <Select
                placeholder="Tất cả tuyến"
                value={hasRoute || undefined}
                onChange={(value) => resetToFirstPage(setHasRoute, value || '')}
                style={{ width: 180 }}
                allowClear
                options={[
                  { value: 'true', label: 'Đã gắn tuyến' },
                  { value: 'false', label: 'Chưa gắn tuyến' },
                ]}
              />

              <Select
                placeholder="Tất cả toạ độ"
                value={coordFilter}
                onChange={(value) => {
                  setCoordFilter(value);
                  setPage(0);
                }}
                style={{ width: 180 }}
                options={[
                  { value: 'all', label: 'Tất cả toạ độ' },
                  { value: 'missing', label: 'Chưa có toạ độ' },
                ]}
              />
            </Space>

            <Space size="small">
              <Button
                icon={<RefreshCw size={14} />}
                onClick={() => {
                  fetchStores();
                  fetchStoreStats();
                }}
              >
                Tải lại
              </Button>

              {canWriteStore ? (
                <Button type="primary" icon={<Plus size={14} />} onClick={openCreateModal}>
                  Thêm cửa hàng
                </Button>
              ) : null}
            </Space>
          </div>

          {error ? (
            <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
          ) : null}

          <Table
            columns={columns}
            dataSource={tableData}
            rowKey="id"
            loading={loading}
            scroll={{ x: 1050 }}
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
              showSizeChanger: true,
              pageSizeOptions: ['5', '10', '20', '50'],
              onChange: (p, s) => {
                setPage(p - 1);
                if (s) setSize(s);
              },
              showTotal: (total) => `Tổng cộng ${total} cửa hàng`,
              position: ['bottomRight'],
            }}
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
            message={
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
