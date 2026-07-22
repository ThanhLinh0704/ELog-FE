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
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../constants/permissions';
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
    vehicle_code: 'vehicleCode',
    plate_number: 'plateNumber',
    vehicle_type: 'vehicleType',
    vehicle_class: 'vehicleClass',
    payload_kg: 'payloadKg',
    gross_vehicle_weight_kg: 'grossVehicleWeightKg',
    required_license: 'requiredLicense',
    max_volume_m3: 'maxVolumeM3',
    cargo_length_mm: 'cargoLengthMm',
    cargo_width_mm: 'cargoWidthMm',
    cargo_height_mm: 'cargoHeightMm',
    average_speed_kmh: 'averageSpeedKmh',
    cost_per_km: 'costPerKm',
    status: 'status',
    image_url: 'imageUrl',
    permit_info: 'permitInfo',
    description: 'description',
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
        vehicleCode: vehicle.vehicleCode,
        plateNumber: vehicle.plateNumber,
        vehicleType: vehicle.vehicleType,
        vehicleClass: vehicle.vehicleClass,
        payloadKg: vehicle.payloadKg,
        grossVehicleWeightKg: vehicle.grossVehicleWeightKg,
        requiredLicense: vehicle.requiredLicense,
        maxVolumeM3: vehicle.maxVolumeM3,
        cargoLengthMm: vehicle.cargoLengthMm,
        cargoWidthMm: vehicle.cargoWidthMm,
        cargoHeightMm: vehicle.cargoHeightMm,
        averageSpeedKmh: vehicle.averageSpeedKmh,
        costPerKm: vehicle.costPerKm,
        status: vehicle.status,
        imageUrl: vehicle.imageUrl,
        permitInfo: vehicle.permitInfo ? (typeof vehicle.permitInfo === 'object' ? JSON.stringify(vehicle.permitInfo) : vehicle.permitInfo) : null,
        description: vehicle.description,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ status: 'AVAILABLE', requiredLicense: 'B' });
    }
  }, [open, isEdit, vehicle, form]);

  async function handleFinish(values: any) {
    const payload: VehiclePayload = {
      vehicleType: values.vehicleType?.trim(),
      payloadKg: Number(values.payloadKg),
      maxVolumeM3: Number(values.maxVolumeM3),
      requiredLicense: values.requiredLicense,
      vehicleClass: values.vehicleClass?.trim() || null,
      grossVehicleWeightKg: values.grossVehicleWeightKg != null ? Number(values.grossVehicleWeightKg) : null,
      cargoLengthMm: values.cargoLengthMm != null ? Number(values.cargoLengthMm) : null,
      cargoWidthMm: values.cargoWidthMm != null ? Number(values.cargoWidthMm) : null,
      cargoHeightMm: values.cargoHeightMm != null ? Number(values.cargoHeightMm) : null,
      averageSpeedKmh: values.averageSpeedKmh != null ? Number(values.averageSpeedKmh) : null,
      costPerKm: values.costPerKm != null ? Number(values.costPerKm) : null,
      status: values.status,
      imageUrl: values.imageUrl?.trim() || null,
      permitInfo: values.permitInfo?.trim() || null,
      description: values.description?.trim() || null,
    };

    if (!isEdit) {
      payload.vehicleCode = values.vehicleCode?.trim();
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

      const status = getVehicleApiStatus(err);
      if (status === 409 || apiMessage.includes('VEHICLE_CODE_DUPLICATE')) {
        form.setFields([
          {
            name: 'vehicleCode',
            errors: ['Mã xe đã tồn tại.'],
          },
        ]);
        return;
      }

      if (apiMessage.includes('INVALID_CAPACITY_RATIO') || status === 422) {
        message.error('Tỷ lệ tải trọng và thể tích của xe nằm ngoài phạm vi an toàn.');
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
      width={800}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Mã xe"
              name="vehicleCode"
              rules={[
                { required: true, message: 'Vui lòng nhập mã xe.' },
                { max: 50, message: 'Mã xe không quá 50 ký tự.' },
              ]}
            >
              <Input placeholder="VD: XE001" disabled={isEdit} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Biển số"
              name="plateNumber"
              getValueFromEvent={(event) => event.target.value?.toUpperCase()}
              rules={[
                { required: true, message: 'Vui lòng nhập biển số xe.' },
                { max: 30, message: 'Biển số không quá 30 ký tự.' },
                {
                  pattern: /^[A-Za-z0-9]+(-[A-Za-z0-9]+)*$/,
                  message: 'Biển số không đúng định dạng. Ví dụ: 29H-12001',
                },
              ]}
            >
              <Input placeholder="VD: 29H-12001" disabled={isEdit} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Loại xe"
              name="vehicleType"
              rules={[
                { required: true, message: 'Vui lòng nhập loại xe.' },
                { max: 100, message: 'Loại xe không quá 100 ký tự.' },
              ]}
            >
              <Input placeholder="VD: Xe tải nhỏ / Xe tải trung / Xe tải lớn" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Phân khúc xe"
              name="vehicleClass"
              rules={[{ max: 20, message: 'Phân khúc xe không quá 20 ký tự.' }]}
            >
              <Input placeholder="VD: 1.25T / 2.5T / 5T" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              label="Tải hàng cho phép (kg)"
              name="payloadKg"
              rules={[
                { required: true, message: 'Vui lòng nhập tải hàng cho phép.' },
                { type: 'number', min: 0.01, message: 'Tải trọng phải lớn hơn 0.' },
              ]}
            >
              <InputNumber style={{ width: '100%' }} min={0.01} precision={0} placeholder="VD: 1250" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              label="Khối lượng toàn bộ (kg)"
              name="grossVehicleWeightKg"
              rules={[{ type: 'number', min: 0.01, message: 'Khối lượng toàn bộ phải lớn hơn 0.' }]}
            >
              <InputNumber style={{ width: '100%' }} min={0.01} precision={0} placeholder="VD: 3490" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              label="Hạng bằng yêu cầu"
              name="requiredLicense"
              rules={[{ required: true, message: 'Vui lòng chọn hạng bằng.' }]}
            >
              <Select placeholder="Chọn hạng bằng">
                <Select.Option value="B">Hạng B</Select.Option>
                <Select.Option value="C1">Hạng C1</Select.Option>
                <Select.Option value="C">Hạng C</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Form.Item
              label="Thể tích tối đa (m³)"
              name="maxVolumeM3"
              rules={[
                { required: true, message: 'Vui lòng nhập thể tích tối đa.' },
                { type: 'number', min: 0.01, message: 'Thể tích phải lớn hơn 0.' },
              ]}
            >
              <InputNumber style={{ width: '100%' }} min={0.01} precision={3} placeholder="VD: 8.0" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              label="Dài lòng thùng (mm)"
              name="cargoLengthMm"
              rules={[{ type: 'number', min: 1, message: 'Chiều dài phải lớn hơn 0.' }]}
            >
              <InputNumber style={{ width: '100%' }} min={1} precision={0} placeholder="VD: 3100" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              label="Rộng lòng thùng (mm)"
              name="cargoWidthMm"
              rules={[{ type: 'number', min: 1, message: 'Chiều rộng phải lớn hơn 0.' }]}
            >
              <InputNumber style={{ width: '100%' }} min={1} precision={0} placeholder="VD: 1700" />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              label="Cao lòng thùng (mm)"
              name="cargoHeightMm"
              rules={[{ type: 'number', min: 1, message: 'Chiều cao phải lớn hơn 0.' }]}
            >
              <InputNumber style={{ width: '100%' }} min={1} precision={0} placeholder="VD: 1500" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              label="Tốc độ trung bình (km/h)"
              name="averageSpeedKmh"
              rules={[{ type: 'number', min: 0.01, message: 'Tốc độ phải lớn hơn 0.' }]}
            >
              <InputNumber style={{ width: '100%' }} min={0.01} precision={2} placeholder="VD: 38.0" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              label="Chi phí mỗi km (VND)"
              name="costPerKm"
              rules={[{ type: 'number', min: 0.01, message: 'Chi phí phải lớn hơn 0.' }]}
            >
              <InputNumber style={{ width: '100%' }} min={0.01} precision={2} placeholder="VD: 12000" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              label="Trạng thái xe"
              name="status"
              rules={[{ required: true, message: 'Vui lòng chọn trạng thái.' }]}
            >
              <Select placeholder="Chọn trạng thái">
                <Select.Option value="AVAILABLE">Sẵn sàng (Available)</Select.Option>
                <Select.Option value="IN_USE">Đang sử dụng (In use)</Select.Option>
                <Select.Option value="MAINTENANCE">Bảo dưỡng (Maintenance)</Select.Option>
                <Select.Option value="OUT_OF_SERVICE">Ngừng hoạt động (Out of service)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Đường dẫn ảnh xe (URL)"
              name="imageUrl"
              rules={[{ max: 512, message: 'Đường dẫn ảnh không quá 512 ký tự.' }]}
            >
              <Input placeholder="VD: /images/vehicles/truck.png" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Thông tin giấy phép (JSON)"
              name="permitInfo"
            >
              <Input placeholder='VD: {"insuranceExpiry":"2027-01-18"}' />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Mô tả chi tiết"
          name="description"
        >
          <Input.TextArea placeholder="Mô tả đặc điểm xe hoặc thông tin lưu ý..." rows={3} />
        </Form.Item>

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
  const { can } = usePermissions();

  const canReadVehicle = can(PERMISSIONS.VEHICLE_READ);
  const canWriteVehicle = can(PERMISSIONS.VEHICLE_WRITE);

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
    if (!canReadVehicle) {
      navigate('/dashboard');
      return;
    }

    fetchVehicles(queryParams);
  }, [canReadVehicle, navigate, queryParams]);

  useEffect(() => {
    if (!canReadVehicle) return;
    fetchFleetCapacity();
  }, [canReadVehicle]);

  function resetToFirstPage(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(0);
  }

  function openCreateModal() {
    if (!canWriteVehicle) {
      message.warning('Bạn không có quyền đăng ký xe.');
      return;
    }

    setFormMode('create');
    setEditingVehicle(null);
    setFormOpen(true);
  }

  async function openEditModal(vehicle: VehicleItem) {
    if (!canWriteVehicle) {
      message.warning('Bạn không có quyền chỉnh sửa xe.');
      return;
    }

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
    if (!canWriteVehicle) {
      message.warning('Bạn không có quyền lưu thông tin xe.');
      return;
    }

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
    if (!canWriteVehicle) {
      message.warning('Bạn không có quyền cập nhật trạng thái xe.');
      return;
    }

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
      title: 'Tải hàng cho phép',
      dataIndex: 'payloadKg',
      key: 'payloadKg',
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
        if (!canWriteVehicle) {
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

              {canWriteVehicle ? (
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
            canWriteVehicle ? (
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
              <Descriptions bordered column={2} size="small">
                <Descriptions.Item label="Mã xe">
                  <Typography.Text strong>{detailVehicle.vehicleCode}</Typography.Text>
                </Descriptions.Item>
                <Descriptions.Item label="Biển số">
                  <Typography.Text strong>{detailVehicle.plateNumber}</Typography.Text>
                </Descriptions.Item>
                <Descriptions.Item label="Loại xe">
                  {detailVehicle.vehicleType}
                </Descriptions.Item>
                <Descriptions.Item label="Phân khúc xe">
                  {detailVehicle.vehicleClass || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Tải hàng cho phép">
                  {formatNumber(detailVehicle.payloadKg)} kg
                </Descriptions.Item>
                <Descriptions.Item label="Khối lượng toàn bộ">
                  {detailVehicle.grossVehicleWeightKg ? `${formatNumber(detailVehicle.grossVehicleWeightKg)} kg` : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Thể tích tối đa">
                  {formatNumber(detailVehicle.maxVolumeM3, 2)} m³
                </Descriptions.Item>
                <Descriptions.Item label="Hạng bằng yêu cầu">
                  Hạng {detailVehicle.requiredLicense}
                </Descriptions.Item>
                <Descriptions.Item label="Kích thước thùng xe (dài × rộng × cao)">
                  {detailVehicle.cargoLengthMm && detailVehicle.cargoWidthMm && detailVehicle.cargoHeightMm
                    ? `${detailVehicle.cargoLengthMm} × ${detailVehicle.cargoWidthMm} × ${detailVehicle.cargoHeightMm} mm`
                    : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Tốc độ trung bình">
                  {detailVehicle.averageSpeedKmh ? `${detailVehicle.averageSpeedKmh} km/h` : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Chi phí mỗi km">
                  {detailVehicle.costPerKm ? `${formatNumber(detailVehicle.costPerKm)} VND/km` : '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <span style={{ fontWeight: 600 }}>{detailVehicle.status}</span>
                </Descriptions.Item>
                <Descriptions.Item label="Hoạt động hệ thống">
                  <VehicleStatusBadge active={detailVehicle.isActive} />
                </Descriptions.Item>
                <Descriptions.Item label="Ảnh xe (URL)">
                  {detailVehicle.imageUrl || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Giấy phép (JSON)" span={2}>
                  {detailVehicle.permitInfo || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Mô tả chi tiết" span={2}>
                  {detailVehicle.description || '—'}
                </Descriptions.Item>
              </Descriptions>


            </Space>
          ) : null}
        </Modal>
      </div>
    </AdminShell>
  );
};

export default VehiclesPage;
