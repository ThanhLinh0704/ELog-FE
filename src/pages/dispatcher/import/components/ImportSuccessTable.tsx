import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, Select, Space, Empty } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ImportResult, ImportedOrderDetail } from '../../../../types/import';
import { importApi } from '../../../../api/importApi';

const { Text } = Typography;

interface ImportSuccessTableProps {
  batch: ImportResult;
}

const ImportSuccessTable: React.FC<ImportSuccessTableProps> = ({ batch }) => {
  const [data, setData] = useState<ImportedOrderDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  useEffect(() => {
    const loadSuccessData = async () => {
      setLoading(true);
      try {
        const apiOrders = await importApi.getImportedOrders(batch.batchId, selectedDate);
        const rows: ImportedOrderDetail[] = Array.isArray(apiOrders) ? apiOrders : [];

        if (!selectedDate) {
          const datesSet = new Set<string>();
          rows.forEach((ord) => {
            if (ord.deliveryDate) datesSet.add(ord.deliveryDate);
          });
          setAvailableDates(Array.from(datesSet).sort());
        }

        setData(rows);
      } catch (err) {
        console.error('Error loading imported orders for batch', err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    loadSuccessData();
  }, [batch.batchId, selectedDate]);

  const columns: ColumnsType<ImportedOrderDetail> = [
    {
      title: 'Mã đơn hàng',
      dataIndex: 'orderRef',
      key: 'orderRef',
      width: 150,
      render: (text) => <Text strong>{text || '—'}</Text>,
    },
    {
      title: 'Ngày giao',
      dataIndex: 'deliveryDate',
      key: 'deliveryDate',
      width: 120,
      render: (val) => val || '—',
    },
    {
      title: 'Cửa hàng nhận',
      key: 'store',
      width: 230,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.storeName || '—'}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.storeCode || '—'}</Text>
        </div>
      ),
    },
    {
      title: 'Sản phẩm',
      key: 'product',
      width: 220,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.productName || '—'}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.sku || '—'}</Text>
        </div>
      ),
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
      align: 'right',
      render: (val) => val != null ? <Text strong style={{ color: '#096dd9' }}>{val}</Text> : '—',
    },
    {
      title: 'Trọng lượng',
      dataIndex: 'weightKg',
      key: 'weightKg',
      width: 120,
      align: 'right',
      render: (val) => val != null ? `${val} kg` : '—',
    },
    {
      title: 'Thể tích',
      dataIndex: 'volumeM3',
      key: 'volumeM3',
      width: 120,
      align: 'right',
      render: (val) => val != null ? `${val} m³` : '—',
    },
    {
      title: 'Khung giờ giao',
      dataIndex: 'deliveryTimeWindow',
      key: 'deliveryTimeWindow',
      width: 140,
      render: (val) => val || '—',
    },
    {
      title: 'Người nhận',
      key: 'recipient',
      width: 180,
      render: (_, record) => (
        <div>
          <div>{record.recipientName || '—'}</div>
          {record.recipientPhone && (
            <Text type="secondary" style={{ fontSize: 12 }}>{record.recipientPhone}</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'notes',
      key: 'notes',
      width: 180,
      ellipsis: true,
      render: (val) => val || '—',
    },
  ];

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: '#389e0d' }}>
            Danh sách kiện hàng đã import thành công
          </span>
          <Space>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#595959' }}>Lọc theo ngày giao:</span>
            <Select
              placeholder="Tất cả ngày"
              allowClear
              value={selectedDate}
              onChange={(val) => setSelectedDate(val)}
              style={{ width: 160 }}
              options={[
                { label: 'Tất cả ngày', value: undefined },
                ...availableDates.map(d => ({ label: d, value: d })),
              ]}
            />
          </Space>
        </div>
      }
      style={{
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        marginBottom: 24,
        border: '1px solid #d9f7be',
      }}
    >
      <Table
        dataSource={data}
        columns={columns}
        rowKey={(record, index) => `${record.orderRef}-${record.sku}-${index}`}
        loading={loading}
        locale={{
          emptyText: (
            <Empty
              description={
                selectedDate
                  ? `Không có kiện hàng nào cho ngày ${selectedDate}`
                  : 'Chưa có kiện hàng nào được import thành công'
              }
            />
          ),
        }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: ['5', '10', '20', '50'],
          showTotal: (total) => `Tổng số ${total} kiện hàng thành công`,
        }}
        scroll={{ x: 'max-content' }}
      />
    </Card>
  );
};

export default ImportSuccessTable;
