import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Alert, Button, Space, Tag, Tooltip } from 'antd';
import { MapPin, Play, Pause, RotateCcw, Truck } from 'lucide-react';
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

function makeTruckMarkerIcon(): L.DivIcon {
  return L.divIcon({
    html: `
      <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
        <div style="
          position: absolute;
          width: 42px; height: 42px;
          border-radius: 50%;
          background: rgba(22, 119, 255, 0.25);
          animation: pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        "></div>
        <div style="
          background: #1677ff;
          color: #ffffff;
          width: 34px; height: 34px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          position: relative; z-index: 2;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="1" y="3" width="15" height="13" rx="2" ry="2" fill="none"/>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" fill="currentColor"/>
            <circle cx="5.5" cy="18.5" r="2.5" fill="#ffffff"/>
            <circle cx="18.5" cy="18.5" r="2.5" fill="#ffffff"/>
          </svg>
        </div>
      </div>
    `,
    className: 'truck-sim-marker',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -22],
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

// Distance helper between 2 lat/lng points in meters
function haversineDistance(p1: L.LatLngTuple, p2: L.LatLngTuple): number {
  const R = 6371000;
  const dLat = ((p2[0] - p1[0]) * Math.PI) / 180;
  const dLng = ((p2[1] - p1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1[0] * Math.PI) / 180) * Math.cos((p2[0] * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const TripRouteMap: React.FC<TripRouteMapProps> = ({ stops }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const truckMarkerRef = useRef<L.Marker | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Filter stops with valid coordinates & sort by sequenceOrder
  const validStops = [...stops]
    .filter((s) => s.latitude !== null && s.longitude !== null && !isNaN(Number(s.latitude)) && !isNaN(Number(s.longitude)))
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  // Simulation states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [simInfo, setSimInfo] = useState<string>('Sẵn sàng');

  // Animation track parameters
  const trackRef = useRef<{
    points: L.LatLngTuple[];
    distances: number[];
    totalDistance: number;
    currentDistance: number;
    speedMps: number; // speed meters per frame
  }>({
    points: [],
    distances: [],
    totalDistance: 0,
    currentDistance: 0,
    speedMps: 0,
  });

  // Calculate cumulative track distances
  useEffect(() => {
    if (validStops.length < 2) return;
    const points: L.LatLngTuple[] = validStops.map((s) => [s.latitude!, s.longitude!]);
    const distances: number[] = [0];
    let total = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const d = haversineDistance(points[i], points[i + 1]);
      total += d;
      distances.push(total);
    }

    trackRef.current = {
      points,
      distances,
      totalDistance: total,
      currentDistance: 0,
      speedMps: total / 400, // Complete simulation in ~7-10 seconds
    };
  }, [validStops]);

  // Position truck at distance d along path
  const updateTruckPositionAtDistance = useCallback((dist: number) => {
    const { points, distances, totalDistance } = trackRef.current;
    if (points.length === 0 || !truckMarkerRef.current) return;

    const clampedDist = Math.max(0, Math.min(dist, totalDistance));

    // Find segment
    let segmentIndex = 0;
    while (segmentIndex < distances.length - 1 && distances[segmentIndex + 1] < clampedDist) {
      segmentIndex++;
    }

    if (segmentIndex >= points.length - 1) {
      const last = points[points.length - 1];
      truckMarkerRef.current.setLatLng(last);
      return;
    }

    const p1 = points[segmentIndex];
    const p2 = points[segmentIndex + 1];
    const segStartDist = distances[segmentIndex];
    const segLength = distances[segmentIndex + 1] - segStartDist;

    const ratio = segLength > 0 ? (clampedDist - segStartDist) / segLength : 0;
    const currentLat = p1[0] + (p2[0] - p1[0]) * ratio;
    const currentLng = p1[1] + (p2[1] - p1[1]) * ratio;

    truckMarkerRef.current.setLatLng([currentLat, currentLng]);

    // Update info text
    const activeStop = validStops[segmentIndex];
    const nextStop = validStops[segmentIndex + 1];
    setSimInfo(`Xe đang di chuyển: #${activeStop.sequenceOrder} ➔ #${nextStop?.sequenceOrder || activeStop.sequenceOrder}`);
  }, [validStops]);

  // Main Map Init
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

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

      // Route polyline
      L.polyline(latlngs, {
        color: '#1677ff',
        weight: 4,
        opacity: 0.75,
        dashArray: '8, 6',
      }).addTo(map);

      // Stop markers
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

      // Default truck initial position (placed at current active or first stop)
      const initialTruckPos = latlngs[0];
      const truckMarker = L.marker(initialTruckPos, {
        icon: makeTruckMarkerIcon(),
        zIndexOffset: 1000,
      }).addTo(map);

      truckMarker.bindPopup(`
        <div style="font-family: system-ui, -apple-system, sans-serif; padding: 2px;">
          <div style="font-weight: 700; font-size: 13px; color: #1677ff;">🚚 Vị Trí Xe Tải Bàn Giao</div>
          <div style="font-size: 11px; color: #6b7280;">GPS Mockup: Di chuyển theo thời gian thực</div>
        </div>
      `);

      truckMarkerRef.current = truckMarker;

      // Fit map bounds to show all markers
      const bounds = L.latLngBounds(latlngs);
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    mapRef.current = map;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Animation Loop
  const animate = useCallback(() => {
    const track = trackRef.current;

    if (track.currentDistance >= track.totalDistance) {
      setIsPlaying(false);
      setIsCompleted(true);
      setSimInfo('Đã hoàn thành toàn bộ tuyến đường!');
      return;
    }

    track.currentDistance += track.speedMps;
    updateTruckPositionAtDistance(track.currentDistance);

    animFrameRef.current = requestAnimationFrame(animate);
  }, [updateTruckPositionAtDistance]);

  const handlePlayPause = () => {
    if (isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setIsPlaying(false);
      setSimInfo('Tạm dừng mô phỏng');
    } else {
      if (isCompleted || trackRef.current.currentDistance >= trackRef.current.totalDistance) {
        trackRef.current.currentDistance = 0;
        setIsCompleted(false);
      }
      setIsPlaying(true);
      animFrameRef.current = requestAnimationFrame(animate);
    }
  };

  const handleReset = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsPlaying(false);
    setIsCompleted(false);
    trackRef.current.currentDistance = 0;
    updateTruckPositionAtDistance(0);
    setSimInfo('Đã đặt lại vị trí xuất phát');
  };

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
      {/* Simulation Control Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc',
          padding: '8px 12px',
          borderRadius: '8px 8px 0 0',
          border: '1px solid #d9d9d9',
          borderBottom: 'none',
        }}
      >
        <Space size={8}>
          <Tag color="processing" icon={<Truck size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />}>
            Mô phỏng GPS
          </Tag>
          <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>
            {simInfo}
          </span>
        </Space>

        <Space size={8}>
          <Button
            size="small"
            type={isPlaying ? 'default' : 'primary'}
            icon={isPlaying ? <Pause size={14} /> : <Play size={14} />}
            onClick={handlePlayPause}
            style={{ borderRadius: 6 }}
          >
            {isPlaying ? 'Tạm dừng' : isCompleted ? 'Chạy lại' : 'Mô phỏng xe chạy'}
          </Button>

          <Tooltip title="Đặt lại về vị trí ban đầu">
            <Button
              size="small"
              icon={<RotateCcw size={14} />}
              onClick={handleReset}
              disabled={isPlaying}
              style={{ borderRadius: 6 }}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Leaflet Map Canvas */}
      <div
        ref={mapContainerRef}
        style={{
          height: 340,
          borderRadius: '0 0 8px 8px',
          border: '1px solid #d9d9d9',
          overflow: 'hidden',
          zIndex: 1,
        }}
      />

      {/* Map Legend overlay */}
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

      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
