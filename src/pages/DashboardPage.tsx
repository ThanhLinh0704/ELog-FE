import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Space, Avatar, Descriptions, Tag, Typography } from 'antd';
import { LogOut, Users, LayoutDashboard } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';

const { Title, Paragraph, Text } = Typography;

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';
  
  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) {
      roles = JSON.parse(rolesStr);
    }
  } catch (e) {
    console.error('Failed to parse roles', e);
  }

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await axiosInstance.post('/api/auth/logout', { refreshToken });
      } catch (err) {
        console.error('Failed to logout in backend', err);
      }
    }
    localStorage.clear();
    navigate('/login');
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#f8fafc',
      padding: '24px'
    }}>
      <Card 
        style={{ 
          width: '100%', 
          maxWidth: 500, 
          borderRadius: 16, 
          boxShadow: '0 4px 20px rgba(15, 23, 42, 0.05)',
          border: '1px solid #f0f0f0'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Avatar 
            size={48} 
            icon={<LayoutDashboard size={24} />} 
            style={{ backgroundColor: '#1677ff', marginBottom: 16 }} 
          />
          <Title level={3} style={{ margin: 0 }}>ELog System Dashboard</Title>
          <Paragraph type="secondary" style={{ marginTop: 8 }}>
            Chào mừng bạn quay trở lại, <Text strong>{username}</Text>!
          </Paragraph>
        </div>

        <Descriptions bordered column={1} size="small" style={{ marginBottom: 24 }}>
          <Descriptions.Item label="Mã người dùng (User ID)">
            {userId}
          </Descriptions.Item>
          <Descriptions.Item label="Vai trò (Roles)">
            <Space size={[0, 4]} wrap>
              {roles.length > 0 ? (
                roles.map((role, idx) => (
                  <Tag color="blue" key={idx}>
                    {role}
                  </Tag>
                ))
              ) : (
                <Text type="secondary">Không có</Text>
              )}
            </Space>
          </Descriptions.Item>
        </Descriptions>

        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {roles.includes('SYSTEM_ADMIN') && (
            <Button 
              type="primary" 
              icon={<Users size={16} />} 
              onClick={() => navigate('/users')}
              size="large"
              style={{ width: '100%', borderRadius: 8 }}
            >
              Quản lý người dùng
            </Button>
          )}

          <Button 
            danger 
            icon={<LogOut size={16} />} 
            onClick={handleLogout}
            size="large"
            style={{ width: '100%', borderRadius: 8 }}
          >
            Đăng xuất
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default DashboardPage;
