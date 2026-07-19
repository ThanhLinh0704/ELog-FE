import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Breadcrumb,
  Typography,
  Row,
  Col,
  Statistic,
  Tag,
  Divider,
  Spin,
  message,
  Empty,
  Space,
  Modal,
  Alert,
} from 'antd';
import { ArrowLeftOutlined, CarOutlined } from '@ant-design/icons';
import { MapPin, CheckCircle2, XCircle } from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import { tripDraftApi } from '../../../api/tripDraftApi';
import { getTripsByTripDraftId } from '../../../api/tripApi';
import type { TripDraft } from '../../../types/tripDraft';
import type { Trip } from '../../../types/trip';

const { Title, Text } = Typography;

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

const TripDraftDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<TripDraft | null>(null);
  const [existingTrips, setExistingTrips] = useState<Trip[]>([]);
  const [revertLoading, setRevertLoading] = useState(false);
  const [revertModalOpen, setRevertModalOpen] = useState(false);

  const handleRevert = async () => {
    if (!id) return;
    setRevertLoading(true);
    try {
      const res = await tripDraftApi.revertTripDraft(id);
      if (res.success) {
        message.success(res.message || 'Thu hồi đợt gom đơn thành công.');
        navigate(`/dispatcher/trip-drafts?deliveryDate=${draft?.deliveryDate}`);
      } else {
        message.error(res.message || 'Thu hồi đợt gom đơn thất bại.');
      }
    } catch (err: any) {
      console.error(err);
      const code = err?.response?.data?.error?.code || err?.body?.error?.code || '';
      const msg = err?.response?.data?.error?.message || err?.body?.error?.message || err?.message || 'Có lỗi xảy ra khi thu hồi.';
      
      if (code === 'TRIP_DRAFT_ALREADY_ASSIGNED') {
        message.error('Không thể thu hồi: Đợt gom đơn này đã được phân xe hoặc tách chuyến.');
      } else {
        message.error(msg);
      }
    } finally {
      setRevertLoading(false);
      setRevertModalOpen(false);
    }
  };

  const fetchDraftDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await tripDraftApi.getTripDraftById(Number(id));
      setDraft(data);
      // Check if any trips have been created from this draft
      if (data.status === 'VALIDATED' || data.status === 'DISPATCHED') {
        try {
          const trips = await getTripsByTripDraftId(id);
          setExistingTrips(trips);
        } catch {
          // Non-critical: if trips fail to load, show assign button anyway
          setExistingTrips([]);
        }
      }
    } catch (e: any) {
      console.error(e);
      message.error("Không thể tải thông tin chi tiết đợt gom đơn.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDraftDetail();
  }, [id]);

  // Sort stops by sequenceNo ascending
  const sortedStops = useMemo(() => {
    if (!draft || !draft.stops) return [];
    return [...draft.stops].sort((a, b) => a.sequenceNo - b.sequenceNo);
  }, [draft]);

  const formatDateStr = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const renderStatusTag = (status: string) => {
    let color = 'default';
    let text = status;

    switch (status) {
      case 'DRAFT':
        color = 'warning';
        text = 'Nháp (Draft)';
        break;
      case 'PLANNED':
        color = 'processing';
        text = 'Đã lập chuyến (Planned)';
        break;
      case 'VALIDATED':
        color = 'success';
        text = 'Đã kiểm tra tải (Validated)';
        break;
      case 'DISPATCHED':
        color = 'purple';
        text = 'Đã xuất phát (Dispatched)';
        break;
      case 'IN_PROGRESS':
        color = 'blue';
        text = 'Đang giao hàng (In Progress)';
        break;
      case 'COMPLETED':
        color = 'cyan';
        text = 'Hoàn thành (Completed)';
        break;
    }

    return <Tag color={color} style={{ fontWeight: 500 }}>{text}</Tag>;
  };

  const stopsColumns = [
    {
      title: 'STT',
      dataIndex: 'sequenceNo',
      key: 'sequenceNo',
      width: 80,
      render: (seq: number) => <Text strong>{seq}</Text>,
    },
    {
      title: 'Mã cửa hàng',
      dataIndex: 'storeCode',
      key: 'storeCode',
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: 'Tên cửa hàng',
      dataIndex: 'storeName',
      key: 'storeName',
      render: (name: string) => <Text>{name}</Text>,
    },
    {
      title: 'Trạng thái điểm dừng',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        isActive
          ? <Tag color="success">🟢 Hoạt động (Active)</Tag>
          : <Tag color="default">⚪ Bỏ qua (Skipped)</Tag>
      ),
    },
    {
      title: 'Số lượng đơn',
      dataIndex: 'orderCount',
      key: 'orderCount',
      render: (count: number) => <Text>{count}</Text>,
    },
  ];

  if (loading) {
    return (
      <AdminShell currentUser={currentUser}>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Đang tải chi tiết Trip Draft..." />
        </div>
      </AdminShell>
    );
  }

  if (!draft) {
    return (
      <AdminShell currentUser={currentUser}>
        <div style={{ marginBottom: 16 }}>
          <Breadcrumb
            items={[
              { title: 'Dashboard', href: '/dashboard' },
              { title: 'Quản lý gom đơn', href: '/dispatcher/trip-drafts' },
              { title: 'Lỗi' },
            ]}
          />
        </div>
        <Card style={{ borderRadius: 12, textAlign: 'center', padding: '40px 0' }}>
          <Empty description={<span style={{ color: '#8c8c8c' }}>Không tìm thấy Trip Draft hoặc xảy ra lỗi.</span>}>
            <Button
              type="primary"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/dispatcher/trip-drafts')}
              style={{ borderRadius: 6, marginTop: 12 }}
            >
              Quay lại danh sách
            </Button>
          </Empty>
        </Card>
      </AdminShell>
    );
  }

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ marginBottom: 16 }}>
        <Breadcrumb
          items={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Quản lý gom đơn', href: '/dispatcher/trip-drafts' },
            { title: `Chi tiết tuyến ${draft.routeCode}` },
          ]}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/dispatcher/trip-drafts?deliveryDate=${draft.deliveryDate}`)}
            style={{ borderRadius: 6 }}
          >
            Quay lại
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
              Chi tiết đợt gom đơn: Tuyến {draft.routeCode}
            </Title>
            {renderStatusTag(draft.status)}
          </div>
        </div>

        <Space wrap>
          {(draft.status === 'PLANNED' || draft.status === 'VALIDATED') && (
            <>
              <Button
                danger
                style={{ borderRadius: 6, fontWeight: 600 }}
                loading={revertLoading}
                onClick={() => setRevertModalOpen(true)}
              >
                Thu hồi gom đơn
              </Button>
              <Button
                style={{ borderRadius: 6, fontWeight: 600 }}
                onClick={() => navigate(`/dispatcher/trip-drafts/${draft.id}/capacity`)}
              >
                {draft.status === 'PLANNED' ? 'Kiểm tra tải trọng' : 'Xem kết quả tải trọng'}
              </Button>
            </>
          )}
          {draft.status === 'VALIDATED' && existingTrips.length === 0 && (
            <Button
              type="primary"
              icon={<CarOutlined />}
              style={{ borderRadius: 6, fontWeight: 600, background: '#52c41a', borderColor: '#52c41a' }}
              onClick={() => navigate(`/dispatcher/trip-drafts/${draft.id}/assign`)}
            >
              Phân xe & tài xế
            </Button>
          )}
          {draft.status === 'VALIDATED' && existingTrips.length > 0 && (
            <Button
              type="primary"
              icon={<CarOutlined />}
              style={{ borderRadius: 6, fontWeight: 600 }}
              onClick={() => navigate(`/dispatcher/trip-drafts/${draft.id}/assign`)}
            >
              Xem chuyến đã tạo
            </Button>
          )}
        </Space>
      </div>


      {/* Overview Metrics Card */}
      <Card
        style={{
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          marginBottom: 24,
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Title level={5} style={{ margin: '0 0 16px 0', color: '#262626', fontWeight: 600 }}>Thông tin tổng quan</Title>
        <Row gutter={[24, 16]}>
          <Col xs={12} sm={8} md={6}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Mã Tuyến đường</Text>
              <Text strong style={{ fontSize: 15 }}>{draft.routeCode}</Text>
            </div>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Ngày giao hàng</Text>
              <Text strong style={{ fontSize: 15 }}>{formatDateStr(draft.deliveryDate)}</Text>
            </div>
          </Col>
          <Col xs={12} sm={8} md={6}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Trạng thái</Text>
              <div style={{ marginTop: 2 }}>{renderStatusTag(draft.status)}</div>
            </div>
          </Col>
          {draft.confirmedBy && (
            <Col xs={12} sm={8} md={6}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Text type="secondary" style={{ fontSize: 13 }}>Người xác nhận</Text>
                <Text strong style={{ fontSize: 15 }}>{draft.confirmedBy.fullName}</Text>
              </div>
            </Col>
          )}
        </Row>

        <Divider style={{ margin: '20px 0' }} />

        {/* Aggregate Stats */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card style={{ background: '#f5f5f5', borderRadius: 8, textAlign: 'center' }} bodyStyle={{ padding: '12px 16px' }}>
              <Statistic
                title="Stops hoạt động"
                value={draft.activeStopCount}
                valueStyle={{ color: '#262626', fontWeight: 700, fontSize: 20 }}
                prefix={<CheckCircle2 size={16} style={{ marginRight: 4, verticalAlign: 'middle', color: '#52c41a' }} />}
                suffix={`/ ${draft.activeStopCount + draft.skippedStopCount}`}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: '#f5f5f5', borderRadius: 8, textAlign: 'center' }} bodyStyle={{ padding: '12px 16px' }}>
              <Statistic
                title="Stops bỏ qua"
                value={draft.skippedStopCount}
                valueStyle={{ color: '#8c8c8c', fontWeight: 700, fontSize: 20 }}
                prefix={<XCircle size={16} style={{ marginRight: 4, verticalAlign: 'middle', color: '#bfbfbf' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: '#f5f5f5', borderRadius: 8, textAlign: 'center' }} bodyStyle={{ padding: '12px 16px' }}>
              <Statistic
                title="Thể tích (m³)"
                value={draft.totalVolumeM3}
                precision={6}
                valueStyle={{ color: '#096dd9', fontWeight: 700, fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: '#f5f5f5', borderRadius: 8, textAlign: 'center' }} bodyStyle={{ padding: '12px 16px' }}>
              <Statistic
                title="Trọng lượng (kg)"
                value={draft.totalWeightKg}
                precision={3}
                valueStyle={{ color: '#d46b08', fontWeight: 700, fontSize: 20 }}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Stops Sequence Table */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} style={{ color: '#1677ff' }} />
            <span style={{ fontSize: 16, fontWeight: 600 }}>Thứ tự giao hàng tại các điểm dừng (Stops)</span>
          </div>
        }
        style={{
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          columns={stopsColumns}
          dataSource={sortedStops}
          rowKey="tripDraftStopId"
          pagination={false}
          locale={{
            emptyText: <Empty description="Tuyến đường này chưa cấu hình điểm dừng stops." />
          }}
        />
      </Card>

      <Modal
        open={revertModalOpen}
        title="Xác nhận thu hồi đợt gom đơn"
        onCancel={() => !revertLoading && setRevertModalOpen(false)}
        footer={[
          <Button key="cancel" onClick={() => setRevertModalOpen(false)} disabled={revertLoading}>
            Quay lại
          </Button>,
          <Button
            key="confirm"
            type="primary"
            danger
            loading={revertLoading}
            onClick={handleRevert}
          >
            Xác nhận thu hồi
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 12 }}>
          <p>Hành động này sẽ <strong>xóa đợt gom đơn hiện tại</strong> và chuyển các đơn hàng trở lại trạng thái chờ gom đơn để lập kế hoạch mới.</p>
          <Alert
            type="warning"
            showIcon
            message="Chú ý"
            description="Nếu đợt gom đơn này đã được phân xe (assign) hoặc tách chuyến (assign-split), hệ thống sẽ từ chối thu hồi."
          />
        </div>
      </Modal>
    </AdminShell>
  );
};

export default TripDraftDetailPage;
