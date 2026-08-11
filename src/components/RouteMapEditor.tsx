import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { message } from 'antd';
import type { DeliveryRoute, RouteStop, StoreSearchResult } from '../types/route';
import { routeApi } from '../api/routeApi';
import { decodePolyline } from '../utils/polyline';

interface RouteMapEditorProps {
  stores: StoreSearchResult[];
  activeRoute: DeliveryRoute | null;
  routes: DeliveryRoute[];
  stops: RouteStop[];
  onAddStoreToRoute: (store: StoreSearchResult) => void;
  onRemoveStop: (stopIdOrStoreId: string) => void;
  height?: string | number;
  // Bump this (e.g. Date.now()) to force-refetch directions with forceRefresh=true —
  // BE clears the cached route_polyline and recomputes via Goong (xem
  // filemd/FE_Route_Directions_Force_Refresh_Guide.md).
  refreshKey?: number;
}

// Kho tổng — dùng tạm cho tới khi GET /routes/{id}/directions trả về toạ độ thật
const FALLBACK_WAREHOUSE_POSITION: L.LatLngTuple = [21.032612, 105.868367];

const OTHER_ROUTE_COLOR = '#722ed1';
const ACTIVE_STOP_COLOR = '#1677ff';

function shortRouteLabel(code: string): string {
  return code.replace(/^RT-/i, '');
}

