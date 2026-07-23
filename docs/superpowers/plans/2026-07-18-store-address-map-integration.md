# Kế hoạch Triển khai — Tích hợp Bản đồ Chọn Địa chỉ Cửa hàng

> **Dành cho agent:** KHÔNG ĐƯỢC TỰ Ý sửa đổi code ngoài các bước đã ghi dưới đây. Sử dụng checkbox (`- [ ]`) để theo dõi tiến độ công việc.

**Mục tiêu:** Tích hợp bản đồ trực quan Leaflet (OpenStreetMap) vào form Thêm/Sửa Cửa hàng (`StoresPage.tsx`) để tự động tìm kiếm địa chỉ (Geocoding qua Nominatim API) và kéo/thả ghim để tự cập nhật kinh độ/vĩ độ chính xác.

**Kiến trúc:** 
1. Cài đặt thư viện `leaflet` và `@types/leaflet`.
2. Tạo component dùng chung `MapSelector.tsx` quản lý vòng đời bản đồ Leaflet trong React thông qua `useRef` và `useEffect` để tránh xung đột React 19.
3. Tích hợp `MapSelector` vào trong modal `StoreFormModal` trong `StoresPage.tsx`. Kết nối hai chiều: kéo ghim cập nhật Form, và nhập số trong Form di chuyển ghim.

**Công nghệ:** React 19, TypeScript, Ant Design (Form, Input, Button), Leaflet JS, Nominatim OpenStreetMap API (Free, không cần API Key).

## Ràng buộc Toàn cục
- Không được dùng `react-leaflet` vì thư viện này thường gây lỗi phiên bản không tương thích với React 19. Sử dụng Leaflet JS thuần thông qua `useRef` và React `useEffect` để đảm bảo ổn định 100%.
- Định dạng icon ghim (marker) sử dụng định dạng SVG inline mã hóa Base64 hoặc SVG trực tiếp trên `L.divIcon` để tránh lỗi thiếu file ảnh icon mặc định của Leaflet khi build bằng Vite.
- Thiết kế bản đồ phải có chiều cao tối thiểu 300px, hiển thị gọn trong modal mà không làm vỡ layout của form.

---

