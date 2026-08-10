import React from 'react';
import { Modal, Typography, Button } from 'antd';
import { PlayCircle } from 'lucide-react';
import { palette } from '../../../../theme/tokens';

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
          <PlayCircle color={palette.success} size={20} />
          <span>Kích hoạt lại sản phẩm "{productSku}"?</span>
        </div>
      }
      open={visible}
      onCancel={loading ? undefined : onCancel}
      styles={{ root: { borderRadius: 14 } }}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          Huỷ
        </Button>,
        <Button
          key="confirm"
          type="primary"
          loading={loading}
          onClick={onConfirm}
          style={{ backgroundColor: palette.success, borderColor: palette.success }}
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
