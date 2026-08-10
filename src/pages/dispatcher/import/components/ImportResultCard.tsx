import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Button, Alert, Space, message } from 'antd';
import { FileSpreadsheet, CheckCircle2, XCircle, Package, Download } from 'lucide-react';
import type { ImportResult } from '../../../../types/import';
import { downloadErrorReport } from '../../../../utils/errorReport';
import { importApi } from '../../../../api/importApi';
import { USE_MOCK_API } from '../../../../config';
import { palette } from '../../../../theme/tokens';

interface ImportResultCardProps {
  result: ImportResult;
  onViewErrors: () => void;
  errorTableOpen: boolean;
}

const ImportResultCard: React.FC<ImportResultCardProps> = ({ result, onViewErrors, errorTableOpen }) => {
  const { batchId, deliveryDate, fileName, totalRows, acceptedRows, rejectedRows, ordersCreated } = result;

  const isAllErrors = acceptedRows === 0 && ordersCreated === 0 && rejectedRows === totalRows;
  const hasErrors = rejectedRows > 0;

  const [exportLoading, setExportLoading] = useState(false);

  const formatDateStr = (dateStr?: string | null) => {
    if (!dateStr) return '—';
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
          style={{ marginBottom: 20, borderRadius: 10 }}
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
          style={{ marginBottom: 20, borderRadius: 10 }}
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
        style={{ marginBottom: 20, borderRadius: 10 }}
      />
    );
  };

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: 8 }}>
          <Space>
            <CheckCircle2 size={20} style={{ color: isAllErrors ? palette.danger : palette.success }} />
            <span style={{ fontWeight: 600, fontSize: 16 }}>
              Kết quả Import gần nhất — Batch #{batchId} ({formatDateStr(deliveryDate)})
            </span>
          </Space>
          <span style={{ fontSize: 13, color: palette.textMuted, fontWeight: 'normal' }}>
            File: <strong>{fileName}</strong>
          </span>
        </div>
      }
      style={{
        borderRadius: 14,
        boxShadow: palette.cardShadow,
        marginBottom: 24,
        border: `1px solid ${palette.borderSoft}`,
      }}
      id="import-result-card"
    >
      {getStatusBanner()}

      {/* Summary Statistics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={12} sm={6}>
          <Card style={{ background: palette.bgLayout, borderRadius: 10, textAlign: 'center' }} bodyStyle={{ padding: 16 }}>
            <Statistic
              title="Tổng dòng"
              value={totalRows}
              valueStyle={{ color: palette.textDark, fontWeight: 700 }}
              prefix={<FileSpreadsheet size={18} style={{ marginRight: 6, verticalAlign: 'middle', color: palette.textMuted }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ background: palette.successBg, borderRadius: 10, textAlign: 'center' }} bodyStyle={{ padding: 16 }}>
            <Statistic
              title="Thành công"
              value={acceptedRows}
              valueStyle={{ color: palette.success, fontWeight: 700 }}
              prefix={<CheckCircle2 size={18} style={{ marginRight: 6, verticalAlign: 'middle', color: palette.success }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ background: rejectedRows > 0 ? palette.dangerBg : palette.bgLayout, borderRadius: 10, textAlign: 'center' }} bodyStyle={{ padding: 16 }}>
            <Statistic
              title="Lỗi"
              value={rejectedRows}
              valueStyle={{ color: rejectedRows > 0 ? palette.danger : palette.textMuted, fontWeight: 700 }}
              prefix={<XCircle size={18} style={{ marginRight: 6, verticalAlign: 'middle', color: rejectedRows > 0 ? palette.danger : palette.textMuted }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ background: palette.primaryBg, borderRadius: 10, textAlign: 'center' }} bodyStyle={{ padding: 16 }}>
            <Statistic
              title="Đơn hàng tạo"
              value={ordersCreated}
              valueStyle={{ color: palette.primaryDark, fontWeight: 700 }}
              prefix={<Package size={18} style={{ marginRight: 6, verticalAlign: 'middle', color: palette.primary }} />}
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
            style={{ borderRadius: 8, fontWeight: 500 }}
          >
            {errorTableOpen ? 'Ẩn danh sách lỗi' : 'Xem danh sách lỗi'}
          </Button>
          <Button
            type="primary"
            danger
            icon={<Download size={16} />}
            loading={exportLoading}
            disabled={exportLoading}
            onClick={async () => {
              if (USE_MOCK_API) {
                downloadErrorReport(result);
                return;
              }
              setExportLoading(true);
              try {
                const blob = await importApi.exportImportErrors(batchId);
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
            }}
            style={{ borderRadius: 8, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            Tải báo cáo lỗi (.xlsx)
          </Button>
        </div>
      )}
    </Card>
  );
};

export default ImportResultCard;
