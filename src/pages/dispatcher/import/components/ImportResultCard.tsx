import React from 'react';
import { Card, Row, Col, Statistic, Button, Alert, Space } from 'antd';
import { FileSpreadsheet, CheckCircle2, XCircle, Package, Download } from 'lucide-react';
import type { ImportResult } from '../../../../types/import';
import { downloadErrorReport } from '../../../../utils/errorReport';

interface ImportResultCardProps {
  result: ImportResult;
  onViewErrors: () => void;
  errorTableOpen: boolean;
}

const ImportResultCard: React.FC<ImportResultCardProps> = ({ result, onViewErrors, errorTableOpen }) => {
  const { batchId, deliveryDate, fileName, totalRows, acceptedRows, rejectedRows, createdOrders } = result;

  const isAllErrors = acceptedRows === 0 && createdOrders === 0 && rejectedRows === totalRows;
  const hasErrors = rejectedRows > 0;

  const formatDateStr = (dateStr: string) => {
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const getStatusBanner = () => {
    if (isAllErrors) {
      return (
        <Alert
          message={
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              Không có đơn hàng nào được tạo — Vui lòng kiểm tra lại file
            </span>
          }
          description="Tất cả các dòng dữ liệu trong file đều không hợp lệ. Vui lòng tải báo cáo lỗi bên dưới để xem chi tiết."
          type="error"
          showIcon
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      );
    }

    if (hasErrors) {
      return (
        <Alert
          message={
            <span style={{ fontWeight: 600, fontSize: 15 }}>
              Nhập đơn hàng hoàn tất với {rejectedRows} dòng lỗi
            </span>
          }
          description="Một số dòng dữ liệu không hợp lệ và đã bị bỏ qua. Các dòng hợp lệ đã được tạo đơn hàng thành công."
          type="warning"
          showIcon
          style={{ marginBottom: 20, borderRadius: 8 }}
        />
      );
    }

    return (
      <Alert
        message={
          <span style={{ fontWeight: 600, fontSize: 15 }}>
            Tải lên đơn hàng thành công!
          </span>
        }
        description="Tất cả các dòng dữ liệu đã được xử lý và chuyển đổi sang đơn hàng thành công."
        type="success"
        showIcon
        style={{ marginBottom: 20, borderRadius: 8 }}
      />
    );
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 8 }}>
          <Space>
            <CheckCircle2 size={20} style={{ color: isAllErrors ? '#ff4d4f' : '#52c41a' }} />
            <span style={{ fontWeight: 600, fontSize: 16 }}>
              Kết quả Import gần nhất — Batch #{batchId} ({formatDateStr(deliveryDate)})
            </span>
          </Space>
          <span style={{ fontSize: 13, color: '#8c8c8c', fontWeight: 'normal' }}>
            File: <strong>{fileName}</strong>
          </span>
        </div>
      }
      style={{
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        marginBottom: 24,
        border: isAllErrors ? '1px solid #ffccc7' : hasErrors ? '1px solid #ffe7ba' : '1px solid #d9f7be',
      }}
      id="import-result-card"
    >
      {getStatusBanner()}

      {/* Summary Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card style={{ background: '#f5f5f5', borderRadius: 8, textAlign: 'center' }} bodyStyle={{ padding: 16 }}>
            <Statistic
              title="Tổng dòng"
              value={totalRows}
              valueStyle={{ color: '#262626', fontWeight: 700 }}
              prefix={<FileSpreadsheet size={18} style={{ marginRight: 6, verticalAlign: 'middle', color: '#8c8c8c' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ background: '#f6ffed', borderRadius: 8, textAlign: 'center', border: '1px solid #d9f7be' }} bodyStyle={{ padding: 16 }}>
            <Statistic
              title="Thành công"
              value={acceptedRows}
              valueStyle={{ color: '#389e0d', fontWeight: 700 }}
              prefix={<CheckCircle2 size={18} style={{ marginRight: 6, verticalAlign: 'middle', color: '#52c41a' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ background: rejectedRows > 0 ? '#fff1f0' : '#f5f5f5', borderRadius: 8, textAlign: 'center', border: rejectedRows > 0 ? '1px solid #ffccc7' : 'none' }} bodyStyle={{ padding: 16 }}>
            <Statistic
              title="Lỗi"
              value={rejectedRows}
              valueStyle={{ color: rejectedRows > 0 ? '#cf1322' : '#8c8c8c', fontWeight: 700 }}
              prefix={<XCircle size={18} style={{ marginRight: 6, verticalAlign: 'middle', color: rejectedRows > 0 ? '#ff4d4f' : '#8c8c8c' }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ background: '#e6f7ff', borderRadius: 8, textAlign: 'center', border: '1px solid #bae7ff' }} bodyStyle={{ padding: 16 }}>
            <Statistic
              title="Đơn hàng tạo"
              value={createdOrders}
              valueStyle={{ color: '#096dd9', fontWeight: 700 }}
              prefix={<Package size={18} style={{ marginRight: 6, verticalAlign: 'middle', color: '#1890ff' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Action Buttons for Errors */}
      {hasErrors && (
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Button
            type="default"
            onClick={onViewErrors}
            style={{ borderRadius: 6, fontWeight: 500 }}
          >
            {errorTableOpen ? 'Ẩn danh sách lỗi' : 'Xem danh sách lỗi'}
          </Button>
          <Button
            type="primary"
            danger
            icon={<Download size={16} />}
            onClick={() => downloadErrorReport(result)}
            style={{ borderRadius: 6, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            Tải báo cáo lỗi (.xlsx)
          </Button>
        </div>
      )}
    </Card>
  );
};

export default ImportResultCard;
