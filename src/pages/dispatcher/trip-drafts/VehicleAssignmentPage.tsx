import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Breadcrumb,
  Typography,
  Row,
  Col,
  Tag,
  Spin,
  message,
  Alert,
  Modal,
  Divider,
  Badge,
  Table,
  Radio,
  Space,
  Tooltip,
  Empty,
  Result,
} from 'antd';
import {
  ArrowLeftOutlined,
  CarOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  SplitCellsOutlined,
  CheckOutlined,
  PlusOutlined,
  DeleteOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { Truck, Users, ShieldCheck, ShieldAlert } from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import { tripDraftApi } from '../../../api/tripDraftApi';
import {
  getEligibleVehicles,
  getAvailableDrivers,
  getFleetCapacityCheck,
  assignTrip,
  assignSplitTrips,
  getTripsByTripDraftId,
  openHandoverSlip,
  updateTripAssignment,
} from '../../../api/tripApi';
import type { TripDraft, TripDraftStop } from '../../../types/tripDraft';
import type {
  EligibleVehicle,
  IneligibleVehicle,
  AvailableDriver,
  FleetCapacityCheck,
  Trip,
} from '../../../types/trip';
import { usePermissions } from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../constants/permissions';

const { Title, Text } = Typography;

function getCurrentUser() {
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';
  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) roles = JSON.parse(rolesStr);
  } catch {
    // ignore
  }
  return { id: Number(userId), username, fullName: username, roles };
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

function fmtVolume(v?: number | null): string {
  if (v == null || isNaN(v)) return '—';
  return v.toFixed(3) + ' m³';
}

function fmtWeight(w?: number | null): string {
  if (w == null || isNaN(w)) return '—';
  return w.toFixed(3) + ' kg';
}

function getErrorCode(err: unknown): string {
  const e = err as { response?: { data?: { error?: { code?: string } } } };
  return e?.response?.data?.error?.code || '';
}

function getErrorMessage(err: unknown, fallback = 'Có lỗi xảy ra, vui lòng thử lại.'): string {
  const e = err as { response?: { data?: { error?: { message?: string }; message?: string } }; message?: string };
  return (
    e?.response?.data?.error?.message ||
    e?.response?.data?.message ||
    (e as { message?: string })?.message ||
    fallback
  );
}

function renderStatusTag(status?: string | null) {
  if (!status) return null;
  const map: Record<string, { color: string; text: string }> = {
    DRAFT: { color: 'warning', text: 'Nháp' },
    PLANNED: { color: 'processing', text: 'Đã lập chuyến' },
    VALIDATED: { color: 'success', text: 'Đã kiểm tra tải' },
    DISPATCHED: { color: 'purple', text: 'Đã xuất phát' },
    IN_PROGRESS: { color: 'blue', text: 'Đang giao hàng' },
    COMPLETED: { color: 'cyan', text: 'Hoàn thành' },
  };
  const { color, text } = map[status] || { color: 'default', text: status };
  return <Tag color={color} style={{ fontWeight: 500 }}>{text}</Tag>;
}

function renderTripStatusTag(status?: string | null) {
  if (!status) return null;
  const map: Record<string, { color: string; text: string }> = {
    VALIDATED: { color: 'success', text: 'Sẵn sàng điều phối' },
    DISPATCHED: { color: 'purple', text: 'Đã điều phối' },
    IN_PROGRESS: { color: 'blue', text: 'Đang giao hàng' },
    COMPLETED: { color: 'cyan', text: 'Hoàn thành' },
  };
  const { color, text } = map[status] || { color: 'default', text: status };
  return <Tag color={color} style={{ fontWeight: 500 }}>{text}</Tag>;
}

type Mode = 'single' | 'split';

interface SplitGroup {
  groupId: string;
  vehicleId: number | null;
  driverId: number | null;
  stopIds: number[];
}

const VehicleAssignmentPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const { can } = usePermissions();
  const canCoordinateTrip = can(PERMISSIONS.TRIP_COORDINATE);

  // ── State ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState<TripDraft | null>(null);
  const [eligibleVehicles, setEligibleVehicles] = useState<EligibleVehicle[]>([]);
  const [ineligibleVehicles, setIneligibleVehicles] = useState<IneligibleVehicle[]>([]);
  const [drivers, setDrivers] = useState<AvailableDriver[]>([]);
  const [fleetCheck, setFleetCheck] = useState<FleetCapacityCheck | null>(null);
  const [existingTrips, setExistingTrips] = useState<Trip[]>([]);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [editVehicleId, setEditVehicleId] = useState<number | null>(null);
  const [editDriverId, setEditDriverId] = useState<number | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Single mode
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Split mode
  const [mode, setMode] = useState<Mode>('single');
  const [splitGroups, setSplitGroups] = useState<SplitGroup[]>([
    { groupId: 'g1', vehicleId: null, driverId: null, stopIds: [] },
  ]);
  const [splitConfirmOpen, setSplitConfirmOpen] = useState(false);

  // Extracted load function for reuse (call from handlers)
  const loadAll = async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);

    try {
      const [draftData, tripsData] = await Promise.all([
        tripDraftApi.getTripDraftById(Number(id)),
        getTripsByTripDraftId(id),
      ]);
      setDraft(draftData);
      setExistingTrips(tripsData);

      // Only load vehicles/drivers if no trips yet and draft is VALIDATED
      if (tripsData.length === 0 && draftData.status === 'VALIDATED') {
        const deliveryDate = draftData.deliveryDate;
        const [vehicleData, driverData, fleetData] = await Promise.all([
          getEligibleVehicles(id),
          getAvailableDrivers(deliveryDate),
          getFleetCapacityCheck(deliveryDate),
        ]);
        setEligibleVehicles(vehicleData.eligibleVehicles ?? []);
        setIneligibleVehicles(vehicleData.ineligibleVehicles ?? []);
        setDrivers(driverData);
        setFleetCheck(fleetData);
      } else if (tripsData.length === 0 && draftData.status !== 'VALIDATED') {
        // Draft not ready for assignment — load fleet check anyway
        const fleetData = await getFleetCapacityCheck(draftData.deliveryDate);
        setFleetCheck(fleetData);
      }
    } catch (err) {
      console.error(err);
      const code = getErrorCode(err);
      if (code === 'TRIP_DRAFT_NOT_VALIDATED') {
        setLoadError('Trip Draft chưa được kiểm tra tải trọng. Vui lòng thực hiện kiểm tra tải trọng trước.');
      } else {
        setLoadError(getErrorMessage(err, 'Không thể tải dữ liệu phân xe. Vui lòng thử lại.'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      setLoadError(null);

      try {
        const [draftData, tripsData] = await Promise.all([
          tripDraftApi.getTripDraftById(Number(id)),
          getTripsByTripDraftId(id),
        ]);
        setDraft(draftData);
        setExistingTrips(tripsData);

        if (tripsData.length === 0 && draftData.status === 'VALIDATED') {
          const deliveryDate = draftData.deliveryDate;
          const [vehicleData, driverData, fleetData] = await Promise.all([
            getEligibleVehicles(id),
            getAvailableDrivers(deliveryDate),
            getFleetCapacityCheck(deliveryDate),
          ]);
          setEligibleVehicles(vehicleData.eligibleVehicles ?? []);
          setIneligibleVehicles(vehicleData.ineligibleVehicles ?? []);
          setDrivers(driverData);
          setFleetCheck(fleetData);
        } else if (tripsData.length === 0 && draftData.status !== 'VALIDATED') {
          const fleetData = await getFleetCapacityCheck(draftData.deliveryDate);
          setFleetCheck(fleetData);
        }
      } catch (err) {
        console.error(err);
        const code = getErrorCode(err);
        if (code === 'TRIP_DRAFT_NOT_VALIDATED') {
          setLoadError('Trip Draft chưa được kiểm tra tải trọng. Vui lòng thực hiện kiểm tra tải trọng trước.');
        } else {
          setLoadError(getErrorMessage(err, 'Không thể tải dữ liệu phân xe. Vui lòng thử lại.'));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // ── Derived: active stops for split ─────────────────────────────────────
  const activeStops: TripDraftStop[] = (draft?.stops ?? [])
    .filter((s) => s.isActive)
    .sort((a, b) => a.sequenceNo - b.sequenceNo);

  // ── Single mode: assign ──────────────────────────────────────────────────
  const handleConfirmAssign = async () => {
    if (!id || !selectedVehicleId || !selectedDriverId) return;
    setSubmitting(true);
    try {
      await assignTrip(id, { vehicleId: selectedVehicleId, driverId: selectedDriverId });
      message.success('Phân xe và tài xế thành công! Đã tạo chuyến.');
      setConfirmModalOpen(false);
      await loadAll();
    } catch (err) {
      console.error(err);
      const code = getErrorCode(err);
      const msg = getErrorMessage(err);
      if (code === 'VEHICLE_NOT_ELIGIBLE') {
        message.error('Xe đã chọn không đủ tải cho chuyến này.');
        setSelectedVehicleId(null);
        await getEligibleVehicles(id).then((v) => {
          setEligibleVehicles(v.eligibleVehicles ?? []);
          setIneligibleVehicles(v.ineligibleVehicles ?? []);
        }).catch(() => null);
      } else if (code === 'VEHICLE_CONFLICT') {
        message.error('Xe này đã được gán cho chuyến khác trong ngày. Vui lòng chọn xe khác.');
        setSelectedVehicleId(null);
      } else if (code === 'DRIVER_CONFLICT') {
        message.error('Tài xế này đã được gán chuyến khác. Vui lòng chọn tài xế khác.');
        setSelectedDriverId(null);
      } else if (code === 'TRIP_DRAFT_ALREADY_ASSIGNED') {
        message.warning('Chuyến đã được phân xe trước đó.');
        await loadAll();
      } else if (code === 'INSUFFICIENT_FLEET') {
        message.error('Đội xe không đủ năng lực. Không thể phân xe lúc này.');
      } else {
        message.error(msg);
      }
      setConfirmModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Split mode ──────────────────────────────────────────────────────────
  const assignedStopIds = splitGroups.flatMap((g) => g.stopIds);
  const unassignedStops = activeStops.filter((s) => !assignedStopIds.includes(s.tripDraftStopId));

  const addSplitGroup = () => {
    setSplitGroups((prev) => [
      ...prev,
      { groupId: `g${Date.now()}`, vehicleId: null, driverId: null, stopIds: [] },
    ]);
  };

  const removeSplitGroup = (groupId: string) => {
    setSplitGroups((prev) => prev.filter((g) => g.groupId !== groupId));
  };

  const updateGroup = (groupId: string, patch: Partial<SplitGroup>) => {
    setSplitGroups((prev) => prev.map((g) => (g.groupId === groupId ? { ...g, ...patch } : g)));
  };

  const toggleStopInGroup = (groupId: string, stopId: number) => {
    setSplitGroups((prev) =>
      prev.map((g) => {
        if (g.groupId !== groupId) return g;
        const has = g.stopIds.includes(stopId);
        return { ...g, stopIds: has ? g.stopIds.filter((s) => s !== stopId) : [...g.stopIds, stopId] };
      })
    );
  };

  const splitValid =
    splitGroups.length >= 2 &&
    splitGroups.every((g) => g.vehicleId && g.driverId && g.stopIds.length > 0) &&
    unassignedStops.length === 0;

  const handleConfirmSplit = async () => {
    if (!id || !splitValid) return;
    setSubmitting(true);
    try {
      const req = {
        assignments: splitGroups.map((g) => ({
          vehicleId: g.vehicleId!,
          driverId: g.driverId!,
          stopIds: [...g.stopIds].sort(
            (a, b) =>
              activeStops.findIndex((s) => s.tripDraftStopId === a) -
              activeStops.findIndex((s) => s.tripDraftStopId === b)
          ),
        })),
      };
      const result = await assignSplitTrips(id, req);
      message.success(`Tách chuyến thành công! Đã tạo ${result.tripsCreated} chuyến.`);
      setSplitConfirmOpen(false);
      await loadAll();
    } catch (err) {
      console.error(err);
      message.error(getErrorMessage(err, 'Tách chuyến thất bại. Vui lòng thử lại.'));
      setSplitConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Handover slip ────────────────────────────────────────────────────────
  const handleOpenHandoverSlip = async (tripId: number) => {
    try {
      await openHandoverSlip(tripId);
    } catch (err) {
      message.error(getErrorMessage(err, 'Không thể mở phiếu bàn giao. Vui lòng thử lại.'));
    }
  };

  // ── Render: loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <AdminShell currentUser={currentUser}>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Đang tải dữ liệu phân xe..." />
        </div>
      </AdminShell>
    );
  }

  // ── Render: 403 ──────────────────────────────────────────────────────────
  if (!canCoordinateTrip) {
    return (
      <AdminShell currentUser={currentUser}>
        <Result
          status="403"
          title="Không có quyền"
          subTitle="Bạn không có quyền phân xe và tài xế. Chỉ Dispatcher mới được thực hiện chức năng này."
          extra={<Button type="primary" onClick={() => navigate(-1)}>Quay lại</Button>}
        />
      </AdminShell>
    );
  }

  // ── Render: load error ───────────────────────────────────────────────────
  if (loadError) {
    return (
      <AdminShell currentUser={currentUser}>
        <Result
          status="error"
          title="Không thể tải dữ liệu"
          subTitle={loadError}
          extra={[
            <Button key="retry" type="primary" onClick={loadAll}>Tải lại</Button>,
            <Button key="back" onClick={() => navigate(`/dispatcher/trip-drafts/${id}`)}>Quay lại</Button>,
          ]}
        />
      </AdminShell>
    );
  }

  if (!draft) {
    return (
      <AdminShell currentUser={currentUser}>
        <Result
          status="404"
          title="Không tìm thấy Trip Draft"
          extra={<Button onClick={() => navigate('/dispatcher/trip-drafts')}>Danh sách gom đơn</Button>}
        />
      </AdminShell>
    );
  }

  const usedDriverIds = new Set(splitGroups.map((g) => g.driverId).filter(Boolean));
  const usedVehicleIds = new Set(splitGroups.map((g) => g.vehicleId).filter(Boolean));

  return (
    <AdminShell currentUser={currentUser}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 16 }}>
        <Breadcrumb
          items={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Quản lý gom đơn', href: '/dispatcher/trip-drafts' },
            { title: `Tuyến ${draft.routeCode}`, href: `/dispatcher/trip-drafts/${id}` },
            { title: 'Phân xe & tài xế' },
          ]}
        />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/dispatcher/trip-drafts/${id}`)}>
            Quay lại
          </Button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
                Phân xe & tài xế — Tuyến {draft.routeCode}
              </Title>
              {renderStatusTag(draft.status)}
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Ngày giao: <strong>{formatDate(draft.deliveryDate)}</strong>
              &nbsp;·&nbsp;Thể tích: <strong>{fmtVolume(draft.totalVolumeM3)}</strong>
              &nbsp;·&nbsp;Tải trọng: <strong>{fmtWeight(draft.totalWeightKg)}</strong>
              &nbsp;·&nbsp;Điểm dừng hoạt động: <strong>{draft.activeStopCount}</strong>
            </Text>
          </div>
        </div>
      </div>

      {/* Draft not VALIDATED warning */}
      {draft.status !== 'VALIDATED' && existingTrips.length === 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message="Trip Draft chưa sẵn sàng phân xe"
          description={`Trạng thái hiện tại: ${draft.status}. Trip Draft phải ở trạng thái VALIDATED để phân xe.`}
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => navigate(`/dispatcher/trip-drafts/${id}/capacity`)}>
              Kiểm tra tải trọng
            </Button>
          }
        />
      )}

      {/* Fleet Capacity Banner */}
      {fleetCheck && (
        <Alert
          type={fleetCheck.canDispatch ? 'success' : 'error'}
          showIcon
          icon={fleetCheck.canDispatch ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
          message={fleetCheck.canDispatch ? 'Đội xe đủ năng lực' : 'Đội xe không đủ năng lực'}
          description={
            <div style={{ fontSize: 13 }}>
              {!fleetCheck.canDispatch && (
                <div style={{ marginBottom: 4 }}>
                  <Tag color={fleetCheck.volumeCheckResult === 'FAIL' ? 'red' : 'green'}>
                    Thể tích: {fmtVolume(fleetCheck.dayTotalVolumeM3)} / {fmtVolume(fleetCheck.fleetTotalVolumeM3)}
                  </Tag>
                  <Tag color={fleetCheck.weightCheckResult === 'FAIL' ? 'red' : 'green'}>
                    Tải trọng: {fmtWeight(fleetCheck.dayTotalWeightKg)} / {fmtWeight(fleetCheck.fleetTotalWeightKg)}
                  </Tag>
                </div>
              )}
              {fleetCheck.message && <span>{fleetCheck.message}</span>}
            </div>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {/* ── Existing Trips (already assigned) ─────────────────────────────── */}
      {existingTrips.length > 0 && (
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Truck size={18} style={{ color: '#1677ff' }} />
              <span>Chuyến đã được tạo ({existingTrips.length})</span>
            </div>
          }
          style={{ borderRadius: 12, marginBottom: 24 }}
        >
          <Table
            dataSource={existingTrips}
            rowKey="tripId"
            pagination={false}
            size="middle"
            columns={[
              { title: 'Trip ID', dataIndex: 'tripId', key: 'tripId', render: (v: number) => <Tag color="blue">#{v}</Tag> },
              { title: 'Tuyến', dataIndex: 'fixedRouteCode', key: 'fixedRouteCode' },
              {
                title: 'Xe',
                key: 'vehicle',
                render: (_: unknown, r: Trip) => r.vehicle ? `${r.vehicle.plateNumber} (${r.vehicle.vehicleType})` : '—',
              },
              {
                title: 'Tài xế',
                key: 'driver',
                render: (_: unknown, r: Trip) => r.driver?.fullName ?? '—',
              },
              { title: 'Số điểm', dataIndex: 'tripStopCount', key: 'tripStopCount' },
              { title: 'Thể tích', key: 'vol', render: (_: unknown, r: Trip) => fmtVolume(r.totalVolumeM3) },
              { title: 'Tải trọng', key: 'wt', render: (_: unknown, r: Trip) => fmtWeight(r.totalWeightKg) },
              { title: 'Trạng thái', key: 'status', render: (_: unknown, r: Trip) => renderTripStatusTag(r.status) },
              {
                title: 'Hành động',
                key: 'action',
                render: (_: unknown, r: Trip) => {
                  if (r.status === 'VALIDATED') {
                    return (
                      <Space size="small">
                        <Button
                          type="primary"
                          size="small"
                          icon={<CheckCircleOutlined />}
                          onClick={() => navigate(`/dispatcher/trips/${r.tripId}/dispatch`)}
                        >
                          Xác nhận điều phối
                        </Button>
                        <Button
                          size="small"
                          icon={<CarOutlined />}
                          onClick={() => {
                            setEditingTrip(r);
                            setEditVehicleId(r.vehicle?.vehicleId ?? null);
                            setEditDriverId(r.driver?.userId ?? null);
                          }}
                        >
                          Sửa xe/tài xế
                        </Button>
                      </Space>
                    );
                  }
                  if (r.status === 'DISPATCHED' || r.status === 'IN_PROGRESS' || r.status === 'COMPLETED') {
                    return (
                      <Button
                        size="small"
                        icon={<PrinterOutlined />}
                        onClick={() => handleOpenHandoverSlip(r.tripId)}
                      >
                        In phiếu bàn giao
                      </Button>
                    );
                  }
                  return null;
                },
              },
            ]}
          />
        </Card>
      )}

      {/* ── Edit Assignment Modal ─────────────────────────────────────────── */}
      <Modal
        open={!!editingTrip}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CarOutlined style={{ color: '#1677ff' }} />
            <span>Sửa xe &amp; tài xế — Trip #{editingTrip?.tripId}</span>
          </div>
        }
        onCancel={() => !editSaving && setEditingTrip(null)}
        footer={[
          <Button key="cancel" onClick={() => setEditingTrip(null)} disabled={editSaving}>
            Huỷ
          </Button>,
          <Button
            key="save"
            type="primary"
            loading={editSaving}
            disabled={!editVehicleId || !editDriverId}
            onClick={async () => {
              if (!editingTrip || !editVehicleId || !editDriverId) return;
              setEditSaving(true);
              try {
                const updated = await updateTripAssignment(editingTrip.tripId, {
                  vehicleId: editVehicleId,
                  driverId: editDriverId,
                });
                setExistingTrips((prev) =>
                  prev.map((t) => (t.tripId === updated.tripId ? updated : t))
                );
                message.success('Cập nhật xe & tài xế thành công!');
                setEditingTrip(null);
              } catch (err) {
                const code = getErrorCode(err);
                if (code === 'TRIP_LOCKED') {
                  message.error('Chuyến đã bị khóa/dispatch, không thể chỉnh sửa.');
                } else if (code === 'VEHICLE_NOT_ELIGIBLE') {
                  message.error('Xe được chọn không đủ tải trọng cho chuyến này.');
                } else if (code === 'VEHICLE_CONFLICT') {
                  message.error('Xe đã có chuyến khác cùng ngày. Vui lòng chọn xe khác.');
                } else if (code === 'DRIVER_CONFLICT') {
                  message.error('Tài xế đã có chuyến khác cùng ngày. Vui lòng chọn tài xế khác.');
                } else {
                  message.error(getErrorMessage(err, 'Cập nhật thất bại. Vui lòng thử lại.'));
                }
              } finally {
                setEditSaving(false);
              }
            }}
          >
            Lưu thay đổi
          </Button>,
        ]}
        width={600}
      >
        <Alert
          type="info"
          showIcon
          message="Lưu ý"
          description="Chỉ cho phép chỉnh sửa khi chuyến chưa được dispatch. Sau khi xác nhận điều phối, xe và tài xế bị khóa vĩnh viễn."
          style={{ marginBottom: 16 }}
        />

        {/* Vehicle picker */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>Chọn xe:</Text>
          {eligibleVehicles.length === 0 ? (
            <Alert type="warning" showIcon message="Không có xe đủ tải trong danh sách hiện tại. Tải lại trang để cập nhật." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {eligibleVehicles.map((v) => (
                <div
                  key={v.vehicleId}
                  onClick={() => setEditVehicleId(v.vehicleId)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: `2px solid ${editVehicleId === v.vehicleId ? '#1677ff' : '#f0f0f0'}`,
                    background: editVehicleId === v.vehicleId ? '#e6f4ff' : '#fafafa',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <Text strong>{v.plateNumber}</Text>
                    <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>{v.vehicleType}</Text>
                  </div>
                  <div style={{ fontSize: 12, color: '#52c41a' }}>
                    Còn: {fmtVolume(v.remainingVolumeM3)} / {fmtWeight(v.remainingWeightKg)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Driver picker */}
        <div>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>Chọn tài xế:</Text>
          {drivers.length === 0 ? (
            <Alert type="warning" showIcon message="Không có tài xế trong danh sách. Tải lại trang để cập nhật." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {drivers.map((d) => (
                <div
                  key={d.userId}
                  onClick={() => d.available && setEditDriverId(d.userId)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: `2px solid ${
                      editDriverId === d.userId ? '#1677ff' : d.available ? '#f0f0f0' : '#ffccc7'
                    }`,
                    background: editDriverId === d.userId ? '#e6f4ff' : d.available ? '#fafafa' : '#fff2f0',
                    cursor: d.available ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: d.available ? 1 : 0.7,
                  }}
                >
                  <div>
                    <Text strong style={{ color: d.available ? undefined : '#cf1322' }}>
                      {d.fullName}
                    </Text>
                    {!d.available && (
                      <Tag color="red" style={{ marginLeft: 8, fontSize: 11 }}>Bận</Tag>
                    )}
                  </div>
                  {!d.available && d.busyReason && (
                    <Tooltip title={d.busyReason}>
                      <InfoCircleOutlined style={{ color: '#cf1322' }} />
                    </Tooltip>
                  )}
                  {d.available && editDriverId === d.userId && (
                    <CheckOutlined style={{ color: '#1677ff' }} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Assignment Form (only when no trips yet & draft VALIDATED) ─────── */}
      {existingTrips.length === 0 && draft.status === 'VALIDATED' && (
        <>
          {/* Mode toggle */}
          <Card style={{ borderRadius: 12, marginBottom: 16 }} bodyStyle={{ padding: '16px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Text strong>Chế độ phân xe:</Text>
              <Radio.Group
                value={mode}
                onChange={(e) => { setMode(e.target.value); }}
                optionType="button"
                buttonStyle="solid"
              >
                <Radio.Button value="single">
                  <CarOutlined /> Phân 1 chuyến
                </Radio.Button>
                <Radio.Button value="split">
                  <SplitCellsOutlined /> Tách chuyến (BR-07)
                </Radio.Button>
              </Radio.Group>
              {mode === 'split' && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Phân {activeStops.length} điểm dừng thành nhiều chuyến
                </Text>
              )}
            </div>
          </Card>

          {/* ── SINGLE MODE ──────────────────────────────────────────────── */}
          {mode === 'single' && (
            <Row gutter={[16, 16]}>
              {/* Vehicle selection */}
              <Col xs={24} lg={12}>
                <Card
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Truck size={16} style={{ color: '#1677ff' }} />
                      <span>Chọn xe ({eligibleVehicles.length} xe đủ tải)</span>
                    </div>
                  }
                  style={{ borderRadius: 12, height: '100%' }}
                >
                  {eligibleVehicles.length === 0 && ineligibleVehicles.length === 0 && (
                    <Empty description="Không có dữ liệu xe. Vui lòng tải lại." />
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {eligibleVehicles.map((v, idx) => (
                      <div
                        key={v.vehicleId}
                        onClick={() => setSelectedVehicleId(v.vehicleId)}
                        style={{
                          border: selectedVehicleId === v.vehicleId ? '2px solid #1677ff' : '1px solid #d9d9d9',
                          borderRadius: 8,
                          padding: '10px 14px',
                          cursor: 'pointer',
                          background: selectedVehicleId === v.vehicleId ? '#f0f7ff' : '#fff',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <CarOutlined style={{ color: '#1677ff' }} />
                              <Text strong>{v.plateNumber}</Text>
                              <Tag color="blue" style={{ fontSize: 11 }}>{v.vehicleType}</Tag>
                              {idx === 0 && (
                                <Tag color="green" style={{ fontSize: 11 }}>Xe nhỏ nhất đủ tải</Tag>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                              Tối đa: {fmtVolume(v.maxVolumeM3)} · {fmtWeight(v.maxWeightKg)}
                            </div>
                            <div style={{ fontSize: 12, color: '#52c41a', marginTop: 2 }}>
                              Còn dư: {fmtVolume(v.remainingVolumeM3)} · {fmtWeight(v.remainingWeightKg)}
                            </div>
                          </div>
                          {selectedVehicleId === v.vehicleId && (
                            <CheckOutlined style={{ color: '#1677ff', fontSize: 16 }} />
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Ineligible vehicles */}
                    {ineligibleVehicles.length > 0 && (
                      <>
                        <Divider style={{ margin: '8px 0', fontSize: 12 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>Xe không đủ tải</Text>
                        </Divider>
                        {ineligibleVehicles.map((v) => (
                          <Tooltip
                            key={v.vehicleId}
                            title={v.failureReason || `Thể tích: ${v.volumeCheckResult} · Tải trọng: ${v.weightCheckResult}`}
                          >
                            <div
                              style={{
                                border: '1px solid #ffccc7',
                                borderRadius: 8,
                                padding: '10px 14px',
                                background: '#fff2f0',
                                cursor: 'not-allowed',
                                opacity: 0.7,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                                <Text style={{ color: '#8c8c8c' }}>{v.plateNumber}</Text>
                                <Tag color="red" style={{ fontSize: 11 }}>{v.vehicleType}</Tag>
                              </div>
                              <div style={{ fontSize: 12, color: '#ff4d4f', marginTop: 4 }}>
                                {v.failureReason || `Thể tích: ${v.volumeCheckResult} · Tải trọng: ${v.weightCheckResult}`}
                              </div>
                            </div>
                          </Tooltip>
                        ))}
                      </>
                    )}
                  </div>
                </Card>
              </Col>

              {/* Driver selection */}
              <Col xs={24} lg={12}>
                <Card
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Users size={16} style={{ color: '#52c41a' }} />
                      <span>Chọn tài xế ({drivers.filter((d) => d.available).length} khả dụng)</span>
                    </div>
                  }
                  style={{ borderRadius: 12, height: '100%' }}
                >
                  {drivers.length === 0 && (
                    <Empty description="Không có dữ liệu tài xế." />
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Available drivers first */}
                    {drivers.filter((d) => d.available).map((d) => (
                      <div
                        key={d.userId}
                        onClick={() => setSelectedDriverId(d.userId)}
                        style={{
                          border: selectedDriverId === d.userId ? '2px solid #52c41a' : '1px solid #d9d9d9',
                          borderRadius: 8,
                          padding: '10px 14px',
                          cursor: 'pointer',
                          background: selectedDriverId === d.userId ? '#f6ffed' : '#fff',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <UserOutlined style={{ color: '#52c41a' }} />
                            <div>
                              <Text strong>{d.fullName}</Text>
                              <div style={{ fontSize: 12, color: '#8c8c8c' }}>{d.email}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Badge status="success" text={<Text style={{ fontSize: 12 }}>Khả dụng</Text>} />
                            {selectedDriverId === d.userId && (
                              <CheckOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Busy drivers */}
                    {drivers.filter((d) => !d.available).length > 0 && (
                      <>
                        <Divider style={{ margin: '8px 0' }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>Tài xế đang bận</Text>
                        </Divider>
                        {drivers.filter((d) => !d.available).map((d) => (
                          <Tooltip key={d.userId} title={d.busyReason || 'Tài xế đang có chuyến khác'}>
                            <div
                              style={{
                                border: '1px solid #ffe7ba',
                                borderRadius: 8,
                                padding: '10px 14px',
                                background: '#fffbe6',
                                cursor: 'not-allowed',
                                opacity: 0.6,
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <UserOutlined style={{ color: '#d48806' }} />
                                  <div>
                                    <Text style={{ color: '#8c8c8c' }}>{d.fullName}</Text>
                                    <div style={{ fontSize: 12, color: '#8c8c8c' }}>{d.email}</div>
                                  </div>
                                </div>
                                <Badge status="warning" text={<Text style={{ fontSize: 12, color: '#d48806' }}>Bận</Text>} />
                              </div>
                              {d.busyReason && (
                                <div style={{ fontSize: 12, color: '#d48806', marginTop: 4 }}>
                                  {d.busyReason}
                                </div>
                              )}
                            </div>
                          </Tooltip>
                        ))}
                      </>
                    )}
                  </div>
                </Card>
              </Col>

              {/* Confirmation summary */}
              <Col xs={24}>
                <Card style={{ borderRadius: 12, background: '#fafafa' }}>
                  <Row gutter={16} align="middle">
                    <Col flex="1">
                      <Space size="large" wrap>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>Xe đã chọn</Text>
                          <div>
                            {selectedVehicleId
                              ? (() => {
                                  const v = eligibleVehicles.find((x) => x.vehicleId === selectedVehicleId);
                                  return <Text strong>{v ? `${v.plateNumber} (${v.vehicleType})` : `ID: ${selectedVehicleId}`}</Text>;
                                })()
                              : <Text type="secondary">Chưa chọn</Text>}
                          </div>
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>Tài xế đã chọn</Text>
                          <div>
                            {selectedDriverId
                              ? (() => {
                                  const d = drivers.find((x) => x.userId === selectedDriverId);
                                  return <Text strong>{d ? d.fullName : `ID: ${selectedDriverId}`}</Text>;
                                })()
                              : <Text type="secondary">Chưa chọn</Text>}
                          </div>
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>Ngày giao</Text>
                          <div><Text strong>{formatDate(draft.deliveryDate)}</Text></div>
                        </div>
                      </Space>
                    </Col>
                    <Col>
                      <Space>
                        <Button
                          onClick={() => { setSelectedVehicleId(null); setSelectedDriverId(null); }}
                          disabled={submitting}
                        >
                          Huỷ chọn
                        </Button>
                        <Button
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          disabled={
                            !selectedVehicleId ||
                            !selectedDriverId ||
                            submitting ||
                            !fleetCheck?.canDispatch
                          }
                          onClick={() => setConfirmModalOpen(true)}
                          loading={submitting}
                        >
                          Xác nhận phân xe
                        </Button>
                      </Space>
                    </Col>
                  </Row>
                  {fleetCheck && !fleetCheck.canDispatch && (
                    <Alert
                      type="error"
                      showIcon
                      message="Không thể phân xe vì đội xe không đủ năng lực. Liên hệ Quản lý Logistics để giải quyết."
                      style={{ marginTop: 12 }}
                    />
                  )}
                </Card>
              </Col>
            </Row>
          )}

          {/* ── SPLIT MODE ───────────────────────────────────────────────── */}
          {mode === 'split' && (
            <Row gutter={[16, 16]}>
              {/* Unassigned stops panel */}
              <Col xs={24} lg={8}>
                <Card
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <InfoCircleOutlined style={{ color: '#1677ff' }} />
                      <span>Điểm dừng cần phân ({unassignedStops.length})</span>
                    </div>
                  }
                  style={{ borderRadius: 12 }}
                  extra={unassignedStops.length === 0 ? <Tag color="success">Đã phân hết</Tag> : <Tag color="warning">Chưa phân</Tag>}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {activeStops.map((s) => {
                      const assigned = assignedStopIds.includes(s.tripDraftStopId);
                      return (
                        <div
                          key={s.tripDraftStopId}
                          style={{
                            border: assigned ? '1px solid #b7eb8f' : '1px solid #d9d9d9',
                            borderRadius: 6,
                            padding: '6px 10px',
                            background: assigned ? '#f6ffed' : '#fff',
                            fontSize: 12,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>
                              <Text strong>#{s.sequenceNo}</Text> — {s.storeName}
                            </span>
                            {assigned
                              ? <CheckOutlined style={{ color: '#52c41a' }} />
                              : <CloseCircleOutlined style={{ color: '#faad14' }} />}
                          </div>
                          <div style={{ color: '#8c8c8c', marginTop: 2 }}>
                            {fmtVolume((s as TripDraftStop & { stopVolumeM3?: number }).stopVolumeM3)} ·{' '}
                            {fmtWeight((s as TripDraftStop & { stopWeightKg?: number }).stopWeightKg)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </Col>

              {/* Split groups */}
              <Col xs={24} lg={16}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {splitGroups.map((group, gIdx) => (
                    <Card
                      key={group.groupId}
                      title={`Chuyến ${gIdx + 1}`}
                      style={{ borderRadius: 12 }}
                      extra={
                        splitGroups.length > 1 && (
                          <Button
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => removeSplitGroup(group.groupId)}
                          >
                            Xoá
                          </Button>
                        )
                      }
                    >
                      <Row gutter={[12, 12]}>
                        <Col xs={24} sm={12}>
                          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Chọn xe</Text>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                            {eligibleVehicles.map((v) => {
                              const takenByOther = usedVehicleIds.has(v.vehicleId) && group.vehicleId !== v.vehicleId;
                              return (
                                <div
                                  key={v.vehicleId}
                                  onClick={() => !takenByOther && updateGroup(group.groupId, { vehicleId: v.vehicleId })}
                                  style={{
                                    border: group.vehicleId === v.vehicleId ? '2px solid #1677ff' : '1px solid #d9d9d9',
                                    borderRadius: 6,
                                    padding: '6px 10px',
                                    cursor: takenByOther ? 'not-allowed' : 'pointer',
                                    opacity: takenByOther ? 0.4 : 1,
                                    background: group.vehicleId === v.vehicleId ? '#f0f7ff' : '#fff',
                                    fontSize: 12,
                                  }}
                                >
                                  <Text strong={!takenByOther}>{v.plateNumber}</Text>
                                  <Text style={{ color: '#8c8c8c', marginLeft: 6 }}>{v.vehicleType}</Text>
                                  {takenByOther && <Text type="danger" style={{ marginLeft: 6 }}>Đã dùng</Text>}
                                </div>
                              );
                            })}
                          </div>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Chọn tài xế</Text>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                            {drivers.filter((d) => d.available).map((d) => {
                              const takenByOther = usedDriverIds.has(d.userId) && group.driverId !== d.userId;
                              return (
                                <div
                                  key={d.userId}
                                  onClick={() => !takenByOther && updateGroup(group.groupId, { driverId: d.userId })}
                                  style={{
                                    border: group.driverId === d.userId ? '2px solid #52c41a' : '1px solid #d9d9d9',
                                    borderRadius: 6,
                                    padding: '6px 10px',
                                    cursor: takenByOther ? 'not-allowed' : 'pointer',
                                    opacity: takenByOther ? 0.4 : 1,
                                    background: group.driverId === d.userId ? '#f6ffed' : '#fff',
                                    fontSize: 12,
                                  }}
                                >
                                  <Text strong={!takenByOther}>{d.fullName}</Text>
                                  {takenByOther && <Text type="danger" style={{ marginLeft: 6 }}>Đã dùng</Text>}
                                </div>
                              );
                            })}
                          </div>
                        </Col>
                        <Col xs={24}>
                          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                            Điểm dừng cho chuyến này ({group.stopIds.length})
                          </Text>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {activeStops.map((s) => {
                              const inThisGroup = group.stopIds.includes(s.tripDraftStopId);
                              const inOtherGroup = assignedStopIds.includes(s.tripDraftStopId) && !inThisGroup;
                              return (
                                <Tag
                                  key={s.tripDraftStopId}
                                  color={inThisGroup ? 'blue' : inOtherGroup ? 'default' : 'default'}
                                  style={{
                                    cursor: inOtherGroup ? 'not-allowed' : 'pointer',
                                    opacity: inOtherGroup ? 0.4 : 1,
                                    border: inThisGroup ? '1px solid #1677ff' : undefined,
                                  }}
                                  onClick={() => {
                                    if (!inOtherGroup) toggleStopInGroup(group.groupId, s.tripDraftStopId);
                                  }}
                                >
                                  #{s.sequenceNo} {s.storeName}
                                  {inThisGroup ? ' ✓' : ''}
                                </Tag>
                              );
                            })}
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  ))}

                  <Button
                    icon={<PlusOutlined />}
                    onClick={addSplitGroup}
                    style={{ borderRadius: 8 }}
                  >
                    Thêm chuyến
                  </Button>

                  {/* Split submit */}
                  <Card style={{ borderRadius: 12, background: '#fafafa' }}>
                    {!splitValid && (
                      <Alert
                        type="warning"
                        showIcon
                        message={
                          unassignedStops.length > 0
                            ? `Còn ${unassignedStops.length} điểm chưa được phân vào chuyến nào.`
                            : 'Mỗi chuyến phải có xe, tài xế và ít nhất 1 điểm dừng.'
                        }
                        style={{ marginBottom: 12 }}
                      />
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <Button onClick={() => setMode('single')}>Chuyển về phân 1 chuyến</Button>
                      <Button
                        type="primary"
                        disabled={!splitValid || submitting || !fleetCheck?.canDispatch}
                        onClick={() => setSplitConfirmOpen(true)}
                        loading={submitting}
                      >
                        Xác nhận tách chuyến
                      </Button>
                    </div>
                  </Card>
                </div>
              </Col>
            </Row>
          )}
        </>
      )}

      {/* ── Modal: single assign confirm ──────────────────────────────────── */}
      <Modal
        open={confirmModalOpen}
        title="Xác nhận phân xe và tài xế"
        onCancel={() => !submitting && setConfirmModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setConfirmModalOpen(false)} disabled={submitting}>
            Quay lại
          </Button>,
          <Button
            key="confirm"
            type="primary"
            loading={submitting}
            onClick={handleConfirmAssign}
          >
            Xác nhận phân xe
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 12 }}>
          <p>Bạn có chắc chắn muốn phân xe và tài xế cho chuyến này?</p>
          <div style={{ background: '#f5f5f5', borderRadius: 8, padding: '12px 16px' }}>
            <div><Text type="secondary">Xe:</Text> <Text strong>{(() => {
              const v = eligibleVehicles.find((x) => x.vehicleId === selectedVehicleId);
              return v ? `${v.plateNumber} (${v.vehicleType})` : '—';
            })()}</Text></div>
            <div><Text type="secondary">Tài xế:</Text> <Text strong>{(() => {
              const d = drivers.find((x) => x.userId === selectedDriverId);
              return d ? d.fullName : '—';
            })()}</Text></div>
            <div><Text type="secondary">Ngày giao:</Text> <Text strong>{formatDate(draft?.deliveryDate)}</Text></div>
            <div><Text type="secondary">Thể tích:</Text> <Text strong>{fmtVolume(draft?.totalVolumeM3)}</Text></div>
            <div><Text type="secondary">Tải trọng:</Text> <Text strong>{fmtWeight(draft?.totalWeightKg)}</Text></div>
          </div>
        </div>
      </Modal>

      {/* ── Modal: split assign confirm ───────────────────────────────────── */}
      <Modal
        open={splitConfirmOpen}
        title="Xác nhận tách chuyến"
        onCancel={() => !submitting && setSplitConfirmOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setSplitConfirmOpen(false)} disabled={submitting}>
            Quay lại
          </Button>,
          <Button
            key="confirm"
            type="primary"
            loading={submitting}
            onClick={handleConfirmSplit}
          >
            Xác nhận tách chuyến
          </Button>,
        ]}
      >
        <p>Sẽ tạo <strong>{splitGroups.length}</strong> chuyến từ tuyến <strong>{draft.routeCode}</strong>.</p>
        <p>Mỗi chuyến sẽ được giao cho một xe và tài xế riêng biệt. Hành động này không thể hoàn tác.</p>
      </Modal>
    </AdminShell>
  );
};

export default VehicleAssignmentPage;
