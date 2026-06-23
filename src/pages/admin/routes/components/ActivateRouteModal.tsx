import React from 'react';
import { Modal, Button, Typography } from 'antd';

const { Paragraph, Text } = Typography;

interface ActivateRouteModalProps {
  visible: boolean;
  routeCode: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const ActivateRouteModal: React.FC<ActivateRouteModalProps> = ({
  visible,
  routeCode,
  loading,
  onCancel,
  onConfirm,
}) => {
  return (
    <Modal
      title={<span style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Kích hoạt tuyến?</span>}
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          Huỷ
        </Button>,
        <Button key="confirm" type="primary" onClick={onConfirm} loading={loading}>
          Xác nhận kích hoạt
        </Button>,
      ]}
      centered
      width={400}
    >
      <div style={{ padding: '8px 0' }}>
        <Paragraph>
          Kích hoạt tuyến <Text strong style={{ color: '#1677ff' }}>{routeCode}</Text>?
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 0 }}>
          Tuyến này sẽ bắt đầu hoạt động và được sử dụng cho các kế hoạch giao hàng mới.
        </Paragraph>
      </div>
    </Modal>
  );
};

export default ActivateRouteModal;
