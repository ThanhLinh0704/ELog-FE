import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Col,
  Empty,
  Modal,
  Popconfirm,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  ArrowLeft,
  CheckCircle2,
  MapPinned,
  Navigation,
  RefreshCw,
} from 'lucide-react';
import AdminShell from '../components/AdminShell';
import {
  confirmTripDraft,
  getApiErrorMessage,
  getTripDraft,
  getTripDraftApiStatus,
  recalculateEta,
  updateStopStatus,
  type TripDraftDetail,
  type TripDraftStop,
  type TripDraftStopStatus,
} from '../api/tripDraftApi';

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

function formatNumber(value?: number | null, fractionDigits = 0) {
  return Number(value || 0).toLocaleString('vi-VN', {
    maximumFractionDigits: fractionDigits,
  });
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function hasGps(stop: TripDraftStop) {
  return stop.latitude !== null && stop.longitude !== null;
}

function mergeRecalculatedDraft(
  draft: TripDraftDetail,
  recalculated: Pick<TripDraftDetail, 'estimatedDistanceKm' | 'estimatedDurationMin' | 'stops'>
): TripDraftDetail {
  const recalculatedStops = new Map(recalculated.stops.map((stop) => [stop.id, stop]));

  return {
    ...draft,
    estimatedDistanceKm: recalculated.estimatedDistanceKm,
    estimatedDurationMin: recalculated.estimatedDurationMin,
    stops: draft.stops
      .map((stop) => ({
        ...stop,
        ...recalculatedStops.get(stop.id),
      }))
      .sort((a, b) => a.sequenceNo - b.sequenceNo),
  };
}

const TripDraftReviewPage: React.FC = () => {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [draft, setDraft] = useState<TripDraftDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbiddenMessage, setForbiddenMessage] = useState('');
  const [toggleStopId, setToggleStopId] = useState<number | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [modal, contextHolder] = Modal.useModal();

  const activeStops = useMemo(
    () => draft?.stops.filter((stop) => stop.status === 'ACTIVE') ?? [],
    [draft]
  );
  const isDraftEditable = draft?.status === 'DRAFT';
  const actionDisabled = !isDraftEditable || recalculating || confirming;

  async function fetchDraft() {
    if (!draftId) return;

    setLoading(true);
    setError('');
    setForbiddenMessage('');

    try {
      const result = await getTripDraft(draftId);
      setDraft(result);
    } catch (err) {
      if (getTripDraftApiStatus(err) === 403) {
        setForbiddenMessage(
          getApiErrorMessage(
            err,
            'You do not have permission to review trip drafts with the current account.'
          )
        );
      } else {
        setError(getApiErrorMessage(err, 'Unable to load trip draft.'));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDraft();
  }, [draftId]);

  async function runRecalculate(currentDraft = draft) {
    if (!draftId || !currentDraft) return;

    setRecalculating(true);

    try {
      const result = await recalculateEta(draftId, {
        startTime: new Date().toISOString(),
      });
      setDraft((previous) => (previous ? mergeRecalculatedDraft(previous, result) : previous));
      message.success('ETA recalculated successfully.');
    } catch (err) {
      const apiMessage = getApiErrorMessage(err, 'Unable to recalculate ETA.');
      if (getTripDraftApiStatus(err) === 409) {
        message.warning(apiMessage);
      } else {
        message.error(apiMessage);
      }
    } finally {
      setRecalculating(false);
    }
  }

  async function handleToggleStop(stop: TripDraftStop) {
    if (!draftId || !draft) return;

    const nextStatus: TripDraftStopStatus = stop.status === 'ACTIVE' ? 'SKIPPED' : 'ACTIVE';
    setToggleStopId(stop.id);

    try {
      const updatedStop = await updateStopStatus(draftId, stop.id, nextStatus);
      const nextDraft = {
        ...draft,
        stops: draft.stops.map((item) =>
          item.id === stop.id ? { ...item, status: updatedStop.status } : item
        ),
      };
      setDraft(nextDraft);
      await runRecalculate(nextDraft);
    } catch (err) {
      const apiMessage = getApiErrorMessage(err, 'Unable to update stop status.');
      if (getTripDraftApiStatus(err) === 409) {
        message.warning(apiMessage);
      } else {
        message.error(apiMessage);
      }
    } finally {
      setToggleStopId(null);
    }
  }

  function handleConfirm() {
    if (!draftId || !draft) return;

    modal.confirm({
      title: 'Confirm Trip Draft?',
      content: 'This will convert the reviewed draft into a planned trip.',
      okText: 'Confirm',
      cancelText: 'Cancel',
      icon: <CheckCircle2 size={20} color="#1677ff" />,
      onOk: async () => {
        setConfirming(true);

        try {
          const result = await confirmTripDraft(draftId, {
            confirmNote: 'Reviewed and confirmed by dispatcher',
          });
          message.success('Trip draft confirmed successfully.');
          navigate(`/trips/${result.tripId}`);
        } catch (err) {
          const apiMessage = getApiErrorMessage(err, 'Unable to confirm trip draft.');
          if (getTripDraftApiStatus(err) === 409) {
            message.warning(apiMessage);
          } else {
            message.error(apiMessage);
          }
        } finally {
          setConfirming(false);
        }
      },
    });
  }

  const columns: ColumnsType<TripDraftStop> = [
    {
      title: 'Sequence',
      dataIndex: 'sequenceNo',
      key: 'sequenceNo',
      width: 100,
      sorter: (a, b) => a.sequenceNo - b.sequenceNo,
      render: (value: number) => <Typography.Text strong>#{value}</Typography.Text>,
    },
    {
      title: 'Store',
      key: 'store',
      width: 240,
      render: (_value, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.storeName || '-'}</Typography.Text>
          <Typography.Text type="secondary">{record.storeCode || '-'}</Typography.Text>
        </Space>
      ),
    },
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
      width: 280,
      render: (value: string) => value || '-',
    },
    {
      title: 'Orders',
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: 100,
      align: 'right',
    },
    {
      title: 'Weight / Volume',
      key: 'capacity',
      width: 170,
      render: (_value, record) => (
        <Space direction="vertical" size={0}>
          <span>{formatNumber(record.weightKg)} kg</span>
          <Typography.Text type="secondary">
            {formatNumber(record.volumeM3, 2)} m3
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: 'GPS',
      key: 'gps',
      width: 120,
      render: (_value, record) =>
        hasGps(record) ? (
          <Tooltip title={`${record.latitude}, ${record.longitude}`}>
            <Tag color="blue">Ready</Tag>
          </Tooltip>
        ) : (
          <Tag color="orange">Missing GPS</Tag>
        ),
    },
    {
      title: 'ETA',
      key: 'eta',
      width: 190,
      render: (_value, record) =>
        record.status === 'SKIPPED' ? (
          <Typography.Text type="secondary">Not included</Typography.Text>
        ) : (
          <Space direction="vertical" size={0}>
            <Typography.Text>{formatDateTime(record.eta)}</Typography.Text>
            <Typography.Text type="secondary">
              {record.estimatedTravelMin ?? 0} min, {formatNumber(record.estimatedDistanceKm, 1)} km
            </Typography.Text>
          </Space>
        ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_value, record) =>
        record.status === 'ACTIVE' ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag color="default">Skipped</Tag>
        ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 140,
      fixed: 'right',
      render: (_value, record) => {
        const isActive = record.status === 'ACTIVE';
        const label = isActive ? 'Skip' : 'Activate';

        return (
          <Popconfirm
            title={`${label} this stop?`}
            description="The route and ETA will be recalculated after this change."
            okText={label}
            cancelText="Cancel"
            onConfirm={() => handleToggleStop(record)}
            disabled={actionDisabled}
          >
            <Button
              danger={isActive}
              loading={toggleStopId === record.id}
              disabled={actionDisabled}
              type={isActive ? 'default' : 'primary'}
            >
              {label}
            </Button>
          </Popconfirm>
        );
      },
    },
  ];

  return (
    <AdminShell currentUser={currentUser}>
      {contextHolder}
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Breadcrumb
            items={[
              { title: 'Admin' },
              { title: 'Trip Draft Review' },
            ]}
          />
          <Typography.Title level={2} style={{ margin: '8px 0 0 0' }}>
            Review Trip Draft
          </Typography.Title>
          <Typography.Text type="secondary">
            Review active/skipped stops and ETA before confirming planned trip.
          </Typography.Text>
        </div>

        {forbiddenMessage ? (
          <Alert
            type="warning"
            showIcon
            message="Access denied"
            description={
              <Space direction="vertical" size={4}>
                <span>{forbiddenMessage}</span>
                <span>
                  Current roles:{' '}
                  {currentUser.roles.length > 0 ? currentUser.roles.join(', ') : 'No role found'}
                </span>
                <span>
                  Please sign in with an account allowed by the backend for trip draft review,
                  usually DISPATCHER or LOGISTICS_MANAGER.
                </span>
              </Space>
            }
          />
        ) : null}

        {error ? <Alert type="error" showIcon message={error} /> : null}

        {draft && draft.status !== 'DRAFT' ? (
          <Alert
            type="warning"
            showIcon
            message={`This draft is ${draft.status}. Toggle and confirm actions are disabled.`}
          />
        ) : null}

        <Spin spinning={loading}>
          {draft ? (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic title="Draft Code" value={draft.draftCode || draft.id} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic
                      title="Vehicle"
                      value={draft.vehicle?.plateNumber || '-'}
                      suffix={draft.vehicle?.vehicleType ? ` / ${draft.vehicle.vehicleType}` : ''}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic title="Total Active Stops" value={activeStops.length} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic title="Total Orders" value={draft.totalOrders} />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic
                      title="Total Weight"
                      value={draft.totalWeightKg}
                      suffix="kg"
                      formatter={(value) => formatNumber(Number(value))}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic
                      title="Total Volume"
                      value={draft.totalVolumeM3}
                      suffix="m3"
                      precision={2}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic
                      title="Estimated Distance"
                      value={draft.estimatedDistanceKm}
                      suffix="km"
                      precision={1}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <Card size="small" bordered={false}>
                    <Statistic
                      title="Estimated Duration"
                      value={draft.estimatedDurationMin}
                      suffix="min"
                    />
                  </Card>
                </Col>
              </Row>

              <Card
                bordered={false}
                title={
                  <Space>
                    <MapPinned size={18} />
                    <span>Stops</span>
                  </Space>
                }
                extra={
                  <Space wrap>
                    <Tag color="green">{activeStops.length} active</Tag>
                    <Tag color="default">
                      {draft.stops.length - activeStops.length} skipped
                    </Tag>
                  </Space>
                }
              >
                <Table
                  columns={columns}
                  dataSource={draft.stops}
                  rowKey="id"
                  loading={recalculating}
                  scroll={{ x: 1420 }}
                  pagination={false}
                  onRow={(record) => ({
                    style:
                      record.status === 'SKIPPED'
                        ? { opacity: 0.62, backgroundColor: '#fafafa' }
                        : undefined,
                  })}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="No stops available"
                      />
                    ),
                  }}
                />
              </Card>

              <Card bordered={false}>
                <Row justify="space-between" gutter={[12, 12]}>
                  <Col>
                    <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
                      Back
                    </Button>
                  </Col>
                  <Col>
                    <Space wrap>
                      <Button
                        icon={<RefreshCw size={16} />}
                        loading={recalculating}
                        disabled={!isDraftEditable || confirming}
                        onClick={() => runRecalculate()}
                      >
                        Recalculate ETA
                      </Button>
                      <Button
                        type="primary"
                        icon={<Navigation size={16} />}
                        loading={confirming}
                        disabled={
                          loading ||
                          !isDraftEditable ||
                          activeStops.length === 0 ||
                          recalculating
                        }
                        onClick={handleConfirm}
                      >
                        Confirm Trip Draft
                      </Button>
                    </Space>
                  </Col>
                </Row>
              </Card>
            </Space>
          ) : !loading ? (
            <Card bordered={false}>
              <Empty description="Trip draft not found" />
            </Card>
          ) : null}
        </Spin>
      </Space>
    </AdminShell>
  );
};

export default TripDraftReviewPage;
