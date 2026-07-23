import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Button, Input, List } from 'antd';
import { Search } from 'lucide-react';

interface MapSelectorProps {
  latitude: number | null;
  longitude: number | null;
  onCoordinateChange: (lat: number, lng: number) => void;
  addressSearchText?: string;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export const MapSelector: React.FC<MapSelectorProps> = ({
  latitude,
  longitude,
  onCoordinateChange,
  addressSearchText,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const isSelectingRef = useRef(false);

  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Mặc định: Trung tâm Thành phố Hồ Chí Minh
  const DEFAULT_LAT = 10.762622;
  const DEFAULT_LNG = 106.660172;

  // Icon SVG Custom màu đỏ để tránh lỗi load ảnh marker.png của Vite
  const redMarkerIcon = L.divIcon({
    html: `
      <div style="color: #ff4d4f; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.35));">
        <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor" stroke="#ffffff" stroke-width="1.5">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `,
    className: 'custom-leaflet-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });

  // Khởi tạo bản đồ lần đầu
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialLat = latitude || DEFAULT_LAT;
    const initialLng = longitude || DEFAULT_LNG;

    const googleRoad = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Maps',
    });

    const googleHybrid = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
      attribution: '&copy; Google Maps',
    });

    const cartoVoyager = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    });

    const osmStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    });

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      layers: [googleRoad], // Set Google Road as default
    });

    const baseMaps = {
      'Google Bản đồ': googleRoad,
      'Google Vệ tinh': googleHybrid,
      'Giao diện tối giản': cartoVoyager,
      'Bản đồ mặc định': osmStandard,
    };

    L.control.layers(baseMaps, undefined, { position: 'topright' }).addTo(map);

    const marker = L.marker([initialLat, initialLng], {
      icon: redMarkerIcon,
      draggable: true,
    }).addTo(map);

    // Xử lý sự kiện kéo thả ghim
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      onCoordinateChange(position.lat, position.lng);
    });

    // Click bản đồ để chọn tọa độ mới
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onCoordinateChange(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Cập nhật vị trí ghim khi props thay đổi từ ngoài Form truyền vào
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;

    const lat = latitude || DEFAULT_LAT;
    const lng = longitude || DEFAULT_LNG;

    const currentPos = markerRef.current.getLatLng();
    if (currentPos.lat !== lat || currentPos.lng !== lng) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.panTo([lat, lng]);
    }
  }, [latitude, longitude]);

  // Nhận địa chỉ gợi ý từ nút bấm bên ngoài
  useEffect(() => {
    if (addressSearchText) {
      isSelectingRef.current = true;
      setSearchText(addressSearchText);
      handleSearch(addressSearchText);
    }
  }, [addressSearchText]);

  // Tự động tìm kiếm gợi ý khi người dùng gõ phím sau 500ms
  useEffect(() => {
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      return;
    }

    if (!searchText.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      // Chỉ tìm kiếm khi gõ trên 2 ký tự để tối ưu API call
      if (searchText.length > 2) {
        handleSearch(searchText);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  // Gọi API Nominatim để tìm tọa độ từ chuỗi địa chỉ
  async function handleSearch(queryText = searchText) {
    if (!queryText.trim()) return;

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          queryText
        )}&limit=5&countrycodes=vn`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Nominatim Geocoding API Error:', error);
    } finally {
      setSearching(false);
    }
  }

  // Chọn một kết quả gợi ý địa chỉ từ danh sách
  function selectPlace(place: SearchResult) {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);

    isSelectingRef.current = true;
    onCoordinateChange(lat, lng);
    setSearchResults([]);
    setSearchText(place.display_name);

    if (mapRef.current && markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], 16);
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <Input
          placeholder="Tìm địa chỉ trên bản đồ..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onPressEnter={() => handleSearch()}
        />
        <Button
          type="primary"
          icon={<Search size={16} />}
          loading={searching}
          onClick={() => handleSearch()}
        >
          Tìm kiếm
        </Button>
      </div>

      {searchResults.length > 0 && (
        <div
          style={{
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            maxHeight: 180,
            overflowY: 'auto',
            marginBottom: 8,
            backgroundColor: '#ffffff',
            position: 'absolute',
            zIndex: 1000,
            width: 'calc(100% - 48px)',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
        >
          <List
            size="small"
            dataSource={searchResults}
            renderItem={(item) => (
              <List.Item
                style={{ cursor: 'pointer', padding: '8px 12px' }}
                onClick={() => selectPlace(item)}
              >
                <div style={{ fontSize: 13 }}>{item.display_name}</div>
              </List.Item>
            )}
          />
        </div>
      )}

      <div
        ref={mapContainerRef}
        style={{
          height: 320,
          borderRadius: 8,
          border: '1px solid #d9d9d9',
          position: 'relative',
          zIndex: 1,
        }}
      />
      <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>
        * Kéo thả ghim đỏ hoặc click lên bản đồ để thay đổi vị trí chính xác.
      </div>
    </div>
  );
};
