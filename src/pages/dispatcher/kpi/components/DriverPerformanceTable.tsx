import React from 'react';
import { Empty, Progress, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { palette } from '../../../../theme/tokens';
import { REPORT_THRESHOLDS } from '../../../../constants/reportThresholds';
import { getRateStatus } from '../../../../utils/performanceStatus';
import type { KpiDriverBreakdown } from '../../../../types/kpi';

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

interface DriverPerformanceTableProps {
  drivers: KpiDriverBreakdown[];
  loading: boolean;
}

const DriverPerformanceTable: React.FC<DriverPerformanceTableProps> = ({ drivers, loading }) => {
  const columns: ColumnsType<KpiDriverBreakdown> = [
    {
      title: 'Tài xế',
      key: 'driver',
      render: (_, record) => (
        <div>
          <Text strong>{record.fullName}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {[record.driverCode, record.phoneNumber].filter(Boolean).join(' · ') || '—'}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Số chuyến',
      dataIndex: 'totalTrips',
      key: 'totalTrips',
      width: 100,
      align: 'right',
      sorter: (a, b) => a.totalTrips - b.totalTrips,
    },
    {
      title: 'Quãng đường',
      dataIndex: 'totalDistanceKm',
      key: 'totalDistanceKm',
      width: 130,
      align: 'right',
      sorter: (a, b) => (a.totalDistanceKm ?? -1) - (b.totalDistanceKm ?? -1),
      render: (val: number | null) => (val === null ? '—' : `${val.toFixed(1)} km`),
    },
    {
      title: 'Quãng đường TB/chuyến',
      key: 'avgDistancePerTrip',
      width: 150,
      align: 'right',
      render: (_, record) =>
        record.totalTrips > 0 && record.totalDistanceKm !== null
          ? `${(record.totalDistanceKm / record.totalTrips).toFixed(1)} km`
          : '—',
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
      width: 100,
      align: 'right',
      render: (val: number) => (
        <Text strong style={{ color: val > 0 ? palette.danger : undefined }}>
          {val}
        </Text>
      ),
    },
  ];

  return (
    <Table<KpiDriverBreakdown>
      columns={columns}
      dataSource={drivers}
      rowKey="driverId"
      pagination={{ defaultPageSize: 5, pageSizeOptions: ['5', '10', '20', '50', '100'], showSizeChanger: true }}
      loading={loading}
      locale={{ emptyText: <Empty description="Không có tài xế nào có chuyến trong kỳ." /> }}
      scroll={{ x: 900 }}
    />
  );
};

export default DriverPerformanceTable;
