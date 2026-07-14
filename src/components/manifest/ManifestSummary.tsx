import { Alert, Card, Col, Descriptions, Row, Statistic, Tag, Typography } from 'antd';
import type { LoadingManifest } from '../../api/loadingManifestApi';

const { Text } = Typography;

interface ManifestSummaryProps {
  manifest: LoadingManifest;
}

const formatNumber = (value?: number, digits = 2): string =>
  typeof value === 'number'
    ? value.toLocaleString('vi-VN', { maximumFractionDigits: digits })
    : '-';

const getUtilizationAlert = (manifest: LoadingManifest) => {
  const weightPercent = manifest.summary?.weightUtilizationPercent;
  const volumePercent = manifest.summary?.volumeUtilizationPercent;
  const maxWeight = manifest.vehicle?.maxWeightKg;
  const maxVolume = manifest.vehicle?.maxVolumeM3;
  const overweight = Boolean(maxWeight && manifest.totalWeightKg > maxWeight);
  const overvolume = Boolean(maxVolume && manifest.totalVolumeM3 > maxVolume);

  if (overweight || overvolume) {
    return (
      <Alert
        type="error"
        showIcon
        message="Vượt sức chứa của xe"
        description="Tổng khối lượng hoặc thể tích hàng đang lớn hơn khả năng chứa của xe."
      />
    );
  }

  if ((weightPercent ?? 0) >= 90 || (volumePercent ?? 0) >= 90) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Xe gần đầy"
        description="Lượng hàng đang sử dụng trên 90% khối lượng hoặc thể tích xe."
      />
    );
  }

  return null;
};

const ManifestSummary = ({ manifest }: ManifestSummaryProps) => {
  const stopCount = manifest.summary?.activeStopCount ?? manifest.stops?.length ?? 0;
  const itemCount = manifest.summary?.itemCount ?? manifest.totalLines;

  return (
    <Card title="Thông tin chuyến và sức chứa xe" variant="borderless">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <Statistic title="Mã bản nháp chuyến" value={manifest.tripDraftId} prefix="#" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Statistic title="Tuyến giao" value={manifest.fixedRouteCode || '-'} />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Statistic title="Tổng khối lượng" value={manifest.totalWeightKg} suffix="kg" precision={2} />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Statistic title="Tổng thể tích" value={manifest.totalVolumeM3} suffix="m3" precision={3} />
        </Col>
      </Row>

      <div style={{ marginTop: 16 }}>
        <Descriptions bordered column={{ xs: 1, md: 2, xl: 3 }} size="small">
          <Descriptions.Item label="Mã bảng xếp hàng">
            <Text copyable>{manifest.manifestId}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Trạng thái">
            <Tag color="processing">Đã tạo</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Ngày giao">{manifest.deliveryDate || '-'}</Descriptions.Item>
          <Descriptions.Item label="Biển số xe">{manifest.vehicle?.plateNumber || '-'}</Descriptions.Item>
          <Descriptions.Item label="Loại xe">{manifest.vehicle?.vehicleType || '-'}</Descriptions.Item>
          <Descriptions.Item label="Tài xế">{manifest.driver?.fullName || '-'}</Descriptions.Item>
          <Descriptions.Item label="Điểm giao đang hoạt động">{formatNumber(stopCount, 0)}</Descriptions.Item>
          <Descriptions.Item label="Tổng đơn hàng">{formatNumber(manifest.summary?.orderCount, 0)}</Descriptions.Item>
          <Descriptions.Item label="Dòng hàng / kiện hàng">
            {formatNumber(itemCount, 0)} / {formatNumber(manifest.summary?.packageCount, 0)}
          </Descriptions.Item>
          <Descriptions.Item label="Tải trọng tối đa">
            {formatNumber(manifest.vehicle?.maxWeightKg)} kg
          </Descriptions.Item>
          <Descriptions.Item label="Thể tích tối đa">
            {formatNumber(manifest.vehicle?.maxVolumeM3, 3)} m3
          </Descriptions.Item>
          <Descriptions.Item label="Mức sử dụng xe">
            Khối lượng {formatNumber(manifest.summary?.weightUtilizationPercent)}% / Thể tích{' '}
            {formatNumber(manifest.summary?.volumeUtilizationPercent)}%
          </Descriptions.Item>
        </Descriptions>
      </div>

      <div style={{ marginTop: 16 }}>{getUtilizationAlert(manifest)}</div>
    </Card>
  );
};

export default ManifestSummary;
