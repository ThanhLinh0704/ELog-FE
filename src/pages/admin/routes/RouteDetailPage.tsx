import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  Card, Row, Col, Space, Button, Breadcrumb, Alert, Tooltip, Empty, Spin, message, Typography, Result
} from 'antd';
import { ArrowLeft, Edit3, Lock, Unlock, Plus } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import AdminShell from '../../../components/AdminShell';
import StatusBadge from '../../../components/StatusBadge';
import type { DeliveryRoute, RouteStop, StoreSearchResult } from '../../../types/route';
import { routeApi } from '../../../api/routeApi';
import { USE_MOCK_API } from '../../../config';
import { deleteStopMock } from '../../../mocks/routeService';
import { getActivateButtonState, countMissingCoordinates, renumberStops } from '../../../utils/routeCalculations';
import dayjs from 'dayjs';
import SortableStopItem from './components/SortableStopItem';
import AddStoreDrawer from './components/AddStoreDrawer';
import ActivateRouteModal from './components/ActivateRouteModal';
import DeactivateRouteModal from './components/DeactivateRouteModal';
import DeleteStopModal from './components/DeleteStopModal';
import { usePermissions } from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../constants/permissions';

const { Paragraph, Text } = Typography;

const RouteDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { routeId } = useParams<{ routeId: string }>();

  // Retrieve current user roles from localStorage
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';
  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) {
      roles = JSON.parse(rolesStr);
    }
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

  // State definitions
  const [route, setRoute] = useState<DeliveryRoute | null>(null);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isReordering, setIsReordering] = useState(false);

  // Drawer & Modals state
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [activateVisible, setActivateVisible] = useState(false);
  const [deactivateVisible, setDeactivateVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [actionStop, setActionStop] = useState<RouteStop | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchRouteDetail = async () => {
    if (!routeId) return;
    setLoading(true);
    setLoadError('');
    try {
      const routeData = await routeApi.getRouteById(routeId);
      const stopsData = await routeApi.getRouteStops(routeId);
      setRoute(routeData);
      setStops(stopsData);
    } catch (err: any) {
      setLoadError(err.message === '404' ? 'Không tìm thấy tuyến đường yêu cầu.' : 'Không thể tải dữ liệu tuyến đường.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRouteDetail();
  }, [routeId]);

  // Handler for activating the route
  const handleActivate = async () => {
    if (!route || !routeId || !canWriteRoute) return;
    setActionLoading(true);
    try {
      const updated = await routeApi.updateStatus(routeId, 'ACTIVE');
      setRoute(updated);
      message.success('Tuyến đã được kích hoạt');
      setActivateVisible(false);
    } catch (err: any) {
      message.error(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handler for deactivating the route
  const handleDeactivate = async () => {
    if (!route || !routeId || !canWriteRoute) return;
    setActionLoading(true);
    try {
      const updated = await routeApi.updateStatus(routeId, 'INACTIVE');
      setRoute(updated);
      message.success('Tuyến đã được vô hiệu hoá');
      setDeactivateVisible(false);
    } catch (err: any) {
      message.error(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handler for drag end stop reordering
  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id || !routeId || !route || !canWriteRoute) return;

    const previousStops = [...stops];

    const oldIndex = stops.findIndex((stop) => stop.id === active.id);
    const newIndex = stops.findIndex((stop) => stop.id === over.id);

    const reordered = renumberStops(arrayMove(stops, oldIndex, newIndex));

    setStops(reordered);
    setIsReordering(true);

    try {
      const saved = await routeApi.reorderStops(routeId, reordered);
      setStops(saved);
      // Update stop counts and warning stats locally as well
      const newWarningCount = countMissingCoordinates(saved);
      setRoute((prev) => prev ? {
        ...prev,
        stopCount: saved.length,
        coordinatesWarningCount: newWarningCount
      } : null);
    } catch (e) {
      setStops(previousStops);
      message.error('Không thể lưu thứ tự mới. Vui lòng thử lại.');
    } finally {
      setIsReordering(false);
    }
  };

  // Handler for adding stop
  const handleAddStore = async (store: StoreSearchResult) => {
    if (!routeId || !route || !canWriteRoute) return;
    try {
      const newStop = await routeApi.addStop(routeId, store);
      const newStops = [...stops, newStop];
      setStops(newStops);
      
      const newWarningCount = countMissingCoordinates(newStops);
      setRoute((prev) => prev ? {
        ...prev,
        stopCount: newStops.length,
        coordinatesWarningCount: newWarningCount
      } : null);
      
      message.success(`Đã thêm cửa hàng "${store.name}" vào tuyến`);
    } catch (e) {
      message.error('Không thể thêm cửa hàng vào tuyến.');
      throw e;
    }
  };

  // Trigger delete stop dialog
  const handleOpenDelete = (stop: RouteStop) => {
    if (!canWriteRoute) {
      return;
    }

    setActionStop(stop);
    setDeleteVisible(true);
  };

  // Confirm delete stop
  const handleDeleteStop = async () => {
    if (!actionStop || !route || !routeId || !canWriteRoute) return;
    setActionLoading(true);
    try {
      let autoDeactivated = false;
      
      if (USE_MOCK_API) {
        const mockRes = await deleteStopMock(actionStop.id);
        autoDeactivated = mockRes.autoDeactivated;
      } else {
        await routeApi.removeStop(routeId, actionStop.id);
        const tempStops = stops.filter(s => s.id !== actionStop.id);
        if (route.status === 'ACTIVE' && tempStops.length < 2) {
          await routeApi.updateStatus(routeId, 'INACTIVE');
          autoDeactivated = true;
        }
      }
      
      const newStops = stops.filter(s => s.id !== actionStop.id);
      const renumbered = renumberStops(newStops);
      setStops(renumbered);

      const newWarningCount = countMissingCoordinates(renumbered);
      setRoute((prev) => prev ? {
        ...prev,
        stopCount: renumbered.length,
        coordinatesWarningCount: newWarningCount,
        status: autoDeactivated ? 'INACTIVE' : prev.status
      } : null);

      message.success('Đã xoá điểm dừng khỏi tuyến');
      
      if (autoDeactivated) {
        message.warning('Tuyến đã được chuyển về trạng thái chưa kích hoạt vì còn dưới 2 điểm dừng');
      } else if (renumbered.length === 1) {
        message.warning('Tuyến cần ít nhất 2 điểm dừng để hoạt động');
      }

      setDeleteVisible(false);
      setActionStop(null);
    } catch (err: any) {
      message.error(err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setActionLoading(false);
    }
  };

  // Scroll to first missing coordinate item
  const handleScrollToWarning = () => {
    const firstWarningEl = document.querySelector('.missing-gps-item');
    if (firstWarningEl) {
      firstWarningEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Temporary highlight
      firstWarningEl.classList.add('flash-warning');
      setTimeout(() => {
        firstWarningEl.classList.remove('flash-warning');
      }, 2000);
    } else {
      message.info('Không tìm thấy điểm dừng nào thiếu toạ độ.');
    }
  };

  // Render 404 page if loading fails
  if (loadError) {
    return (
      <AdminShell currentUser={currentUser}>
        <Result
          status="404"
          title="Không tìm thấy tuyến đường"
          subTitle={loadError}
          extra={
            <Button type="primary" onClick={() => navigate('/admin/routes')}>
              Quay lại danh sách tuyến
            </Button>
          }
        />
      </AdminShell>
    );
  }

  const activationState = route ? getActivateButtonState(route.stopCount) : { disabled: true };
  const coordinatesWarningCount = stops.filter(s => !s.hasCoordinates).length;

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Style tag for flashing/highlighting warning item */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes flashYellow {
            0% { box-shadow: 0 0 0 0px rgba(245, 158, 11, 0.4); border-color: #f59e0b; }
            50% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.4); border-color: #f59e0b; }
            100% { box-shadow: 0 0 0 0px rgba(245, 158, 11, 0); border-color: #fed7aa; }
          }
          .flash-warning {
            animation: flashYellow 1.5s ease-in-out infinite;
          }
        `}} />

        {/* Breadcrumb & Navigation */}
        <div>
          <Breadcrumb
            items={[
              { title: 'Admin' },
              { title: <Link to="/admin/routes">Quản lý tuyến</Link> },
              { title: route?.code || 'Chi tiết tuyến' }
            ]}
          />
          <h2 style={{ margin: '8px 0 0 0', fontSize: 24, fontWeight: 700, color: '#1f1f1f' }}>
            Chi tiết tuyến đường {route?.code}
          </h2>
        </div>

        {/* Back navigation */}
        <div>
          <Button
            type="text"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate('/admin/routes')}
            style={{ paddingLeft: 0, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            Quay lại danh sách tuyến
          </Button>
        </div>

        {/* Read-only Info Banner */}
        {!canWriteRoute && (
          <Alert
            message="Thông tin thông báo"
            description="ℹ️ Dữ liệu tuyến chỉ được chỉnh sửa bởi Quản trị viên hệ thống."
            type="info"
            showIcon
            style={{ borderRadius: 8 }}
          />
        )}

        {/* ETA Warning Banner if any stop lacks GPS */}
        {coordinatesWarningCount > 0 && (
          <Alert
            message={
              <span>
                ⚠️ {coordinatesWarningCount} điểm dừng trong tuyến này chưa có toạ độ GPS. ETA sẽ không chính xác cho các điểm dừng đó.{' '}
                <a onClick={handleScrollToWarning} style={{ fontWeight: 600, textDecoration: 'underline' }}>
                  [Xem danh sách]
                </a>
              </span>
            }
            type="warning"
            showIcon
            style={{ borderRadius: 8 }}
          />
        )}

        {loading ? (
          <Card bordered={false} style={{ textAlign: 'center', padding: '60px 0' }}>
            <Spin size="large" />
            <Paragraph style={{ marginTop: 16 }}>Đang tải dữ liệu tuyến đường...</Paragraph>
          </Card>
        ) : (
          <Row gutter={[24, 24]}>
            {/* Left Panel: Route metadata (35%) */}
            <Col xs={24} lg={8}>
              <Card
                title="Thông tin tuyến"
                bordered={false}
                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                extra={
                  canWriteRoute && (
                    <Tooltip title="Chỉnh sửa thông tin">
                      <Button
                        type="text"
                        icon={<Edit3 size={16} />}
                        onClick={() => navigate(`/admin/routes/${routeId}/edit`)}
                      />
                    </Tooltip>
                  )
                }
              >
                {route && (
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>MÃ TUYẾN</Text>
                      <Text strong style={{ fontSize: 16 }}>{route.code}</Text>
                    </div>

                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>TÊN TUYẾN</Text>
                      <Text strong style={{ fontSize: 15 }}>{route.name}</Text>
                    </div>

                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>TRẠNG THÁI</Text>
                      <div style={{ marginTop: 4 }}>
                        <StatusBadge color={route.status === 'ACTIVE' ? 'success' : 'default'}>
                          {route.status === 'ACTIVE' ? 'Đang hoạt động' : 'Chưa kích hoạt'}
                        </StatusBadge>
                      </div>
                    </div>

                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>SỐ ĐIỂM DỪNG</Text>
                      <Text strong style={{ fontSize: 15 }}>{stops.length} điểm dừng</Text>
                    </div>

                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>MÔ TẢ</Text>
                      <Paragraph style={{ margin: 0, color: '#475569', fontSize: 13.5 }}>
                        {route.description || <Text type="secondary">Chưa có mô tả</Text>}
                      </Paragraph>
                    </div>

                    <hr style={{ border: 0, borderTop: '1px solid #f1f5f9', margin: '8px 0' }} />

                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>NGÀY TẠO</Text>
                      <Text style={{ fontSize: 13 }}>{dayjs(route.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
                    </div>

                    <div>
                      <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>CẬP NHẬT LẦN CUỐI</Text>
                      <Text style={{ fontSize: 13 }}>{dayjs(route.updatedAt).format('DD/MM/YYYY HH:mm')}</Text>
                    </div>

                    {/* Admin Status Toggles */}
                    {canWriteRoute && (
                      <div style={{ marginTop: 12 }}>
                        {route.status === 'ACTIVE' ? (
                          <Button
                            danger
                            type="dashed"
                            icon={<Lock size={15} />}
                            onClick={() => setDeactivateVisible(true)}
                            style={{ width: '100%', borderRadius: 6 }}
                          >
                            Vô hiệu hoá tuyến
                          </Button>
                        ) : (
                          <Tooltip title={activationState.disabled ? activationState.tooltip : 'Kích hoạt hoạt động'}>
                            <Button
                              type="primary"
                              icon={<Unlock size={15} />}
                              disabled={activationState.disabled}
                              onClick={() => setActivateVisible(true)}
                              style={{ width: '100%', borderRadius: 6, backgroundColor: activationState.disabled ? undefined : '#22c55e', borderColor: activationState.disabled ? undefined : '#22c55e' }}
                            >
                              Kích hoạt tuyến
                            </Button>
                          </Tooltip>
                        )}
                      </div>
                    )}
                  </Space>
                )}
              </Card>
            </Col>

            {/* Right Panel: Sortable Stops List (65%) */}
            <Col xs={24} lg={16}>
              <Card
                title={
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>Danh sách điểm dừng</span>
                    <StatusBadge color="blue">{stops.length} điểm dừng</StatusBadge>
                  </Space>
                }
                bordered={false}
                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}
                extra={
                  canWriteRoute && (
                    <Button
                      type="primary"
                      icon={<Plus size={14} />}
                      onClick={() => setDrawerVisible(true)}
                      style={{ borderRadius: 6 }}
                    >
                      Thêm điểm dừng
                    </Button>
                  )
                }
              >
                {stops.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <Empty
                      description={
                        canWriteRoute ? (
                          <div>
                            <Text strong style={{ fontSize: 15, display: 'block' }}>Tuyến chưa có điểm dừng.</Text>
                            <Text type="secondary" style={{ fontSize: 13 }}>Hãy thêm ít nhất 2 điểm dừng để có thể kích hoạt tuyến.</Text>
                          </div>
                        ) : (
                          <Text strong style={{ fontSize: 15 }}>Tuyến chưa có điểm dừng.</Text>
                        )
                      }
                    >
                      {canWriteRoute && (
                        <Button type="primary" icon={<Plus size={14} />} onClick={() => setDrawerVisible(true)} style={{ borderRadius: 6 }}>
                          Thêm điểm dừng
                        </Button>
                      )}
                    </Empty>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    {/* Reordering Overlay Spinner */}
                    {isReordering && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(255, 255, 255, 0.6)',
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 8
                      }}>
                        <Spin size="medium" />
                        <Text style={{ marginTop: 8, fontWeight: 600, color: '#475569' }}>Đang lưu thứ tự mới...</Text>
                      </div>
                    )}

                    <div style={{ opacity: isReordering ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={stops.map((stop) => stop.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {stops.map((stop) => (
                            <SortableStopItem
                              key={stop.id}
                              stop={stop}
                              readOnly={!canWriteRoute}
                              onDelete={handleOpenDelete}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    </div>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        )}
      </div>

      {/* Drawer for searching/selecting store stop to add */}
      <AddStoreDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        onAddStore={handleAddStore}
      />

      {/* Confirmation Modals */}
      <ActivateRouteModal
        visible={activateVisible}
        routeCode={route?.code || ''}
        loading={actionLoading}
        onCancel={() => setActivateVisible(false)}
        onConfirm={handleActivate}
      />

      <DeactivateRouteModal
        visible={deactivateVisible}
        routeCode={route?.code || ''}
        loading={actionLoading}
        onCancel={() => setDeactivateVisible(false)}
        onConfirm={handleDeactivate}
      />

      <DeleteStopModal
        visible={deleteVisible}
        storeName={actionStop?.storeName || ''}
        loading={actionLoading}
        onCancel={() => {
          setDeleteVisible(false);
          setActionStop(null);
        }}
        onConfirm={handleDeleteStop}
      />
    </AdminShell>
  );
};

export default RouteDetailPage;
