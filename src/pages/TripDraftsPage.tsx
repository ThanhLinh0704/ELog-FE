import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  Button,
  Card,
  Col,
  Form,
  InputNumber,
  Row,
  Space,
  Typography,
} from 'antd';
import { ClipboardList, PackageCheck, Search } from 'lucide-react';
import AdminShell from '../components/AdminShell';

function getCurrentUser() {
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';

  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) roles = JSON.parse(rolesStr);
  } catch (err) {
    console.error('Failed to parse roles', err);
  }

  return {
    id: Number(userId),
    username,
    fullName: username,
    roles,
  };
}

const TripDraftsPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [draftId, setDraftId] = useState<number | null>(null);

  function openReview() {
    if (!draftId) return;
    navigate(`/trip-drafts/${draftId}/review`);
  }

  function openLifoManifest() {
    if (!draftId) return;
    navigate(`/trip-drafts/${draftId}/loading-manifest`);
  }

  return (
    <AdminShell currentUser={currentUser}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Breadcrumb
            items={[
              { title: 'Quản trị' },
              { title: 'Lập kế hoạch chuyến' },
            ]}
          />
          <Typography.Title level={2} style={{ margin: '8px 0 0 0' }}>
            Lập kế hoạch chuyến
          </Typography.Title>
          <Typography.Text type="secondary">
            Mở bản nháp chuyến giao hàng để kiểm tra trước khi xác nhận thành chuyến đã lập kế hoạch.
          </Typography.Text>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              bordered={false}
              title={
                <Space>
                  <ClipboardList size={18} />
                  <span>Mở bản nháp chuyến</span>
                </Space>
              }
            >
              <Form layout="vertical" onFinish={openReview}>
                <Form.Item
                  label="ID bản nháp"
                  required
                  validateStatus={draftId ? undefined : 'warning'}
                  help={draftId ? undefined : 'Nhập ID bản nháp để mở màn kiểm tra.'}
                >
                  <InputNumber
                    min={1}
                    precision={0}
                    value={draftId}
                    onChange={(value) => setDraftId(value)}
                    placeholder="Ví dụ: 10"
                    style={{ width: '100%' }}
                  />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<Search size={16} />}
                  disabled={!draftId}
                >
                  Kiểm tra bản nháp
                </Button>
                <Button
                  icon={<PackageCheck size={16} />}
                  disabled={!draftId}
                  onClick={openLifoManifest}
                  style={{ marginLeft: 8 }}
                >
                  LIFO Manifest
                </Button>
              </Form>
            </Card>
          </Col>

        </Row>
      </Space>
    </AdminShell>
  );
};

export default TripDraftsPage;