function makeStopIcon(seq: number): L.DivIcon {
  return L.divIcon({
    html: `
      <div style="
        background: ${ACTIVE_STOP_COLOR};
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
      ">${seq}</div>
    `,
    className: 'route-editor-stop-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

function makeOtherRouteIcon(label: string): L.DivIcon {
  return L.divIcon({
    html: `
      <div style="
        background: ${OTHER_ROUTE_COLOR};
        color: #ffffff;
        min-width: 26px;
        height: 20px;
        padding: 0 4px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 700;
        border: 1.5px solid #ffffff;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        white-space: nowrap;
      ">${label}</div>
    `,
    className: 'route-editor-other-marker',
    iconSize: [26, 20],
    iconAnchor: [13, 10],
    popupAnchor: [0, -10],
  });
}

function makeWarehouseIcon(): L.DivIcon {
  return L.divIcon({
    html: `
      <div style="
        background: #1e293b;
        color: #ffffff;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        border: 2.5px solid #ffffff;
        box-shadow: 0 3px 8px rgba(0,0,0,0.4);
      ">🏢</div>
    `,
    className: 'route-editor-warehouse-marker',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -17],
  });
}

const RouteMapEditor: React.FC<RouteMapEditorProps> = ({
  stores,
  activeRoute,
  routes,
  stops,
  onAddStoreToRoute,
  onRemoveStop,
  height = '100%',
  refreshKey,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Toạ độ kho + polyline đường thật (Goong Directions, qua BE) cho route đang chọn.
  // routePolyline null = BE chưa cấu hình Goong / route quá ít điểm dừng — FE fallback về
  // đường thẳng nối trực tiếp giữa các điểm (xem đoạn vẽ polyline bên dưới).
  const [warehousePosition, setWarehousePosition] = useState<L.LatLngTuple>(FALLBACK_WAREHOUSE_POSITION);
  const [routePolyline, setRoutePolyline] = useState<string | null>(null);

  useEffect(() => {
    if (!activeRoute?.id) {
      setRoutePolyline(null);
      return;
    }
    let cancelled = false;
    const force = Boolean(refreshKey && refreshKey > 0);
    routeApi.getRouteDirections(String(activeRoute.id), force)
      .then((res) => {
        if (cancelled) return;
        setWarehousePosition([res.warehouseLat, res.warehouseLng]);
        setRoutePolyline(res.routePolyline);
      })
      .catch(() => {
        if (cancelled) return;
        setRoutePolyline(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRoute?.id, refreshKey]);

  const sortedStops = [...stops].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  const stopsKey = sortedStops.map((s) => `${s.id}-${s.storeId}-${s.sequenceOrder}`).join('|');
  const activeStoreIds = new Set(sortedStops.map((s) => String(s.storeId)));

  const routeCodeById = new Map(routes.map((r) => [String(r.id), r.code]));

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const activeStops = sortedStops.filter(
      (s) => s.latitude != null && s.longitude != null
    );

    const initialCenter: L.LatLngTuple =
      activeStops.length > 0 ? [activeStops[0].latitude!, activeStops[0].longitude!] : warehousePosition;

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: 9,
    });

    L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      attribution: '&copy; Map Data',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // 1. Warehouse marker
    const whMarker = L.marker(warehousePosition, {
      icon: makeWarehouseIcon(),
      zIndexOffset: 1000,
    }).addTo(map);
    whMarker.bindPopup(`
      <div style="font-family: system-ui, sans-serif;">
        <div style="font-weight: 700; font-size: 13px; color: #1e293b;">🏢 Kho tổng</div>
      </div>
    `);

    const boundsPoints: L.LatLngTuple[] = [warehousePosition];

    // 2. Active route stops — numbered markers + connecting polyline.
    // Dùng đường thật (Goong Directions, qua BE) khi có; nếu BE chưa cấu hình Goong hoặc
    // gọi lỗi, routePolyline = null và ta fallback về đường thẳng nối trực tiếp các điểm.
    if (activeStops.length > 0) {
      const decoded = routePolyline ? decodePolyline(routePolyline) : [];
      const linePoints: L.LatLngTuple[] =
        decoded.length > 0
          ? (decoded as L.LatLngTuple[])
          : [warehousePosition, ...activeStops.map((s): L.LatLngTuple => [s.latitude!, s.longitude!])];

      L.polyline(linePoints, {
        color: ACTIVE_STOP_COLOR,
        weight: 4,
        opacity: 0.8,
        ...(decoded.length === 0 ? { dashArray: '6, 6' } : {}),
      }).addTo(map);

      activeStops.forEach((stop, idx) => {
        const pos: L.LatLngTuple = [stop.latitude!, stop.longitude!];
        boundsPoints.push(pos);
        const marker = L.marker(pos, { icon: makeStopIcon(idx + 1) }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; min-width: 180px;">
            <div style="font-weight: 700; font-size: 13px; color: #1f2937; margin-bottom: 4px;">
              #${idx + 1} — [${stop.storeCode}] ${stop.storeName}
            </div>
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">${stop.address}</div>
            <button id="route-editor-remove-${stop.id}" style="
              background: #fff1f0; color: #cf1322; border: 1px solid #ffa39e;
              border-radius: 4px; padding: 4px 10px; font-size: 12px; cursor: pointer;
            ">Xoá khỏi tuyến</button>
          </div>
        `);
        marker.on('popupopen', () => {
          const btn = document.getElementById(`route-editor-remove-${stop.id}`);
          btn?.addEventListener('click', () => {
            onRemoveStop(String(stop.id || stop.storeId));
            map.closePopup();
          });
        });
      });
    }

    // 3. Other routes' stores — small purple badge markers (reference layer)
    stores.forEach((store) => {
      if (store.latitude == null || store.longitude == null) return;
      if (activeStoreIds.has(String(store.id))) return;

      const pos: L.LatLngTuple = [store.latitude, store.longitude];

      if (store.routeId && String(store.routeId) !== String(activeRoute?.id ?? '')) {
        const label = shortRouteLabel(routeCodeById.get(String(store.routeId)) || '?');
        const marker = L.marker(pos, { icon: makeOtherRouteIcon(label) }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; min-width: 160px;">
            <div style="font-weight: 700; font-size: 12px; color: #1f2937;">[${store.code}] ${store.name}</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 2px;">Thuộc tuyến ${routeCodeById.get(String(store.routeId)) || ''}</div>
          </div>
        `);
        return;
      }

      // Unassigned store, available to add to the active route
      if (!store.routeId && activeRoute) {
        const marker = L.circleMarker(pos, {
          radius: 6,
          color: '#8c8c8c',
          fillColor: '#d9d9d9',
          fillOpacity: 0.9,
          weight: 1,
        }).addTo(map);
        marker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; min-width: 160px;">
            <div style="font-weight: 700; font-size: 12px; color: #1f2937;">[${store.code}] ${store.name}</div>
            <div style="font-size: 11px; color: #6b7280; margin: 4px 0 8px;">${store.address}</div>
            <button id="route-editor-add-${store.id}" style="
              background: #e6f4ff; color: #1677ff; border: 1px solid #91caff;
              border-radius: 4px; padding: 4px 10px; font-size: 12px; cursor: pointer;
            ">+ Thêm vào tuyến</button>
          </div>
        `);
        marker.on('popupopen', () => {
          const btn = document.getElementById(`route-editor-add-${store.id}`);
          btn?.addEventListener('click', () => {
            onAddStoreToRoute(store);
            message.success(`Đã thêm ${store.name} vào bản nháp tuyến.`);
            map.closePopup();
          });
        });
      }
    });

    // animate: false — effect tái tạo lại map mỗi khi routePolyline/warehousePosition đổi (sau khi
    // fetch directions xong); nếu để animate mặc định, pan animation dở dang của map cũ có thể callback
    // trễ vào marker đã bị map.remove() dọn mất, ném lỗi "_leaflet_pos" (đã gặp thực tế khi test).
    if (boundsPoints.length > 1) {
      map.fitBounds(L.latLngBounds(boundsPoints), { padding: [40, 40], animate: false });
    } else {
      map.setView(warehousePosition, 9, { animate: false });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsKey, stores, routes, activeRoute?.id, warehousePosition, routePolyline]);

  return <div ref={containerRef} style={{ width: '100%', height, zIndex: 1 }} />;
};

export default RouteMapEditor;
