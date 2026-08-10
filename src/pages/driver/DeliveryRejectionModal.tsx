import React, { useState } from 'react';
import {
  Modal,
  Radio,
  Input,
  Button,
  Space,
  Typography,
  Alert,
  message,
  Popconfirm,
  Row,
  Col,
} from 'antd';
import { AlertTriangle } from 'lucide-react';
import { rejectDelivery } from '../../api/exceptionApi';
import type { RejectionType } from '../../types/exception';
import { palette } from '../../theme/tokens';

const { Text } = Typography;
const { TextArea } = Input;

// ── Vietnamese labels for rejection types ────────────────────────────────────

const REJECTION_OPTIONS: { value: RejectionType; label: string }[] = [
  { value: 'STORE_CLOSED', label: 'Cửa hàng đóng cửa' },
  { value: 'STORE_REFUSED', label: 'Cửa hàng từ chối nhận' },
  { value: 'WRONG_ITEMS', label: 'Hàng không đúng đơn' },
  { value: 'DAMAGED_GOODS', label: 'Hàng bị hư hỏng' },
  { value: 'NO_SPACE', label: 'Không có chỗ chứa hàng' },
  { value: 'OTHER', label: 'Lý do khác (vui lòng ghi rõ bên dưới)' },
];

// ── Error helper ─────────────────────────────────────────────────────────────

interface ApiError {
  response?: {
    status?: number;
    data?: {
      error?: {
        code?: string;
        message?: string;
      };
    };
  };
}

function getRejectErrorInfo(err: unknown): { code: string; message: string } {
  const axErr = err as ApiError;
  const code = axErr?.response?.data?.error?.code || '';
  const msg = axErr?.response?.data?.error?.message || '';

  switch (code) {
    case 'STOP_NOT_IN_PROGRESS':
      return { code, message: 'Điểm giao chưa được xác nhận đến. Vui lòng bấm "Đã đến" trước.' };
    case 'REJECTION_ALREADY_RECORDED':
      return { code, message: 'Điểm giao này đã được báo lỗi trước đó.' };
    case 'NOT_YOUR_TRIP':
      return { code, message: 'Bạn không được phân công cho chuyến này.' };
    case 'TRIP_COMPLETED':
      return { code, message: 'Chuyến đã hoàn thành, không thể báo lỗi.' };
    case 'TRIP_STOP_NOT_FOUND':
      return { code, message: 'Không tìm thấy điểm giao.' };
    case 'STOP_ALREADY_DONE':
      return { code, message: 'Điểm giao đã được xử lý.' };
    case 'ACCESS_DENIED':
      return { code, message: 'Bạn không có quyền thực hiện thao tác này.' };
    case 'VALIDATION_FAILED':
      return { code, message: msg || 'Dữ liệu không hợp lệ.' };
    default:
      if (axErr?.response?.status === 403) {
        return { code: 'ACCESS_DENIED', message: 'Bạn không có quyền cập nhật chuyến này.' };
      }
      if (axErr?.response?.status === 404) {
        return { code: 'NOT_FOUND', message: 'Không tìm thấy dữ liệu.' };
      }
      return { code: 'UNKNOWN', message: msg || 'Đã xảy ra lỗi. Vui lòng thử lại.' };
  }
}

// ── Props ────────────────────────────────────────────────────────────────────

interface DeliveryRejectionModalProps {
  open: boolean;
  tripStopId: number;
  storeCode: string;
  storeName: string | null | undefined;
  onClose: () => void;
  /** Called after successful rejection — parent should reload trip data */
  onSuccess: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

const DeliveryRejectionModal: React.FC<DeliveryRejectionModalProps> = ({
  open,
  tripStopId,
  storeCode,
  storeName,
  onClose,
  onSuccess,
}) => {
  const [rejectionType, setRejectionType] = useState<RejectionType | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setRejectionType(null);
    setDescription('');
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return; // Don't close while submitting
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!rejectionType) {
      message.warning('Vui lòng chọn lý do từ chối.');
      return;
    }

    // Backend requires description when rejectionType === 'OTHER'
    if (rejectionType === 'OTHER' && !description.trim()) {
      message.warning('Vui lòng nhập mô tả khi chọn "Lý do khác".');
      return;
    }

