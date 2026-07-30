import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Space, Statistic, Button, Breadcrumb, Typography, Spin, Alert, Empty, Divider, message } from 'antd';
import { ArrowLeftOutlined, DownloadOutlined } from '@ant-design/icons';
import { FileSpreadsheet, CheckCircle2, XCircle, Package } from 'lucide-react';
import dayjs from 'dayjs';
import AdminShell from '../../../components/AdminShell';
import ImportStatusTag from './components/ImportStatusTag';
import ImportErrorsTable from './components/ImportErrorsTable';
import ImportSuccessTable from './components/ImportSuccessTable';
import { importApi } from '../../../api/importApi';
import type { ImportResult } from '../../../types/import';
import { downloadErrorReport } from '../../../utils/errorReport';
import { USE_MOCK_API } from '../../../config';

const { Title, Text } = Typography;

function getCurrentUser() {
  const username = localStorage.getItem('username') || '';
  const userId = localStorage.getItem('userId') || '';

  let roles: string[] = [];
  try {
    const rolesStr = localStorage.getItem('roles');
    if (rolesStr) roles = JSON.parse(rolesStr);
  } catch (err) {
    console.error('Failed to parse roles in ImportBatchDetailPage', err);
  }

  return {
    id: Number(userId),
    username,
    fullName: username,
    roles,
  };
}

