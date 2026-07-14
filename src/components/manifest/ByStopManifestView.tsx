import { Card, Collapse, Descriptions, Empty, Space, Table, Tag, Typography } from 'antd';
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
    return <Tag color="blue">Load First - Deep Inside</Tag>;
  }
  if (index === total - 1) {
    return <Tag color="green">Load Last - Near Door</Tag>;
  }
  return <Tag>Load Next</Tag>;
};

const columns: ColumnsType<LoadingManifestItem> = [
  {
    title: 'Load Seq',
    dataIndex: 'lifoSequence',
    width: 100,
    render: (value: number) => <Tag color="blue">#{value}</Tag>,
  },
  {
    title: 'Product',
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
    title: 'Qty',
    dataIndex: 'quantity',
    width: 80,
    align: 'right',
  },
  {
    title: 'Weight',
    dataIndex: 'lineWeightKg',
    width: 120,
    align: 'right',
    render: (value: number) => `${formatNumber(value)} kg`,
  },
  {
    title: 'Volume',
    dataIndex: 'lineVolumeM3',
    width: 120,
    align: 'right',
    render: (value: number) => `${formatNumber(value)} m3`,
  },
];

const ByStopManifestView = ({ stops, loading = false }: ByStopManifestViewProps) => {
  if (!loading && stops.length === 0) {
    return (
      <Card title="By-Stop View" variant="borderless">
        <Empty description="No stop groups in this manifest" />
      </Card>
    );
  }

  return (
    <Card title="By-Stop View" loading={loading} variant="borderless">
      <Collapse
        defaultActiveKey={stops.slice(0, 2).map((stop) => String(stop.stopSequenceNo))}
        items={stops.map((stop, index) => ({
          key: String(stop.stopSequenceNo),
          label: (
            <Space wrap>
              <Text strong>
                Load Group {index + 1} - Stop {stop.stopSequenceNo}
              </Text>
              {getStopPositionTag(index, stops.length)}
              {stop.hasCoordinates === false ? <Tag color="orange">Missing GPS</Tag> : null}
              {stop.isActive === false ? <Tag color="warning">Skipped</Tag> : null}
              <Text type="secondary">{stop.storeName}</Text>
            </Space>
          ),
          children: (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Descriptions bordered size="small" column={{ xs: 1, md: 2, xl: 3 }}>
                <Descriptions.Item label="Delivery Sequence">{stop.stopSequenceNo}</Descriptions.Item>
                <Descriptions.Item label="Store Code">{stop.storeCode || '-'}</Descriptions.Item>
                <Descriptions.Item label="Store Name">{stop.storeName || '-'}</Descriptions.Item>
                <Descriptions.Item label="Address">{stop.address || '-'}</Descriptions.Item>
                <Descriptions.Item label="Orders">{formatNumber(stop.orderCount, 0)}</Descriptions.Item>
                <Descriptions.Item label="Items">{formatNumber(stop.itemCount ?? stop.items.length, 0)}</Descriptions.Item>
                <Descriptions.Item label="Total Weight">{formatNumber(stop.stopWeightKg)} kg</Descriptions.Item>
                <Descriptions.Item label="Total Volume">{formatNumber(stop.stopVolumeM3)} m3</Descriptions.Item>
                <Descriptions.Item label="ETA">{stop.eta || '-'}</Descriptions.Item>
                <Descriptions.Item label="Loading Instruction" span={3}>
                  {stop.loadingNote || stop.loadingInstruction || '-'}
                </Descriptions.Item>
              </Descriptions>

              <Table
                rowKey={(record) => `${stop.stopSequenceNo}-${record.lifoSequence}-${record.productCode}`}
                columns={columns}
                dataSource={[...stop.items].sort((a, b) => a.lifoSequence - b.lifoSequence)}
                pagination={false}
                size="small"
                locale={{ emptyText: <Empty description="No items in this stop group" /> }}
              />
            </Space>
          ),
        }))}
      />
    </Card>
  );
};

export default ByStopManifestView;
