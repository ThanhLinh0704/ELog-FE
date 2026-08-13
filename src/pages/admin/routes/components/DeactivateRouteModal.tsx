import React from 'react';
import { Modal, Button, Typography } from 'antd';

const { Paragraph, Text } = Typography;

interface DeactivateRouteModalProps {
  visible: boolean;
  routeCode: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const DeactivateRouteModal: React.FC<DeactivateRouteModalProps> = ({
  visible,
  routeCode,
  loading,
  onCancel,
  onConfirm,
}) => {
  return (
    <Modal
      title={<span style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>Vô hiệu hoá tuyến?</span>}
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          Huỷ
        </Button>,
        <Button key="confirm" type="primary" danger onClick={onConfirm} loading={loading}>
          Xác nhận vô hiệu hoá
        </Button>,
      ]}
      centered
      width={400}
    >
      <div style={{ padding: '8px 0' }}>
        <Paragraph>
          Vô hiệu hoá tuyến <Text strong style={{ color: '#ef4444' }}>{routeCode}</Text>?
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 0 }}>
          Tuyến này sẽ không được sử dụng cho các kế hoạch giao hàng mới. Dữ liệu lịch sử của tuyến vẫn được giữ nguyên.
        </Paragraph>
      </div>
    </Modal>
  );
};

export default DeactivateRouteModal;
