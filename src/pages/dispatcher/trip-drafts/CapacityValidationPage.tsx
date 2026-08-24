import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Breadcrumb,
  Typography,
  Row,
  Col,
  Statistic,
  Divider,
  Spin,
  message,
  Alert,
  Tooltip,
  Table,
  Empty
} from 'antd';
import { ArrowLeftOutlined, LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined, WarningOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { ShieldAlert, Scale } from 'lucide-react';
import AdminShell from '../../../components/AdminShell';
import StatusBadge from '../../../components/StatusBadge';
import { palette } from '../../../theme/tokens';
import { tripDraftApi } from '../../../api/tripDraftApi';
import type { CapacityValidationResult, IneligibleVehicle } from '../../../types/tripDraft';
import { usePermissions } from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../constants/permissions';

const { Title, Text, Paragraph } = Typography;

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

// Backend joins these clauses with " and " (CapacityValidationServiceImpl / ConstraintValidationServiceImpl) —
// translate each recognized clause to Vietnamese, keep the embedded numbers, and fall back to the raw
// clause untranslated if BE wording ever drifts from what's matched here.
const FAILURE_REASON_PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^Volume exceeds safety limit \(([\d.]+) m³ > ([\d.]+) m³\)$/, (m) => `Thể tích ${m[1]} m³ vượt giới hạn an toàn ${m[2]} m³`],
  [/^Weight exceeds safety limit \(([\d.]+) kg > ([\d.]+) kg\)$/, (m) => `Trọng lượng ${m[1]} kg vượt giới hạn an toàn ${m[2]} kg`],
  [/^Vehicle weight \(([\d.]+) kg\) exceeds store (\S+) limit \(([\d.]+) kg\)$/, (m) => `Tải trọng xe ${m[1]} kg vượt giới hạn cửa hàng ${m[2]} (${m[3]} kg)`],
  [/^Planned ETA \(([\d:]+)\) is outside store (\S+) allowed delivery hours \(([^)]+)\)$/, (m) => `Giờ đến dự kiến ${m[1]} nằm ngoài khung giờ nhận hàng của cửa hàng ${m[2]} (${m[3]})`],
  [/^ETA ([\d:]+) exceeds closing time ([\d:]+) at store (\S+)$/, (m) => `Giờ đến dự kiến ${m[1]} trễ hơn giờ đóng cửa ${m[2]} của cửa hàng ${m[3]}`],
  [/^Planned ETA \(([\d:]+)\) violates delivery window \(([^)]+)\) for order (\S+)$/, (m) => `Giờ đến dự kiến ${m[1]} không nằm trong khung giờ giao (${m[2]}) của đơn ${m[3]}`],
];

function translateFailureReason(reason?: string): string {
  if (!reason) return 'Không đủ tải';
  return reason
    .split(' and ')
    .map((clause) => {
      const trimmed = clause.trim();
      for (const [pattern, translate] of FAILURE_REASON_PATTERNS) {
        const m = trimmed.match(pattern);
        if (m) return translate(m);
      }
      return trimmed;
    })
    .join(' và ');
}

const CapacityValidationPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const { can } = usePermissions();
  const canValidateCapacity = can(PERMISSIONS.TRIP_CONFIRM);

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [result, setResult] = useState<CapacityValidationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [showAllEligible, setShowAllEligible] = useState(false);
  const [showIneligible, setShowIneligible] = useState(false);

  const ELIGIBLE_PREVIEW_COUNT = 5;

  const fetchValidationResult = async (showLoading = true) => {
    if (!id) return;
    if (showLoading) setLoading(true);
    setErrorMsg(null);
    setErrorCode(null);
    try {
      const data = await tripDraftApi.getCapacityValidationResult(id);
      setResult(data);
    } catch (err: any) {
      console.error(err);
      const status = err.status;
      const code = err.body?.error?.code || err.body?.code;
      setErrorCode(code);

      if (status === 403) {
        setErrorMsg("Bạn không có quyền thực hiện hoặc xem kết quả kiểm tra tải trọng.");
      } else if (code === 'TRIP_DRAFT_NOT_FOUND') {
        setErrorMsg("Không tìm thấy đợt gom đơn.");
      } else {
        setErrorMsg(err.message || "Không thể tải kết quả kiểm tra tải trọng. Vui lòng thử lại.");
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchValidationResult();
  }, [id]);

  const handleValidate = async () => {
    if (!id || !canValidateCapacity) return;
    setValidating(true);
    setErrorMsg(null);
    setErrorCode(null);
    try {
      const data = await tripDraftApi.validateTripDraftCapacity(id);
      setResult(data);
      message.success("Kiểm tra tải trọng hoàn tất.");
    } catch (err: any) {
      console.error(err);
      const code = err.body?.error?.code || err.body?.code;
      setErrorCode(code);

      if (code === 'TRIP_DRAFT_NOT_CONFIRMED') {
        message.error("Vui lòng xác nhận kế hoạch chuyến trước khi kiểm tra tải trọng.");
        navigate(`/dispatcher/trip-drafts/${id}`);
      } else if (code === 'ALREADY_VALIDATED') {
        message.info("Trip Draft đã được kiểm tra trước đó.");
        fetchValidationResult(false);
      } else if (code === 'NO_ITEMS_TO_VALIDATE') {
        setErrorMsg("Trip Draft chưa có hàng hóa để kiểm tra tải trọng.");
      } else if (code === 'NO_ACTIVE_VEHICLE') {
        setErrorMsg("Không tìm thấy xe đang hoạt động trong đội xe. Vui lòng liên hệ Quản trị viên.");
      } else if (err.status === 403) {
        message.error("Bạn không có quyền thực hiện kiểm tra tải trọng.");
      } else {
        setErrorMsg(err.message || "Kiểm tra tải trọng thất bại. Vui lòng thử lại.");
      }
    } finally {
      setValidating(false);
    }
  };

  const renderStatusTag = (status?: string) => {
    if (!status) return null;
    let color: 'default' | 'warning' | 'processing' | 'success' | 'purple' | 'blue' | 'cyan' = 'default';
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

    return <StatusBadge color={color}>{text}</StatusBadge>;
  };

  const renderConstraintIcon = (result?: string) => {
    if (result === 'PASS') {
      return <StatusBadge color="success" icon={<CheckCircleOutlined />}>Đạt</StatusBadge>;
    }
    if (result === 'FAIL') {
      return <StatusBadge color="error" icon={<CloseCircleOutlined />}>Không đạt</StatusBadge>;
    }
    return <StatusBadge color="default" icon={<InfoCircleOutlined />}>Chưa kiểm tra</StatusBadge>;
  };

  const formatVolume = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '—';
    return val.toFixed(3);
  };

  const formatWeight = (val?: number) => {
    if (val === undefined || val === null || isNaN(val)) return '—';
    return val.toFixed(3);
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('vi-VN');
    } catch {
      return dateStr;
    }
  };

  const formatDateStr = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <AdminShell currentUser={currentUser}>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Đang tải kết quả kiểm tra..." />
        </div>
      </AdminShell>
    );
  }

  // Error boundary logic
  if (errorMsg && errorCode !== 'NO_ITEMS_TO_VALIDATE' && errorCode !== 'NO_ACTIVE_VEHICLE') {
    return (
      <AdminShell currentUser={currentUser}>
        <div style={{ marginBottom: 16 }}>
          <Breadcrumb
            items={[
              { title: 'Dashboard', href: '/dashboard' },
              { title: 'Quản lý gom đơn', href: '/dispatcher/trip-drafts' },
              { title: 'Kiểm tra tải trọng' },
            ]}
          />
        </div>
        <Card style={{ borderRadius: 12, textAlign: 'center', padding: '40px 0' }}>
          <ResultError
            message={errorMsg}
            onRetry={errorCode !== 'ACCESS_DENIED' ? () => fetchValidationResult() : undefined}
            onBack={() => navigate(`/dispatcher/trip-drafts/${id}`)}
          />
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
            { title: result ? `Kiểm tra tải trọng - Tuyến ${result.fixedRouteCode || '—'}` : 'Kiểm tra tải trọng' },
          ]}
        />
      </div>

      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/dispatcher/trip-drafts/${id}`)}
            style={{ borderRadius: 6 }}
          >
            Chi tiết Trip Draft
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
              Kiểm tra tải trọng {result?.fixedRouteCode ? `— Tuyến ${result.fixedRouteCode}` : ''} {result?.deliveryDate ? `— ${formatDateStr(result.deliveryDate)}` : ''}
            </Title>
            {renderStatusTag(result?.newStatus)}
          </div>
        </div>
      </div>

      {/* Full screen spin on POST validate */}
      {validating && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(255, 255, 255, 0.7)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: 16
        }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
          <Text strong style={{ fontSize: 16 }}>Đang kiểm tra tải trọng...</Text>
        </div>
      )}

      {/* Specific Business Exceptions (NO_ITEMS_TO_VALIDATE, NO_ACTIVE_VEHICLE) */}
      {errorCode === 'NO_ITEMS_TO_VALIDATE' && (
        <Alert
          message="Lỗi Kiểm tra Tải trọng"
          description="Trip Draft chưa có hàng hóa để kiểm tra tải trọng. Vui lòng thêm các điểm dừng hoặc đơn hàng trước khi thực hiện kiểm tra."
          type="error"
          showIcon
          style={{ marginBottom: 24, borderRadius: 8 }}
        />
      )}

      {errorCode === 'NO_ACTIVE_VEHICLE' && (
        <Alert
          message="Lỗi Kiểm tra Tải trọng"
          description="Không tìm thấy xe đang hoạt động trong đội xe. Vui lòng liên hệ Quản trị viên để cấu hình lại danh sách phương tiện."
          type="error"
          showIcon
          style={{ marginBottom: 24, borderRadius: 8 }}
        />
      )}

      <Row gutter={[24, 24]}>
        {/* Left Side: Summary load & Constraints */}
        <Col xs={24} md={result?.volumeCheckResult !== 'NOT_CHECKED' ? 10 : 24}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Scale size={18} style={{ color: palette.primary }} />
                <span style={{ fontSize: 16, fontWeight: 600 }}>Tải trọng chuyến gom đơn</span>
              </div>
            }
            style={{ borderRadius: 14, boxShadow: palette.cardShadow }}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card style={{ background: palette.bgLayout, border: `1px solid ${palette.borderSoft}`, borderRadius: 10, textAlign: 'center' }} bodyStyle={{ padding: '16px 12px' }}>
                  <Statistic
                    title="Tổng thể tích (m³)"
                    value={result?.totalVolumeM3}
                    precision={3}
                    valueStyle={{ color: palette.primaryDark, fontWeight: 700, fontSize: 20 }}
                  />
                  <div style={{ marginTop: 8 }}>
                    {renderConstraintIcon(result?.volumeCheckResult)}
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card style={{ background: palette.bgLayout, border: `1px solid ${palette.borderSoft}`, borderRadius: 10, textAlign: 'center' }} bodyStyle={{ padding: '16px 12px' }}>
                  <Statistic
                    title="Tổng trọng lượng (kg)"
                    value={result?.totalWeightKg}
                    precision={3}
                    valueStyle={{ color: palette.gold, fontWeight: 700, fontSize: 20 }}
                  />
                  <div style={{ marginTop: 8 }}>
                    {renderConstraintIcon(result?.weightCheckResult)}
                  </div>
                </Card>
              </Col>
            </Row>

            {result?.validatedAt && (
              <>
                <Divider style={{ margin: '20px 0' }} />
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <Text type="secondary">Thời gian kiểm tra</Text>
                    <div><Text strong>{formatDateTime(result.validatedAt)}</Text></div>
                  </Col>
                  {result.validatedBy && (
                    <Col span={12}>
                      <Text type="secondary">Người thực hiện</Text>
                      <div><Text strong>{result.validatedBy.fullName}</Text></div>
                    </Col>
                  )}
                </Row>
              </>
            )}
          </Card>
        </Col>

        {/* Right Side: Validation state details */}
        {result?.volumeCheckResult === 'NOT_CHECKED' && (
          <Col xs={24} md={24}>
            <Card style={{ borderRadius: 12, textAlign: 'center', padding: '40px 0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <div style={{ maxWidth: 480, margin: '0 auto' }}>
                    <Title level={4} style={{ color: '#1f1f1f', fontWeight: 600, marginBottom: 8 }}>Chưa có kết quả kiểm tra tải trọng</Title>
                    <Paragraph type="secondary">
                      Hệ thống sẽ đối soát tổng thể tích ({formatVolume(result?.totalVolumeM3)} m³) và tổng trọng lượng ({formatWeight(result?.totalWeightKg)} kg) của tuyến này với toàn bộ xe đang hoạt động trong đội.
                    </Paragraph>
                  </div>
                }
              >
                {canValidateCapacity ? (
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleValidate}
                    disabled={validating || errorCode === 'NO_ITEMS_TO_VALIDATE'}
                    style={{ borderRadius: 6, fontWeight: 600 }}
                  >
                    Kiểm tra tải trọng
                  </Button>
                ) : (
                  <Alert
                    message="Bạn không có quyền thực hiện kiểm tra tải trọng."
                    type="info"
                    showIcon
                    style={{ display: 'inline-block', textAlign: 'left', borderRadius: 8 }}
                  />
                )}
              </Empty>
            </Card>
          </Col>
        )}

        {result && result.volumeCheckResult !== 'NOT_CHECKED' && (
          <Col xs={24} md={14}>
            {/* Case PASS */}
            {result.validationPassed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {(result.eligibleVehicles?.length ?? 0) === 0 ? (
                  <Alert
                    message={<Text strong style={{ color: '#27272a' }}>Kiểm tra tải trọng thành công — cần chia 2 xe</Text>}
                    description="Không có xe đơn lẻ nào đủ tải cho tuyến này, nhưng hệ thống xác nhận có thể chia tải thành 2 xe (tối đa cho phép). Vào mục 'Gợi ý phân xe tự động' để xem chi tiết phương án 2 xe và tiến hành phân xe."
                    type="success"
                    showIcon
                    style={{ borderRadius: 8 }}
                  />
                ) : (
                  <Alert
                    message={<Text strong style={{ color: '#27272a' }}>Kiểm tra tải trọng thành công</Text>}
                    description={`Tìm thấy các xe đơn lẻ trong fleet có đủ sức chứa cho chuyến đi này.`}
                    type="success"
                    showIcon
                    style={{ borderRadius: 8 }}
                  />
                )}

                {/* Check if vehicle list is provided by backend */}
                {((result.eligibleVehicles && result.eligibleVehicles.length > 0) || (result.ineligibleVehicles && result.ineligibleVehicles.length > 0)) ? (
                  <>
                    {/* Eligible Vehicles */}
                    {result.eligibleVehicles && result.eligibleVehicles.length > 0 && (
                      <Card
                        title={
                          <Text strong style={{ fontSize: 15 }}>
                            Danh sách xe đủ tải ({result.eligibleVehicles.length})
                          </Text>
                        }
                        style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
                        bodyStyle={{ padding: 16 }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {(showAllEligible ? result.eligibleVehicles : result.eligibleVehicles.slice(0, ELIGIBLE_PREVIEW_COUNT)).map((vehicle, idx) => (
                            <Card
                              key={vehicle.vehicleId}
                              style={{
                                borderRadius: 8,
                                border: '1px solid #e4e4e7',
                                background: idx === 0 ? '#f0fdf4' : '#fff',
                                borderColor: idx === 0 ? '#bbf7d0' : '#e4e4e7'
                              }}
                              bodyStyle={{ padding: 16 }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Text strong style={{ fontSize: 16 }}>{vehicle.plateNumber}</Text>
                                    <StatusBadge color="blue">{vehicle.vehicleType}</StatusBadge>
                                    {idx === 0 && <StatusBadge color="success">Xe nhỏ nhất đủ tải</StatusBadge>}
                                  </div>
                                  <div style={{ marginTop: 8, fontSize: 13, color: '#52525b' }}>
                                    <div>Giới hạn: <Text strong>{formatVolume(vehicle.maxVolumeM3)} m³</Text> / <Text strong>{formatWeight(vehicle.maxWeightKg)} kg</Text></div>
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: 12, color: '#71717a' }}>Thể tích còn dư</div>
                                  <Text strong style={{ color: '#166534', fontSize: 15 }}>{formatVolume(vehicle.remainingVolumeM3)} m³</Text>
                                  <div style={{ fontSize: 12, color: '#71717a', marginTop: 4 }}>Trọng lượng còn dư</div>
                                  <Text strong style={{ color: '#166534', fontSize: 15 }}>{formatWeight(vehicle.remainingWeightKg)} kg</Text>
                                </div>
                              </div>
                            </Card>
                          ))}
                          {result.eligibleVehicles.length > ELIGIBLE_PREVIEW_COUNT && (
                            <Button
                              type="dashed"
                              block
                              icon={showAllEligible ? <UpOutlined /> : <DownOutlined />}
                              onClick={() => setShowAllEligible((prev) => !prev)}
                            >
                              {showAllEligible
                                ? 'Thu gọn'
                                : `Xem thêm ${result.eligibleVehicles.length - ELIGIBLE_PREVIEW_COUNT} xe`}
                            </Button>
                          )}
                        </div>
                      </Card>
                    )}

                    {/* Ineligible Vehicles (Optional Section inside PASS) */}
                    {result.ineligibleVehicles && result.ineligibleVehicles.length > 0 && (
                      <Card
                        title={
                          <Text strong style={{ fontSize: 15, color: '#71717a' }}>
                            Danh sách xe không đủ tải ({result.ineligibleVehicles.length})
                          </Text>
                        }
                        extra={
                          <Button
                            type="link"
                            size="small"
                            icon={showIneligible ? <UpOutlined /> : <DownOutlined />}
                            onClick={() => setShowIneligible((prev) => !prev)}
                          >
                            {showIneligible ? 'Ẩn' : 'Xem'}
                          </Button>
                        }
                        style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
                        bodyStyle={{ padding: 0 }}
                      >
                        {showIneligible && (
                          <Table
                            dataSource={result.ineligibleVehicles}
                            rowKey="vehicleId"
                            pagination={false}
                            size="middle"
                            columns={[
                              {
                                title: 'Biển số',
                                dataIndex: 'plateNumber',
                                key: 'plateNumber',
                                width: 150,
                                render: (val: string) => <Text strong>{val}</Text>
                              },
                              {
                                title: 'Loại xe',
                                dataIndex: 'vehicleType',
                                key: 'vehicleType',
                                width: 120,
                                render: (val: string) => <StatusBadge>{val}</StatusBadge>
                              },
                              {
                                title: 'Lý do không đạt',
                                dataIndex: 'failureReason',
                                key: 'failureReason',
                                render: (val: string) => (
                                  <div style={{ padding: '4px 0', lineHeight: '1.6' }}>
                                    <Text type="danger" style={{ fontSize: 13 }}>
                                      {translateFailureReason(val)}
                                    </Text>
                                  </div>
                                )
                              }
                            ]}
                          />
                        )}
                      </Card>
                    )}
                  </>
                ) : (
                  <Alert
                    message="Thông báo từ hệ thống"
                    description="API kết quả đã lưu hiện chỉ cung cấp thông tin tổng hợp."
                    type="info"
                    showIcon
                  />
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <Tooltip title="Tính năng Phân xe (Vehicle Assignment) thuộc Sprint sau.">
                    <Button type="primary" size="large" disabled style={{ borderRadius: 6, fontWeight: 600 }}>
                      Tiến hành phân xe
                    </Button>
                  </Tooltip>
                  {canValidateCapacity && (
                    <Button size="large" onClick={handleValidate} loading={validating} style={{ borderRadius: 6 }}>
                      Kiểm tra lại
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              /* Case FAIL */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <Alert
                  message={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: '#991b1b' }}>
                      <ShieldAlert size={18} />
                      <span>Không có xe đơn lẻ nào đủ tải</span>
                    </div>
                  }
                  description={
                    <div style={{ marginTop: 8 }}>
                      <div>
                        Ràng buộc vi phạm:{' '}
                        <Text strong style={{ color: '#c2410c' }}>
                          {result.bindingConstraint === 'VOLUME' && 'Vượt giới hạn thể tích'}
                          {result.bindingConstraint === 'WEIGHT' && 'Vượt giới hạn tải trọng'}
                          {result.bindingConstraint === 'BOTH' && 'Vượt cả giới hạn thể tích và tải trọng'}
                          {result.bindingConstraint === 'TIME_WINDOW' && 'Vi phạm khung giờ giao hàng (không liên quan tải trọng)'}
                          {result.bindingConstraint === 'ROUTE_CONSTRAINT' && 'Vi phạm ràng buộc tuyến/cửa hàng (không liên quan tải trọng)'}
                          {!result.bindingConstraint && 'Vượt giới hạn tải trọng'}
                        </Text>
                      </div>
                      {result.suggestion && (
                        <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: '2px solid #ef4444', fontStyle: 'italic' }}>
                          Gợi ý: Không có xe hoặc cặp 2 xe nào đáp ứng đủ điều kiện. Vui lòng kiểm tra lại đội xe, khung giờ giao hàng hoặc giới hạn tuyến.
                        </div>
                      )}
                    </div>
                  }
                  type="warning"
                  showIcon={false}
                  style={{ borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2' }}
                />

                {/* Check if vehicle list is provided by backend */}
                {result.ineligibleVehicles && result.ineligibleVehicles.length > 0 ? (
                  <Card
                    title={
                      <Text strong style={{ fontSize: 15 }}>
                        Chi tiết giới hạn tải trọng của đội xe ({result.ineligibleVehicles.length})
                      </Text>
                    }
                    style={{ borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}
                    bodyStyle={{ padding: 0 }}
                  >
                    <Table
                      dataSource={result.ineligibleVehicles}
                      rowKey="vehicleId"
                      pagination={result.ineligibleVehicles.length > 5 ? { pageSize: 5, showSizeChanger: false } : false}
                      size="middle"
                      columns={[
                        {
                          title: 'Biển số',
                          dataIndex: 'plateNumber',
                          key: 'plateNumber',
                          width: 120,
                          render: (val: string) => <Text strong>{val}</Text>
                        },
                        {
                          title: 'Loại xe',
                          dataIndex: 'vehicleType',
                          key: 'vehicleType',
                          width: 100,
                        },
                        {
                          title: 'Giới hạn tối đa',
                          key: 'limits',
                          width: 180,
                          render: (_, vehicle: IneligibleVehicle) => (
                            <span style={{ fontSize: 13 }}>
                              {formatVolume(vehicle.maxVolumeM3)} m³ / {formatWeight(vehicle.maxWeightKg)} kg
                            </span>
                          )
                        },
                        {
                          title: 'Kết quả kiểm tra',
                          key: 'results',
                          width: 180,
                          render: (_, vehicle: IneligibleVehicle) => (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <div>m³: {renderConstraintIcon(vehicle.volumeCheckResult)}</div>
                              <div>kg: {renderConstraintIcon(vehicle.weightCheckResult)}</div>
                            </div>
                          )
                        },
                        {
                          title: 'Lý do không đạt',
                          dataIndex: 'failureReason',
                          key: 'failureReason',
                          render: (val: string) => (
                            <div style={{ padding: '4px 0', lineHeight: '1.6' }}>
                              <Text type="danger" style={{ fontSize: 13 }}>{translateFailureReason(val)}</Text>
                            </div>
                          )
                        }
                      ]}
                    />
                  </Card>
                ) : (
                  <Alert
                    message="Thông báo từ hệ thống"
                    description="API kết quả đã lưu hiện chỉ cung cấp thông tin tổng hợp."
                    type="info"
                    showIcon
                  />
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                  <Button size="large" onClick={() => navigate(`/dispatcher/trip-drafts/${id}`)} style={{ borderRadius: 6 }}>
                    Quay lại xem Trip Draft
                  </Button>
                  {canValidateCapacity && (
                    <Button size="large" onClick={handleValidate} loading={validating} style={{ borderRadius: 6 }}>
                      Kiểm tra lại
                    </Button>
                  )}
                  {canValidateCapacity && result?.validationPassed && (
                    <Button
                      type="primary"
                      size="large"
                      onClick={() => navigate(`/dispatcher/trip-drafts/${id}/assign`)}
                      style={{ borderRadius: 6, fontWeight: 600, background: '#52c41a', borderColor: '#52c41a' }}
                    >
                      Tiến hành phân xe
                    </Button>
                  )}
                </div>
              </div>
            )}
          </Col>
        )}
      </Row>
    </AdminShell>
  );
};

interface ResultErrorProps {
  message: string;
  onRetry?: () => void;
  onBack: () => void;
}

const ResultError: React.FC<ResultErrorProps> = ({ message: errorMsg, onRetry, onBack }) => {
  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ fontSize: 48, color: '#ff4d4f', marginBottom: 16 }}>
        <WarningOutlined />
      </div>
      <Title level={4} style={{ color: '#262626', fontWeight: 600, marginBottom: 8 }}>Không thể tải kết quả kiểm tra</Title>
      <Paragraph type="secondary" style={{ maxWidth: 480, margin: '0 auto 24px auto', fontSize: 14 }}>
        {errorMsg}
      </Paragraph>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
        <Button onClick={onBack} style={{ borderRadius: 6 }}>Quay lại</Button>
        {onRetry && (
          <Button type="primary" onClick={onRetry} style={{ borderRadius: 6 }}>Thử tải lại kết quả</Button>
        )}
      </div>
    </div>
  );
};

export default CapacityValidationPage;
