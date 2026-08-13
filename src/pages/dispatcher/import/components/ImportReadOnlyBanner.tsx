import React from 'react';
import { Alert } from 'antd';
import { palette } from '../../../../theme/tokens';

const ImportReadOnlyBanner: React.FC = () => {
  return (
    <Alert
      message="Bạn đang xem lịch sử nhập đơn hàng ở chế độ chỉ đọc"
      description="Chỉ Dispatcher được phép tải file Excel lên hệ thống."
      type="info"
      showIcon
      style={{
        marginBottom: 24,
        borderRadius: 10,
        border: `1px solid ${palette.border}`,
        backgroundColor: palette.primaryBg,
      }}
    />
  );
};

export default ImportReadOnlyBanner;
