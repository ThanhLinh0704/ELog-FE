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
        message="Manifest vuot capacity cua xe"
        description="Tong tai trong hoac the tich cua manifest dang lon hon gioi han xe."
      />
    );
  }

  if ((weightPercent ?? 0) >= 90 || (volumePercent ?? 0) >= 90) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Capacity gan day"
        description="Manifest dang su dung tren 90% tai trong hoac the tich xe."
      />
    );
  }

  return null;
};

const ManifestSummary = ({ manifest }: ManifestSummaryProps) => {
  const stopCount = manifest.summary?.activeStopCount ?? manifest.stops?.length ?? 0;
  const itemCount = manifest.summary?.itemCount ?? manifest.totalLines;

  return (
    <Card title="Trip Summary" variant="borderless">
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <Statistic title="Trip Draft" value={manifest.tripDraftId} prefix="#" />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Statistic title="Route" value={manifest.fixedRouteCode || '-'} />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Statistic title="Total Weight" value={manifest.totalWeightKg} suffix="kg" precision={2} />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Statistic title="Total Volume" value={manifest.totalVolumeM3} suffix="m3" precision={3} />
        </Col>
      </Row>

      <div style={{ marginTop: 16 }}>
        <Descriptions bordered column={{ xs: 1, md: 2, xl: 3 }} size="small">
          <Descriptions.Item label="Manifest ID">
            <Text copyable>{manifest.manifestId}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color="processing">{manifest.status ?? 'GENERATED'}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Delivery Date">{manifest.deliveryDate || '-'}</Descriptions.Item>
          <Descriptions.Item label="Vehicle Plate">{manifest.vehicle?.plateNumber || '-'}</Descriptions.Item>
          <Descriptions.Item label="Vehicle Type">{manifest.vehicle?.vehicleType || '-'}</Descriptions.Item>
          <Descriptions.Item label="Driver">{manifest.driver?.fullName || '-'}</Descriptions.Item>
          <Descriptions.Item label="Active Stops">{formatNumber(stopCount, 0)}</Descriptions.Item>
          <Descriptions.Item label="Total Orders">{formatNumber(manifest.summary?.orderCount, 0)}</Descriptions.Item>
          <Descriptions.Item label="Items / Packages">
            {formatNumber(itemCount, 0)} / {formatNumber(manifest.summary?.packageCount, 0)}
          </Descriptions.Item>
          <Descriptions.Item label="Vehicle Max Weight">
            {formatNumber(manifest.vehicle?.maxWeightKg)} kg
          </Descriptions.Item>
          <Descriptions.Item label="Vehicle Max Volume">
            {formatNumber(manifest.vehicle?.maxVolumeM3, 3)} m3
          </Descriptions.Item>
          <Descriptions.Item label="Utilization">
            Weight {formatNumber(manifest.summary?.weightUtilizationPercent)}% / Volume{' '}
            {formatNumber(manifest.summary?.volumeUtilizationPercent)}%
          </Descriptions.Item>
        </Descriptions>
      </div>

      <div style={{ marginTop: 16 }}>{getUtilizationAlert(manifest)}</div>
    </Card>
  );
};

export default ManifestSummary;
