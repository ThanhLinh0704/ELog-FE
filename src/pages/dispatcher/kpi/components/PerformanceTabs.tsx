import React from 'react';
import { Card, Space, Tabs } from 'antd';
import { MapPin, Truck, User } from 'lucide-react';
import { palette } from '../../../../theme/tokens';
import RoutePerformanceTable from './RoutePerformanceTable';
import DriverPerformanceTable from './DriverPerformanceTable';
import VehiclePerformanceTable from './VehiclePerformanceTable';
import type { KpiByDriverResponse, KpiByRouteResponse, KpiByVehicleResponse, KpiRouteBreakdown } from '../../../../types/kpi';

interface PerformanceTabsProps {
  byRoute: KpiByRouteResponse | null;
  byDriver: KpiByDriverResponse | null;
  byVehicle: KpiByVehicleResponse | null;
  vehicleLoadFailed: boolean;
  loading: boolean;
  defaultActiveKey?: 'by-route' | 'by-driver' | 'by-vehicle';
  activeKey?: string;
  onTabChange?: (key: string) => void;
  onRouteRowClick: (route: KpiRouteBreakdown) => void;
}

const PerformanceTabs: React.FC<PerformanceTabsProps> = ({
  byRoute,
  byDriver,
  byVehicle,
  vehicleLoadFailed,
  loading,
  defaultActiveKey = 'by-route',
  activeKey,
  onTabChange,
  onRouteRowClick,
}) => {
  return (
    <Card
      size="small"
      style={{
        borderRadius: 14,
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.05)',
        border: `1px solid ${palette.borderSoft}`,
        background: '#ffffff',
      }}
      styles={{ body: { padding: '0 20px 20px 20px' } }}
    >
      <Tabs
        defaultActiveKey={defaultActiveKey}
        activeKey={activeKey}
        onChange={onTabChange}
        items={[
          {
            key: 'by-route',
            label: (
              <Space size={6}>
                <MapPin size={16} />
                <span>Hiệu suất theo Tuyến ({byRoute?.routes.length ?? 0})</span>
              </Space>
            ),
            children: <RoutePerformanceTable routes={byRoute?.routes ?? []} loading={loading && !byRoute} onRowClick={onRouteRowClick} />,
          },
          {
            key: 'by-driver',
            label: (
              <Space size={6}>
                <User size={16} />
                <span>Hiệu suất theo Tài xế ({byDriver?.drivers.length ?? 0})</span>
              </Space>
            ),
            children: <DriverPerformanceTable drivers={byDriver?.drivers ?? []} loading={loading && !byDriver} />,
          },
          {
            key: 'by-vehicle',
            label: (
              <Space size={6}>
                <Truck size={16} />
                <span>Hiệu suất theo Phương tiện / Xe ({byVehicle?.vehicles.length ?? 0})</span>
              </Space>
            ),
            children: (
              <VehiclePerformanceTable
                vehicles={byVehicle?.vehicles ?? null}
                loading={loading && !byVehicle && !vehicleLoadFailed}
                loadFailed={vehicleLoadFailed}
              />
            ),
          },
        ]}
      />
    </Card>
  );
};

export default PerformanceTabs;