    if (submitting) return;
    setSubmitting(true);

    try {
      const result = await rejectDelivery(tripStopId, {
        rejectionType,
        description: description.trim() || undefined,
      });
      message.success(result.message || `Đã ghi nhận lỗi giao hàng cho ${storeCode}.`);
      resetForm();
      onSuccess();
    } catch (err: unknown) {
      const { code, message: errMsg } = getRejectErrorInfo(err);
      message.error(errMsg);

      // For certain error codes, close modal and trigger refresh
      if (['STOP_NOT_IN_PROGRESS', 'REJECTION_ALREADY_RECORDED', 'NOT_YOUR_TRIP', 'TRIP_COMPLETED', 'TRIP_STOP_NOT_FOUND', 'STOP_ALREADY_DONE'].includes(code)) {
        resetForm();
        onSuccess(); // Parent will reload data
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = rejectionType !== null && (rejectionType !== 'OTHER' || description.trim().length > 0);

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={
        <Space>
          <AlertTriangle size={18} style={{ color: palette.gold }} />
          <span>Báo Lỗi Giao Hàng</span>
        </Space>
      }
      footer={null}
      width={480}
      destroyOnClose
      maskClosable={!submitting}
      closable={!submitting}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
        {/* Stop info */}
        <Alert
          type="info"
          showIcon={false}
          message={
            <Space direction="vertical" size={2}>
              <Text strong style={{ fontSize: 15 }}>{storeCode}</Text>
              {storeName && <Text type="secondary">{storeName}</Text>}
            </Space>
          }
          style={{ borderRadius: 8, background: palette.primaryBg, border: `1px solid ${palette.primary}40` }}
        />

        {/* Rejection type */}
        <div>
          <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
            Lý do từ chối <Text type="danger">*</Text>
          </Text>
          <Radio.Group
            value={rejectionType}
            onChange={(e) => setRejectionType(e.target.value)}
            style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {REJECTION_OPTIONS.map((opt) => (
              <Radio
                key={opt.value}
                value={opt.value}
                style={{
                  padding: '10px 12px',
                  border: `1px solid ${palette.border}`,
                  borderRadius: 8,
                  // min 44px touch target
                  minHeight: 44,
                  display: 'flex',
                  alignItems: 'center',
                  ...(rejectionType === opt.value
                    ? { borderColor: palette.primary, background: palette.primaryBg }
                    : {}),
                }}
              >
                <Text style={{ fontSize: 14 }}>{opt.label}</Text>
              </Radio>
            ))}
          </Radio.Group>
        </div>

        {/* Description */}
        <div>
          <Text strong style={{ display: 'block', marginBottom: 8, fontSize: 14 }}>
            Ghi chú thêm {rejectionType === 'OTHER' && <Text type="danger">*</Text>}
          </Text>
          <TextArea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả chi tiết (nếu có)..."
            maxLength={1000}
            showCount
            style={{ borderRadius: 8, minHeight: 80 }}
          />
        </div>

        {/* Warning */}
        <Alert
          type="warning"
          icon={<AlertTriangle size={14} />}
          showIcon
          message="Sau khi xác nhận, hàng sẽ được giữ lại trên xe và trả về kho sau khi kết thúc chuyến."
          style={{ borderRadius: 8 }}
        />

        {/* Actions */}
        <Row gutter={12}>
          <Col span={12}>
            <Button
              block
              onClick={handleClose}
              disabled={submitting}
              style={{ height: 48, borderRadius: 10, fontSize: 15, fontWeight: 600 }}
            >
              Huỷ
            </Button>
          </Col>
          <Col span={12}>
            <Popconfirm
              title="Xác nhận báo lỗi"
              description={`Xác nhận ghi nhận lỗi giao hàng cho ${storeCode}?`}
              onConfirm={handleSubmit}
              okText="Xác nhận"
              cancelText="Hủy"
              disabled={!isValid || submitting}
            >
              <Button
                type="primary"
                danger
                block
                disabled={!isValid}
                loading={submitting}
                style={{
                  height: 48,
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                Xác nhận Báo Lỗi
              </Button>
            </Popconfirm>
          </Col>
        </Row>
      </div>
    </Modal>
  );
};

export default DeliveryRejectionModal;
