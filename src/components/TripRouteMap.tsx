import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Alert } from 'antd';
import { MapPin } from 'lucide-react';
import type { StopProgress } from '../types/monitoring';

interface TripRouteMapProps {
  stops: StopProgress[];
}

// Colors by status
const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#52c41a',
  IN_PROGRESS: '#fa8c16',
  EXCEPTION: '#ff4d4f',
  PENDING: '#1677ff',
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Đã hoàn thành',
  IN_PROGRESS: 'Đang giao',
  EXCEPTION: 'Có ngoại lệ',
  PENDING: 'Chờ đến',
};

function makeMarkerIcon(color: string, seq: number): L.DivIcon {
  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        color: #ffffff;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 700;
        border: 2px solid #ffffff;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      ">
        ${seq}
      </div>
    `,
    className: 'custom-trip-map-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function formatTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoStr;
  }
}

export const TripRouteMap: React.FC<TripRouteMapProps> = ({ stops }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Filter stops with valid coordinates & sort by sequenceOrder
  const validStops = [...stops]
    .filter((s) => s.latitude !== null && s.longitude !== null && !isNaN(Number(s.latitude)) && !isNaN(Number(s.longitude)))
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default center: HCM City
    const initialLat = validStops.length > 0 ? validStops[0].latitude! : 10.762622;
    const initialLng = validStops.length > 0 ? validStops[0].longitude! : 106.660172;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 13,
    });

    const googleRoad = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Maps',
      maxZoom: 19,
    });

    googleRoad.addTo(map);

    if (validStops.length > 0) {
      const latlngs: L.LatLngTuple[] = validStops.map((s) => [s.latitude!, s.longitude!]);

      // Draw polyline connecting stops
      L.polyline(latlngs, {
        color: '#1677ff',
        weight: 4,
        opacity: 0.75,
        dashArray: '8, 6',
      }).addTo(map);

      // Add markers
      validStops.forEach((stop) => {
        const color = STATUS_COLORS[stop.status] || '#8c8c8c';
        const icon = makeMarkerIcon(color, stop.sequenceOrder);

        const marker = L.marker([stop.latitude!, stop.longitude!], { icon }).addTo(map);

        const label = STATUS_LABELS[stop.status] || stop.status;
        const eta = formatTime(stop.plannedEta);
        const arrival = formatTime(stop.actualArrivalTime);

        marker.bindPopup(`
          <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 180px; padding: 2px;">
            <div style="font-weight: 700; font-size: 13px; color: #1f2937; margin-bottom: 4px;">
              #${stop.sequenceOrder} — ${stop.storeCode}
            </div>
            ${stop.storeName ? `<div style="font-size: 12px; color: #4b5563; margin-bottom: 6px;">${stop.storeName}</div>` : ''}
            <div style="font-size: 11px; color: #6b7280; display: flex; flex-direction: column; gap: 2px;">
              <div>ETA dự kiến: <strong style="color: #111827;">${eta}</strong></div>
              <div>Đến thực tế: <strong style="color: #111827;">${arrival}</strong></div>
              <div style="margin-top: 4px;">
                Trạng thái: 
                <span style="
                  background: ${color}15;
                  color: ${color};
                  border: 1px solid ${color}40;
                  padding: 1px 6px;
                  border-radius: 4px;
                  font-weight: 600;
                ">${label}</span>
              </div>
            </div>
          </div>
        `);
      });

      // Fit map bounds to show all markers
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    mapRef.current = map;

    // Invalidate size after drawer animation finishes
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  if (validStops.length === 0) {
    return (
      <Alert
        type="warning"
        showIcon
        icon={<MapPin size={16} />}
        message="Chưa có tọa độ điểm giao hàng"
        description="Các cửa hàng trong chuyến này chưa được thiết lập tọa độ (Latitude / Longitude). Vui lòng cập nhật tọa độ cửa hàng trong trang Quản lý Cửa hàng."
        style={{ borderRadius: 8 }}
      />
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={mapContainerRef}
        style={{
          height: 340,
          borderRadius: 8,
          border: '1px solid #d9d9d9',
          overflow: 'hidden',
          zIndex: 1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          zIndex: 1000,
          background: 'rgba(255, 255, 255, 0.92)',
          padding: '6px 12px',
          borderRadius: 6,
          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
          fontSize: 11,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          backdropFilter: 'blur(4px)',
        }}
      >
        <span style={{ fontWeight: 600, color: '#374151' }}>Chú thích:</span>
        <span style={{ color: '#52c41a', fontWeight: 600 }}>● Hoàn thành</span>
        <span style={{ color: '#fa8c16', fontWeight: 600 }}>● Đang giao</span>
        <span style={{ color: '#ff4d4f', fontWeight: 600 }}>● Ngoại lệ</span>
        <span style={{ color: '#1677ff', fontWeight: 600 }}>● Chờ đến</span>
      </div>
    </div>
  );
};