const ImportBatchDetailPage: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState<ImportResult | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [uploader, setUploader] = useState<string>('');
  const [uploadedAt, setUploadedAt] = useState<string>('');
  const [exportLoading, setExportLoading] = useState(false);

  const handleExport = async () => {
    if (!batchId || !batch) return;
    if (USE_MOCK_API) {
      downloadErrorReport(batch);
      return;
    }
    setExportLoading(true);
    try {
      const blob = await importApi.exportImportErrors(Number(batchId));
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `import-errors-batch${batchId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success("Tải báo cáo lỗi thành công");
    } catch (e: any) {
      console.error(e);
      message.error("Không thể tải báo cáo lỗi. Vui lòng thử lại.");
    } finally {
      setExportLoading(false);
    }
  };

  const loadBatchDetails = async () => {
    if (!batchId) return;
    setLoading(true);
    try {
      const data = await importApi.getBatchDetail(Number(batchId));
      if (data) {
        setBatch(data);
        
        // Load extra info from history list to get uploader, uploadedAt, isActive status
        try {
          const historyResponse = await importApi.getImportHistory({ page: 0, size: 50 });
          const found = historyResponse.content.find((b: any) => b.id === Number(batchId));
          if (found) {
            setIsActive(found.isActive);
            setUploader(found.uploadedBy);
            setUploadedAt(found.uploadedAt);
          }
        } catch (e) {
          console.error("Error reading extra history item from API", e);
        }
      } else {
        setBatch(null);
      }
    } catch (error) {
      console.error('Error fetching batch detail', error);
      message.error('Không thể tải chi tiết batch import');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatchDetails();
  }, [batchId]);

  const formatDateStr = (dateStr?: string | null) => {
    if (!dateStr) return 'Nhiều ngày giao hàng';
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    return dayjs(dateStr).format('DD/MM/YYYY HH:mm:ss');
  };

  if (loading) {
    return (
      <AdminShell currentUser={currentUser}>
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <Spin size="large" tip="Đang tải chi tiết batch import..." />
        </div>
      </AdminShell>
    );
  }

  if (!batch) {
    return (
      <AdminShell currentUser={currentUser}>
        <div style={{ marginBottom: 16 }}>
          <Breadcrumb
            items={[
              { title: 'Dashboard', href: '/dashboard' },
              { title: 'Nhập đơn hàng từ Excel', href: '/dispatcher/import' },
              { title: 'Lỗi' },
            ]}
          />
        </div>
        <Card style={{ borderRadius: 12, textAlign: 'center', padding: '40px 0' }}>
          <Empty
            description={
              <span style={{ fontSize: 16, fontWeight: 500, color: '#8c8c8c' }}>
                404 - Không tìm thấy batch import
              </span>
            }
          >
            <Button
              type="primary"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/dispatcher/import')}
              style={{ borderRadius: 6, marginTop: 12 }}
            >
              Quay lại danh sách
            </Button>
          </Empty>
        </Card>
      </AdminShell>
    );
  }

  const { totalRows, acceptedRows, rejectedRows, ordersCreated } = batch;
  const isAllErrors = acceptedRows === 0 && ordersCreated === 0 && rejectedRows === totalRows;

  return (
    <AdminShell currentUser={currentUser}>
      <div style={{ marginBottom: 16 }}>
        <Breadcrumb
          items={[
            { title: 'Dashboard', href: '/dashboard' },
            { title: 'Nhập đơn hàng từ Excel', href: '/dispatcher/import' },
            { title: `Batch #${batchId}` },
          ]}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/dispatcher/import')}
            style={{ borderRadius: 6, marginBottom: 8 }}
          >
            Quay lại
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Title level={3} style={{ margin: 0, fontWeight: 700 }}>
              Chi tiết Batch #{batchId}
            </Title>
            <ImportStatusTag isActive={isActive} />
          </div>
        </div>
        
        <Space size={12} wrap>
          {ordersCreated > 0 && (
            <Button
              type="primary"
              onClick={() => navigate(batch.deliveryDate ? `/dispatcher/trip-drafts?deliveryDate=${batch.deliveryDate}` : '/dispatcher/trip-drafts')}
              style={{ borderRadius: 6, height: 40, fontWeight: 600, background: '#52c41a', borderColor: '#52c41a' }}
            >
              Đi đến Gom đơn
            </Button>
          )}

          {rejectedRows > 0 && (
            <Button
              type="primary"
              danger
              icon={<DownloadOutlined />}
              loading={exportLoading}
              disabled={exportLoading}
              onClick={handleExport}
              style={{ borderRadius: 6, height: 40, fontWeight: 600 }}
            >
              Tải báo cáo lỗi (.xlsx)
            </Button>
          )}
        </Space>
      </div>

      {/* Metadata Overview Card */}
      <Card
        style={{
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          marginBottom: 24,
        }}
        bodyStyle={{ padding: 24 }}
      >
        <Title level={5} style={{ margin: '0 0 16px 0', color: '#262626', fontWeight: 600 }}>Thông tin tổng quan</Title>
        <Row gutter={[24, 16]}>
          <Col xs={24} sm={12} md={8}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Tên file Excel</Text>
              <Text strong style={{ fontSize: 14, wordBreak: 'break-all' }}>{batch.fileName}</Text>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Ngày giao hàng</Text>
              <Text strong style={{ fontSize: 14 }}>{formatDateStr(batch.deliveryDate)}</Text>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Người tải lên</Text>
              <Text strong style={{ fontSize: 14 }}>{uploader || 'N/A'}</Text>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Thời gian tải lên</Text>
              <Text strong style={{ fontSize: 14 }}>{formatDateTime(uploadedAt)}</Text>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text type="secondary" style={{ fontSize: 13 }}>Trạng thái phân phối</Text>
              <div>
                <ImportStatusTag isActive={isActive} />
              </div>
            </div>
          </Col>
        </Row>

        <Divider style={{ margin: '20px 0' }} />

        {/* Statistic Metrics */}
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card style={{ background: '#f5f5f5', borderRadius: 8, textAlign: 'center' }} bodyStyle={{ padding: '12px 16px' }}>
              <Statistic
                title="Tổng dòng"
                value={totalRows}
                valueStyle={{ color: '#262626', fontWeight: 700, fontSize: 20 }}
                prefix={<FileSpreadsheet size={16} style={{ marginRight: 4, verticalAlign: 'middle', color: '#8c8c8c' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: '#f6ffed', borderRadius: 8, textAlign: 'center', border: '1px solid #d9f7be' }} bodyStyle={{ padding: '12px 16px' }}>
              <Statistic
                title="Thành công"
                value={acceptedRows}
                valueStyle={{ color: '#389e0d', fontWeight: 700, fontSize: 20 }}
                prefix={<CheckCircle2 size={16} style={{ marginRight: 4, verticalAlign: 'middle', color: '#52c41a' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: rejectedRows > 0 ? '#fff1f0' : '#f5f5f5', borderRadius: 8, textAlign: 'center', border: rejectedRows > 0 ? '1px solid #ffccc7' : 'none' }} bodyStyle={{ padding: '12px 16px' }}>
              <Statistic
                title="Lỗi"
                value={rejectedRows}
                valueStyle={{ color: rejectedRows > 0 ? '#cf1322' : '#8c8c8c', fontWeight: 700, fontSize: 20 }}
                prefix={<XCircle size={16} style={{ marginRight: 4, verticalAlign: 'middle', color: rejectedRows > 0 ? '#ff4d4f' : '#8c8c8c' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card style={{ background: '#e6f7ff', borderRadius: 8, textAlign: 'center', border: '1px solid #bae7ff' }} bodyStyle={{ padding: '12px 16px' }}>
              <Statistic
                title="Đơn hàng tạo"
                value={ordersCreated}
                valueStyle={{ color: '#096dd9', fontWeight: 700, fontSize: 20 }}
                prefix={<Package size={16} style={{ marginRight: 4, verticalAlign: 'middle', color: '#1890ff' }} />}
              />
            </Card>
          </Col>
        </Row>
      </Card>

      {/* Red Alert if 100% of rows are errored */}
      {isAllErrors && (
        <Alert
          message="Không có đơn hàng nào được tạo từ batch này"
          description="Tất cả các dòng dữ liệu trong file import đều bị lỗi. Vui lòng kiểm tra danh sách dòng lỗi bên dưới."
          type="error"
          showIcon
          style={{ marginBottom: 24, borderRadius: 8 }}
        />
      )}

      {/* Success detail list */}
      {acceptedRows > 0 && <ImportSuccessTable batch={batch} />}

      {/* Error detail list */}
      {rejectedRows > 0 ? (
        <ImportErrorsTable batchId={Number(batchId)} />
      ) : (
        <Card style={{ borderRadius: 12, textAlign: 'center', padding: '24px 0', border: '1px solid #d9d9d9', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 24 }}>
          <Empty description={<span style={{ color: '#8c8c8c' }}>Batch này không có dòng lỗi. Tất cả dữ liệu đã được import thành công.</span>} />
        </Card>
      )}
    </AdminShell>
  );
};

export default ImportBatchDetailPage;
