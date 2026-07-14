import { Alert, Card, Empty, Space, Table, Tag, Tooltip, Typography } from 'antd';
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

const statusLabel: Record<string, string> = {
  PENDING: 'Chờ xếp',
  LOADING: 'Đang xếp',
  LOADED: 'Đã xếp',
  SKIPPED: 'Đã bỏ qua',
  EXCEPTION: 'Có sự cố',
};

const zoneLabel: Record<string, string> = {
  DEEP_INSIDE: 'Sâu trong xe',
  CENTER: 'Giữa khoang xe',
  NEAR_DOOR: 'Gần cửa xe',
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
      title: 'Bước xếp',
      dataIndex: 'lifoSequence',
      width: 120,
      fixed: 'left',
      sorter: (a, b) => a.lifoSequence - b.lifoSequence,
      render: (value: number) => <Tag color="blue">#{value}</Tag>,
    },
    {
      title: 'Giao tại',
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
      title: 'Thứ tự giao',
      dataIndex: 'stopSequenceNo',
      width: 140,
      render: (value: number) => <Tag>{value}</Tag>,
    },
    {
      title: 'Mã đơn',
      dataIndex: 'orderCode',
      width: 140,
      render: clipText,
    },
    {
      title: 'Hàng hóa',
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
      title: 'Loại hàng',
      dataIndex: 'category',
      width: 130,
      render: (value?: string) => value || '-',
    },
    {
      title: 'SL',
      dataIndex: 'quantity',
      width: 80,
      align: 'right',
    },
    {
      title: 'Mã kiện',
      dataIndex: 'packageCode',
      width: 140,
      render: clipText,
    },
    {
      title: 'Khối lượng',
      dataIndex: 'lineWeightKg',
      width: 110,
      align: 'right',
      render: (value: number) => `${formatNumber(value)} kg`,
    },
    {
      title: 'Thể tích',
      dataIndex: 'lineVolumeM3',
      width: 110,
      align: 'right',
      render: (value: number) => `${formatNumber(value)} m3`,
    },
    {
      title: 'Vị trí trên xe',
      dataIndex: 'loadingZone',
      width: 140,
      render: (value?: string) => (value ? zoneLabel[value] || value : '-'),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'loadingStatus',
      width: 140,
      render: (value?: string) => (
        <Tag color={statusColor[value || 'PENDING']}>{statusLabel[value || 'PENDING'] || value || 'Chờ xếp'}</Tag>
      ),
    },
    {
      title: 'Ghi chú xếp hàng',
      dataIndex: 'loadingNote',
      width: 220,
      render: (_, record) => clipText(record.loadingNote || record.note || ''),
    },
  ];

  return (
    <Card
      title="Danh sách xếp hàng theo từng kiện"
      extra={
        <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
          <Text>Tổng khối lượng: {formatNumber(totalWeight)} kg</Text>
          <Text>Tổng thể tích: {formatNumber(totalVolume)} m3</Text>
        </Space>
      }
      variant="borderless"
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Làm theo cột Bước xếp từ trên xuống dưới"
        description="Bước #1 là kiện cần đưa lên xe đầu tiên và nằm sâu trong khoang xe. Các bước cuối sẽ nằm gần cửa xe hơn để giao trước."
      />
      <Table
        rowKey={(record) => `${record.lifoSequence}-${record.productCode}-${record.storeCode}`}
        columns={columns}
        dataSource={sortedItems}
        loading={loading}
        size="middle"
        scroll={{ x: 1600 }}
        pagination={sortedItems.length > 10 ? { pageSize: 10, showSizeChanger: true } : false}
        locale={{ emptyText: <Empty description="Chưa có dòng hàng hợp lệ trong bảng xếp hàng" /> }}
        summary={() =>
          sortedItems.length > 0 ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={8}>
                <Text strong>Tổng cộng</Text>
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
