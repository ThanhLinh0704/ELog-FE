import React from 'react';
import { Empty, Progress, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Truck } from 'lucide-react';
import { palette } from '../../../../theme/tokens';
import StatusBadge from '../../../../components/StatusBadge';
import { REPORT_THRESHOLDS } from '../../../../constants/reportThresholds';
import { combineStatuses, getRateStatus } from '../../../../utils/performanceStatus';
import type { KpiVehicleBreakdown } from '../../../../types/kpi';

const { Text } = Typography;

function renderRateProgress(val: number | null, targetPct: number) {
  if (val === null) return <Text type="secondary" style={{ color: '#94a3b8' }}>—</Text>;
  const pct = Math.min(100, Math.max(0, Math.round(val * 10) / 10));
  const statusInfo = getRateStatus(val, targetPct);
  const color = statusInfo.color === palette.textMuted ? '#64748b' : statusInfo.color;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 130 }}>
      <Progress
        percent={pct}
        size="small"
        strokeColor={color}
        trailColor="#f1f5f9"
        showInfo={false}
        style={{ flex: 1, margin: 0 }}
      />
      <Text strong style={{ fontSize: 12, minWidth: 44, textAlign: 'right', color, fontWeight: 700 }}>
        {pct.toFixed(1)}%
      </Text>
    </div>
  );
}

function getVehicleStatus(vehicle: KpiVehicleBreakdown) {
  return combineStatuses([
    getRateStatus(vehicle.avgVolumeUtilPct, REPORT_THRESHOLDS.VOLUME_UTILIZATION_TARGET_PCT),
    getRateStatus(vehicle.avgWeightUtilPct, REPORT_THRESHOLDS.WEIGHT_UTILIZATION_TARGET_PCT),
  ]);
}

interface VehiclePerformanceTableProps {
  vehicles: KpiVehicleBreakdown[] | null;
  loading: boolean;
  loadFailed: boolean;
}

const VehiclePerformanceTable: React.FC<VehiclePerformanceTableProps> = ({ vehicles, loading, loadFailed }) => {
  const columns: ColumnsType<KpiVehicleBreakdown> = [
    {
      title: 'Biển số xe',
      dataIndex: 'licensePlate',
      key: 'licensePlate',
      width: 130,
      render: (plate: string) => <StatusBadge icon={<Truck size={12} />}>{plate}</StatusBadge>,
    },
    { title: 'Loại xe', dataIndex: 'vehicleType', key: 'vehicleType', width: 130, render: (t: string | null) => t || '—' },
    {
      title: 'Tải trọng / Thể tích',
      key: 'capacity',
      width: 150,
      render: (_, r) => (
        <Text style={{ fontSize: 12 }}>
          {r.payloadKg ? `${r.payloadKg} kg` : '—'} / {r.maxVolumeM3 ? `${r.maxVolumeM3} m³` : '—'}
        </Text>
      ),
    },
    { title: 'Số chuyến', dataIndex: 'totalTrips', key: 'totalTrips', width: 90, align: 'right' },
    {
      title: 'Quãng đường',
      dataIndex: 'totalDistanceKm',
      key: 'totalDistanceKm',
      width: 120,
      align: 'right',
      render: (val: number | null) => (val === null ? '—' : `${val.toFixed(1)} km`),
    },
    {
      title: 'Lấp đầy thể tích',
      dataIndex: 'avgVolumeUtilPct',
      key: 'avgVolumeUtilPct',
      width: 170,
      sorter: (a, b) => (a.avgVolumeUtilPct ?? -1) - (b.avgVolumeUtilPct ?? -1),
      defaultSortOrder: 'ascend',
      render: (val: number | null) => renderRateProgress(val, REPORT_THRESHOLDS.VOLUME_UTILIZATION_TARGET_PCT),
    },
    {
      title: 'Lấp đầy tải trọng',
      dataIndex: 'avgWeightUtilPct',
      key: 'avgWeightUtilPct',
      width: 170,
      sorter: (a, b) => (a.avgWeightUtilPct ?? -1) - (b.avgWeightUtilPct ?? -1),
      render: (val: number | null) => renderRateProgress(val, REPORT_THRESHOLDS.WEIGHT_UTILIZATION_TARGET_PCT),
    },
    {
      title: 'Tỷ lệ đúng giờ',
      dataIndex: 'onTimeRatePct',
      key: 'onTimeRatePct',
      width: 170,
      sorter: (a, b) => (a.onTimeRatePct ?? -1) - (b.onTimeRatePct ?? -1),
      render: (val: number | null) => renderRateProgress(val, REPORT_THRESHOLDS.ON_TIME_TARGET_PCT),
    },
    {
      title: 'Sự cố',
      dataIndex: 'totalExceptions',
      key: 'totalExceptions',
      width: 90,
      align: 'right',
      render: (val: number) => (
        <Text strong style={{ color: val > 0 ? palette.danger : undefined }}>
          {val}
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 130,
      render: (_, record) => {
        const status = getVehicleStatus(record);
        return <StatusBadge color={status.badgeColor}>{status.shortLabel}</StatusBadge>;
      },
    },
  ];

  if (loadFailed) {
    return (
      <Empty
        description="Không thể tải dữ liệu phương tiện. Vui lòng thử làm mới trang."
        style={{ padding: '32px 0' }}
      />
    );
  }

  return (
    <Table<KpiVehicleBreakdown>
      columns={columns}
      dataSource={vehicles ?? []}
      rowKey="vehicleId"
      pagination={{ defaultPageSize: 5, pageSizeOptions: ['5', '10', '20', '50', '100'], showSizeChanger: true }}
      loading={loading}
      locale={{ emptyText: <Empty description="Không có xe nào có chuyến trong kỳ." /> }}
      scroll={{ x: 1150 }}
      onRow={(record) => {
        const status = getVehicleStatus(record);
        return status.severity === 'warning' ? { style: { background: palette.statusWarningBg } } : {};
      }}
    />
  );
};

export default VehiclePerformanceTable;
