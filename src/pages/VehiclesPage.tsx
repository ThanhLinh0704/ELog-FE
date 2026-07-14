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
  Descriptions,
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
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Edit3,
  Eye,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Truck,
  Unlock,
} from 'lucide-react';
import AdminShell from '../components/AdminShell';
import { useDebounce } from '../hooks/useDebounce';
import {
  getVehicleApiErrorMessage,
  getVehicleApiStatus,
  vehicleApi,
  type FleetCapacity,
  type VehicleItem,
  type VehiclePayload,
} from '../api/vehicleApi';

type FormMode = 'create' | 'edit';

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

  if (Array.isArray(data?.error?.details)) {
    data.error.details.forEach((detail: string) => {
      const [field, ...messageParts] = detail.split(':');
      const fieldName = field?.trim();
      const errorMessage = messageParts.join(':').trim();

      if (fieldName && errorMessage) {
        result[fieldName] = errorMessage;
      }
    });
  }

  return result;
}

function mapVehicleFieldName(field: string) {
  const fieldMap: Record<string, string> = {
    plate_number: 'plateNumber',
    vehicle_type: 'vehicleType',
    max_weight_kg: 'maxWeightKg',
    max_volume_m3: 'maxVolumeM3',
  };

  return fieldMap[field] || field;
}

function formatNumber(value?: number | null, fractionDigits = 0) {
  return Number(value || 0).toLocaleString('vi-VN', {
    maximumFractionDigits: fractionDigits,
  });
}

function VehicleStatusBadge({ active }: { active: boolean }) {
  return (
    <Badge
      status={active ? 'success' : 'error'}
      text={active ? 'Hoạt động' : 'Đã vô hiệu hoá'}
    />
  );
}

interface VehicleFormModalProps {
  open: boolean;
  mode: FormMode;
  vehicle: VehicleItem | null;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (payload: VehiclePayload) => Promise<void>;
}

