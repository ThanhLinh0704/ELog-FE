import React, { useState, useEffect } from 'react';
import { Table, Card, Space, Select, Button, Tooltip, Alert, message, Badge } from 'antd';
import { ExclamationCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ImportErrorRow } from '../../../../types/import';
import { importApi } from '../../../../api/importApi';
import { USE_MOCK_API } from '../../../../config';
import { downloadErrorReport } from '../../../../utils/errorReport';
import StatusBadge from '../../../../components/StatusBadge';
import { palette } from '../../../../theme/tokens';

interface ImportErrorsTableProps {
  batchId: number;
}

export const IMPORT_ERROR_META: Record<
  string,
  {
    label: string;
    color: string;
    icon?: string;
  }
> = {
  STORE_NOT_FOUND: {
    label: "Cửa hàng không tồn tại",
    color: "red",
    icon: "🔴",
  },
  SKU_NOT_FOUND: {
    label: "SKU không tồn tại",
    color: "red",
    icon: "🔴",
  },
  REQUIRED_FIELD_MISSING: {
    label: "Thiếu dữ liệu",
    color: "gold",
    icon: "🟡",
  },
  MISSING_FIELD: {
    label: "Thiếu dữ liệu",
    color: "gold",
    icon: "🟡",
  },
  DUPLICATE_ORDER_LINE: {
    label: "Trùng dòng đơn hàng",
    color: "orange",
    icon: "🟠",
  },
  ORDER_REF_STORE_MISMATCH: {
    label: "Mã đơn sai cửa hàng",
    color: "orange",
    icon: "🟠",
  },
  INVALID_QUANTITY: {
    label: "Số lượng không hợp lệ",
    color: "volcano",
    icon: "🔴",
  },
  SKU_INACTIVE: {
    label: "SKU ngừng kinh doanh",
    color: "volcano",
    icon: "🔴",
  },
  DELIVERY_DATE_LOCKED: {
    label: "Ngày giao đã khoá Trip Draft",
    color: "purple",
    icon: "🔒",
  },
  UNKNOWN: {
    label: "Lỗi khác",
    color: "default",
    icon: "⚪",
  },
  UNKNOWN_ERROR: {
    label: "Lỗi khác",
    color: "default",
    icon: "⚪",
  },
};

