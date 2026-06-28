import React from 'react';
import { Modal, Button } from 'antd';
import { AlertTriangle } from 'lucide-react';

interface ReplaceBatchModalProps {
  open: boolean;
  deliveryDateStr?: string;
  confirmLoading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const ReplaceBatchModal: React.FC<ReplaceBatchModalProps> = ({
  open,
  deliveryDateStr,
  confirmLoading,
  onCancel,
  onConfirm,
}) => {
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#fa8c16' }}>
          <AlertTriangle size={20} />
          <span>Ngày {deliveryDateStr} đã có dữ liệu đơn hàng</span>
        </div>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={confirmLoading} style={{ borderRadius: 6 }}>
          Huỷ
        </Button>,
        <Button
          key="confirm"
          type="primary"
          danger
          loading={confirmLoading}
          onClick={onConfirm}
          style={{ borderRadius: 6 }}
        >
          Xác nhận thay thế
        </Button>,
      ]}
      bodyStyle={{ padding: '12px 0 0 0' }}
    >
      <div style={{ fontSize: 14, color: '#595959', lineHeight: 1.6 }}>
        <p>Ngày giao hàng này đã có một batch đang hiện hành.</p>
        <p>
          Nếu tiếp tục, batch hiện tại sẽ được đánh dấu là <strong>đã thay thế</strong> và dữ liệu từ file mới sẽ trở thành batch hiện hành.
        </p>
        <p style={{ fontWeight: 500, color: '#262626' }}>Bạn có chắc chắn muốn tiếp tục?</p>
      </div>
    </Modal>
  );
};

export default ReplaceBatchModal;
