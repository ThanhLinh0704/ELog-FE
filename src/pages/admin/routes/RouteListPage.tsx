import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Card, Row, Col, Space, Button, Input, Select, Breadcrumb,
  Statistic, Tag, message, Alert, Tooltip, Empty, Typography, Segmented, Badge, Popconfirm, Modal
} from 'antd';
import {
  Edit3, Lock, Unlock, Plus, RefreshCw, Search, AlertTriangle,
  MapPin, List as ListIcon, Save, RotateCcw, Trash2, GripVertical
} from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import RouteMapEditor from '../../../components/RouteMapEditor';
import type { DeliveryRoute, RouteStop, StoreSearchResult, RouteStatus } from '../../../types/route';
import { routeApi } from '../../../api/routeApi';
import { storeApi } from '../../../api/storeApi';
import { USE_MOCK_API } from '../../../config';
import { mockRoutes } from '../../../mocks/routeData';
import { getActivateButtonState } from '../../../utils/routeCalculations';
import dayjs from 'dayjs';
import ActivateRouteModal from './components/ActivateRouteModal';
import DeactivateRouteModal from './components/DeactivateRouteModal';
import { usePermissions } from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../constants/permissions';

const { Text, Title } = Typography;

const RouteListPage: React.FC = () => {
  const navigate = useNavigate();

  // Retrieve current user roles from localStorage
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';
  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) roles = JSON.parse(rolesStr);
  } catch (e) {
    console.error('Failed to parse roles', e);
  }

  const { can } = usePermissions();
  const canWriteRoute = can(PERMISSIONS.ROUTE_WRITE);
  const currentUser = {
    id: Number(userId),
    username,
    fullName: username,
    roles,
  };

  // View mode: 'TABLE' (default) or 'SPLIT_MAP'
  const [viewMode, setViewMode] = useState<'SPLIT_MAP' | 'TABLE'>('TABLE');

  // Route & Store Data States
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [allStores, setAllStores] = useState<StoreSearchResult[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // Draft Stops for Selected Route (for local unsaved edits)
  const [originalStops, setOriginalStops] = useState<RouteStop[]>([]);
  const [draftStops, setDraftStops] = useState<RouteStop[]>([]);
  const [saving, setSaving] = useState(false);

  // Drag and drop state for stop reordering
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === dropIdx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const newStops = [...draftStops];
    const [movedItem] = newStops.splice(draggedIdx, 1);
    newStops.splice(dropIdx, 0, movedItem);

    // Re-index sequenceOrder with fresh objects
    const updatedStops = newStops.map((s, idx) => ({ ...s, sequenceOrder: idx + 1 }));

    setDraftStops(updatedStops);
    setDraggedIdx(null);
    setDragOverIdx(null);
    message.success(`Đã kéo thả điểm dừng [${movedItem.storeCode}] tới vị trí #${dropIdx + 1}`);
  };

  // Search & Filters for Table View
  const [searchKeyword, setSearchKeyword] = useState('');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [allRoutes, setAllRoutes] = useState<DeliveryRoute[]>([]);
  const [pageMeta, setPageMeta] = useState({ totalElements: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Stats
  const [activeCount, setActiveCount] = useState(0);
  const [inactiveCount, setInactiveCount] = useState(0);

  // Selected Store to Add in Left Panel
  const [selectedStoreToAdd, setSelectedStoreToAdd] = useState<string | null>(null);

  // Modals state
  const [actionRoute, setActionRoute] = useState<DeliveryRoute | null>(null);
  const [deactivateVisible, setDeactivateVisible] = useState(false);
  const [activateVisible, setActivateVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Edit Route Modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editRoute, setEditRoute] = useState<DeliveryRoute | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Active selected route object
  const activeRoute = useMemo(() => {
    return (
      allRoutes.find((r) => String(r.id) === String(selectedRouteId)) ||
      routes.find((r) => String(r.id) === String(selectedRouteId)) ||
      allRoutes[0] ||
      routes[0] ||
      null
    );
  }, [allRoutes, routes, selectedRouteId]);

  // Check if draftStops has unsaved changes compared to originalStops
  const hasUnsavedChanges = useMemo(() => {
    if (originalStops.length !== draftStops.length) return true;
    for (let i = 0; i < draftStops.length; i++) {
      if (
        draftStops[i].id !== originalStops[i].id ||
        draftStops[i].storeId !== originalStops[i].storeId ||
        draftStops[i].sequenceOrder !== originalStops[i].sequenceOrder
      ) {
        return true;
      }
    }
    return false;
  }, [originalStops, draftStops]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setKeyword(searchKeyword);
      setPage(0);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchKeyword]);

  const queryParams = useMemo(
    () => ({ keyword, status, page, size }),
    [keyword, status, page, size]
  );

  // Load All Stores for Map (for the store-picker & map reference layer)
  const fetchAllStores = useCallback(async () => {
    try {
      if (USE_MOCK_API) {
        const available = await routeApi.getAvailableStores();
        setAllStores(available);
      } else {
        const res = await storeApi.getStores({ size: 1000 });
        const mapped: StoreSearchResult[] = (res.content || []).map((s) => {
          const firstAssigned = s.assignedRoutes && s.assignedRoutes[0];
          return {
            id: String(s.id),
            code: s.storeCode || `KH${String(s.id).padStart(4, '0')}`,
            name: s.storeName || 'Cửa hàng',
            address: s.addressDetail || s.address || '',
            latitude: s.latitude ?? null,
            longitude: s.longitude ?? null,
            hasCoordinates: s.latitude != null && s.longitude != null,
            isActive: s.isActive ?? true,
            routeId: firstAssigned ? String(firstAssigned.id) : null,
          };
        });
        setAllStores(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch stores for map', err);
    }
  }, []);

  // Fetch ALL routes for map & dropdown selector (independent of table pagination)
  const fetchAllRoutes = useCallback(async () => {
    try {
      if (USE_MOCK_API) {
        setAllRoutes(mockRoutes);
      } else {
        const res = await routeApi.getRoutes({ page: 0, size: 1000, status: 'ALL' });
        setAllRoutes(res.content);
      }
    } catch (err) {
      console.error('Failed to fetch all routes for map editor', err);
    }
  }, []);

  // Fetch routes list
  const fetchRoutes = useCallback(async (params = queryParams) => {
    setLoading(true);
    setError('');
    try {
      const response = await routeApi.getRoutes(params);
      setRoutes(response.content);
      setPageMeta({
        totalElements: response.totalElements,
        totalPages: response.totalPages,
      });

      if (!selectedRouteId && response.content.length > 0) {
        setSelectedRouteId(String(response.content[0].id));
      }

      if (USE_MOCK_API) {
        setActiveCount(mockRoutes.filter((r) => r.status === 'ACTIVE').length);
        setInactiveCount(mockRoutes.filter((r) => r.status === 'INACTIVE').length);
      } else {
        const activeRes = await routeApi.getRoutes({ page: 0, size: 1, status: 'ACTIVE' });
        const inactiveRes = await routeApi.getRoutes({ page: 0, size: 1, status: 'INACTIVE' });
        setActiveCount(activeRes.totalElements);
        setInactiveCount(inactiveRes.totalElements);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách tuyến đường.');
    } finally {
      setLoading(false);
    }
  }, [queryParams, selectedRouteId]);

  // Fetch stops for the selected route
  const fetchRouteStops = useCallback(async (routeId: string) => {
    try {
      const stopsRes = await routeApi.getRouteStops(routeId);
      const sorted = [...stopsRes].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
      setOriginalStops(JSON.parse(JSON.stringify(sorted)));
      setDraftStops(JSON.parse(JSON.stringify(sorted)));
    } catch (err) {
      console.error('Failed to fetch route stops', err);
    }
  }, []);

  useEffect(() => {
    fetchRoutes(queryParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryParams]);

  useEffect(() => {
    fetchAllStores();
    fetchAllRoutes();
  }, [fetchAllStores, fetchAllRoutes]);

  useEffect(() => {
    if (activeRoute?.id) {
      setDraftStops([]);
      setOriginalStops([]);
      fetchRouteStops(String(activeRoute.id));
    }
  }, [activeRoute?.id, fetchRouteStops]);

  // Handle Route Selector change
  const handleSelectRoute = (routeId: string) => {
    if (hasUnsavedChanges) {
      if (!window.confirm('Bạn có thay đổi chưa lưu trên tuyến hiện tại. Bạn có chắc muốn chuyển tuyến?')) {
        return;
      }
    }
    setSelectedRouteId(routeId);
  };

  const handleRemoveDraftStop = (stopIdOrStoreId: string) => {
    const filtered = draftStops.filter(
      (s) => String(s.id) !== String(stopIdOrStoreId) && String(s.storeId) !== String(stopIdOrStoreId)
    );
    const updated = filtered.map((s, idx) => ({ ...s, sequenceOrder: idx + 1 }));
    setDraftStops(updated);
    message.info('Đã xóa điểm dừng khỏi bản nháp.');
  };

  const handleAddStoreToDraft = (storeToAdd: StoreSearchResult) => {
    if (!activeRoute) return;
    // Check if store already exists in draft
    if (draftStops.some((s) => String(s.storeId) === String(storeToAdd.id))) {
      message.warning(`Cửa hàng ${storeToAdd.name} đã có trong tuyến.`);
      return;
    }
    const newStop: RouteStop = {
      id: `temp-${Date.now()}-${Math.random()}`,
      routeId: String(activeRoute.id),
      storeId: String(storeToAdd.id),
      storeCode: storeToAdd.code,
      storeName: storeToAdd.name,
      address: storeToAdd.address,
      latitude: storeToAdd.latitude,
      longitude: storeToAdd.longitude,
      hasCoordinates: storeToAdd.hasCoordinates,
      sequenceOrder: draftStops.length + 1,
    };
    setDraftStops([...draftStops, newStop]);
    setSelectedStoreToAdd(null);
    message.success(`Đã thêm ${storeToAdd.name} vào bản nháp tuyến.`);
  };

  const handleRevertChanges = () => {
    setDraftStops(JSON.parse(JSON.stringify(originalStops)));
    message.info('Đã khôi phục về trạng thái tuyến ban đầu.');
  };

  // SAVE CHANGES TO BACKEND
  const handleSaveChanges = async () => {
    if (!activeRoute) return;
    setSaving(true);
    try {
      // 1. Identify removed stops from original
      const draftStoreIds = new Set(draftStops.map((s) => String(s.storeId)));
      const removedOriginalStops = originalStops.filter((s) => !draftStoreIds.has(String(s.storeId)));

      for (const removed of removedOriginalStops) {
        if (removed.id && !removed.id.startsWith('temp-')) {
          await routeApi.removeStop(String(activeRoute.id), String(removed.id));
        }
      }

      // 2. Identify new added stops
      const originalStoreIds = new Set(originalStops.map((s) => String(s.storeId)));
      const addedDraftStops = draftStops.filter((s) => !originalStoreIds.has(String(s.storeId)));

      for (const added of addedDraftStops) {
        const matchingStore = allStores.find((st) => String(st.id) === String(added.storeId));
        if (matchingStore) {
          await routeApi.addStop(String(activeRoute.id), matchingStore);
        }
      }

      // 3. Fetch current backend stops and reorder them matching draft sequence
      const updatedStops = await routeApi.getRouteStops(String(activeRoute.id));
      // Sort updatedStops according to draftStops order
      const orderedStops: RouteStop[] = [];
      draftStops.forEach((ds) => {
        const found = updatedStops.find((us) => String(us.storeId) === String(ds.storeId));
        if (found) orderedStops.push(found);
      });

      if (orderedStops.length > 0) {
        await routeApi.reorderStops(String(activeRoute.id), orderedStops);
      }

      message.success(`Đã lưu thay đổi cho tuyến ${activeRoute.code} thành công!`);
      await fetchRoutes();
      await fetchAllStores();
      await fetchRouteStops(String(activeRoute.id));
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi lưu thay đổi tuyến.');
    } finally {
      setSaving(false);
    }
  };

  // Modals status actions
  const handleOpenDeactivate = (route: DeliveryRoute) => {
    if (!canWriteRoute) {
      message.warning('Bạn không có quyền vô hiệu hoá tuyến.');
      return;
    }
    setActionRoute(route);
    setDeactivateVisible(true);
  };

  const handleOpenActivate = (route: DeliveryRoute) => {
    if (!canWriteRoute) {
      message.warning('Bạn không có quyền kích hoạt tuyến.');
      return;
    }
    setActionRoute(route);
    setActivateVisible(true);
  };

  const handleConfirmDeactivate = async () => {
    if (!actionRoute || !canWriteRoute) return;
    setModalLoading(true);
    try {
      await routeApi.updateStatus(actionRoute.id, 'INACTIVE');
      message.success(`Tuyến ${actionRoute.code} đã được vô hiệu hoá`);
      setDeactivateVisible(false);
      setActionRoute(null);
      fetchRoutes();
    } catch (err: any) {
      message.error(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmActivate = async () => {
    if (!actionRoute || !canWriteRoute) return;
    setModalLoading(true);
    try {
      await routeApi.updateStatus(actionRoute.id, 'ACTIVE');
      message.success(`Tuyến ${actionRoute.code} đã được kích hoạt`);
      setActivateVisible(false);
      setActionRoute(null);
      fetchRoutes();
    } catch (err: any) {
      message.error(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleOpenEditModal = (route: DeliveryRoute) => {
    if (!canWriteRoute) {
      message.warning('Bạn không có quyền chỉnh sửa tuyến.');
      return;
    }
    setEditRoute(route);
    setEditName(route.name || '');
    setEditDescription(route.description || '');
    setEditModalVisible(true);
  };

  const handleConfirmEditRoute = async () => {
    if (!editRoute) return;
    if (!editName.trim()) {
      message.error('Tên tuyến không được để trống.');
      return;
    }
    setEditSaving(true);
    try {
      await routeApi.updateRoute(String(editRoute.id), {
        name: editName.trim(),
        description: editDescription.trim(),
      });
      message.success(`Đã cập nhật thông tin tuyến ${editRoute.code} thành công!`);
      setEditModalVisible(false);
      setEditRoute(null);
      await fetchRoutes();
      await fetchAllRoutes();
    } catch (err: any) {
      message.error(err.message || 'Không thể cập nhật thông tin tuyến.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleResetFilters = () => {
    setSearchKeyword('');
    setKeyword('');
    setStatus('ALL');
    setPage(0);
  };

  // Columns definition for classic Table View
  const columns = [
    {
      title: 'Mã tuyến',
      dataIndex: 'code',
      key: 'code',
      render: (code: string, record: DeliveryRoute) => (
        <a
          onClick={() => {
            setSelectedRouteId(String(record.id));
            setViewMode('SPLIT_MAP');
          }}
          style={{ fontWeight: 700, color: '#1677ff' }}
        >
          {code}
        </a>
      ),
    },
    {
      title: 'Tên tuyến',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: 'Số điểm dừng',
      dataIndex: 'stopCount',
      key: 'stopCount',
      render: (stopCount: number, record: DeliveryRoute) => (
        <Space size="small">
          <span>{stopCount} điểm dừng</span>
          {record.coordinatesWarningCount > 0 && (
            <Tooltip title={`Có ${record.coordinatesWarningCount} điểm dừng chưa có toạ độ GPS`}>
              <Tag color="warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 4, margin: 0 }}>
                <AlertTriangle size={12} />
                <span>{record.coordinatesWarningCount}</span>
              </Tag>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (routeStatus: RouteStatus) => {
        const isActive = routeStatus === 'ACTIVE';
        return (
          <Tag color={isActive ? 'success' : 'default'} style={{ borderRadius: 6, fontWeight: 500 }}>
            {isActive ? 'Đang hoạt động' : 'Chưa kích hoạt'}
          </Tag>
        );
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (dateStr: string) => dayjs(dateStr).format('DD/MM/YYYY'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_: any, record: DeliveryRoute) => {
        const activationState = getActivateButtonState(record.stopCount);
        return (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              icon={<MapPin size={14} />}
              onClick={() => {
                setSelectedRouteId(String(record.id));
                setViewMode('SPLIT_MAP');
              }}
            >
              Bản đồ & Điều chỉnh
            </Button>

            {canWriteRoute && (
              <Tooltip title="Chỉnh sửa tên & mô tả tuyến">
                <Button
                  type="text"
                  icon={<Edit3 size={16} />}
                  onClick={() => handleOpenEditModal(record)}
                />
              </Tooltip>
            )}

            {canWriteRoute && (
              <>
                {record.status === 'ACTIVE' ? (
                  <Tooltip title="Vô hiệu hoá">
                    <Button
                      type="text"
                      danger
                      icon={<Lock size={16} />}
                      onClick={() => handleOpenDeactivate(record)}
                    />
                  </Tooltip>
                ) : (
                  <Tooltip title={activationState.disabled ? activationState.tooltip : 'Kích hoạt'}>
                    <Button
                      type="text"
                      style={{ color: activationState.disabled ? undefined : '#52c41a' }}
                      disabled={activationState.disabled}
                      icon={<Unlock size={16} />}
                      onClick={() => handleOpenActivate(record)}
                    />
                  </Tooltip>
                )}
              </>
            )}
          </Space>
        );
      },
    },
  ];

  // Stores available to add (not in draftStops)
  const availableStoresForAdd = useMemo(() => {
    const draftIds = new Set(draftStops.map((s) => String(s.storeId)));
    return allStores.filter((st) => !draftIds.has(String(st.id)));
  }, [allStores, draftStops]);

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header Breadcrumb, Title & View Switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Breadcrumb items={[{ title: 'Admin' }, { title: 'Quản lý tuyến' }]} />
            <h2 style={{ margin: '6px 0 0 0', fontSize: 24, fontWeight: 700, color: '#1f1f1f' }}>
              Quản lý tuyến giao hàng
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#8c8c8c' }}>
              Hiển thị bản đồ trực quan các tuyến giao hàng miền Bắc và cho phép tùy chỉnh tuyến trực tiếp.
            </p>
          </div>

          <Space size="middle">
            <Segmented
              value={viewMode}
              onChange={(val) => setViewMode(val as 'SPLIT_MAP' | 'TABLE')}
              options={[
                {
                  label: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px' }}>
                      <ListIcon size={16} />
                      <span>Danh sách tuyến</span>
                    </div>
                  ),
                  value: 'TABLE',
                },
                {
                  label: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px' }}>
                      <MapPin size={16} />
                      <span>Bản đồ & Điều chỉnh tuyến</span>
                    </div>
                  ),
                  value: 'SPLIT_MAP',
                },
              ]}
            />
            {canWriteRoute && (
              <Button type="primary" icon={<Plus size={14} />} onClick={() => navigate('/admin/routes/new')}>
                Tạo tuyến mới
              </Button>
            )}
          </Space>
        </div>

        {/* Statistic Cards */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card size="small" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)' }}>
              <Statistic title="Tổng số tuyến" value={pageMeta.totalElements || routes.length} suffix="tuyến" />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)' }}>
              <Statistic title="Đang hoạt động" value={activeCount} valueStyle={{ color: '#52c41a' }} suffix="tuyến" />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0,0,0,0.03)' }}>
              <Statistic title="Không kích hoạt" value={inactiveCount} valueStyle={{ color: '#8c8c8c' }} suffix="tuyến" />
            </Card>
          </Col>
        </Row>

        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 12 }} />}

        {/* ── MODE 1: SPLIT VIEW (MAP + LEFT PANEL) ────────────────────────── */}
        {viewMode === 'SPLIT_MAP' && (
          <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 270px)', minHeight: 620 }}>
            {/* LEFT PANEL: Route Selector, Stop List & Actions */}
            <div
              style={{
                width: 440,
                background: '#ffffff',
                borderRadius: 8,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: '1px solid #f0f0f0',
              }}
            >
              {/* Header: Select Active Route & Back to Table */}
              <div style={{ padding: '12px 16px', background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                    Chọn tuyến để xem & điều chỉnh
                  </Text>
                  <Button
                    size="small"
                    type="link"
                    onClick={() => setViewMode('TABLE')}
                    style={{ padding: 0, fontSize: 12, height: 'auto' }}
                  >
                    ← Quay lại Danh sách tuyến
                  </Button>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Select
                    style={{ flex: 1, minWidth: 0 }}
                    value={activeRoute ? String(activeRoute.id) : undefined}
                    onChange={handleSelectRoute}
                    options={(allRoutes.length > 0 ? allRoutes : routes).map((r) => ({
                      value: String(r.id),
                      label: `${r.code} - ${r.name} (${r.stopCount} điểm)`,
                    }))}
                  />
                  {activeRoute && (
                    <Tooltip title="Chỉnh sửa tên & mô tả tuyến này">
                      <Button
                        icon={<Edit3 size={14} />}
                        onClick={() => handleOpenEditModal(activeRoute)}
                      >
                        Sửa tên
                      </Button>
                    </Tooltip>
                  )}
                  <Button icon={<RefreshCw size={14} />} onClick={() => fetchRoutes()} title="Tải lại" />
                </div>
              </div>

              {/* Unsaved Changes Banner & Action Buttons */}
              {hasUnsavedChanges && (
                <div
                  style={{
                    padding: '10px 16px',
                    background: '#fffbe6',
                    borderBottom: '1px solid #ffe58f',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Space size="small">
                    <Badge dot color="#faad14" />
                    <Text strong style={{ color: '#d48806', fontSize: 13 }}>
                      Có thay đổi chưa lưu
                    </Text>
                  </Space>
                  <Space size="small">
                    <Button size="small" icon={<RotateCcw size={12} />} onClick={handleRevertChanges}>
                      Khôi phục
                    </Button>
                    <Button
                      type="primary"
                      size="small"
                      icon={<Save size={12} />}
                      loading={saving}
                      onClick={handleSaveChanges}
                      style={{ background: '#52c41a', borderColor: '#52c41a' }}
                    >
                      Lưu thay đổi
                    </Button>
                  </Space>
                </div>
              )}

              {/* Stop List Header & Add Store Selector */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', background: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Title level={5} style={{ margin: 0, fontSize: 14 }}>
                    Thứ tự điểm dừng ({draftStops.length})
                  </Title>
                  {!hasUnsavedChanges && canWriteRoute && (
                    <Button
                      type="primary"
                      size="small"
                      icon={<Save size={12} />}
                      disabled
                      style={{ background: '#f5f5f5', borderColor: '#d9d9d9', color: '#bfbfbf' }}
                    >
                      Đã lưu
                    </Button>
                  )}
                </div>

                {/* Add Store Dropdown */}
                {canWriteRoute && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%', minWidth: 0 }}>
                    <Select
                      showSearch
                      placeholder="Tìm cửa hàng để thêm..."
                      style={{ flex: 1, minWidth: 0 }}
                      value={selectedStoreToAdd}
                      onChange={(val) => setSelectedStoreToAdd(val)}
                      filterOption={(input, option) =>
                        (option?.searchValue ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={availableStoresForAdd.map((st) => ({
                        value: String(st.id),
                        searchValue: `${st.code} ${st.name} ${st.address}`,
                        label: (
                          <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            <span style={{ fontWeight: 600, color: '#1677ff', marginRight: 4 }}>[{st.code}]</span>
                            <span>{st.name}</span>
                          </div>
                        ),
                      }))}
                    />
                    <Button
                      type="primary"
                      icon={<Plus size={14} />}
                      disabled={!selectedStoreToAdd}
                      style={{ flexShrink: 0 }}
                      onClick={() => {
                        const found = availableStoresForAdd.find((st) => String(st.id) === selectedStoreToAdd);
                        if (found) handleAddStoreToDraft(found);
                      }}
                    >
                      Thêm
                    </Button>
                  </div>
                )}
              </div>

              {/* Scrollable Stop List with Drag & Drop */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
                {draftStops.length === 0 ? (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tuyến này chưa có điểm dừng nào." />
                ) : (
                  draftStops.map((stop, idx) => {
                    const isDragging = draggedIdx === idx;
                    const isDragOver = dragOverIdx === idx;
                    return (
                      <div
                        key={stop.id || stop.storeId}
                        draggable={canWriteRoute}
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDrop(e, idx)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          marginBottom: 8,
                          background: isDragging ? '#e6f4ff' : isDragOver ? '#bae0ff' : '#ffffff',
                          border: isDragOver ? '2px dashed #1677ff' : '1px solid #e8e8e8',
                          borderRadius: 6,
                          boxShadow: isDragging ? '0 4px 12px rgba(22, 119, 255, 0.25)' : '0 1px 2px rgba(0,0,0,0.02)',
                          opacity: isDragging ? 0.6 : 1,
                          cursor: canWriteRoute ? 'grab' : 'default',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                          {canWriteRoute && (
                            <GripVertical size={16} style={{ color: '#bfbfbf', cursor: 'grab', flexShrink: 0 }} />
                          )}
                          <span
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              background: '#1677ff',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {idx + 1}
                          </span>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#262626', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              <span style={{ color: '#1677ff', marginRight: 4 }}>[{stop.storeCode}]</span>
                              {stop.storeName}
                            </div>
                            <div style={{ fontSize: 11, color: '#8c8c8c', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {stop.address}
                            </div>
                          </div>
                        </div>

                        {/* Stop Control: Delete */}
                        {canWriteRoute && (
                          <Space size={2} style={{ flexShrink: 0, marginLeft: 8 }}>
                            <Popconfirm
                              title="Xóa điểm dừng"
                              description={`Xóa ${stop.storeName} khỏi tuyến này?`}
                              onConfirm={() => handleRemoveDraftStop(String(stop.id || stop.storeId))}
                              okText="Xóa"
                              cancelText="Hủy"
                            >
                              <Button type="text" danger size="small" icon={<Trash2 size={14} />} title="Xóa khỏi tuyến" />
                            </Popconfirm>
                          </Space>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT MAIN PANEL: Interactive Leaflet RouteMapEditor */}
            <div
              style={{
                flex: 1,
                background: '#ffffff',
                borderRadius: 8,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                overflow: 'hidden',
                border: '1px solid #f0f0f0',
              }}
            >
              <RouteMapEditor
                stores={allStores}
                activeRoute={activeRoute}
                routes={allRoutes.length > 0 ? allRoutes : routes}
                stops={draftStops}
                onAddStoreToRoute={handleAddStoreToDraft}
                onRemoveStop={handleRemoveDraftStop}
                height="100%"
              />
            </div>
          </div>
        )}

        {/* ── MODE 2: CLASSIC TABLE VIEW ────────────────────────────────────── */}
        {viewMode === 'TABLE' && (
          <Card bordered={false} style={{ boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <Space size="middle" wrap style={{ flex: 1 }}>
                <Input
                  placeholder="Tìm theo mã hoặc tên tuyến..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  prefix={<Search size={16} style={{ color: '#bfbfbf' }} />}
                  style={{ width: 280, borderRadius: 6 }}
                  allowClear
                />
                <Select
                  placeholder="Trạng thái"
                  value={status}
                  onChange={(val) => {
                    setStatus(val);
                    setPage(0);
                  }}
                  style={{ width: 180 }}
                  options={[
                    { value: 'ALL', label: 'Tất cả trạng thái' },
                    { value: 'ACTIVE', label: 'Đang hoạt động' },
                    { value: 'INACTIVE', label: 'Không kích hoạt' },
                  ]}
                />
              </Space>

              <Space size="small">
                <Button icon={<RefreshCw size={14} />} onClick={() => fetchRoutes()}>
                  Tải lại
                </Button>
                {canWriteRoute && (
                  <Button type="primary" icon={<Plus size={14} />} onClick={() => navigate('/admin/routes/new')}>
                    Tạo tuyến
                  </Button>
                )}
              </Space>
            </div>

            <Table
              columns={columns}
              dataSource={routes}
              rowKey="id"
              loading={loading}
              scroll={{ x: 'max-content' }}
              pagination={{
                current: page + 1,
                pageSize: size,
                total: pageMeta.totalElements,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                onChange: (p, s) => {
                  setPage(p - 1);
                  if (s) setSize(s);
                },
                showTotal: (total) => `Tổng cộng ${total} tuyến`,
                position: ['bottomRight'],
              }}
              locale={{
                emptyText: (
                  <Empty description="Không tìm thấy tuyến phù hợp" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                    <Button onClick={handleResetFilters}>Xoá bộ lọc</Button>
                  </Empty>
                ),
              }}
            />
          </Card>
        )}
      </div>

      {/* Confirmation Modals */}
      <ActivateRouteModal
        visible={activateVisible}
        routeCode={actionRoute?.code || ''}
        loading={modalLoading}
        onCancel={() => {
          setActivateVisible(false);
          setActionRoute(null);
        }}
        onConfirm={handleConfirmActivate}
      />

      <DeactivateRouteModal
        visible={deactivateVisible}
        routeCode={actionRoute?.code || ''}
        loading={modalLoading}
        onCancel={() => {
          setDeactivateVisible(false);
          setActionRoute(null);
        }}
        onConfirm={handleConfirmDeactivate}
      />

      {/* Edit Route Info Modal */}
      <Modal
        title={`Chỉnh sửa thông tin tuyến [${editRoute?.code || ''}]`}
        open={editModalVisible}
        onCancel={() => {
          setEditModalVisible(false);
          setEditRoute(null);
        }}
        onOk={handleConfirmEditRoute}
        confirmLoading={editSaving}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        destroyOnClose
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 12 }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
              Tên tuyến <span style={{ color: '#ff4d4f' }}>*</span>
            </label>
            <Input
              placeholder="Nhập tên tuyến..."
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>
              Mô tả tuyến
            </label>
            <Input.TextArea
              rows={3}
              placeholder="Nhập mô tả khu vực giao hàng..."
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </AdminShell>
  );
};

export default RouteListPage;
