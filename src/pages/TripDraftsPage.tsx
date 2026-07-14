import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
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
import { ClipboardList, Search } from 'lucide-react';
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

  return (
    <AdminShell currentUser={currentUser}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Breadcrumb
            items={[
              { title: 'Admin' },
              { title: 'Trip Planning' },
            ]}
          />
          <Typography.Title level={2} style={{ margin: '8px 0 0 0' }}>
            Trip Planning
          </Typography.Title>
          <Typography.Text type="secondary">
            Open a trip draft review screen before confirming it as a planned trip.
          </Typography.Text>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              bordered={false}
              title={
                <Space>
                  <ClipboardList size={18} />
                  <span>Open Trip Draft</span>
                </Space>
              }
            >
              <Form layout="vertical" onFinish={openReview}>
                <Form.Item
                  label="Draft ID"
                  required
                  validateStatus={draftId ? undefined : 'warning'}
                  help={draftId ? undefined : 'Enter a draft ID to open review.'}
                >
                  <InputNumber
                    min={1}
                    precision={0}
                    value={draftId}
                    onChange={(value) => setDraftId(value)}
                    placeholder="Example: 10"
                    style={{ width: '100%' }}
                  />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<Search size={16} />}
                  disabled={!draftId}
                >
                  Review Draft
                </Button>
              </Form>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Alert
              type="info"
              showIcon
              message="Open a real trip draft by ID."
              description="The backend contract for this task provides the detail endpoint /api/trip-drafts/{draftId}. This page no longer calls /api/trip-drafts automatically, so it will not trigger the list endpoint 500."
            />
          </Col>
        </Row>
      </Space>
    </AdminShell>
  );
};

export default TripDraftsPage;
