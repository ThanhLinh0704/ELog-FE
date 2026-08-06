/**
 * OrderResultModal — cập nhật kết quả giao hàng cho một Order.
 * Thay thế DeliveryRejectionModal cũ (stop-level) bằng order-level result.
 *
 * API: PUT /api/v1/driver/trips/{executionId}/orders/{orderId}/result
 * Body: UpdateOrderResultPayload { status, reasonCode?, exceptionText? }
 */
import React, { useState } from 'react';
import {
  Modal,
  Button,
  Select,
  Input,
  Space,
  Typography,
  Alert,
  Divider,
  Tag,
} from 'antd';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { OrderDeliveryStatus, UpdateOrderResultPayload } from '../../types/driverTrip';
import { REASON_CODE_OPTIONS } from '../../types/driverTrip';

const { Text } = Typography;
const { TextArea } = Input;

// ── Props ─────────────────────────────────────────────────────────────────────

interface OrderResultModalProps {
  open: boolean;
  executionId: number;
  orderId: number;
  orderRef: string;
  currentStatus: OrderDeliveryStatus;
  onClose: () => void;
  onSuccess: (
    executionId: number,
    orderId: number,
    payload: UpdateOrderResultPayload
  ) => Promise<void>;
}

// ── Result option type ────────────────────────────────────────────────────────

type ResultOption = {
  status: OrderDeliveryStatus;
  label: string;
  color: string;
  icon: React.ReactNode;
  needsReason: boolean;
};

const RESULT_OPTIONS: ResultOption[] = [
  {
    status: 'DELIVERED',
    label: 'Đã giao thành công',
    color: '#52c41a',
    icon: <CheckCircle2 size={16} />,
    needsReason: false,
  },
  {
    status: 'PARTIALLY_DELIVERED',
    label: 'Giao một phần',
    color: '#fa8c16',
    icon: <AlertTriangle size={16} />,
    needsReason: true,
  },
  {
    status: 'FAILED',
    label: 'Giao thất bại',
    color: '#ff4d4f',
    icon: <XCircle size={16} />,
    needsReason: true,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

const OrderResultModal: React.FC<OrderResultModalProps> = ({
  open,
  executionId,
  orderId,
  orderRef,
  onClose,
  onSuccess,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<OrderDeliveryStatus | null>(null);
  const [reasonCode, setReasonCode] = useState<string | undefined>(undefined);
  const [exceptionText, setExceptionText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedOption = RESULT_OPTIONS.find(o => o.status === selectedStatus);
  const needsReason = selectedOption?.needsReason ?? false;

  const handleClose = () => {
    setSelectedStatus(null);
    setReasonCode(undefined);
    setExceptionText('');
    setError(null);
    setLoading(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedStatus) {
      setError('Vui lòng chọn kết quả giao hàng.');
      return;
    }
    if (needsReason && !reasonCode) {
      setError('Vui lòng chọn lý do.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const payload: UpdateOrderResultPayload = {
        status: selectedStatus,
        reasonCode: needsReason ? reasonCode : undefined,
        exceptionText: exceptionText.trim() || undefined,
      };
      await onSuccess(executionId, orderId, payload);
      handleClose();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { error?: { message?: string } } } };
      setError(axErr?.response?.data?.error?.message || 'Cập nhật thất bại. Vui lòng thử lại.');
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        <Space>
          <CheckCircle2 size={18} color="#1677ff" />
          <span>Cập nhật kết quả giao hàng</span>
        </Space>
      }
      onCancel={handleClose}
      footer={[
        <Button key="cancel" onClick={handleClose} disabled={loading}>
          Hủy
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading}
          disabled={!selectedStatus}
          onClick={handleSubmit}
          style={selectedOption ? { background: selectedOption.color, borderColor: selectedOption.color } : {}}
        >
          Xác nhận
        </Button>,
      ]}
      width={480}
      destroyOnClose
    >
      <div style={{ padding: '8px 0' }}>
        {/* Order info */}
        <Alert
          type="info"
          showIcon={false}
          message={
            <Space>
              <Text type="secondary">Đơn hàng:</Text>
              <Tag color="blue">{orderRef}</Tag>
            </Space>
          }
          style={{ marginBottom: 16, borderRadius: 8 }}
        />

        {/* Status selection */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ display: 'block', marginBottom: 8 }}>
            Kết quả <span style={{ color: '#ff4d4f' }}>*</span>
          </Text>
          <Space direction="vertical" style={{ width: '100%' }} size={8}>
            {RESULT_OPTIONS.map(option => (
              <div
                key={option.status}
                onClick={() => {
                  setSelectedStatus(option.status);
                  setReasonCode(undefined);
                  setExceptionText('');
                  setError(null);
                }}
                style={{
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: selectedStatus === option.status
                    ? `2px solid ${option.color}`
                    : '1px solid #f0f0f0',
                  background: selectedStatus === option.status ? `${option.color}15` : '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'all 0.15s',
                }}
                role="button"
                aria-pressed={selectedStatus === option.status}
              >
                <span style={{ color: option.color }}>{option.icon}</span>
                <Text strong style={{ color: option.color }}>{option.label}</Text>
              </div>
            ))}
          </Space>
        </div>

        {/* Reason code — required for PARTIALLY_DELIVERED / FAILED */}
        {needsReason && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>
                Lý do <span style={{ color: '#ff4d4f' }}>*</span>
              </Text>
              <Select
                style={{ width: '100%' }}
                placeholder="Chọn lý do..."
                value={reasonCode}
                onChange={val => setReasonCode(val)}
                options={REASON_CODE_OPTIONS}
                popupMatchSelectWidth
              />
            </div>
          </>
        )}

        {/* Exception text — optional note */}
        {selectedStatus && selectedStatus !== 'DELIVERED' && (
          <div style={{ marginBottom: 12 }}>
            <Text strong style={{ display: 'block', marginBottom: 6 }}>
              Ghi chú thêm <Text type="secondary">(tùy chọn)</Text>
            </Text>
            <TextArea
              rows={3}
              value={exceptionText}
              onChange={e => setExceptionText(e.target.value)}
              placeholder="Mô tả chi tiết tình huống..."
              maxLength={500}
              showCount
              style={{ borderRadius: 8 }}
            />
          </div>
        )}

        {error && (
          <Alert
            type="error"
            showIcon
            message={error}
            style={{ borderRadius: 8, marginTop: 8 }}
          />
        )}
      </div>
    </Modal>
  );
};

export default OrderResultModal;
