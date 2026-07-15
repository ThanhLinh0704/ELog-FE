import React from 'react';
import { Alert } from 'antd';

const ImportReadOnlyBanner: React.FC = () => {
  return (
    <Alert
      message="Bạn đang xem lịch sử nhập đơn hàng ở chế độ chỉ đọc"
      description="Chỉ Dispatcher được phép tải file Excel lên hệ thống."
      type="info"
      showIcon
      style={{
        marginBottom: 24,
        borderRadius: 8,
        border: '1px solid #bae7ff',
        backgroundColor: '#e6f7ff',
      }}
    />
  );
};

export default ImportReadOnlyBanner;