const ImportErrorsTable: React.FC<ImportErrorsTableProps> = ({ batchId }) => {
  const [data, setData] = useState<ImportErrorRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [exportLoading, setExportLoading] = useState(false);
  const [hasPermissionError, setHasPermissionError] = useState(false);

  const loadErrors = async (code = errorCode, page = currentPage, size = pageSize) => {
    setLoading(true);
    setHasPermissionError(false);
    try {
      const response = await importApi.getImportErrors({
        batchId,
        errorCode: code,
        page,
        size,
        sort: 'rowNumber,asc',
      });
      setData(response.data);
      if (response.pagination) {
        setTotalElements(response.pagination.totalElements);
      } else {
        setTotalElements(response.data.length);
      }
    } catch (error: any) {
      console.error('Failed to load import errors', error);
      if (error?.status === 403) {
        setHasPermissionError(true);
      } else {
        message.error('Không thể tải chi tiết dòng lỗi hoặc lỗi phân quyền.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadErrors(errorCode, currentPage, pageSize);
  }, [batchId, errorCode, currentPage, pageSize]);

  const handleFilterChange = (value: string) => {
    const code = value || undefined;
    setErrorCode(code);
    setCurrentPage(0);
  };

  const handleExport = async () => {
    if (USE_MOCK_API) {
      try {
        const detail = await importApi.getBatchDetail(batchId);
        if (detail) {
          downloadErrorReport(detail);
        }
      } catch (e) {
        message.error("Không thể tải báo cáo lỗi.");
      }
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
  };

  const columns: ColumnsType<ImportErrorRow> = [
    {
      title: 'Dòng',
      dataIndex: 'rowNumber',
      key: 'rowNumber',
      width: 85,
      align: 'center',
      render: (text) => <strong style={{ color: palette.danger }}>{text}</strong>,
    },
    {
      title: 'Loại lỗi',
      dataIndex: 'errorCode',
      key: 'errorCode',
      width: 220,
      render: (code: string) => {
        const meta = IMPORT_ERROR_META[code] || {
          label: "Lỗi khác",
          color: "default",
          icon: "⚪",
        };
        const badgeElement = (
          <Badge
            color={meta.color}
            text={`${meta.icon || ''} ${meta.label}`}
            style={{ fontWeight: 500 }}
          />
        );

        if (!IMPORT_ERROR_META[code]) {
          return (
            <Tooltip title={`Mã lỗi gốc: ${code}`}>
              {badgeElement}
            </Tooltip>
          );
        }
        return badgeElement;
      },
    },
    {
      title: 'Trường lỗi',
      dataIndex: 'fieldName',
      key: 'fieldName',
      width: 140,
      render: (text) => text ? <StatusBadge color="blue">{text}</StatusBadge> : <StatusBadge color="default">N/A</StatusBadge>,
    },
    {
      title: 'Dữ liệu gốc',
      dataIndex: 'rawData',
      key: 'rawData',
      render: (text) => (
        <span
          style={{
            fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
            fontSize: '12px',
            backgroundColor: palette.bgLayout,
            padding: '2px 6px',
            borderRadius: 6,
            border: `1px solid ${palette.borderSoft}`,
            wordBreak: 'break-all',
            display: 'inline-block',
            maxWidth: '300px',
          }}
        >
          {text || 'N/A'}
        </span>
      ),
    },
    {
      title: 'Lý do lỗi chi tiết',
      dataIndex: 'errorReason',
      key: 'errorReason',
      render: (text) => (
        <Space style={{ color: palette.danger, alignItems: 'flex-start' }}>
          <ExclamationCircleOutlined style={{ marginTop: 4 }} />
          <span style={{ fontWeight: 500, wordBreak: 'break-word' }}>{text}</span>
        </Space>
      ),
    },
  ];

  if (hasPermissionError) {
    return (
      <Alert
        message="Hạn chế quyền truy cập"
        description="Tài khoản Quản trị viên hệ thống (Admin) chỉ được xem lịch sử tổng quan, không có quyền xem chi tiết lỗi của lô import này."
        type="warning"
        showIcon
        style={{ borderRadius: 10, marginBottom: 24 }}
      />
    );
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: palette.danger }}>Danh sách chi tiết các dòng lỗi</span>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>Lọc theo loại lỗi:</span>
            <Select
              placeholder="Tất cả lỗi"
              style={{ width: 220 }}
              allowClear
              onChange={handleFilterChange}
              options={[
                { value: '', label: 'Tất cả lỗi' },
                { value: 'STORE_NOT_FOUND', label: 'Cửa hàng không tồn tại' },
                { value: 'SKU_NOT_FOUND', label: 'SKU không tồn tại' },
                { value: 'MISSING_FIELD', label: 'Thiếu dữ liệu' },
                { value: 'DUPLICATE_ORDER_LINE', label: 'Trùng dòng đơn hàng' },
                { value: 'ORDER_REF_STORE_MISMATCH', label: 'Mã đơn sai cửa hàng' },
                { value: 'INVALID_QUANTITY', label: 'Số lượng không hợp lệ' },
                { value: 'SKU_INACTIVE', label: 'SKU ngừng kinh doanh' },
                { value: 'DELIVERY_DATE_LOCKED', label: 'Ngày giao đã khoá Trip Draft' },
                { value: 'UNKNOWN', label: 'Lỗi khác' },
              ]}
            />
            <Button
              type="primary"
              danger
              icon={<DownloadOutlined />}
              onClick={handleExport}
              loading={exportLoading}
              disabled={exportLoading}
              style={{ borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              Tải báo cáo
            </Button>
          </div>
        </div>
      }
      style={{
        borderRadius: 14,
        boxShadow: palette.cardShadow,
        marginBottom: 24,
        border: `1px solid ${palette.borderSoft}`,
      }}
    >
      <Table
        dataSource={data}
        columns={columns}
        rowKey="rowNumber"
        loading={loading}
        pagination={{
          current: currentPage + 1,
          pageSize: pageSize,
          total: totalElements,
          showSizeChanger: true,
          pageSizeOptions: ['5', '10', '20', '50'],
          onChange: (page, pSize) => {
            setCurrentPage(page - 1);
            setPageSize(pSize || 10);
          },
          showTotal: (total) => `Tổng số ${total} dòng lỗi`,
        }}
        locale={{
          emptyText: 'Không có lỗi nào phù hợp với bộ lọc.',
        }}
        scroll={{ x: 'max-content' }}
      />
    </Card>
  );
};

export default ImportErrorsTable;