const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  open,
  mode,
  vehicle,
  submitting,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm();
  const isEdit = mode === 'edit';

  useEffect(() => {
    if (!open) return;

    if (isEdit && vehicle) {
      form.setFieldsValue({
        plateNumber: vehicle.plateNumber,
        vehicleType: vehicle.vehicleType,
        maxWeightKg: vehicle.maxWeightKg,
        maxVolumeM3: vehicle.maxVolumeM3,
      });
    } else {
      form.resetFields();
    }
  }, [open, isEdit, vehicle, form]);

  async function handleFinish(values: any) {
    const payload: VehiclePayload = {
      vehicleType: values.vehicleType?.trim(),
      maxWeightKg: Number(values.maxWeightKg),
      maxVolumeM3: Number(values.maxVolumeM3),
    };

    if (!isEdit) {
      payload.plateNumber = values.plateNumber?.trim()?.toUpperCase();
    }

    try {
      await onSubmit(payload);
    } catch (err: any) {
      const apiMessage = getVehicleApiErrorMessage(
        err,
        'Không lưu được thông tin xe.'
      );
      const fieldErrors = getApiFieldErrors(err);

      if (Object.keys(fieldErrors).length > 0) {
        form.setFields(
          Object.entries(fieldErrors).map(([name, errorMessage]) => ({
            name: mapVehicleFieldName(name),
            errors: [errorMessage],
          }))
        );
        return;
      }

      if (getVehicleApiStatus(err) === 409) {
        form.setFields([
          {
            name: 'plateNumber',
            errors: [apiMessage || 'Biển số xe đã tồn tại.'],
          },
        ]);
        return;
      }

      message.error(apiMessage);
    }
  }

  return (
    <Modal
      title={isEdit ? 'Chỉnh sửa xe' : 'Đăng ký xe mới'}
      open={open}
      onCancel={onCancel}
      footer={null}
      width={720}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          label="Biển số"
          name="plateNumber"
          getValueFromEvent={(event) => event.target.value?.toUpperCase()}
          rules={[
            { required: true, message: 'Vui lòng nhập biển số xe.' },
            { max: 30, message: 'Biển số không quá 30 ký tự.' },
            {
              pattern: /^\d{2}[A-Z]-\d{4,5}$/,
              message: 'Biển số không đúng định dạng. Ví dụ: 51B-67890',
            },
          ]}
        >
          <Input placeholder="VD: 51B-67890" readOnly={isEdit} />
        </Form.Item>

        <Form.Item
          label="Loại xe"
          name="vehicleType"
          tooltip="Có thể nhập tự do, ví dụ: Xe tải nhỏ / Xe tải trung / Xe tải lớn"
          rules={[
            { required: true, message: 'Vui lòng nhập loại xe.' },
            { max: 100, message: 'Loại xe không quá 100 ký tự.' },
          ]}
        >
          <Input placeholder="VD: Xe tải nhỏ / Xe tải trung / Xe tải lớn" />
        </Form.Item>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Tải trọng tối đa (kg)"
              name="maxWeightKg"
              extra="Nhập theo số liệu trên giấy phép lưu thông"
              rules={[
                { required: true, message: 'Vui lòng nhập tải trọng tối đa.' },
                {
                  type: 'number',
                  min: 0.01,
                  message: 'Tải trọng phải lớn hơn 0.',
                },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0.01}
                precision={0}
                placeholder="VD: 2500"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Thể tích tối đa (m³)"
              name="maxVolumeM3"
              extra="Đo khoang hàng thực tế: dài × rộng × cao"
              rules={[
                { required: true, message: 'Vui lòng nhập thể tích tối đa.' },
                {
                  type: 'number',
                  min: 0.01,
                  message: 'Thể tích phải lớn hơn 0.',
                },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0.01}
                precision={2}
                placeholder="VD: 12.5"
              />
            </Form.Item>
          </Col>
        </Row>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
          <Button onClick={onCancel}>Huỷ</Button>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {isEdit ? 'Lưu thay đổi' : 'Đăng ký xe'}
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

const VehiclesPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const isAdmin = currentUser.roles.includes('SYSTEM_ADMIN');
  const canRead = currentUser.roles.some((role) =>
    ['SYSTEM_ADMIN', 'DISPATCHER', 'LOGISTICS_MANAGER'].includes(role)
  );

  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [fleetCapacity, setFleetCapacity] = useState<FleetCapacity>({
    activeVehicleCount: 0,
    totalMaxWeightKg: 0,
    totalMaxVolumeM3: 0,
  });
  const [keyword, setKeyword] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [pageMeta, setPageMeta] = useState({ totalElements: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [capacityLoading, setCapacityLoading] = useState(false);
  const [error, setError] = useState('');
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [formOpen, setFormOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleItem | null>(null);
  const [detailVehicle, setDetailVehicle] = useState<VehicleItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [statusSubmittingId, setStatusSubmittingId] = useState<number | null>(null);
  const [blockedVehicleMessage, setBlockedVehicleMessage] = useState('');

  const debouncedKeyword = useDebounce(keyword, 350);

  const queryParams = useMemo(
    () => ({
      keyword: debouncedKeyword,
      isActive,
      page,
      size,
      sort: 'id,desc',
    }),
    [debouncedKeyword, isActive, page, size]
  );

  async function fetchVehicles(params = queryParams) {
    setLoading(true);
    setError('');

    try {
      const result = await vehicleApi.getVehicles(params);
      setVehicles(result.content);
      setPageMeta({
        totalElements: result.totalElements,
        totalPages: result.totalPages,
      });
    } catch (err: any) {
      if (getVehicleApiStatus(err) === 403) {
        navigate('/dashboard');
      } else {
        setError(getVehicleApiErrorMessage(err, 'Không tải được danh sách xe.'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function fetchFleetCapacity() {
    setCapacityLoading(true);

    try {
      const result = await vehicleApi.getFleetCapacity();
      setFleetCapacity(result);
    } catch (err: any) {
      setError(getVehicleApiErrorMessage(err, 'Không tải được tổng hợp đội xe.'));
    } finally {
      setCapacityLoading(false);
    }
  }

  useEffect(() => {
    if (!canRead) {
      navigate('/dashboard');
      return;
    }

    fetchVehicles(queryParams);
  }, [canRead, navigate, queryParams]);

  useEffect(() => {
    if (!canRead) return;
    fetchFleetCapacity();
  }, [canRead]);

  function resetToFirstPage(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(0);
  }

  function openCreateModal() {
    setFormMode('create');
    setEditingVehicle(null);
    setFormOpen(true);
  }

  async function openEditModal(vehicle: VehicleItem) {
    setFormMode('edit');

    try {
      const detail = await vehicleApi.getVehicle(vehicle.id);
      setEditingVehicle(detail);
    } catch (err: any) {
      message.error(getVehicleApiErrorMessage(err, 'Không tải được chi tiết xe.'));
      setEditingVehicle(vehicle);
    }

    setFormOpen(true);
  }

  async function openDetailModal(vehicle: VehicleItem) {
    try {
      const detail = await vehicleApi.getVehicle(vehicle.id);
      setDetailVehicle(detail);
    } catch (err: any) {
      message.error(getVehicleApiErrorMessage(err, 'Không tải được chi tiết xe.'));
      setDetailVehicle(vehicle);
    }
  }

  async function handleSubmit(payload: VehiclePayload) {
    setSubmitting(true);

    try {
      if (formMode === 'create') {
        const created = await vehicleApi.createVehicle(payload);
        message.success(
          `Xe ${created.plateNumber || payload.plateNumber} đã được đăng ký thành công.`
        );
        setFormOpen(false);
        setPage(0);
        await fetchVehicles({ ...queryParams, page: 0 });
        await fetchFleetCapacity();
      } else if (editingVehicle) {
        await vehicleApi.updateVehicle(editingVehicle.id, payload);
        message.success('Thông tin xe đã được lưu.');
        setFormOpen(false);
        setEditingVehicle(null);
        await fetchVehicles();
        await fetchFleetCapacity();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleVehicleStatus(vehicle: VehicleItem) {
    const nextActive = !vehicle.isActive;
    setBlockedVehicleMessage('');
    setStatusSubmittingId(vehicle.id);

    try {
      await vehicleApi.updateStatus(vehicle.id, nextActive);

      message.success(
        nextActive
          ? `Đã kích hoạt xe ${vehicle.plateNumber}.`
          : `Đã vô hiệu hoá xe ${vehicle.plateNumber}.`
      );

      await fetchVehicles();
      await fetchFleetCapacity();
    } catch (err: any) {
      const apiMessage = getVehicleApiErrorMessage(
        err,
        'Không cập nhật được trạng thái xe.'
      );

      if (getVehicleApiStatus(err) === 409) {
        setBlockedVehicleMessage(apiMessage);
        return;
      }

      message.error(apiMessage);
    } finally {
      setStatusSubmittingId(null);
    }
  }

  const columns: ColumnsType<VehicleItem> = [
    {
      title: 'Biển số',
      dataIndex: 'plateNumber',
      key: 'plateNumber',
      width: 160,
      render: (value: string, record) => (
        <Button type="link" onClick={() => openDetailModal(record)} style={{ padding: 0 }}>
          <strong>{value}</strong>
        </Button>
      ),
    },
    {
      title: 'Loại xe',
      dataIndex: 'vehicleType',
      key: 'vehicleType',
      width: 220,
      render: (value: string) => (
        <Space>
          <Avatar style={{ backgroundColor: '#1677ff' }} icon={<Truck size={17} />} />
          <span style={{ fontWeight: 600, color: '#1f1f1f' }}>{value}</span>
        </Space>
      ),
    },
    {
      title: 'Tải trọng tối đa',
      dataIndex: 'maxWeightKg',
      key: 'maxWeightKg',
      width: 170,
      render: (value: number) => `${formatNumber(value)} kg`,
    },
    {
      title: 'Thể tích tối đa',
      dataIndex: 'maxVolumeM3',
      key: 'maxVolumeM3',
      width: 170,
      render: (value: number) => `${formatNumber(value, 2)} m³`,
    },
    {
      title: 'Trạng thái',
      key: 'isActive',
      width: 150,
      render: (_: any, record) => <VehicleStatusBadge active={record.isActive} />,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 150,
      render: (_: any, record) => {
        if (!isAdmin) {
          return (
            <Button
              type="text"
              icon={<Eye size={16} />}
              onClick={() => openDetailModal(record)}
              title="Xem chi tiết"
            />
          );
        }

        return (
          <Space size="small">
            <Button
              type="text"
              icon={<Eye size={16} />}
              onClick={() => openDetailModal(record)}
              title="Xem chi tiết"
            />

            <Button
              type="text"
              icon={<Edit3 size={16} />}
              onClick={() => openEditModal(record)}
              title="Chỉnh sửa"
            />

            <Popconfirm
              title={record.isActive ? 'Vô hiệu hoá xe?' : 'Kích hoạt xe?'}
              description={
                record.isActive
                  ? `Xe ${record.plateNumber} sẽ không còn xuất hiện trong danh sách phân xe cho chuyến.`
                  : `Xe ${record.plateNumber} sẽ được mở lại để phân xe cho chuyến.`
              }
              onConfirm={() => toggleVehicleStatus(record)}
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
              { title: 'Quản lý đội xe' },
            ]}
          />
          <h2 style={{ margin: '8px 0 0 0', fontSize: 24, fontWeight: 700, color: '#1f1f1f' }}>
            Quản lý đội xe
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>
            Quản lý xe giao hàng, tải trọng, thể tích khoang hàng và trạng thái khai thác.
          </p>
        </div>

        {blockedVehicleMessage ? (
          <Alert
            type="warning"
            showIcon
            message={blockedVehicleMessage}
            description="Xe có thể đang được gắn với chuyến đang vận hành. Hãy hoàn tất hoặc điều chỉnh chuyến trước khi vô hiệu hoá."
            closable
            onClose={() => setBlockedVehicleMessage('')}
          />
        ) : null}

        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card
              size="small"
              bordered={false}
              loading={capacityLoading}
              style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}
            >
              <Statistic
                title="Đội xe đang hoạt động"
                value={fleetCapacity.activeVehicleCount}
                suffix="xe"
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card
              size="small"
              bordered={false}
              loading={capacityLoading}
              style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}
            >
              <Statistic
                title="Tổng tải trọng"
                value={fleetCapacity.totalMaxWeightKg}
                suffix="kg"
                formatter={(value) => formatNumber(Number(value))}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card
              size="small"
              bordered={false}
              loading={capacityLoading}
              style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}
            >
              <Statistic
                title="Tổng thể tích"
                value={fleetCapacity.totalMaxVolumeM3}
                suffix="m³"
                precision={2}
              />
            </Card>
          </Col>
        </Row>

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
                placeholder="Tìm theo biển số hoặc loại xe..."
                value={keyword}
                onChange={(event) => {
                  setKeyword(event.target.value);
                  setPage(0);
                }}
                prefix={<Search size={16} style={{ color: '#bfbfbf' }} />}
                style={{ width: 280, borderRadius: 6 }}
                allowClear
              />

              <Select
                placeholder="Tất cả trạng thái"
                value={isActive || undefined}
                onChange={(value) => resetToFirstPage(setIsActive, value || '')}
                style={{ width: 190 }}
                allowClear
                options={[
                  { value: 'true', label: 'Hoạt động' },
                  { value: 'false', label: 'Đã vô hiệu hoá' },
                ]}
              />
            </Space>

            <Space size="small">
              <Button
                icon={<RefreshCw size={14} />}
                onClick={() => {
                  fetchVehicles();
                  fetchFleetCapacity();
                }}
              >
                Tải lại
              </Button>

              {isAdmin ? (
                <Button type="primary" icon={<Plus size={14} />} onClick={openCreateModal}>
                  Đăng ký xe
                </Button>
              ) : null}
            </Space>
          </div>

          {error ? (
            <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} />
          ) : null}

          <Table
            columns={columns}
            dataSource={vehicles}
            rowKey="id"
            loading={loading}
            scroll={{ x: 980 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Không tìm thấy xe phù hợp"
                />
              ),
            }}
            pagination={{
              current: page + 1,
              pageSize: size,
              total: pageMeta.totalElements,
              showSizeChanger: true,
              pageSizeOptions: ['5', '10', '20', '50'],
              onChange: (p, s) => {
                setPage(p - 1);
                if (s) setSize(s);
              },
              showTotal: (total) => `Tổng cộng ${total} xe`,
              position: ['bottomRight'],
            }}
          />
        </Card>

        <VehicleFormModal
          open={formOpen}
          mode={formMode}
          vehicle={editingVehicle}
          submitting={submitting}
          onCancel={() => {
            setFormOpen(false);
            setEditingVehicle(null);
          }}
          onSubmit={handleSubmit}
        />

        <Modal
          title={`Chi tiết xe ${detailVehicle?.plateNumber || ''}`}
          open={!!detailVehicle}
          onCancel={() => setDetailVehicle(null)}
          footer={[
            <Button key="close" onClick={() => setDetailVehicle(null)}>
              Đóng
            </Button>,
            isAdmin ? (
              <Button
                key="edit"
                type="primary"
                onClick={() => {
                  if (detailVehicle) openEditModal(detailVehicle);
                  setDetailVehicle(null);
                }}
              >
                Chỉnh sửa
              </Button>
            ) : null,
          ]}
          width={760}
        >
          {detailVehicle ? (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Biển số">
                  <Typography.Text strong>{detailVehicle.plateNumber}</Typography.Text>
                </Descriptions.Item>
                <Descriptions.Item label="Loại xe">
                  {detailVehicle.vehicleType}
                </Descriptions.Item>
                <Descriptions.Item label="Tải trọng tối đa">
                  {formatNumber(detailVehicle.maxWeightKg)} kg
                </Descriptions.Item>
                <Descriptions.Item label="Thể tích tối đa">
                  {formatNumber(detailVehicle.maxVolumeM3, 2)} m³
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <VehicleStatusBadge active={detailVehicle.isActive} />
                </Descriptions.Item>
                <Descriptions.Item label="Ngày tạo">
                  {detailVehicle.createdAt || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Cập nhật cuối">
                  {detailVehicle.updatedAt || '—'}
                </Descriptions.Item>
              </Descriptions>

              <Alert
                type="info"
                showIcon
                message="Ghi chú Sprint 4"
                description='Màn hình chi tiết xe sẽ bổ sung tab "Lịch sử chuyến" để xem các trips xe này đã thực hiện.'
              />
            </Space>
          ) : null}
        </Modal>
      </div>
    </AdminShell>
  );
};

export default VehiclesPage;
