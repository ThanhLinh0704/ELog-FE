import { Card, Empty, Space, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { LoadingManifestItem } from '../../api/loadingManifestApi';

const { Text } = Typography;

interface FlatManifestViewProps {
  items: LoadingManifestItem[];
  loading?: boolean;
}

const statusColor: Record<string, string> = {
  PENDING: 'default',
  LOADING: 'processing',
  LOADED: 'success',
  SKIPPED: 'warning',
  EXCEPTION: 'error',
};

const formatNumber = (value?: number, digits = 3): string =>
  typeof value === 'number'
    ? value.toLocaleString('vi-VN', { maximumFractionDigits: digits })
    : '-';

const clipText = (value?: string) => {
  if (!value) {
    return '-';
  }
  return (
    <Tooltip title={value}>
      <Text ellipsis style={{ maxWidth: 180 }}>
        {value}
      </Text>
    </Tooltip>
  );
};

const FlatManifestView = ({ items, loading = false }: FlatManifestViewProps) => {
  const sortedItems = [...items].sort((a, b) => a.lifoSequence - b.lifoSequence);
  const totalWeight = sortedItems.reduce((sum, item) => sum + (item.lineWeightKg || 0), 0);
  const totalVolume = sortedItems.reduce((sum, item) => sum + (item.lineVolumeM3 || 0), 0);

  const columns: ColumnsType<LoadingManifestItem> = [
    {
      title: 'Load Sequence',
      dataIndex: 'lifoSequence',
      width: 120,
      fixed: 'left',
      sorter: (a, b) => a.lifoSequence - b.lifoSequence,
      render: (value: number) => <Tag color="blue">#{value}</Tag>,
    },
    {
      title: 'Delivery Stop',
      dataIndex: 'storeName',
      width: 190,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{clipText(record.storeName)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.storeCode || '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Delivery Sequence',
      dataIndex: 'stopSequenceNo',
      width: 140,
      render: (value: number) => <Tag>{value}</Tag>,
    },
    {
      title: 'Order Code',
      dataIndex: 'orderCode',
      width: 140,
      render: clipText,
    },
    {
      title: 'Item / Product',
      dataIndex: 'productName',
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          {clipText(record.productName)}
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.productCode || '-'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      width: 130,
      render: (value?: string) => value || '-',
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      width: 80,
      align: 'right',
    },
    {
      title: 'Package Code',
      dataIndex: 'packageCode',
      width: 140,
      render: clipText,
    },
    {
      title: 'Weight',
      dataIndex: 'lineWeightKg',
      width: 110,
      align: 'right',
      render: (value: number) => `${formatNumber(value)} kg`,
    },
    {
      title: 'Volume',
      dataIndex: 'lineVolumeM3',
      width: 110,
      align: 'right',
      render: (value: number) => `${formatNumber(value)} m3`,
    },
    {
      title: 'Loading Zone',
      dataIndex: 'loadingZone',
      width: 140,
      render: (value?: string) => value || '-',
    },
    {
      title: 'Loading Status',
      dataIndex: 'loadingStatus',
      width: 140,
      render: (value?: string) => <Tag color={statusColor[value || 'PENDING']}>{value || 'PENDING'}</Tag>,
    },
    {
      title: 'Note',
      dataIndex: 'loadingNote',
      width: 220,
      render: (_, record) => clipText(record.loadingNote || record.note || ''),
    },
  ];

  return (
    <Card
      title="Flat LIFO List"
      extra={
        <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
          <Text>Total weight: {formatNumber(totalWeight)} kg</Text>
          <Text>Total volume: {formatNumber(totalVolume)} m3</Text>
        </Space>
      }
      variant="borderless"
    >
      <Table
        rowKey={(record) => `${record.lifoSequence}-${record.productCode}-${record.storeCode}`}
        columns={columns}
        dataSource={sortedItems}
        loading={loading}
        size="middle"
        scroll={{ x: 1600 }}
        pagination={sortedItems.length > 10 ? { pageSize: 10, showSizeChanger: true } : false}
        locale={{ emptyText: <Empty description="Manifest has no valid item lines" /> }}
        summary={() =>
          sortedItems.length > 0 ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={8}>
                <Text strong>Total</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={8} align="right">
                <Text strong>{formatNumber(totalWeight)} kg</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={9} align="right">
                <Text strong>{formatNumber(totalVolume)} m3</Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={10} colSpan={3} />
            </Table.Summary.Row>
          ) : null
        }
      />
    </Card>
  );
};

export default FlatManifestView;
