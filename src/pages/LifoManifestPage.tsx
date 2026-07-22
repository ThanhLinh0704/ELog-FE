import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Flex,
  message,
  Modal,
  Result,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { ArrowLeft, RefreshCcw, Truck } from 'lucide-react';
import AdminShell from '../components/AdminShell';
import {
  generateLoadingManifest,
  getLoadingManifest,
  getLoadingManifestApiErrorMessage,
  getLoadingManifestApiStatus,
  getManifestStops,
  type LoadingManifest,
  type LoadingManifestStop,
} from '../api/loadingManifestApi';
import ManifestSummary from '../components/manifest/ManifestSummary';
import FlatManifestView from '../components/manifest/FlatManifestView';
import ByStopManifestView from '../components/manifest/ByStopManifestView';
import { usePermissions } from '../hooks/usePermissions';
import { PERMISSIONS } from '../constants/permissions';

const { Title } = Typography;

const readRoles = (): string[] => {
  try {
    const rawRoles = localStorage.getItem('roles');
    const roles = rawRoles ? JSON.parse(rawRoles) : [];
    return Array.isArray(roles) ? roles.filter((role): role is string => typeof role === 'string') : [];
  } catch {
    return [];
  }
};

const getCurrentUser = () => {
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';
  return {
    id: Number(userId),
    username,
    fullName: username,
    roles: readRoles(),
  };
};

const isManifestNotFound = (error: unknown): boolean => {
  const status = getLoadingManifestApiStatus(error);
  const messageText = getLoadingManifestApiErrorMessage(error, '');
  return status === 404 || messageText.includes('MANIFEST_NOT_FOUND') || messageText.includes('Manifest not found');
};

