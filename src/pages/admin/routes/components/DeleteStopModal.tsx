import React from 'react';
import { Modal, Button, Typography } from 'antd';

const { Paragraph, Text } = Typography;

interface DeleteStopModalProps {
  visible: boolean;
  storeName: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const DeleteStopModal: React.FC<DeleteStopModalProps> = ({
  visible,
  storeName,
  loading,
  onCancel,
  onConfirm,
}) => {
  return (
    <Modal
      title={<span style={{ fontSize: 16, fontWeight: 700, color: '#ef4444' }}>Xoá điểm dừng khỏi tuyến?</span>}
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          Huỷ
        </Button>,
        <Button key="confirm" type="primary" danger onClick={onConfirm} loading={loading}>
          Xác nhận xoá
        </Button>,
      ]}
      centered
      width={400}
    >
      <div style={{ padding: '8px 0' }}>
        <Paragraph>
          Xoá điểm dừng <Text strong style={{ color: '#ef4444' }}>"{storeName}"</Text> khỏi tuyến?
        </Paragraph>
        <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 0 }}>
          Cửa hàng sẽ được gỡ khỏi tuyến này và có thể được thêm vào một tuyến khác.
        </Paragraph>
      </div>
    </Modal>
  );
};

export default DeleteStopModal;
