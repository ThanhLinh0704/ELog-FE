import React from 'react';
import { Modal, Typography, Button } from 'antd';
import { PlayCircle } from 'lucide-react';

const { Paragraph } = Typography;

interface ActivateProductModalProps {
  visible: boolean;
  productSku: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const ActivateProductModal: React.FC<ActivateProductModalProps> = ({
  visible,
  productSku,
  loading,
  onCancel,
  onConfirm,
}) => {
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PlayCircle color="#52c41a" size={20} />
          <span>Kích hoạt lại sản phẩm "{productSku}"?</span>
        </div>
      }
      open={visible}
      onCancel={loading ? undefined : onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          Huỷ
        </Button>,
        <Button
          key="confirm"
          type="primary"
          loading={loading}
          onClick={onConfirm}
          style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
        >
          Xác nhận kích hoạt
        </Button>,
      ]}
    >
      <Paragraph style={{ marginTop: 12 }}>
        Sản phẩm sẽ được phép sử dụng lại trong các đơn hàng mới.
      </Paragraph>
    </Modal>
  );
};

export default ActivateProductModal;