const LifoManifestPage = () => {
  const navigate = useNavigate();
  const params = useParams();
  const tripDraftId = params.tripDraftId ?? params.tripId ?? '';
  const currentUser = useMemo(getCurrentUser, []);
  const { can } = usePermissions();
  const canView = can(PERMISSIONS.TRIP_READ);
  const canGenerate = can(PERMISSIONS.TRIP_COORDINATE);

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else if (params.tripDraftId) {
      navigate('/dispatcher/trip-drafts');
    } else {
      navigate('/dispatcher/monitoring');
    }
  };

  const [manifest, setManifest] = useState<LoadingManifest | null>(null);
  const [stops, setStops] = useState<LoadingManifestStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [notGenerated, setNotGenerated] = useState(false);

  const loadManifest = useCallback(async () => {
    if (!tripDraftId) {
      setError('Thiếu mã bản nháp chuyến trên đường dẫn.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setNotGenerated(false);

    try {
      const nextManifest = await getLoadingManifest(tripDraftId);
      setManifest(nextManifest);
      try {
        const nextStops = await getManifestStops(tripDraftId);
        setStops(nextStops);
      } catch {
        setStops(nextManifest.stops ?? []);
      }
    } catch (err) {
      if (isManifestNotFound(err)) {
        setManifest(null);
        setStops([]);
        setNotGenerated(true);
      } else {
        setError(getLoadingManifestApiErrorMessage(err, 'Không thể tải bảng xếp hàng.'));
      }
    } finally {
      setLoading(false);
    }
  }, [tripDraftId]);

  useEffect(() => {
    void loadManifest();
  }, [loadManifest]);

  const handleGenerate = () => {
    if (!canGenerate) {
      message.warning('Bạn không có quyền tạo bảng xếp hàng.');
      return;
    }

    Modal.confirm({
      title: 'Tạo bảng hướng dẫn xếp hàng?',
      content: 'Hệ thống sẽ sắp xếp hàng theo thứ tự giao ngược lại: điểm giao cuối xếp lên xe trước, điểm giao đầu xếp lên xe sau cùng.',
      okText: 'Tạo bảng xếp hàng',
      cancelText: 'Hủy',
      onOk: async () => {
        setActionLoading(true);
        try {
          const generated = await generateLoadingManifest(tripDraftId, { generationMode: 'LIFO' });
          setManifest(generated);
          message.success('Đã tạo bảng xếp hàng thành công.');
          await loadManifest();
        } catch (err) {
          message.error(getLoadingManifestApiErrorMessage(err, 'Không thể tạo bảng xếp hàng.'));
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const statusTag = manifest ? <Tag color="processing">Đã tạo bảng xếp hàng</Tag> : <Tag>Chưa tạo</Tag>;

  const renderContent = () => {
    if (loading) {
      return (
        <Card variant="borderless">
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      );
    }

    if (!canView) {
      return (
        <Result
          status="403"
          title="Bạn không có quyền xem bảng xếp hàng"
          subTitle="Chỉ nhân viên điều phối, kho hoặc quản lý logistics được xem màn hình này."
        />
      );
    }

    if (error) {
      return (
        <Alert
          type="error"
          showIcon
          message="Không thể tải bảng xếp hàng"
          description={error}
          action={<Button onClick={loadManifest}>Tải lại</Button>}
        />
      );
    }

    if (notGenerated || !manifest) {
      return (
        <Result
          status="info"
          title="Chưa có bảng hướng dẫn xếp hàng"
          subTitle="Hãy tạo bảng xếp hàng để kho biết kiện nào cần đưa lên xe trước và kiện nào nằm gần cửa xe."
          extra={
            canGenerate ? (
              <Button
                type="primary"
                icon={<Truck size={16} />}
                loading={actionLoading}
                onClick={handleGenerate}
              >
                Tạo bảng xếp hàng
              </Button>
            ) : null
          }
        />
      );
    }

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message="Cách đọc màn hình này"
          description="Hàng giao ở điểm cuối tuyến sẽ được xếp lên xe trước và nằm sâu trong khoang xe. Hàng giao ở điểm đầu tuyến sẽ xếp sau cùng, nằm gần cửa xe để dỡ xuống trước."
        />
        <ManifestSummary manifest={manifest} />
        <Tabs
          items={[
            {
              key: 'flat',
              label: 'Danh sách xếp hàng',
              children: <FlatManifestView items={manifest.lines} loading={loading} />,
            },
            {
              key: 'by-stop',
              label: 'Theo điểm giao',
              children: <ByStopManifestView stops={stops} loading={loading} />,
            },
          ]}
        />
      </Space>
    );
  };

  return (
    <AdminShell currentUser={currentUser}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Flex justify="space-between" align="center" gap={16} wrap style={{ marginBottom: 16 }}>
          <Space direction="vertical" size={8}>
            <Breadcrumb
              items={[
                { title: 'Dashboard', href: '/dashboard' },
                { title: params.tripDraftId ? 'Quản lý gom đơn' : 'Theo dõi chuyến hàng', href: params.tripDraftId ? '/dispatcher/trip-drafts' : '/dispatcher/monitoring' },
                { title: 'Hướng dẫn xếp hàng' },
              ]}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button
                type="text"
                icon={<ArrowLeft size={18} />}
                onClick={handleBack}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  backgroundColor: '#f5f5f5',
                  border: 'none',
                  padding: 0
                }}
              />
              <Space align="center" wrap>
                <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
                  Hướng dẫn xếp hàng lên xe
                </Title>
                {statusTag}
              </Space>
            </div>
          </Space>

          <Space wrap>
            {canGenerate && !manifest ? (
              <Button
                type="primary"
                icon={<Truck size={16} />}
                loading={actionLoading}
                onClick={handleGenerate}
              >
                Tạo bảng xếp hàng
              </Button>
            ) : null}
            <Button icon={<RefreshCcw size={16} />} onClick={loadManifest} loading={loading}>
              Tải lại
            </Button>
          </Space>
        </Flex>

        {renderContent()}
      </Space>
    </AdminShell>
  );
};

export default LifoManifestPage;
