import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Typography,
  Breadcrumb,
  Spin,
  Alert,
  Modal,
  Input,
  Space,
  Tooltip,
  Statistic,
  Row,
  Col,
  message,
  Empty,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { CheckCircle2, XCircle, Package, Truck, History } from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import StatusBadge, { type StatusBadgeColor } from '../../../components/StatusBadge';
import { getTripOutcomes, validateOutcome, amendOutcome } from '../../../api/tripOutcomeApi';
import { getTripOutcomeHistory } from '../../../api/tripOutcomeEventApi';
import type { TripOutcome } from '../../../types/tripOutcome';
import { OUTCOME_STATUS_LABEL } from '../../../types/tripOutcome';
import { TRIP_OUTCOME_EVENT_TYPE_LABEL, type TripOutcomeEvent } from '../../../types/tripOutcomeEvent';
import { REASON_CODE_LABELS } from '../../../types/driverTrip';

const { Title, Text } = Typography;
const { TextArea } = Input;

function getCurrentUser() {
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';
  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) roles = JSON.parse(rolesStr);
  } catch { /* ignore */ }
  return { id: Number(userId), username, fullName: username, roles };
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const TripOutcomePage: React.FC = () => {
  const currentUser = getCurrentUser();
  const [outcomes, setOutcomes] = useState<TripOutcome[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Validate modal
  const [validateTarget, setValidateTarget] = useState<TripOutcome | null>(null);
  const [validateLoading, setValidateLoading] = useState(false);

  // Amend modal
  const [amendTarget, setAmendTarget] = useState<TripOutcome | null>(null);
  const [amendReason, setAmendReason] = useState('');
  const [amendLoading, setAmendLoading] = useState(false);

  // History modal
  const [historyTarget, setHistoryTarget] = useState<TripOutcome | null>(null);
  const [historyEvents, setHistoryEvents] = useState<TripOutcomeEvent[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchOutcomes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTripOutcomes();
      setOutcomes(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message || 'Không thể tải danh sách nghiệm thu.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOutcomes(); }, [fetchOutcomes]);

  const handleOpenHistory = async (target: TripOutcome) => {
    setHistoryTarget(target);
    setHistoryLoading(true);
    setHistoryEvents([]);
    try {
      const result = await getTripOutcomeHistory(target.tripId);
      setHistoryEvents(result.items);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Không thể tải lịch sử sự kiện chuyến hàng.';
      message.error(msg);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!validateTarget) return;
    setValidateLoading(true);
    try {
      const updated = await validateOutcome(validateTarget.id);
      message.success(`Đã nghiệm thu chuyến ${updated.tripCode}.`);
      setValidateTarget(null);
      await fetchOutcomes();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message || 'Nghiệm thu thất bại.';
      message.error(msg);
    } finally {
      setValidateLoading(false);
    }
  };

  const handleAmend = async () => {
    if (!amendTarget || !amendReason.trim()) {
      message.warning('Vui lòng nhập lý do điều chỉnh.');
      return;
    }
    setAmendLoading(true);
    try {
      const updated = await amendOutcome(amendTarget.id, amendReason.trim());
      message.success(`Đã gửi yêu cầu điều chỉnh cho chuyến ${updated.tripCode}.`);
      setAmendTarget(null);
      setAmendReason('');
      await fetchOutcomes();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message || 'Gửi yêu cầu điều chỉnh thất bại.';
      message.error(msg);
    } finally {
      setAmendLoading(false);
    }
  };

  const columns = [
    {
      title: 'Mã chuyến',
      dataIndex: 'tripCode',
      key: 'tripCode',
      render: (code: string, record: TripOutcome) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ color: '#2563eb' }}>{code}</Text>
          {record.version > 1 && (
            <Text type="secondary" style={{ fontSize: 11 }}>v{record.version}</Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Tài xế',
      dataIndex: 'driverName',
      key: 'driverName',
      render: (name: string | null) => name || '—',
    },
    {
      title: 'Biển số xe',
      dataIndex: 'vehiclePlate',
      key: 'vehiclePlate',
      render: (plate: string | null) => plate ? <StatusBadge icon={<Truck size={12} />}>{plate}</StatusBadge> : '—',
    },
    {
      title: 'Tổng đơn',
      dataIndex: 'totalOrders',
      key: 'totalOrders',
      align: 'center' as const,
    },
    {
      title: 'Giao thành công',
      dataIndex: 'deliveredCount',
      key: 'deliveredCount',
      align: 'center' as const,
      render: (n: number) => <Text style={{ color: '#52c41a', fontWeight: 600 }}>{n}</Text>,
    },
    {
      title: 'Thất bại',
      dataIndex: 'failedCount',
      key: 'failedCount',
      align: 'center' as const,
      render: (n: number) => n > 0 ? <Text style={{ color: '#ff4d4f', fontWeight: 600 }}>{n}</Text> : <Text type="secondary">0</Text>,
    },
    {
      title: 'Một phần',
      dataIndex: 'partialCount',
      key: 'partialCount',
      align: 'center' as const,
      render: (n: number) => n > 0 ? <Text style={{ color: '#fa8c16', fontWeight: 600 }}>{n}</Text> : <Text type="secondary">0</Text>,
    },
    {
      title: 'Nộp lúc',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
      render: (v: string | null) => <Text style={{ fontSize: 12 }}>{formatDateTime(v)}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: TripOutcome) => {
        const info = OUTCOME_STATUS_LABEL[status as keyof typeof OUTCOME_STATUS_LABEL]
          || { color: 'default', label: status };
        const tooltipText = status === 'VALIDATED'
          ? `Nghiệm thu bởi: ${record.validatedBy || 'Hệ thống'} lúc ${formatDateTime(record.validatedAt)} (v${record.version})`
          : status === 'NEEDS_CORRECTION'
            ? `Lý do yêu cầu sửa: ${record.amendmentReason || '—'} (v${record.version})`
            : `Chờ nghiệm thu (v${record.version})`;
        return (
          <Tooltip title={tooltipText}>
            <span>
              <StatusBadge color={info.color as StatusBadgeColor}>{info.label}</StatusBadge>
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 280,
      render: (_: unknown, record: TripOutcome) => (
        <Space wrap>
          {record.status === 'SUBMITTED' && (
            <Tooltip title="Xác nhận kết quả chuyến xe">
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                style={{ background: '#52c41a', borderColor: '#52c41a', borderRadius: 6 }}
                onClick={() => setValidateTarget(record)}
              >
                Nghiệm thu
              </Button>
            </Tooltip>
          )}
          {record.status === 'VALIDATED' && (
            <Tooltip title={`Nghiệm thu bởi: ${record.validatedBy || 'Hệ thống'} lúc ${formatDateTime(record.validatedAt)}`}>
              <span>
                <StatusBadge color="success" icon={<CheckCircle2 size={12} />}>Đã nghiệm thu</StatusBadge>
              </span>
            </Tooltip>
          )}
          {record.status === 'NEEDS_CORRECTION' && (
            <Tooltip title={`Lý do: ${record.amendmentReason || '—'}`}>
              <span>
                <StatusBadge color="warning" icon={<XCircle size={12} />}>Chờ sửa</StatusBadge>
              </span>
            </Tooltip>
          )}
          <Tooltip title="Xem lịch sử sự kiện nghiệm thu (Audit Trail)">
            <Button
              size="small"
              icon={<HistoryOutlined />}
              style={{ borderRadius: 6 }}
              onClick={() => handleOpenHistory(record)}
            >
              Lịch sử
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Summary stats
  const submittedCount = outcomes.filter(o => o.status === 'SUBMITTED').length;
  const validatedCount = outcomes.filter(o => o.status === 'VALIDATED').length;
  const needsCorrectionCount = outcomes.filter(o => o.status === 'NEEDS_CORRECTION').length;

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Breadcrumb */}
        <Breadcrumb
          style={{ marginBottom: 12 }}
          items={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Nghiệm thu chuyến hàng' },
          ]}
        />

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          padding: '20px 24px',
          borderRadius: 12,
          color: '#ffffff',
          marginBottom: 20,
        }}>
          <Title level={4} style={{ margin: 0, color: '#fff' }}>
            <Package size={20} style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Nghiệm thu kết quả chuyến hàng
          </Title>
          <Text style={{ color: '#94a3b8', fontSize: 13 }}>
            Xem xét và xác nhận kết quả giao hàng từ tài xế.
          </Text>
        </div>

        {/* Stats */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={8}>
            <Card style={{ borderRadius: 10, textAlign: 'center', border: '1px solid #91caff' }} bodyStyle={{ padding: '12px 16px' }}>
              <Statistic title="Chờ nghiệm thu" value={submittedCount} valueStyle={{ color: '#2563eb', fontWeight: 700 }} />
            </Card>
          </Col>
          <Col xs={8}>
            <Card style={{ borderRadius: 10, textAlign: 'center', border: '1px solid #b7eb8f' }} bodyStyle={{ padding: '12px 16px' }}>
              <Statistic title="Đã nghiệm thu" value={validatedCount} valueStyle={{ color: '#52c41a', fontWeight: 700 }} />
            </Card>
          </Col>
          <Col xs={8}>
            <Card style={{ borderRadius: 10, textAlign: 'center', border: '1px solid #ffe58f' }} bodyStyle={{ padding: '12px 16px' }}>
              <Statistic title="Cần điều chỉnh" value={needsCorrectionCount} valueStyle={{ color: '#fa8c16', fontWeight: 700 }} />
            </Card>
          </Col>
        </Row>

        {/* Main card */}
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text strong style={{ fontSize: 15 }}>Danh sách kết quả chuyến</Text>
              <Button
                icon={<ReloadOutlined />}
                size="small"
                onClick={fetchOutcomes}
                loading={loading}
              >
                Làm mới
              </Button>
            </div>
          }
          style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
          bodyStyle={{ padding: 0 }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin size="large" tip="Đang tải dữ liệu nghiệm thu..." />
            </div>
          ) : error ? (
            <div style={{ padding: 24 }}>
              <Alert
                type="error"
                showIcon
                message={error}
                action={<Button size="small" onClick={fetchOutcomes}>Thử lại</Button>}
              />
            </div>
          ) : outcomes.length === 0 ? (
            <Empty
              style={{ padding: '40px 0' }}
              description="Chưa có kết quả chuyến nào cần nghiệm thu."
            />
          ) : (
            <Table
              columns={columns}
              dataSource={outcomes}
              rowKey="id"
              pagination={{ pageSize: 20, showSizeChanger: false }}
              scroll={{ x: 1100 }}
              locale={{ emptyText: <Empty description="Không có dữ liệu." /> }}
            />
          )}
        </Card>
      </div>

      {/* Validate Modal */}
      <Modal
        open={!!validateTarget}
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>Xác nhận nghiệm thu</span>
          </Space>
        }
        onCancel={() => setValidateTarget(null)}
        onOk={handleValidate}
        okText="Nghiệm thu"
        cancelText="Hủy"
        okButtonProps={{ loading: validateLoading, style: { background: '#52c41a', borderColor: '#52c41a' } }}
        width={480}
      >
        {validateTarget && (
          <div style={{ padding: '12px 0' }}>
            <Alert
              type="success"
              showIcon
              icon={<CheckCircle2 size={16} />}
              message={`Xác nhận nghiệm thu chuyến ${validateTarget.tripCode}`}
              description={
                <div style={{ marginTop: 8 }}>
                  <div>Tài xế: <strong>{validateTarget.driverName || '—'}</strong></div>
                  <div>Xe: <strong>{validateTarget.vehiclePlate || '—'}</strong></div>
                  <div>Đã giao: <strong style={{ color: '#52c41a' }}>{validateTarget.deliveredCount}/{validateTarget.totalOrders}</strong></div>
                  {validateTarget.failedCount > 0 && (
                    <div>Thất bại: <strong style={{ color: '#ff4d4f' }}>{validateTarget.failedCount}</strong></div>
                  )}
                </div>
              }
            />
          </div>
        )}
      </Modal>

      {/* Amend Modal */}
      <Modal
        open={!!amendTarget}
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#fa8c16' }} />
            <span>Yêu cầu điều chỉnh</span>
          </Space>
        }
        onCancel={() => { setAmendTarget(null); setAmendReason(''); }}
        onOk={handleAmend}
        okText="Gửi yêu cầu"
        cancelText="Hủy"
        okButtonProps={{ loading: amendLoading, danger: true }}
        width={500}
      >
        {amendTarget && (
          <div style={{ padding: '12px 0' }}>
            <Alert
              type="warning"
              showIcon
              message={`Yêu cầu tài xế ${amendTarget.driverName || ''} điều chỉnh kết quả chuyến ${amendTarget.tripCode}`}
              style={{ marginBottom: 16 }}
            />
            <div style={{ marginBottom: 8 }}>
              <Text strong>Lý do điều chỉnh <span style={{ color: '#ff4d4f' }}>*</span></Text>
            </div>
            <TextArea
              rows={4}
              value={amendReason}
              onChange={(e) => setAmendReason(e.target.value)}
              placeholder="Nhập lý do yêu cầu tài xế điều chỉnh..."
              maxLength={500}
              showCount
              style={{ borderRadius: 8 }}
            />
          </div>
        )}
      </Modal>

      {/* History Audit Trail Modal */}
      <Modal
        open={!!historyTarget}
        title={
          <Space>
            <HistoryOutlined style={{ color: '#2563eb' }} />
            <span>Lịch sử thực thi & nghiệm thu chuyến {historyTarget?.tripCode}</span>
          </Space>
        }
        onCancel={() => { setHistoryTarget(null); setHistoryEvents([]); }}
        footer={[
          <Button key="close" onClick={() => { setHistoryTarget(null); setHistoryEvents([]); }}>
            Đóng
          </Button>,
        ]}
        width={720}
      >
        {historyLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin tip="Đang tải lịch sử sự kiện chuyến..." />
          </div>
        ) : historyEvents.length === 0 ? (
          <Empty description="Chưa có lịch sử sự kiện nào được ghi nhận." style={{ padding: '20px 0' }} />
        ) : (
          <Table<TripOutcomeEvent>
            dataSource={historyEvents}
            rowKey="id"
            pagination={false}
            size="small"
            scroll={{ y: 360 }}
            columns={[
              {
                title: 'Thời gian',
                dataIndex: 'occurredAt',
                key: 'occurredAt',
                width: 140,
                render: (v: string) => <Text style={{ fontSize: 12 }}>{formatDateTime(v)}</Text>,
              },
              {
                title: 'Sự kiện',
                dataIndex: 'eventType',
                key: 'eventType',
                width: 180,
                render: (type: TripOutcomeEvent['eventType']) => (
                  <StatusBadge color="blue">
                    {TRIP_OUTCOME_EVENT_TYPE_LABEL[type] || type}
                  </StatusBadge>
                ),
              },
              {
                title: 'Người thực hiện',
                dataIndex: 'actorUsername',
                key: 'actorUsername',
                width: 130,
                render: (uname: string | null, r) => (
                  <Text style={{ fontSize: 12 }}>
                    {uname || 'Hệ thống'} {r.actorRole ? `(${r.actorRole})` : ''}
                  </Text>
                ),
              },
              {
                title: 'Ghi chú / Chi tiết',
                key: 'details',
                render: (_: unknown, r: TripOutcomeEvent) => {
                  const rawNote = r.validationNote || r.exceptionText || r.reasonCode;
                  const note = rawNote ? (REASON_CODE_LABELS[rawNote] || rawNote) : (r.deliveryResult ? (r.deliveryResult) : null);
                  return (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {note || (r.statusBefore && r.statusAfter ? `${r.statusBefore} → ${r.statusAfter}` : '—')}
                    </Text>
                  );
                },
              },
            ]}
          />
        )}
      </Modal>
    </AdminShell>
  );
};

export default TripOutcomePage;
