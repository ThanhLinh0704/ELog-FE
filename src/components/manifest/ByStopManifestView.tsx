import { Alert, Card, Collapse, Descriptions, Empty, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { LoadingManifestItem, LoadingManifestStop } from '../../api/loadingManifestApi';

const { Text } = Typography;

interface ByStopManifestViewProps {
  stops: LoadingManifestStop[];
  loading?: boolean;
}

const formatNumber = (value?: number, digits = 3): string =>
  typeof value === 'number'
    ? value.toLocaleString('vi-VN', { maximumFractionDigits: digits })
    : '-';

const getStopPositionTag = (index: number, total: number) => {
  if (index === 0) {
    return <Tag color="blue">Xếp đầu tiên - sâu trong xe</Tag>;
  }
  if (index === total - 1) {
    return <Tag color="green">Xếp cuối - gần cửa</Tag>;
  }
  return <Tag>Xếp tiếp theo</Tag>;
};

const columns: ColumnsType<LoadingManifestItem> = [
  {
    title: 'Bước xếp',
    dataIndex: 'lifoSequence',
    width: 100,
    render: (value: number) => <Tag color="blue">#{value}</Tag>,
  },
  {
    title: 'Hàng hóa',
    dataIndex: 'productName',
    render: (_, record) => (
      <Space direction="vertical" size={0}>
        <Text strong>{record.productName || '-'}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {record.productCode || '-'}
        </Text>
      </Space>
    ),
  },
  {
    title: 'SL',
    dataIndex: 'quantity',
    width: 80,
    align: 'right',
  },
  {
    title: 'Khối lượng',
    dataIndex: 'lineWeightKg',
    width: 120,
    align: 'right',
    render: (value: number) => `${formatNumber(value)} kg`,
  },
  {
    title: 'Thể tích',
    dataIndex: 'lineVolumeM3',
    width: 120,
    align: 'right',
    render: (value: number) => `${formatNumber(value)} m3`,
  },
];

const ByStopManifestView = ({ stops, loading = false }: ByStopManifestViewProps) => {
  if (!loading && stops.length === 0) {
    return (
      <Card title="Hàng hóa theo từng điểm giao" variant="borderless">
        <Empty description="Chưa có nhóm điểm giao trong bảng xếp hàng" />
      </Card>
    );
  }

  return (
    <Card title="Hàng hóa theo từng điểm giao" loading={loading} variant="borderless">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Mỗi nhóm là hàng của một điểm giao"
        description="Nhóm ở trên cùng được xếp lên xe trước. Nhóm ở dưới cùng được xếp sau cùng và sẽ nằm gần cửa xe."
      />
      <Collapse
        defaultActiveKey={stops.slice(0, 2).map((stop) => String(stop.stopSequenceNo))}
        items={stops.map((stop, index) => ({
          key: String(stop.stopSequenceNo),
          label: (
            <Space wrap>
              <Text strong>
                Nhóm {index + 1}: giao tại điểm {stop.stopSequenceNo}
              </Text>
              {getStopPositionTag(index, stops.length)}
              {stop.hasCoordinates === false ? <Tag color="orange">Thiếu GPS</Tag> : null}
              {stop.isActive === false ? <Tag color="warning">Đã bỏ qua</Tag> : null}
              <Text type="secondary">{stop.storeName}</Text>
            </Space>
          ),
          children: (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }}>
                <Descriptions.Item label="Thứ tự giao">{stop.stopSequenceNo}</Descriptions.Item>
                <Descriptions.Item label="Mã cửa hàng">{stop.storeCode || '-'}</Descriptions.Item>
                <Descriptions.Item label="Tên cửa hàng">{stop.storeName || '-'}</Descriptions.Item>
                <Descriptions.Item label="Địa chỉ">{stop.address || '-'}</Descriptions.Item>
                <Descriptions.Item label="Số đơn">{formatNumber(stop.orderCount, 0)}</Descriptions.Item>
                <Descriptions.Item label="Số dòng hàng">{formatNumber(stop.itemCount ?? stop.items.length, 0)}</Descriptions.Item>
                <Descriptions.Item label="Tổng khối lượng">{formatNumber(stop.stopWeightKg)} kg</Descriptions.Item>
                <Descriptions.Item label="Tổng thể tích">{formatNumber(stop.stopVolumeM3)} m3</Descriptions.Item>
                <Descriptions.Item label="ETA">{stop.eta || '-'}</Descriptions.Item>
                <Descriptions.Item label="Hướng dẫn xếp" span={3}>
                  {stop.loadingNote || stop.loadingInstruction || '-'}
                </Descriptions.Item>
              </Descriptions>

              <Table
                rowKey={(record) => `${stop.stopSequenceNo}-${record.lifoSequence}-${record.productCode}`}
                columns={columns}
                dataSource={[...stop.items].sort((a, b) => a.lifoSequence - b.lifoSequence)}
                pagination={false}
                size="small"
                locale={{ emptyText: <Empty description="Nhóm này chưa có hàng" /> }}
              />
            </Space>
          ),
        }))}
      />
    </Card>
  );
};

export default ByStopManifestView;