### Nhiệm vụ 1: Cài đặt và cấu hình thư viện Leaflet
**Files chỉnh sửa:**
- [package.json](file:///D:/FULearning/semester%209/Elog/ELog-FE/package.json)
- [src/main.tsx](file:///D:/FULearning/semester%209/Elog/ELog-FE/src/main.tsx)

- [ ] **Bước 1: Chạy lệnh cài đặt thư viện**
  Run: `npm install leaflet`
  Expected: Cài đặt thành công, thêm `"leaflet"` vào dependencies trong `package.json`.

- [ ] **Bước 2: Chạy lệnh cài đặt types cho TypeScript**
  Run: `npm install -D @types/leaflet`
  Expected: Cài đặt thành công, thêm `"@types/leaflet"` vào devDependencies trong `package.json`.

- [ ] **Bước 3: Nhập file CSS của Leaflet vào entry point**
  Mở [src/main.tsx](file:///D:/FULearning/semester%209/Elog/ELog-FE/src/main.tsx) và thêm dòng import CSS vào phần đầu file (dưới các dòng import antd css):
  ```typescript
  import 'leaflet/dist/leaflet.css';
  ```

---

### Nhiệm vụ 2: Tạo component chọn vị trí trên bản đồ (`MapSelector`)
**File tạo mới:**
- [MapSelector.tsx](file:///D:/FULearning/semester%209/Elog/ELog-FE/src/components/MapSelector.tsx)

**Mô tả:** Tạo component bản đồ hiển thị điểm ghim hiện tại, hỗ trợ kéo thả ghim, click chọn điểm mới, và tích hợp thanh tìm kiếm địa chỉ tích hợp Nominatim API.

- [ ] **Bước 1: Tạo file và viết code cho `src/components/MapSelector.tsx`**

```typescript
import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Button, Input, List, Spin, message } from 'antd';
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

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

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
      setSearchText(addressSearchText);
      handleSearch(addressSearchText);
    }
  }, [addressSearchText]);

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
      if (data.length === 0) {
        message.warning('Không tìm thấy tọa độ phù hợp cho địa chỉ này.');
      }
    } catch (error) {
      console.error('Nominatim Geocoding API Error:', error);
      message.error('Lỗi kết nối với dịch vụ bản đồ.');
    } finally {
      setSearching(false);
    }
  }

  // Chọn một kết quả gợi ý địa chỉ từ danh sách
  function selectPlace(place: SearchResult) {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);

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
```

---

### Nhiệm vụ 3: Tích hợp Bản đồ vào Modal Thêm/Sửa Cửa hàng
**File chỉnh sửa:**
- [StoresPage.tsx](file:///D:/FULearning/semester%209/Elog/ELog-FE/src/pages/StoresPage.tsx)

**Mô tả:** Nhúng `MapSelector` vào trong modal `StoreFormModal` và liên kết dữ liệu Form hai chiều. Thêm nút "Tìm nhanh tọa độ" ngay dưới ô địa chỉ của Form.

- [ ] **Bước 1: Import MapSelector vào `StoresPage.tsx`**
  Mở file `src/pages/StoresPage.tsx` và thêm dòng import ở đầu file:
  ```typescript
  import { MapSelector } from '../components/MapSelector';
  ```

- [ ] **Bước 2: Khai báo State chứa địa chỉ tìm kiếm trên bản đồ**
  Tìm định nghĩa component `StoreFormModal` (khoảng dòng 170). Thêm State `mapSearchText` vào đầu component để truyền địa chỉ cần tìm xuống Map:
  ```typescript
  const [mapSearchText, setMapSearchText] = useState('');
  ```
  Và thêm `useEffect` reset state này khi Modal đóng/mở:
  ```typescript
  useEffect(() => {
    if (!open) {
      setMapSearchText('');
    }
  }, [open]);
  ```

- [ ] **Bước 3: Bổ sung nút bấm tìm nhanh tọa độ bên dưới ô Địa chỉ**
  Tìm thẻ `<Form.Item label="Địa chỉ" name="address" ...>` (khoảng dòng 295).
  Thay đổi phần hiển thị của ô Địa chỉ để thêm một nút bấm bên cạnh:
  ```typescript
  <Form.Item label="Địa chỉ" required style={{ marginBottom: 12 }}>
    <Space.Compact style={{ width: '100%' }}>
      <Form.Item
        name="address"
        noStyle
        rules={[
          { required: true, message: 'Vui lòng nhập địa chỉ.' },
          { max: 255, message: 'Địa chỉ không quá 255 ký tự.' },
        ]}
      >
        <Input.TextArea rows={2} placeholder="VD: 120 Nguyễn Oanh, P.17, Q.Gò Vấp" />
      </Form.Item>
      <Button 
        type="default"
        style={{ height: 'auto', display: 'flex', alignItems: 'center' }}
        onClick={() => {
          const addr = form.getFieldValue('address');
          if (addr && addr.trim()) {
            setMapSearchText(addr.trim());
          } else {
            message.warning('Vui lòng nhập địa chỉ trước khi tìm trên bản đồ.');
          }
        }}
      >
        Tìm Tọa Độ
      </Button>
    </Space.Compact>
  </Form.Item>
  ```

- [ ] **Bước 4: Nhúng `MapSelector` vào trước các ô nhập Latitude/Longitude**
  Tìm đoạn mã khai báo các ô Latitude và Longitude (khoảng dòng 329-352). Chèn component `MapSelector` lên phía trên:
  ```typescript
  {/* Chèn MapSelector vào đây */}
  <Form.Item noStyle shouldUpdate={['latitude', 'longitude']}>
    {({ getFieldValue, setFieldsValue }) => {
      const lat = getFieldValue('latitude');
      const lng = getFieldValue('longitude');
      return (
        <MapSelector
          latitude={lat}
          longitude={lng}
          addressSearchText={mapSearchText}
          onCoordinateChange={(newLat, newLng) => {
            setFieldsValue({
              latitude: Number(newLat.toFixed(6)),
              longitude: Number(newLng.toFixed(6)),
            });
            // Reset chuỗi tìm kiếm để tránh kích hoạt lại Geocoding không mong muốn
            setMapSearchText('');
          }}
        />
      );
    }}
  </Form.Item>

  {/* Phía dưới giữ nguyên hai ô nhập số để người dùng xem/tự sửa nếu muốn */}
  <Row gutter={16}>
    <Col xs={24} md={12}>
  ...
  ```

---

## Kế hoạch Xác minh và Kiểm thử

### Kiểm thử thủ công bằng trình duyệt:
1. Đăng nhập hệ thống với tài khoản **Admin** (`admin01`).
2. Điều hướng tới menu **Quản lý cửa hàng**.
3. Bấm **Tạo cửa hàng mới**.
   * Bản đồ phải xuất hiện trong modal (mặc định trỏ về trung tâm TP.HCM).
4. Nhập vào ô Địa chỉ: `"Chợ Bến Thành, Quận 1"` -> Bấm nút **Tìm Tọa Độ**.
   * Bản đồ phải tự động tìm kiếm, di chuyển tâm đến Chợ Bến Thành và kéo ghim đỏ đến đó.
   * Đồng thời, hai ô nhập **Vĩ độ** và **Kinh độ** phía dưới phải tự động điền các số (khoảng `10.772...`, `106.698...`).
5. Click chọn một điểm bất kỳ khác trên bản đồ hoặc kéo rê ghim đỏ.
   * Số vĩ độ/kinh độ trong hai ô nhập bên dưới phải cập nhật ngay lập tức theo vị trí ghim mới.
6. Bấm **Tạo cửa hàng**.
   * Hệ thống phải lưu thành công cửa hàng mới vào DB với tọa độ vừa chọn.
7. Thử bấm **Chỉnh sửa** một cửa hàng hiện có.
   * Bản đồ trong modal sửa phải hiện đúng tâm và ghim đúng vị trí tọa độ cũ của cửa hàng đó.
