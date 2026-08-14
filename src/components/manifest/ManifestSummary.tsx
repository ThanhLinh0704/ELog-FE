import { Alert, Card, Col, Descriptions, Row, Space, Statistic, Tag, Typography } from 'antd';
import type { LoadingManifest } from '../../api/loadingManifestApi';
import type { Trip } from '../../types/trip';

const { Text } = Typography;

interface ManifestSummaryProps {
  manifest: LoadingManifest;
  createdTrips?: Trip[];
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

const ManifestSummary = ({ manifest, createdTrips = [] }: ManifestSummaryProps) => {
  // Compute active stops count fallback from lines/stops
  const uniqueStores = (manifest.lines || []).reduce((set, line) => {
    if (line.storeCode) set.add(line.storeCode);
    return set;
  }, new Set<string>()).size;

  const stopCount = manifest.summary?.activeStopCount && manifest.summary.activeStopCount > 0
    ? manifest.summary.activeStopCount
    : (manifest.stops && manifest.stops.length > 0 ? manifest.stops.length : uniqueStores);

  // Compute order count fallback from lines
  const uniqueOrders = (manifest.lines || []).reduce((set, line) => {
    if (line.orderCode) set.add(line.orderCode);
    return set;
  }, new Set<string>()).size;

  const orderCount = manifest.summary?.orderCount ?? (uniqueOrders > 0 ? uniqueOrders : null);

  const itemCount = manifest.summary?.itemCount ?? manifest.totalLines ?? (manifest.lines ? manifest.lines.length : 0);
  const packageCount = manifest.summary?.packageCount;

  // Resolve vehicle & driver from manifest OR createdTrips
  const directVehicle = manifest.vehicle?.plateNumber ? manifest.vehicle : null;
  const singleTrip = createdTrips.length === 1 ? createdTrips[0] : null;
  const multiTrips = createdTrips.length > 1 ? createdTrips : null;

  const plateNumber = directVehicle?.plateNumber || singleTrip?.vehicle?.plateNumber || null;
  const vehicleType = directVehicle?.vehicleType || singleTrip?.vehicle?.vehicleType || null;
  const driverName = manifest.driver?.fullName || singleTrip?.driver?.fullName || null;

  const hasVehicle = Boolean(plateNumber || vehicleType || multiTrips);
  const maxWeightKg = manifest.vehicle?.maxWeightKg;
  const maxVolumeM3 = manifest.vehicle?.maxVolumeM3;
  const hasCapacity = Boolean(maxWeightKg || maxVolumeM3);
  const hasUtilization = Boolean(
    typeof manifest.summary?.weightUtilizationPercent === 'number' ||
    typeof manifest.summary?.volumeUtilizationPercent === 'number'
  );

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

          <Descriptions.Item label="Điểm giao đang hoạt động">{formatNumber(stopCount, 0)}</Descriptions.Item>
          {orderCount !== null && (
            <Descriptions.Item label="Tổng đơn hàng">{formatNumber(orderCount, 0)}</Descriptions.Item>
          )}
          <Descriptions.Item label="Dòng hàng / kiện hàng">
            {typeof packageCount === 'number'
              ? `${formatNumber(itemCount, 0)} dòng hàng / ${formatNumber(packageCount, 0)} kiện`
              : `${formatNumber(itemCount, 0)} dòng hàng`}
          </Descriptions.Item>

          {/* Vehicle & Driver Details */}
          {multiTrips ? (
            <Descriptions.Item label="Chuyến & Xe đã phân" span={2}>
              <Space wrap size={[8, 8]}>
                {multiTrips.map((trip) => (
                  <Tag key={trip.tripId} color="blue" style={{ padding: '4px 8px', fontSize: 12 }}>
                    Chuyến #{trip.tripId}: <Text strong>{trip.vehicle?.plateNumber || 'Chưa gán xe'}</Text>
                    {trip.vehicle?.vehicleType ? ` (${trip.vehicle.vehicleType})` : ''}
                    {trip.driver?.fullName ? ` · LX: ${trip.driver.fullName}` : ''}
                  </Tag>
                ))}
              </Space>
            </Descriptions.Item>
          ) : hasVehicle ? (
            <>
              <Descriptions.Item label="Biển số xe">{plateNumber || '—'}</Descriptions.Item>
              <Descriptions.Item label="Loại xe">{vehicleType || '—'}</Descriptions.Item>
              <Descriptions.Item label="Tài xế">{driverName || '—'}</Descriptions.Item>
            </>
          ) : (
            <Descriptions.Item label="Thông tin phương tiện">
              <Tag color="default">Chưa gán phương tiện (Bản nháp)</Tag>
            </Descriptions.Item>
          )}

          {/* Capacity Details */}
          {hasCapacity && (
            <>
              {maxWeightKg ? (
                <Descriptions.Item label="Tải trọng tối đa">
                  {formatNumber(maxWeightKg)} kg
                </Descriptions.Item>
              ) : null}
              {maxVolumeM3 ? (
                <Descriptions.Item label="Thể tích tối đa">
                  {formatNumber(maxVolumeM3, 3)} m3
                </Descriptions.Item>
              ) : null}
            </>
          )}

          {/* Utilization Rates */}
          {hasUtilization && (
            <Descriptions.Item label="Mức sử dụng xe">
              {typeof manifest.summary?.weightUtilizationPercent === 'number' &&
                `Khối lượng ${formatNumber(manifest.summary.weightUtilizationPercent)}%`}
              {typeof manifest.summary?.weightUtilizationPercent === 'number' &&
                typeof manifest.summary?.volumeUtilizationPercent === 'number' &&
                ' / '}
              {typeof manifest.summary?.volumeUtilizationPercent === 'number' &&
                `Thể tích ${formatNumber(manifest.summary.volumeUtilizationPercent)}%`}
            </Descriptions.Item>
          )}
        </Descriptions>
      </div>

      <div style={{ marginTop: 16 }}>{getUtilizationAlert(manifest)}</div>
    </Card>
  );
};

export default ManifestSummary;
