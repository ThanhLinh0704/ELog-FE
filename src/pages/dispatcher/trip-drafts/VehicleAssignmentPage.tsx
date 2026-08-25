import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
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
  DownloadOutlined,
  DownOutlined,
  UpOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { Truck, Users, ShieldCheck, ShieldAlert } from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import StatusBadge from '../../../components/StatusBadge';
import { palette } from '../../../theme/tokens';
import { tripDraftApi, type VehicleRecommendation } from '../../../api/tripDraftApi';
import {
  getEligibleVehicles,
  getEligibleVehiclesForStops,
  getAvailableDrivers,
  getFleetCapacityCheck,
  assignTrip,
  assignSplitTrips,
  getTripsByTripDraftId,
  openHandoverSlip,
  cancelTrip,
} from '../../../api/tripApi';
import { dispatchExportApi } from '../../../api/dispatchExportApi';
import { downloadBlob } from '../../../utils/downloadBlob';
import type { TripDraft, TripDraftStop, CapacityValidationResult } from '../../../types/tripDraft';
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

type BadgeColor = 'warning' | 'processing' | 'success' | 'purple' | 'blue' | 'cyan' | 'error' | 'default';

function renderStatusTag(status?: string | null) {
  if (!status) return null;
  const map: Record<string, { color: BadgeColor; text: string }> = {
    DRAFT: { color: 'warning', text: 'Nháp' },
    PLANNED: { color: 'processing', text: 'Đã lập chuyến' },
    VALIDATED: { color: 'success', text: 'Đã kiểm tra tải' },
    DISPATCHED: { color: 'purple', text: 'Đã xuất phát' },
    IN_PROGRESS: { color: 'blue', text: 'Đang giao hàng' },
    COMPLETED: { color: 'cyan', text: 'Hoàn thành' },
  };
  const { color, text } = map[status] || { color: 'default', text: status };
  return <StatusBadge color={color}>{text}</StatusBadge>;
}

