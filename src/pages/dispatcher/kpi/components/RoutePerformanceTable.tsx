import React from 'react';
import { Empty, Progress, Space, Table, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { palette } from '../../../../theme/tokens';
import StatusBadge from '../../../../components/StatusBadge';
import { REPORT_THRESHOLDS } from '../../../../constants/reportThresholds';
import { getRateStatus, getRouteStatus } from '../../../../utils/performanceStatus';
import type { KpiRouteBreakdown } from '../../../../types/kpi';

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

interface RoutePerformanceTableProps {
  routes: KpiRouteBreakdown[];
  loading: boolean;
  onRowClick: (route: KpiRouteBreakdown) => void;
}

const RoutePerformanceTable: React.FC<RoutePerformanceTableProps> = ({ routes, loading, onRowClick }) => {
  const columns: ColumnsType<KpiRouteBreakdown> = [
    {
      title: 'Mã tuyến',
      dataIndex: 'routeCode',
      key: 'routeCode',
      width: 110,
      render: (code: string) => (
        <Text strong style={{ color: palette.primary }}>
          {code}
        </Text>
      ),
    },
    { title: 'Tên tuyến', dataIndex: 'routeName', key: 'routeName' },
    { title: 'Số chuyến', dataIndex: 'totalTrips', key: 'totalTrips', width: 100, align: 'right' },
    {
      title: 'Tỷ lệ đúng giờ',
      dataIndex: 'onTimeRatePct',
      key: 'onTimeRatePct',
      width: 170,
      sorter: (a, b) => (a.onTimeRatePct ?? -1) - (b.onTimeRatePct ?? -1),
      defaultSortOrder: 'ascend',
      render: (val: number | null) => renderRateProgress(val, REPORT_THRESHOLDS.ON_TIME_TARGET_PCT),
    },
    {
      title: 'Tỷ lệ lấp đầy thể tích',
      dataIndex: 'avgVolumeUtilPct',
      key: 'avgVolumeUtilPct',
      width: 170,
      sorter: (a, b) => (a.avgVolumeUtilPct ?? -1) - (b.avgVolumeUtilPct ?? -1),
      render: (val: number | null) => renderRateProgress(val, REPORT_THRESHOLDS.VOLUME_UTILIZATION_TARGET_PCT),
    },
    {
      title: 'Sự cố',
      key: 'exceptions',
      width: 140,
      align: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Text strong style={{ color: record.totalExceptions > 0 ? palette.danger : undefined }}>
            {record.totalExceptions}
          </Text>
          {record.totalRejections > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              ({record.totalRejections} từ chối)
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 130,
      render: (_, record) => {
        const status = getRouteStatus(record);
        return <StatusBadge color={status.badgeColor}>{status.shortLabel}</StatusBadge>;
      },
    },
  ];

  return (
    <Table<KpiRouteBreakdown>
      columns={columns}
      dataSource={routes}
      rowKey="routeCode"
      pagination={{ defaultPageSize: 5, pageSizeOptions: ['5', '10', '20', '50', '100'], showSizeChanger: true }}
      loading={loading}
      locale={{ emptyText: <Empty description="Không có tuyến nào có chuyến trong kỳ." /> }}
      scroll={{ x: 900 }}
      onRow={(record) => ({ onClick: () => onRowClick(record), style: { cursor: 'pointer' } })}
    />
  );
};

export default RoutePerformanceTable;
