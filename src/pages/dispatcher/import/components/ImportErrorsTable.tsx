import React from 'react';
import { Table, Card, Space } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ImportErrorRow } from '../../../../types/import';

interface ImportErrorsTableProps {
  errors: ImportErrorRow[];
}

const ImportErrorsTable: React.FC<ImportErrorsTableProps> = ({ errors }) => {
  const columns: ColumnsType<ImportErrorRow> = [
    {
      title: 'Dòng',
      dataIndex: 'rowNumber',
      key: 'rowNumber',
      width: 80,
      align: 'center',
      sorter: (a, b) => a.rowNumber - b.rowNumber,
      render: (text) => <strong style={{ color: '#ff4d4f' }}>{text}</strong>,
    },
    {
      title: 'Nội dung gốc trong file',
      dataIndex: 'originalContent',
      key: 'originalContent',
      render: (text) => (
        <span
          style={{
            fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
            fontSize: '12.5px',
            backgroundColor: '#fafafa',
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid #f0f0f0',
            wordBreak: 'break-all',
            display: 'inline-block',
            maxWidth: '100%',
          }}
        >
          {text}
        </span>
      ),
    },
    {
      title: 'Lý do lỗi chi tiết',
      dataIndex: 'errorReason',
      key: 'errorReason',
      render: (text) => (
        <Space style={{ color: '#d9363e', alignItems: 'flex-start' }}>
          <ExclamationCircleOutlined style={{ marginTop: 4 }} />
          <span style={{ fontWeight: 500, wordBreak: 'break-word' }}>{text}</span>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={<span style={{ fontWeight: 600, fontSize: 15, color: '#cf1322' }}>Danh sách chi tiết các dòng lỗi</span>}
      style={{
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        marginBottom: 24,
        border: '1px solid #ffccc7',
      }}
    >
      <Table
        dataSource={errors}
        columns={columns}
        rowKey="rowNumber"
        pagination={{
          pageSize: 5,
          showSizeChanger: true,
          pageSizeOptions: ['5', '10', '20'],
          showTotal: (total) => `Tổng số ${total} dòng lỗi`,
        }}
        locale={{
          emptyText: 'Không có lỗi nào được ghi nhận.',
        }}
        scroll={{ x: 'max-content' }}
      />
    </Card>
  );
};

export default ImportErrorsTable;
