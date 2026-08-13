import React from 'react';
import { Modal, Typography, Button } from 'antd';
import { AlertTriangle } from 'lucide-react';
import { palette } from '../../../../theme/tokens';

const { Text, Paragraph } = Typography;

interface DeactivateProductModalProps {
  visible: boolean;
  productSku: string;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const DeactivateProductModal: React.FC<DeactivateProductModalProps> = ({
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
          <AlertTriangle color={palette.danger} size={20} />
          <span>Vô hiệu hoá sản phẩm "{productSku}"?</span>
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
          danger
          loading={loading}
          onClick={onConfirm}
        >
          Xác nhận vô hiệu hoá
        </Button>,
      ]}
    >
      <Paragraph style={{ marginTop: 12 }}>
        Sản phẩm này sẽ không còn được chấp nhận trong file Excel đơn hàng.
      </Paragraph>
      <Paragraph>
        Các đơn hàng lịch sử sử dụng sản phẩm này <Text strong>vẫn được giữ nguyên</Text>.
      </Paragraph>
    </Modal>
  );
};

export default DeactivateProductModal;
