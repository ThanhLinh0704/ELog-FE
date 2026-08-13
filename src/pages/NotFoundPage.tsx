import React from 'react';
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { palette } from '../theme/tokens';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: palette.bgLayout,
      padding: '24px'
    }}>
      <Result
        status="404"
        title="404"
        subTitle="Không tìm thấy trang bạn yêu cầu."
        extra={
          <Button type="primary" onClick={() => navigate('/dashboard')}>
            Quay lại Trang chủ
          </Button>
        }
      />
    </div>
  );
};

export default NotFoundPage;
