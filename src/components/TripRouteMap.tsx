import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { Alert, Button, Space, Tag, Tooltip } from 'antd';
import { MapPin, Play, Pause, RotateCcw, Truck } from 'lucide-react';
import type { StopProgress } from '../types/monitoring';
import { decodePolyline } from '../utils/polyline';

interface TripRouteMapProps {
  stops: StopProgress[];
  /** Encoded polyline (Goong.io/Google format); multiple legs joined by ';'. Optional — falls back to straight lines between stops when the backend hasn't provided a real road route yet. */
  routePolyline?: string | null;
  totalDistanceKm?: number | null;
}

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

function formatTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return isoStr;
  }
}

function haversineDistance(p1: L.LatLngTuple, p2: L.LatLngTuple): number {
  const R = 6371;
  const dLat = ((p2[0] - p1[0]) * Math.PI) / 180;
  const dLng = ((p2[1] - p1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1[0] * Math.PI) / 180) *
      Math.cos((p2[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

function makeWarehouseMarkerIcon(): L.DivIcon {
  return L.divIcon({
    html: `
      <div style="
        background: #1e293b;
        color: #ffffff;
        padding: 4px 10px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 11px;
        font-weight: 700;
        border: 2px solid #ffffff;
        box-shadow: 0 3px 8px rgba(0,0,0,0.4);
        white-space: nowrap;
      ">
        <span style="font-size: 14px;">🏢</span> KHO XUẤT HÀNG
      </div>
    `,
    className: 'custom-warehouse-marker',
    iconSize: [125, 30],
    iconAnchor: [62, 15],
    popupAnchor: [0, -15],
  });
}

export const TripRouteMap: React.FC<TripRouteMapProps> = ({
  stops,
  routePolyline,
  totalDistanceKm,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const truckMarkerRef = useRef<L.Marker | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [simInfo, setSimInfo] = useState<string>('Sẵn sàng');

  const validStops = [...stops]
    .filter(
      (s) =>
        s.latitude !== null &&
        s.longitude !== null &&
        !isNaN(Number(s.latitude)) &&
        !isNaN(Number(s.longitude))
    )
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  // Primitive stable key so the map only re-inits when a stop's identity/coords/status
  // actually changes — avoids infinite re-render / map flashing on every parent re-render.
  const stopsKey = validStops.map((s) => `${s.tripStopId}-${s.status}-${s.latitude}-${s.longitude}`).join('|');

  const trackRef = useRef<{
    points: L.LatLngTuple[];
    distances: number[];
    totalDistance: number;
    currentDistance: number;
    speedMps: number;
  }>({
    points: [],
    distances: [],
    totalDistance: 0,
    currentDistance: 0,
    speedMps: 0,
  });

  // Compute track points (road-following polyline when available, otherwise straight lines)
  useEffect(() => {
    if (validStops.length < 1) return;
    let points: L.LatLngTuple[] = [];
    if (routePolyline) {
      const polyParts = routePolyline.split(';');
      let decodedPoints: L.LatLngTuple[] = [];
      polyParts.forEach((part) => {
        if (part.trim()) {
          decodedPoints = decodedPoints.concat(decodePolyline(part.trim()));
        }
      });
      if (decodedPoints.length > 0) {
        points = decodedPoints;
      }
    }
    if (points.length === 0) {
      points = validStops.map((s) => [s.latitude!, s.longitude!]);
    }

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
      speedMps: total / 120,
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsKey, routePolyline]);

  const updateTruckPositionAtDistance = useCallback((dist: number) => {
    if (!truckMarkerRef.current) return;

    const { points, distances, totalDistance } = trackRef.current;
    if (points.length === 0) return;

    const clampedDist = Math.max(0, Math.min(dist, totalDistance));

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

    const activeSeq = segmentIndex + 1;
    const nextSeq = segmentIndex + 2 <= validStops.length ? segmentIndex + 2 : activeSeq;
    setSimInfo(`Xe đang di chuyển: #${activeSeq} ➔ #${nextSeq}`);
  }, [validStops.length]);

  // Main Map Init — Leaflet with crisp, reliable tile layer
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const initialLat = validStops.length > 0 ? validStops[0].latitude! : 21.0315;
    const initialLng = validStops.length > 0 ? validStops[0].longitude! : 105.7491;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 12,
    });

    const mapTileLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      attribution: '&copy; Map Data',
      maxZoom: 19,
    });
    mapTileLayer.addTo(map);
    mapRef.current = map;

    if (validStops.length > 0) {
      const latlngs: L.LatLngTuple[] = validStops.map((s) => [s.latitude!, s.longitude!]);
      let warehousePos: L.LatLngTuple | null = null;

      // Route polyline
      if (routePolyline) {
        const polyParts = routePolyline.split(';');
        let decodedPoints: L.LatLngTuple[] = [];
        polyParts.forEach((part) => {
          if (part.trim()) {
            decodedPoints = decodedPoints.concat(decodePolyline(part.trim()));
          }
        });

        if (decodedPoints.length > 0) {
          warehousePos = decodedPoints[0];
          const pathLayer = L.polyline(decodedPoints, {
            color: '#1677ff',
            weight: 5,
            opacity: 0.85,
            lineJoin: 'round',
          }).addTo(map);
          map.fitBounds(pathLayer.getBounds(), { padding: [40, 40] });
        }
      } else {
        L.polyline(latlngs, {
          color: '#1677ff',
          weight: 4,
          opacity: 0.75,
          dashArray: '8, 6',
        }).addTo(map);
        map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
      }

      // 1. Warehouse Marker (only known when we have a real route polyline to anchor it to)
      if (warehousePos) {
        const whMarker = L.marker(warehousePos, {
          icon: makeWarehouseMarkerIcon(),
          zIndexOffset: 950,
        }).addTo(map);

        whMarker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; padding: 2px;">
            <div style="font-weight: 700; font-size: 13px; color: #1e293b;">🏢 KHO XUẤT HÀNG</div>
            <div style="font-size: 11px; color: #6b7280;">Điểm khởi đầu tuyến đường bốc hàng</div>
          </div>
        `);
      }

      // 2. Stop Markers (#1 to #N)
      validStops.forEach((stop, idx) => {
        const seqNum = idx + 1;
        const color = STATUS_COLORS[stop.status] || '#8c8c8c';
        const icon = makeMarkerIcon(color, seqNum);
        const marker = L.marker([stop.latitude!, stop.longitude!], { icon }).addTo(map);

        const label = STATUS_LABELS[stop.status] || stop.status;
        const eta = formatTime(stop.plannedEta);
        const arrival = formatTime(stop.actualArrivalTime);

        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; min-width: 180px; padding: 2px;">
            <div style="font-weight: 700; font-size: 13px; color: #1f2937; margin-bottom: 4px;">
              #${seqNum} — ${stop.storeCode}
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

      // 3. Truck Marker
      const initialTruckPos = warehousePos || latlngs[0];
      const truckMarker = L.marker(initialTruckPos, {
        icon: makeTruckMarkerIcon(),
        zIndexOffset: 1000,
      }).addTo(map);

      truckMarker.bindPopup(`
        <div style="font-family: system-ui, sans-serif; padding: 2px;">
          <div style="font-weight: 700; font-size: 13px; color: #1677ff;">🚚 Vị Trí Xe Tải Bàn Giao</div>
          <div style="font-size: 11px; color: #6b7280;">GPS Mockup: Di chuyển theo thời gian thực</div>
        </div>
      `);

      truckMarkerRef.current = truckMarker;
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsKey, routePolyline]);

  const startTimeRef = useRef<number | null>(null);

  // Time-based smooth animation loop (15-second full simulation run)
  useEffect(() => {
    if (!isPlaying) {
      startTimeRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const durationMs = 15000; // 15 seconds duration for smooth visible movement

    if (trackRef.current.currentDistance >= trackRef.current.totalDistance) {
      trackRef.current.currentDistance = 0;
    }

    const startDist = trackRef.current.currentDistance;
    const targetDist = trackRef.current.totalDistance;
    const distToTravel = targetDist - startDist;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(1, elapsed / durationMs);

      const currentDist = startDist + progress * distToTravel;
      trackRef.current.currentDistance = currentDist;
      updateTruckPositionAtDistance(currentDist);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        setSimInfo('Đã hoàn thành tuyến đường');
        startTimeRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, updateTruckPositionAtDistance]);

  const handlePlayPause = () => {
    if (trackRef.current.currentDistance >= trackRef.current.totalDistance) {
      trackRef.current.currentDistance = 0;
      updateTruckPositionAtDistance(0);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleReset = () => {
    setIsPlaying(false);
    startTimeRef.current = null;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    trackRef.current.currentDistance = 0;
    updateTruckPositionAtDistance(0);
    setSimInfo('Sẵn sàng');
  };

  const distKmDisplay = totalDistanceKm
    ? totalDistanceKm.toFixed(2)
    : (trackRef.current.totalDistance).toFixed(2);

  if (validStops.length === 0) {
    return (
      <Alert
        message="Bản đồ không khả dụng"
        description="Không tìm thấy tọa độ hợp lệ cho các điểm giao của chuyến xe này."
        type="warning"
        showIcon
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Control Bar Above Map */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f8fafc',
          padding: '10px 14px',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
        }}
      >
        <Space size="middle">
          <Tag color="blue" icon={<Truck size={14} />} style={{ padding: '4px 10px', fontSize: 13, borderRadius: 6 }}>
            Mô phỏng GPS
          </Tag>
          <Tag color="magenta" icon={<MapPin size={14} />} style={{ padding: '4px 10px', fontSize: 13, borderRadius: 6 }}>
            {distKmDisplay} km
          </Tag>
          <Tag style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12, fontWeight: 500 }}>
            {simInfo}
          </Tag>
        </Space>

        <Space size="small">
          <Button
            type="primary"
            icon={isPlaying ? <Pause size={15} /> : <Play size={15} />}
            onClick={handlePlayPause}
            size="middle"
            style={{ borderRadius: 6, fontWeight: 600 }}
          >
            {isPlaying ? 'Tạm dừng mô phỏng' : '▷ Mô phỏng xe chạy'}
          </Button>
          <Tooltip title="Đặt lại vị trí ban đầu">
            <Button
              icon={<RotateCcw size={15} />}
              onClick={handleReset}
              size="middle"
              style={{ borderRadius: 6, background: '#ffffff' }}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Map Container */}
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb' }}>
        <div
          ref={mapContainerRef}
          style={{ width: '100%', height: 420, borderRadius: 12, zIndex: 1 }}
        />
      </div>

      {/* Legend Footer */}
      <div
        style={{
          padding: '8px 16px',
          background: '#fafafa',
          borderRadius: 8,
          border: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 12,
          color: '#6b7280',
        }}
      >
        <Space size="large">
          <span>Chú thích:</span>
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <span key={status} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: STATUS_COLORS[status],
                  display: 'inline-block',
                }}
              />
              {label}
            </span>
          ))}
        </Space>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>
          {routePolyline ? '© Leaflet Map (Đường đi từ Goong API)' : '© Leaflet Map (Ước tính đường thẳng — chưa có dữ liệu tuyến đường thực tế)'}
        </span>
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

export default TripRouteMap;
