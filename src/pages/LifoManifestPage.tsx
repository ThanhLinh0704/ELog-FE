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
import { ArrowLeft, RefreshCcw, RotateCw, Truck } from 'lucide-react';
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

const { Title, Paragraph, Text } = Typography;

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
  const canGenerate = currentUser.roles.includes('DISPATCHER');
  const canView = currentUser.roles.some((role) =>
    ['DISPATCHER', 'WAREHOUSE_STAFF', 'LOGISTICS_MANAGER'].includes(role)
  );

  const [manifest, setManifest] = useState<LoadingManifest | null>(null);
  const [stops, setStops] = useState<LoadingManifestStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [notGenerated, setNotGenerated] = useState(false);

  const loadManifest = useCallback(async () => {
    if (!tripDraftId) {
      setError('Missing tripDraftId in route.');
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
        setError(getLoadingManifestApiErrorMessage(err, 'Khong the tai Loading Manifest.'));
      }
    } finally {
      setLoading(false);
    }
  }, [tripDraftId]);

  useEffect(() => {
    void loadManifest();
  }, [loadManifest]);

  const handleGenerate = () => {
    Modal.confirm({
      title: 'Tao LIFO Manifest?',
      content: 'He thong se tao thu tu xep hang theo nguyen tac LIFO cho Trip Draft nay.',
      okText: 'Tao Manifest',
      cancelText: 'Huy',
      onOk: async () => {
        setActionLoading(true);
        try {
          const generated = await generateLoadingManifest(tripDraftId, { generationMode: 'LIFO' });
          setManifest(generated);
          message.success('LIFO manifest generated successfully.');
          await loadManifest();
        } catch (err) {
          message.error(getLoadingManifestApiErrorMessage(err, 'Khong the tao Loading Manifest.'));
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const statusTag = manifest ? <Tag color="processing">{manifest.status ?? 'GENERATED'}</Tag> : <Tag>NOT_GENERATED</Tag>;

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
          title="Khong co quyen xem Loading Manifest"
          subTitle="Permission Matrix US-13 chi cho DISPATCHER, WAREHOUSE_STAFF va LOGISTICS_MANAGER xem manifest."
        />
      );
    }

    if (error) {
      return (
        <Alert
          type="error"
          showIcon
          message="Khong the tai Loading Manifest"
          description={error}
          action={<Button onClick={loadManifest}>Tai lai</Button>}
        />
      );
    }

    if (notGenerated || !manifest) {
      return (
        <Result
          status="info"
          title="Chua co Loading Manifest"
          subTitle="Trip Draft nay chua duoc tao LIFO Loading Manifest theo API Contract US-13."
          extra={
            canGenerate ? (
              <Button
                type="primary"
                icon={<Truck size={16} />}
                loading={actionLoading}
                onClick={handleGenerate}
              >
                Tao LIFO Manifest
              </Button>
            ) : null
          }
        />
      );
    }

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <ManifestSummary manifest={manifest} />
        <Tabs
          items={[
            {
              key: 'flat',
              label: 'Flat LIFO List',
              children: <FlatManifestView items={manifest.lines} loading={loading} />,
            },
            {
              key: 'by-stop',
              label: 'By-Stop View',
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
        <Flex justify="space-between" align="flex-start" gap={16} wrap>
          <Space direction="vertical" size={4}>
            <Breadcrumb
              items={[
                { title: 'Dashboard' },
                { title: 'Trip Management' },
                { title: 'LIFO Loading Manifest' },
              ]}
            />
            <Space align="center" wrap>
              <Title level={2} style={{ margin: 0 }}>
                LIFO Loading Manifest
              </Title>
              {statusTag}
            </Space>
            <Paragraph type="secondary" style={{ margin: 0 }}>
              Review and execute the loading order based on reverse delivery-stop sequence.
            </Paragraph>
            <Text type="secondary">API Contract: US-13 uses Trip Draft ID {tripDraftId || '-'}</Text>
          </Space>

          <Space wrap>
            {canGenerate && !manifest ? (
              <Button
                type="primary"
                icon={<Truck size={16} />}
                loading={actionLoading}
                onClick={handleGenerate}
              >
                Tao LIFO Manifest
              </Button>
            ) : null}
            <Button icon={<RefreshCcw size={16} />} onClick={loadManifest} loading={loading}>
              Tai lai
            </Button>
            <Button icon={<RotateCw size={16} />} disabled>
              Tao lai Manifest
            </Button>
            <Button disabled>Xac nhan Manifest</Button>
            <Button icon={<ArrowLeft size={16} />} onClick={() => navigate('/dashboard')}>
              Quay lai Trip Detail
            </Button>
          </Space>
        </Flex>

        <Alert
          type="info"
          showIcon
          message="Endpoint contract dang dung"
          description="US-13 khai bao POST /api/trip-drafts/{id}/generate-manifest, GET /api/trip-drafts/{id}/manifest va GET /api/trip-drafts/{id}/manifest/by-stop. Regenerate/Confirm chua co trong contract nen UI khong goi endpoint that."
        />

        {renderContent()}
      </Space>
    </AdminShell>
  );
};

export default LifoManifestPage;