function renderTripStatusTag(status?: string | null) {
  if (!status) return null;
  const map: Record<string, { color: BadgeColor; text: string }> = {
    VALIDATED: { color: 'success', text: 'Sẵn sàng điều phối' },
    DISPATCHED: { color: 'purple', text: 'Đã điều phối' },
    IN_PROGRESS: { color: 'blue', text: 'Đang giao hàng' },
    COMPLETED: { color: 'cyan', text: 'Hoàn thành' },
    CANCELLED: { color: 'error', text: 'Đã huỷ' },
  };
  const { color, text } = map[status] || { color: 'default', text: status };
  return <StatusBadge color={color}>{text}</StatusBadge>;
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Carried over from TripDraftDetailPage when the dispatcher picked a TWO_VEHICLE
  // recommendation — getEligibleVehicles() checks each vehicle against the WHOLE
  // route's load, so it can never list either vehicle of a plan that only works
  // split in two. Prefilling split mode straight from the already-validated plan
  // sidesteps that instead of re-deriving eligibility per sub-trip client-side.
  const incomingRecState = location.state as { tripDraftId?: number; recommendation?: VehicleRecommendation } | null;
  const incomingRecommendation =
    incomingRecState?.tripDraftId === Number(id) ? incomingRecState.recommendation : undefined;
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
  // Populated only when draft.status === 'PLANNED' — mirrors TripDraftDetailPage's
  // capacityFailInfo so this page can independently re-derive the same manual
  // assignment eligibility (spec-manual-assignment-override.md) without relying
  // on navigation state from the detail page.
  const [capacityInfo, setCapacityInfo] = useState<CapacityValidationResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Auto-confirm when arriving from "Gợi ý phân xe tự động" (see effect below) — these
  // query params / nav state only ever come from TripDraftDetailPage's getAssignUrlWithVehicle
  // / getAssignNavigationState, i.e. only when the dispatcher already picked a specific
  // recommendation there. Seed 'pending' from the very first render (not inside an effect) so
  // the manual picker form never flashes on screen before the auto-submit fires.
  const hasRecommendationPrefill = !!(searchParams.get('vehicleId') || incomingRecommendation);
  const [autoAssignState, setAutoAssignState] = useState<'idle' | 'pending' | 'failed'>(
    hasRecommendationPrefill ? 'pending' : 'idle'
  );
  const autoConfirmedRef = useRef(false);

  // Single mode
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<number | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [showIneligibleVehicles, setShowIneligibleVehicles] = useState(false);
  const [showAllEligibleVehicles, setShowAllEligibleVehicles] = useState(false);
  const ELIGIBLE_PREVIEW_COUNT = 5;

  // Split mode
  const [mode, setMode] = useState<Mode>('single');
  const [splitGroups, setSplitGroups] = useState<SplitGroup[]>([
    { groupId: 'g1', vehicleId: null, driverId: null, stopIds: [] },
  ]);
  const [splitConfirmOpen, setSplitConfirmOpen] = useState(false);
  // Per-group vehicle eligibility for manually-built split groups (no recommendation
  // prefill) — whole-route eligibleVehicles never lists a vehicle sized for just one
  // sub-group, so each group's own stopIds must be checked against its own endpoint.
  const [groupEligibleVehicles, setGroupEligibleVehicles] = useState<Record<string, EligibleVehicle[]>>({});
  const [groupVehiclesLoading, setGroupVehiclesLoading] = useState<Record<string, boolean>>({});
  // Surfaces WHY a group has no eligible vehicle — ineligibleVehicles[].failureReason
  // from the same API response, previously fetched but silently discarded here.
  const [groupIneligibleVehicles, setGroupIneligibleVehicles] = useState<Record<string, IneligibleVehicle[]>>({});
  // Distinguishes "API call failed" from "genuinely zero eligible vehicles" — the
  // previous .catch silently treated both the same, hiding real errors from the dispatcher.
  const [groupVehiclesError, setGroupVehiclesError] = useState<Record<string, string | null>>({});

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

      // Manual assignment override (spec-manual-assignment-override.md, mirrors
      // TripServiceImpl.validateAssignmentEligibility): fetch the capacity
      // validation result when PLANNED so we know whether the automatic check
      // actually ran and failed (volumeCheckResult !== NOT_CHECKED) — a draft
      // that never ran the check at all must stay locked.
      let capacityResult: CapacityValidationResult | null = null;
      if (draftData.status === 'PLANNED') {
        try {
          capacityResult = await tripDraftApi.getCapacityValidationResult(id);
        } catch (err) {
          console.error('Failed to fetch capacity validation result', err);
        }
      }
      setCapacityInfo(capacityResult);

      const eligibleForManualAssign =
        draftData.status === 'VALIDATED' ||
        (draftData.status === 'PLANNED' &&
          capacityResult != null &&
          capacityResult.volumeCheckResult !== 'NOT_CHECKED');

      // Mirrors the hasActiveTrip check used for rendering below — a CANCELLED trip must not
      // block re-loading eligible vehicles/drivers, otherwise the assignment form renders (per
      // hasActiveTrip) but stays permanently empty since this data never gets fetched.
      const hasActiveTripData = tripsData.some((t) => t.status !== 'CANCELLED');

      // Only load vehicles/drivers if no ACTIVE trip yet and draft is eligible for assignment
      if (!hasActiveTripData && eligibleForManualAssign) {
        const deliveryDate = draftData.deliveryDate;
        const [vehicleData, driverData, fleetData] = await Promise.all([
          getEligibleVehicles(id),
          getAvailableDrivers(deliveryDate),
          getFleetCapacityCheck(deliveryDate),
        ]);
        const loadedEligible = vehicleData.eligibleVehicles ?? [];
        setEligibleVehicles(loadedEligible);
        setIneligibleVehicles(vehicleData.ineligibleVehicles ?? []);
        setDrivers(driverData);
        setFleetCheck(fleetData);

        const paramVId = searchParams.get('vehicleId');
        if (paramVId && loadedEligible.some(v => v.vehicleId === Number(paramVId))) {
          setSelectedVehicleId(Number(paramVId));
        }

        const paramDriverId = searchParams.get('driverId');
        if (paramDriverId && driverData.some(d => d.userId === Number(paramDriverId))) {
          setSelectedDriverId(Number(paramDriverId));
        }

        if (incomingRecommendation?.subTrips?.length) {
          const activeDraftStops = (draftData.stops ?? [])
            .filter((s) => s.isActive)
            .sort((a, b) => a.sequenceNo - b.sequenceNo);

          const prefilledGroups: SplitGroup[] = incomingRecommendation.subTrips.map((sub, idx) => ({
            groupId: `rec-${idx}`,
            vehicleId: sub.vehicleId,
            driverId: incomingRecommendation.vehicles.find((v) => v.vehicleId === sub.vehicleId)?.driverId ?? null,
            stopIds: sub.stopSequenceNos
              .map((seq) => activeDraftStops.find((s) => s.sequenceNo === seq)?.tripDraftStopId)
              .filter((stopId): stopId is number => stopId != null),
          }));

          setSplitGroups(prefilledGroups);
          setMode('split');
        }
      } else if (!hasActiveTripData && !eligibleForManualAssign) {
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
    loadAll();
  }, [id, searchParams]);

  // ── Derived: active stops for split ─────────────────────────────────────
  const activeStops: TripDraftStop[] = (draft?.stops ?? [])
    .filter((s) => s.isActive)
    .sort((a, b) => a.sequenceNo - b.sequenceNo);

  // ── Single mode: assign ──────────────────────────────────────────────────
  const handleConfirmAssign = async () => {
    if (!id || !selectedVehicleId) return;
    setSubmitting(true);
    try {
      await assignTrip(id, { vehicleId: selectedVehicleId, driverId: selectedDriverId });
      message.success('Phân xe và tài xế thành công! Đã tạo chuyến.');
      setConfirmModalOpen(false);
      await loadAll();
    } catch (err) {
      console.error(err);
      setAutoAssignState('failed');
      const code = getErrorCode(err);
      const msg = getErrorMessage(err);
      if (code === 'VEHICLE_NOT_ELIGIBLE') {
        message.error(msg || 'Xe đã chọn không đủ tải cho chuyến này.');
        setSelectedVehicleId(null);
        await getEligibleVehicles(id).then((v) => {
          setEligibleVehicles(v.eligibleVehicles ?? []);
          setIneligibleVehicles(v.ineligibleVehicles ?? []);
        }).catch(() => null);
      } else if (code === 'DRIVER_LICENSE_INCOMPATIBLE') {
        message.error(msg || 'Hạng bằng lái của tài xế không tương thích với yêu cầu của xe.');
      } else if (code === 'VEHICLE_CONFLICT') {
        message.error(msg || 'Xe này đã được gán cho chuyến khác trong ngày. Vui lòng chọn xe khác.');
        setSelectedVehicleId(null);
      } else if (code === 'DRIVER_CONFLICT') {
        message.error(msg || 'Tài xế này đã được gán chuyến khác. Vui lòng chọn tài xế khác.');
        setSelectedDriverId(null);
      } else if (code === 'TRIP_DRAFT_ALREADY_ASSIGNED') {
        message.warning('Chuyến đã được phân xe trước đó.');
        await loadAll();
      } else if (code === 'INSUFFICIENT_FLEET') {
        message.error('Đội xe không đủ năng lực. Không thể phân xe lúc này.');
      } else {
        message.error(msg || 'Phân xe thất bại.');
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
      setAutoAssignState('failed');
      const code = getErrorCode(err);
      if (code === 'DRIVER_LICENSE_INCOMPATIBLE') {
        message.error('Hạng bằng lái của tài xế không tương thích với yêu cầu của xe.');
      } else {
        message.error(getErrorMessage(err, 'Tách chuyến thất bại. Vui lòng thử lại.'));
      }
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

  // ── Confirmed dispatch data export (per trip) ──────────────────────────────
  const [exportingTripId, setExportingTripId] = useState<number | null>(null);
  const handleExportDispatch = async (trip: Trip) => {
    setExportingTripId(trip.tripId);
    try {
      const blob = await dispatchExportApi.exportSingleDispatch(trip.tripDraftId);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `ELog_DispatchExport_${trip.tripDraftId}_${stamp}.xlsx`);
      message.success('Xuất dữ liệu điều phối thành công');
    } catch (err) {
      message.error(getErrorMessage(err, 'Không thể xuất dữ liệu điều phối. Vui lòng thử lại.'));
    } finally {
      setExportingTripId(null);
    }
  };

  // ── Cancel trip (DISPATCHED, chưa bắt đầu) ─────────────────────────────────
  const [cancellingTrip, setCancellingTrip] = useState<Trip | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const handleCancelTrip = async () => {
    if (!cancellingTrip) return;
    setCancelling(true);
    try {
      const updated = await cancelTrip(cancellingTrip.tripId);
      setExistingTrips((prev) =>
        prev.map((t) => (t.tripId === updated.tripId ? updated : t))
      );
      message.success('Đã huỷ chuyến');
      setCancellingTrip(null);
    } catch (err) {
      message.error(getErrorMessage(err, 'Không thể huỷ chuyến. Vui lòng thử lại.'));
    } finally {
      setCancelling(false);
    }
  };

  // ── Split mode: per-group vehicle eligibility (manual, no recommendation) ──
  // Recommendation-prefilled groups already have the right vehicles via
  // splitPickerVehicles below, so this only runs for groups the dispatcher built
  // by hand — each group's stopIds is checked against eligible-vehicles-for-stops.
  const splitStopIdsKey = splitGroups.map((g) => `${g.groupId}:${g.stopIds.join(',')}`).join('|');
  useEffect(() => {
    if (!id || mode !== 'split' || incomingRecommendation) return;
    let cancelled = false;

    splitGroups.forEach((group) => {
      if (group.stopIds.length === 0) {
        setGroupEligibleVehicles((prev) => (prev[group.groupId]?.length ? { ...prev, [group.groupId]: [] } : prev));
        setGroupIneligibleVehicles((prev) => (prev[group.groupId]?.length ? { ...prev, [group.groupId]: [] } : prev));
        setGroupVehiclesError((prev) => (prev[group.groupId] ? { ...prev, [group.groupId]: null } : prev));
        return;
      }
      setGroupVehiclesLoading((prev) => ({ ...prev, [group.groupId]: true }));
      setGroupVehiclesError((prev) => ({ ...prev, [group.groupId]: null }));
      getEligibleVehiclesForStops(id, group.stopIds)
        .then((res) => {
          if (cancelled) return;
          setGroupEligibleVehicles((prev) => ({ ...prev, [group.groupId]: res.eligibleVehicles ?? [] }));
          setGroupIneligibleVehicles((prev) => ({ ...prev, [group.groupId]: res.ineligibleVehicles ?? [] }));
        })
        .catch((err) => {
          if (cancelled) return;
          console.error(`Failed to load eligible vehicles for group ${group.groupId}`, err);
          setGroupEligibleVehicles((prev) => ({ ...prev, [group.groupId]: [] }));
          setGroupIneligibleVehicles((prev) => ({ ...prev, [group.groupId]: [] }));
          setGroupVehiclesError((prev) => ({
            ...prev,
            [group.groupId]: getErrorMessage(err, 'Không thể tải danh sách xe cho nhóm này.'),
          }));
        })
        .finally(() => {
          if (cancelled) return;
          setGroupVehiclesLoading((prev) => ({ ...prev, [group.groupId]: false }));
        });
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, mode, incomingRecommendation, splitStopIdsKey]);

  // ── Auto-confirm from recommendation prefill (see autoAssignState above) ──
  useEffect(() => {
    if (loading || autoAssignState !== 'pending' || autoConfirmedRef.current) return;
    if (existingTrips.some((t) => t.status !== 'CANCELLED')) return;

    if (incomingRecommendation) {
      if (splitValid) {
        autoConfirmedRef.current = true;
        handleConfirmSplit();
      } else {
        // Recommended split no longer fully valid (e.g. a vehicle/driver got taken in the
        // meantime) — fall back to the manual split form instead of hanging on the spinner.
        setAutoAssignState('failed');
      }
    } else if (searchParams.get('vehicleId')) {
      if (selectedVehicleId) {
        autoConfirmedRef.current = true;
        handleConfirmAssign();
      } else {
        // Recommended vehicle is no longer eligible — fall back to the manual picker.
        setAutoAssignState('failed');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, autoAssignState, existingTrips, incomingRecommendation, splitValid, selectedVehicleId, searchParams]);

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

  // Manual assignment override (spec-manual-assignment-override.md, mirrors
  // TripServiceImpl.validateAssignmentEligibility): eligible when VALIDATED, or
  // when PLANNED and the automatic capacity check actually ran and failed.
  const canManuallyAssign =
    draft.status === 'VALIDATED' ||
    (draft.status === 'PLANNED' && capacityInfo != null && capacityInfo.volumeCheckResult !== 'NOT_CHECKED');

  // Mirrors TripServiceImpl's existsByTripDraftIdAndStatusNot(..., CANCELLED) guard — một Trip đã
  // huỷ không tính là "đang chiếm" tripDraft này, nên vẫn phải cho hiện lại form chọn xe mới. Bảng
  // "Chuyến đã được tạo" bên dưới vẫn luôn hiện đủ mọi Trip (kể cả CANCELLED) để xem lịch sử —
  // chỉ riêng điều kiện "có cho chọn xe mới không" mới cần loại trừ CANCELLED.
  const hasActiveTrip = existingTrips.some((t) => t.status !== 'CANCELLED');

  const usedDriverIds = new Set(splitGroups.map((g) => g.driverId).filter(Boolean));
  const usedVehicleIds = new Set(splitGroups.map((g) => g.vehicleId).filter(Boolean));

  // Split mode's vehicle picker needs to show the two vehicles a prefilled
  // TWO_VEHICLE recommendation selected — they fail the whole-route eligibility
  // check by definition (that's why the plan is split in two), so they never
  // appear in `eligibleVehicles`. Add them in without touching the general
  // (still whole-route-based) eligibility list used elsewhere on this page.
  const splitPickerVehicles: EligibleVehicle[] = incomingRecommendation
    ? [
        ...eligibleVehicles,
        ...incomingRecommendation.vehicles
          .filter((rv) => !eligibleVehicles.some((v) => v.vehicleId === rv.vehicleId))
          .map((rv) => ({
            vehicleId: rv.vehicleId,
            plateNumber: rv.plateNumber,
            vehicleType: rv.vehicleType,
            maxVolumeM3: rv.maxVolumeM3,
            payloadKg: rv.payloadKg,
            remainingVolumeM3: 0,
            remainingWeightKg: 0,
          })),
      ]
    : eligibleVehicles;

  // Manually-built groups (no incomingRecommendation) get their own picker list,
  // fetched per-group from eligible-vehicles-for-stops (see effect above) instead
  // of the whole-route splitPickerVehicles.
  const getGroupVehicles = (group: SplitGroup): EligibleVehicle[] =>
    incomingRecommendation ? splitPickerVehicles : (groupEligibleVehicles[group.groupId] ?? []);

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

      {/* Draft not eligible for assignment warning */}
      {!canManuallyAssign && !hasActiveTrip && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message="Trip Draft chưa sẵn sàng phân xe"
          description={
            draft.status === 'PLANNED'
              ? `Trạng thái hiện tại: ${draft.status}. Trip Draft cần được "Kiểm tra tải trọng" trước — nếu tự động không đủ tải, hệ thống sẽ cho phép phân xe thủ công.`
              : `Trạng thái hiện tại: ${draft.status}. Trip Draft phải ở trạng thái VALIDATED (hoặc PLANNED đã kiểm tra tải trọng) để phân xe.`
          }
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
                  <StatusBadge color={fleetCheck.volumeCheckResult === 'FAIL' ? 'red' : 'green'}>
                    Thể tích: {fmtVolume(fleetCheck.dayTotalVolumeM3)} / {fmtVolume(fleetCheck.fleetTotalVolumeM3)}
                  </StatusBadge>
                  <StatusBadge color={fleetCheck.weightCheckResult === 'FAIL' ? 'red' : 'green'}>
                    Tải trọng: {fmtWeight(fleetCheck.dayTotalWeightKg)} / {fmtWeight(fleetCheck.fleetTotalWeightKg)}
                  </StatusBadge>
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
              <Truck size={18} style={{ color: '#2563eb' }} />
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
              { title: 'Trip ID', dataIndex: 'tripId', key: 'tripId', render: (v: number) => <StatusBadge color="blue">#{v}</StatusBadge> },
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
              {
                title: 'Trạng thái',
                key: 'status',
                render: (_: unknown, r: Trip) => (
                  <Space size={4}>
                    {renderTripStatusTag(r.status)}
                    {r.daysOverdue != null && (
                      <Tag color="warning">Quá hạn {r.daysOverdue} ngày</Tag>
                    )}
                  </Space>
                ),
              },
              {
                title: 'Hành động',
                key: 'action',
                render: (_: unknown, r: Trip) => {
                  if (r.status === 'VALIDATED') {
                    return (
                      <Button
                        type="primary"
                        size="small"
                        icon={<CheckCircleOutlined />}
                        onClick={() => navigate(`/dispatcher/trips/${r.tripId}/dispatch`)}
                      >
                        Xác nhận điều phối
                      </Button>
                    );
                  }
                  if (r.status === 'DISPATCHED' || r.status === 'IN_PROGRESS' || r.status === 'COMPLETED') {
                    return (
                      <Space size="small">
                        <Button
                          size="small"
                          icon={<PrinterOutlined />}
                          onClick={() => handleOpenHandoverSlip(r.tripId)}
                        >
                          In phiếu bàn giao
                        </Button>
                        <Button
                          size="small"
                          icon={<DownloadOutlined />}
                          loading={exportingTripId === r.tripId}
                          onClick={() => handleExportDispatch(r)}
                        >
                          Xuất dữ liệu điều phối
                        </Button>
                        {r.status === 'DISPATCHED' && (
                          <Button
                            danger
                            size="small"
                            icon={<StopOutlined />}
                            onClick={() => setCancellingTrip(r)}
                          >
                            Huỷ chuyến
                          </Button>
                        )}
                      </Space>
                    );
                  }
                  return null;
                },
              },
            ]}
          />
        </Card>
      )}

      {/* ── Cancel Trip Modal ────────────────────────────────────────────────── */}
      <Modal
        open={!!cancellingTrip}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StopOutlined style={{ color: '#cf1322' }} />
            <span>Huỷ chuyến — Trip #{cancellingTrip?.tripId}</span>
          </div>
        }
        onCancel={() => !cancelling && setCancellingTrip(null)}
        footer={[
          <Button key="back" onClick={() => setCancellingTrip(null)} disabled={cancelling}>
            Quay lại
          </Button>,
          <Button key="confirm" danger type="primary" loading={cancelling} onClick={handleCancelTrip}>
            Xác nhận huỷ chuyến
          </Button>,
        ]}
      >
        <Alert
          type="warning"
          showIcon
          message="Hành động không thể hoàn tác"
          description="Chuyến sẽ chuyển sang trạng thái Đã huỷ. Xe và tài xế được giải phóng ngay lập tức. Chỉ áp dụng được khi tài xế chưa bấm 'Bắt đầu chuyến' trên app."
          style={{ marginBottom: 16 }}
        />
        {cancellingTrip && (
          <div style={{ background: palette.bgLayout, borderRadius: 10, padding: '12px 16px' }}>
            <div>Tuyến: <Text strong>{cancellingTrip.fixedRouteCode}</Text></div>
            <div>Xe: <Text strong>{cancellingTrip.vehicle ? `${cancellingTrip.vehicle.plateNumber} (${cancellingTrip.vehicle.vehicleType})` : '—'}</Text></div>
            <div>Tài xế: <Text strong>{cancellingTrip.driver?.fullName ?? '—'}</Text></div>
          </div>
        )}
      </Modal>

      {/* ── Assignment Form (only when no ACTIVE trip & draft VALIDATED) ────── */}
      {!hasActiveTrip && canManuallyAssign && (
        autoAssignState === 'pending' ? (
          <Card style={{ borderRadius: 12, marginBottom: 16, textAlign: 'center', padding: '32px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 12 }}>
              <Text strong>Đang tạo chuyến theo phương án đã chọn...</Text>
            </div>
          </Card>
        ) : (
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
                      <Truck size={16} style={{ color: '#2563eb' }} />
                      <span>Chọn xe ({eligibleVehicles.length} xe đủ tải)</span>
                    </div>
                  }
                  style={{ borderRadius: 12, height: '100%' }}
                >
                  {eligibleVehicles.length === 0 && ineligibleVehicles.length === 0 && (
                    <Empty description="Không có dữ liệu xe. Vui lòng tải lại." />
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(showAllEligibleVehicles ? eligibleVehicles : eligibleVehicles.slice(0, ELIGIBLE_PREVIEW_COUNT)).map((v, idx) => (
                      <div
                        key={v.vehicleId}
                        onClick={() => setSelectedVehicleId(v.vehicleId)}
                        style={{
                          border: selectedVehicleId === v.vehicleId ? '2px solid #2563eb' : '1px solid #d9d9d9',
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
                              <CarOutlined style={{ color: '#2563eb' }} />
                              <Text strong>{v.plateNumber}</Text>
                              <StatusBadge color="blue">{v.vehicleType}</StatusBadge>
                              {idx === 0 && (
                                <StatusBadge color="green">Xe nhỏ nhất đủ tải</StatusBadge>
                              )}
                            </div>
                             <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>
                              Tối đa: {fmtVolume(v.maxVolumeM3)} · {fmtWeight(v.payloadKg)}
                            </div>
                            <div style={{ fontSize: 12, color: '#52c41a', marginTop: 2 }}>
                              Còn dư: {fmtVolume(v.remainingVolumeM3)} · {fmtWeight(v.remainingWeightKg)}
                            </div>
                          </div>
                          {selectedVehicleId === v.vehicleId && (
                            <CheckOutlined style={{ color: '#2563eb', fontSize: 16 }} />
                          )}
                        </div>
                      </div>
                    ))}

                    {eligibleVehicles.length > ELIGIBLE_PREVIEW_COUNT && (
                      <Button
                        type="dashed"
                        block
                        icon={showAllEligibleVehicles ? <UpOutlined /> : <DownOutlined />}
                        onClick={() => setShowAllEligibleVehicles((prev) => !prev)}
                      >
                        {showAllEligibleVehicles
                          ? 'Thu gọn'
                          : `Xem thêm ${eligibleVehicles.length - ELIGIBLE_PREVIEW_COUNT} xe`}
                      </Button>
                    )}

                    {/* Ineligible vehicles */}
                    {ineligibleVehicles.length > 0 && (
                      <>
                        <Divider style={{ margin: '8px 0', fontSize: 12 }}>
                          <Button
                            type="link"
                            size="small"
                            icon={showIneligibleVehicles ? <UpOutlined /> : <DownOutlined />}
                            onClick={() => setShowIneligibleVehicles((prev) => !prev)}
                            style={{ fontSize: 12, padding: 0, height: 'auto' }}
                          >
                            {showIneligibleVehicles ? 'Ẩn' : 'Xem'} xe không đủ tải ({ineligibleVehicles.length})
                          </Button>
                        </Divider>
                        {showIneligibleVehicles && ineligibleVehicles.map((v) => (
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
                                <StatusBadge color="red">{v.vehicleType}</StatusBadge>
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
                    {/* Auto driver option */}
                    <div
                      onClick={() => setSelectedDriverId(null)}
                      style={{
                        border: selectedDriverId === null ? '2px solid #2563eb' : '1px dashed #d9d9d9',
                        borderRadius: 8,
                        padding: '10px 14px',
                        cursor: 'pointer',
                        background: selectedDriverId === null ? '#e6f4ff' : '#fafafa',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <UserOutlined style={{ color: '#2563eb' }} />
                          <div>
                            <Text strong>Tự động gán tài xế cố định</Text>
                            <div style={{ fontSize: 12, color: '#8c8c8c' }}>Sử dụng tài xế cố định của xe (nếu có)</div>
                          </div>
                        </div>
                        {selectedDriverId === null && (
                          <CheckOutlined style={{ color: '#2563eb', fontSize: 16 }} />
                        )}
                      </div>
                    </div>

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
                              : <Text type="secondary" style={{ fontStyle: 'italic' }}>Tự động chọn tài xế cố định của xe</Text>}
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
                      <InfoCircleOutlined style={{ color: '#2563eb' }} />
                      <span>Điểm dừng cần phân ({unassignedStops.length})</span>
                    </div>
                  }
                  style={{ borderRadius: 12 }}
                  extra={unassignedStops.length === 0 ? <StatusBadge color="success">Đã phân hết</StatusBadge> : <StatusBadge color="warning">Chưa phân</StatusBadge>}
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
                            {!incomingRecommendation && group.stopIds.length === 0 && (
                              <Text type="secondary" style={{ fontSize: 12, fontStyle: 'italic' }}>
                                Chọn điểm dừng cho chuyến này trước để xem xe đủ tải.
                              </Text>
                            )}
                            {!incomingRecommendation && group.stopIds.length > 0 && groupVehiclesLoading[group.groupId] && (
                              <Spin size="small" />
                            )}
                            {!incomingRecommendation &&
                              group.stopIds.length > 0 &&
                              !groupVehiclesLoading[group.groupId] &&
                              groupVehiclesError[group.groupId] && (
                                <Alert
                                  type="error"
                                  showIcon
                                  message="Không tải được danh sách xe"
                                  description={groupVehiclesError[group.groupId]}
                                  style={{ fontSize: 12 }}
                                />
                              )}
                            {!incomingRecommendation &&
                              group.stopIds.length > 0 &&
                              !groupVehiclesLoading[group.groupId] &&
                              !groupVehiclesError[group.groupId] &&
                              getGroupVehicles(group).length === 0 && (
                                <>
                                  <Text type="warning" style={{ fontSize: 12 }}>
                                    Không có xe nào đủ tải cho nhóm điểm dừng này.
                                  </Text>
                                  {(groupIneligibleVehicles[group.groupId] ?? []).map((v) => (
                                    <div key={v.vehicleId} style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                                      <Text type="secondary" style={{ fontSize: 11 }}>{v.plateNumber} ({v.vehicleType}):</Text>{' '}
                                      {v.failureReason || `Thể tích: ${v.volumeCheckResult} · Tải trọng: ${v.weightCheckResult}`}
                                    </div>
                                  ))}
                                </>
                              )}
                            {getGroupVehicles(group).map((v) => {
                              const takenByOther = usedVehicleIds.has(v.vehicleId) && group.vehicleId !== v.vehicleId;
                              return (
                                <div
                                  key={v.vehicleId}
                                  onClick={() =>
                                    !takenByOther &&
                                    updateGroup(group.groupId, {
                                      vehicleId: v.vehicleId,
                                      // Auto-fill the vehicle's fixed driver when it's available; otherwise
                                      // leave the driver picker empty so the dispatcher must pick manually
                                      // (see filemd/FE_Split_Vehicle_Assignment_Guide.md).
                                      driverId: v.assignedDriverId && v.assignedDriverAvailable ? v.assignedDriverId : null,
                                    })
                                  }
                                  style={{
                                    border: group.vehicleId === v.vehicleId ? '2px solid #2563eb' : '1px solid #d9d9d9',
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
                          {(() => {
                            const selectedVehicle = getGroupVehicles(group).find((v) => v.vehicleId === group.vehicleId);
                            if (!selectedVehicle?.assignedDriverId || selectedVehicle.assignedDriverAvailable !== false) return null;
                            return (
                              <Text type="warning" style={{ fontSize: 11, display: 'block', marginBottom: 4 }}>
                                ⚠️ Tài xế cố định ({selectedVehicle.assignedDriverName}) không khả dụng
                                {selectedVehicle.assignedDriverBusyReason ? `: ${selectedVehicle.assignedDriverBusyReason}` : ''}. Vui lòng chọn tài xế khác.
                              </Text>
                            );
                          })()}
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
                                    border: inThisGroup ? `1px solid ${palette.primary}` : undefined,
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
        )
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
              return d ? d.fullName : 'Tự động chọn tài xế cố định của xe';
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
