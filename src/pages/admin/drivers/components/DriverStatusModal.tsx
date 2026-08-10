import React, { useEffect, useState } from 'react';
import { Modal, Button, Typography, Form, Select, Input, Alert } from 'antd';
import type { Driver, DriverInactiveReasonCode } from '../../../../types/driver';
import { REASON_CODE_LABEL } from '../../../../types/driver';
import type { DriverStatusUpdatePayload } from '../../../../api/driverApi';
import { palette } from '../../../../theme/tokens';

const { Paragraph, Text } = Typography;

interface DriverStatusModalProps {
  visible: boolean;
  driver: Driver | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (payload: DriverStatusUpdatePayload) => void;
}

const REASON_OPTIONS = (Object.keys(REASON_CODE_LABEL) as DriverInactiveReasonCode[]).map((code) => ({
  value: code,
  label: REASON_CODE_LABEL[code],
}));

const DriverStatusModal: React.FC<DriverStatusModalProps> = ({ visible, driver, loading, onCancel, onConfirm }) => {
  const [reasonCode, setReasonCode] = useState<DriverInactiveReasonCode | undefined>(undefined);
  const [reasonNote, setReasonNote] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (visible) {
      setReasonCode(undefined);
      setReasonNote('');
      setTouched(false);
    }
  }, [visible, driver]);

  if (!driver) return null;

  const willBeInactive = driver.driverStatus === 'ACTIVE';
  const reasonMissing = willBeInactive && !reasonCode;
  const noteMissing = willBeInactive && reasonCode === 'OTHER' && !reasonNote.trim();

  function handleConfirm() {
    setTouched(true);
    if (reasonMissing || noteMissing) return;
    onConfirm(
      willBeInactive
        ? { status: 'INACTIVE', reasonCode, reasonNote: reasonCode === 'OTHER' ? reasonNote.trim() : undefined }
        : { status: 'ACTIVE' }
    );
  }

  return (
    <Modal
      title={
        <span style={{ fontSize: 16, fontWeight: 700, color: willBeInactive ? palette.danger : palette.success }}>
          {willBeInactive ? 'Chuyển tài xế sang Ngừng hoạt động?' : 'Kích hoạt lại tài xế?'}
        </span>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          Huỷ
        </Button>,
        <Button key="confirm" type="primary" danger={willBeInactive} onClick={handleConfirm} loading={loading}>
          Xác nhận
        </Button>,
      ]}
      centered
      width={460}
      styles={{ root: { borderRadius: 14 } }}
    >
      <div style={{ padding: '8px 0' }}>
        <Paragraph>
          {willBeInactive ? 'Ngừng hoạt động' : 'Kích hoạt lại'} tài xế{' '}
          <Text strong>{driver.fullName}</Text>?
        </Paragraph>

        {willBeInactive && (
          <Form layout="vertical">
            <Form.Item
              label="Lý do"
              required
              validateStatus={touched && reasonMissing ? 'error' : ''}
              help={touched && reasonMissing ? 'Vui lòng chọn lý do.' : undefined}
            >
              <Select
                placeholder="Chọn lý do ngừng hoạt động"
                options={REASON_OPTIONS}
                value={reasonCode}
                onChange={(val) => setReasonCode(val)}
              />
            </Form.Item>
            {reasonCode === 'OTHER' && (
              <Form.Item
                label="Ghi chú"
                required
                validateStatus={touched && noteMissing ? 'error' : ''}
                help={touched && noteMissing ? 'Vui lòng nhập ghi chú cho lý do "Khác".' : undefined}
              >
                <Input.TextArea
                  rows={3}
                  value={reasonNote}
                  onChange={(e) => setReasonNote(e.target.value)}
                  placeholder="Mô tả lý do..."
                />
              </Form.Item>
            )}
          </Form>
        )}

        {willBeInactive && (driver.activeTripsWarning?.length ?? 0) > 0 && (
          <Alert
            type="warning"
            showIcon
            style={{ marginTop: 8 }}
            message={`Tài xế đang có ${driver.activeTripsWarning.length} chuyến đang hoạt động`}
            description={
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                {driver.activeTripsWarning.map((t) => (
                  <li key={t.tripId}>
                    Chuyến #{t.tripId} · {t.routeCode} · {t.deliveryDate} · {t.status}
                  </li>
                ))}
              </ul>
            }
          />
        )}

        {!willBeInactive && (
          <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 0 }}>
            Tài xế sẽ có thể được phân công vào các chuyến giao hàng mới sau khi kích hoạt lại.
          </Paragraph>
        )}
      </div>
    </Modal>
  );
};

export default DriverStatusModal;
