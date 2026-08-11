# BÁO CÁO LỖI BACKEND (BACKEND BUG REPORT)

---

## 🐛 Bug 1: API KPI Vận hành trả về Quãng đường (`totalDistanceKm`) bằng `0.0 km`

### 1. Mô tả lỗi
Trên màn hình **KPI Vận hành** (`/dispatcher/kpi`), khi Frontend gọi các endpoint:
- `GET /api/v1/kpi/summary`
- `GET /api/v1/kpi/by-vehicle`
- `GET /api/v1/kpi/by-driver`

Trường `totalDistanceKm` (Quãng đường) của từng Tài xế (`drivers`), Xe (`vehicles`), và Tổng hạm đội (`totalFleetDistanceKm`) **luôn trả về `0.0` (hoặc `null`)**, dẫn đến màn hình KPI hiển thị `0.0 km` cho tất cả các bản ghi mặc dù tài xế đã thực hiện nhiều chuyến hàng.

---

### 2. Nguyên nhân kỹ thuật phía Backend
- **Dữ liệu chuyến hàng (`trips`)**: Trong cơ sở dữ liệu (hoặc khi khởi tạo chuyến hàng mới từ đợt gom đơn), trường `total_distance_km` trong bảng `trips` bị để giá trị `NULL`.
- **Logic tính toán tại `KpiServiceImpl.java`**:
  ```java
  // Logic hiện tại trong getByDriver, getByVehicle, calculate
  double totalDistance = driverTrips.stream()
          .map(Trip::getTotalDistanceKm)
          .filter(Objects::nonNull)
          .mapToDouble(BigDecimal::doubleValue)
          .sum();
  ```
  Do `Trip.getTotalDistanceKm()` trả về `null`, câu lệnh `.filter(Objects::nonNull)` đã loại bỏ toàn bộ danh sách chuyến hàng, dẫn đến hàm `sum()` trả về `0.0`.

---

### 3. Đề xuất phương án khắc phục cho Backend

#### **Phương án 1: Bổ sung Fallback lấy quãng đường trong `KpiServiceImpl.java`**
Nên cập nhật hàm đọc quãng đường chuyến hàng theo thứ tự ưu tiên:
1. Nếu `trip.getTotalDistanceKm()` non-null và > 0 -> Lấy `trip.getTotalDistanceKm()`.
2. Nếu `NULL`, lấy từ Đợt gom đơn: `trip.getTripDraft().getTotalDistanceKm()`.
3. Nếu `NULL`, lấy từ Tuyến đường mặc định: `trip.getRoute().getTotalDistanceKm()`.
4. Nếu vẫn `NULL`, cộng tổng `distanceFromPrevKm` từ danh sách `tripStops`.
5. Nếu chưa có, tính khoảng cách theo tọa độ GPS (Haversine) giữa các điểm giao hàng `Store`.

**Đoạn code gợi ý cho BE (`KpiServiceImpl.java`):**
```java
private double getTripDistanceKm(Trip trip) {
    if (trip == null) return 0.0;

    // 1. Lấy trực tiếp từ Trip
    if (trip.getTotalDistanceKm() != null && trip.getTotalDistanceKm().doubleValue() > 0) {
        return trip.getTotalDistanceKm().doubleValue();
    }

    // 2. Fallback sang TripDraft
    if (trip.getTripDraft() != null && trip.getTripDraft().getTotalDistanceKm() != null 
            && trip.getTripDraft().getTotalDistanceKm().doubleValue() > 0) {
        return trip.getTripDraft().getTotalDistanceKm().doubleValue();
    }

    // 3. Fallback sang Route
    if (trip.getRoute() != null && trip.getRoute().getTotalDistanceKm() != null 
            && trip.getRoute().getTotalDistanceKm() > 0) {
        return trip.getRoute().getTotalDistanceKm();
    }

    // 4. Sum distanceFromPrevKm của tripStops
    if (trip.getTripStops() != null && !trip.getTripStops().isEmpty()) {
        double sumKm = trip.getTripStops().stream()
                .map(TripStop::getDistanceFromPrevKm)
                .filter(Objects::nonNull)
                .mapToDouble(BigDecimal::doubleValue)
                .sum();
        if (sumKm > 0) return sumKm;
    }

    return 0.0;
}
```

#### **Phương án 2: Đảm bảo lưu `totalDistanceKm` khi tạo Trip (`TripServiceImpl.java`)**
Khi khởi tạo đối tượng `Trip` từ `TripDraft` (trong phương thức `buildTrip` / `assignVehicle`), đảm bảo gán trường `totalDistanceKm`:
```java
.totalDistanceKm(tripDraft.getTotalDistanceKm())
```

---
---

## 🐛 Bug 2: API Phân quyền `/api/v1/roles` vẫn trả về vai trò `WAREHOUSE_STAFF`

### 1. Mô tả lỗi
Hệ thống Web đã bãi bỏ vai trò Nhân viên kho (`WAREHOUSE_STAFF`), tuy nhiên endpoint `GET /api/v1/roles` vẫn trả về role `WAREHOUSE_STAFF`, làm trang Quản lý phân quyền hiển thị cột vai trò này.

### 2. Đề xuất phương án khắc phục cho Backend
Tại `RoleServiceImpl.java`, lọc bỏ `WAREHOUSE_STAFF` khỏi kết quả trả về của API `getAllRoles()`:
```java
@Override
@Transactional(readOnly = true)
public List<RoleResponse> getAllRoles() {
    return roleRepository.findAll().stream()
            .filter(role -> !"WAREHOUSE_STAFF".equalsIgnoreCase(role.getName()))
            .map(this::toRoleResponse)
            .collect(Collectors.toList());
}
```
