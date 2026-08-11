import React from 'react';
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { palette } from '../theme/tokens';
import AdminShell from '../components/AdminShell';

const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();

  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';
  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) roles = JSON.parse(rolesStr);
  } catch {
    // Ignore parse error
  }

  const currentUser = { id: Number(userId), username, fullName: username, roles };

  const content = (
    <div style={{
      minHeight: token ? '60vh' : '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: token ? undefined : palette.bgLayout,
      borderRadius: token ? '12px' : 0,
      padding: '24px'
    }}>
      <Result
        status="403"
        title="403"
        subTitle="Bạn không có quyền truy cập trang này."
        extra={
          <Button type="primary" onClick={() => navigate('/dashboard')}>
            Quay lại Trang chủ
          </Button>
        }
      />
    </div>
  );

  if (token) {
    return <AdminShell currentUser={currentUser}>{content}</AdminShell>;
  }

  return content;
};

export default ForbiddenPage;
