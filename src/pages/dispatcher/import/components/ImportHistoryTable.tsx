import React from 'react';
import { Table, Card, Button, Space, Badge } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { ImportBatchHistory } from '../../../../types/import';
import ImportStatusTag from './ImportStatusTag';

interface ImportHistoryTableProps {
  data: ImportBatchHistory[];
  loading: boolean;
  totalElements: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number, pageSize?: number) => void;
}

const ImportHistoryTable: React.FC<ImportHistoryTableProps> = ({
  data,
  loading,
  totalElements,
  currentPage,
  pageSize,
  onPageChange,
}) => {
  const navigate = useNavigate();

  const formatDate = (dateStr: string, format = 'DD/MM/YYYY') => {
    if (!dateStr) return '';
    return dayjs(dateStr).format(format);
  };

  const columns: ColumnsType<ImportBatchHistory> = [
    {
      title: 'Batch ID',
      dataIndex: 'id',
      key: 'id',
      width: 90,
      align: 'center',
      render: (text) => <strong>#{text}</strong>,
    },
    {
      title: 'Ngày giao hàng',
      dataIndex: 'deliveryDate',
      key: 'deliveryDate',
      width: 140,
      sorter: (a, b) => dayjs(a.deliveryDate).unix() - dayjs(b.deliveryDate).unix(),
      render: (text) => formatDate(text),
    },
    {
      title: 'Tên file Excel',
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true,
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: 'Người tải lên',
      dataIndex: 'uploadedBy',
      key: 'uploadedBy',
      width: 180,
    },
    {
      title: 'Tổng / Thành công / Lỗi',
      key: 'stats',
      width: 220,
      align: 'center',
      render: (_, record) => (
        <Space size={8}>
          <Badge count={record.totalRows} showZero overflowCount={999} style={{ backgroundColor: '#8c8c8c' }} title="Tổng số dòng" />
          <Badge count={record.acceptedRows} showZero overflowCount={999} style={{ backgroundColor: '#52c41a' }} title="Số dòng thành công" />
          <Badge count={record.rejectedRows} showZero overflowCount={999} style={{ backgroundColor: '#ff4d4f' }} title="Số dòng lỗi" />
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 130,
      align: 'center',
      render: (isActive) => <ImportStatusTag isActive={isActive} />,
    },
    {
      title: 'Thời gian tải',
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
      width: 180,
      sorter: (a, b) => dayjs(a.uploadedAt).unix() - dayjs(b.uploadedAt).unix(),
      render: (text) => formatDate(text, 'DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 130,
      align: 'center',
      fixed: 'right' as const,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/dispatcher/import/history/${record.id}`)}
          style={{ padding: 0 }}
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  return (
    <Card
      title={
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>Lịch sử nhập đơn hàng</span>
          <span style={{ fontWeight: 'normal', fontSize: 13, color: '#8c8c8c', marginTop: 4 }}>
            Theo dõi các batch Excel đã được tải lên hệ thống theo ngày giao hàng
          </span>
        </div>
      }
      style={{
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
      }}
    >
      <Table
        dataSource={data}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: currentPage + 1,
          pageSize: pageSize,
          total: totalElements,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
          onChange: (page, pSize) => onPageChange(page - 1, pSize),
        }}
        scroll={{ x: 'max-content' }}
        locale={{
          emptyText: 'Chưa có lịch sử nhập đơn hàng.',
        }}
      />
    </Card>
  );
};

export default ImportHistoryTable;
