import type { StoreItem, StorePageResponse, StoreQueryParams, StorePayload } from './storeApi';

let mockStores: StoreItem[] = [
  {
    id: 1,
    storeCode: 'ST-BT-001',
    storeName: 'Điện Máy Thiên Hà',
    address: '102 Đinh Tiên Hoàng, Bình Thạnh, TP. HCM',
    contactName: 'Nguyễn Văn Hải',
    contactPhone: '0901234567',
    latitude: 10.7992,
    longitude: 106.7061,
    isActive: true,
    hasCoordinates: true,
    createdAt: '2026-06-01 08:00',
  },
  {
    id: 2,
    storeCode: 'ST-BT-002',
    storeName: 'Shop Điện Tử Minh Phát',
    address: '45 Bạch Đằng, Bình Thạnh, TP. HCM',
    contactName: 'Trần Minh Phát',
    contactPhone: '0912345678',
    latitude: 10.8031,
    longitude: 106.7094,
    isActive: true,
    hasCoordinates: true,
    createdAt: '2026-06-01 09:30',
  },
  {
    id: 3,
    storeCode: 'ST-BT-003',
    storeName: 'Siêu Thị Điện Máy Phú Hoà',
    address: '218 Xô Viết Nghệ Tĩnh, Bình Thạnh, TP. HCM',
    contactName: 'Phạm Phú Hoà',
    contactPhone: '0923456789',
    latitude: 10.8094,
    longitude: 106.7132,
    isActive: true,
    hasCoordinates: true,
    createdAt: '2026-06-02 10:15',
  },
  {
    id: 4,
    storeCode: 'ST-BT-004',
    storeName: 'Điện Lạnh Thanh Bình',
    address: '67 Nguyễn Xí, Bình Thạnh, TP. HCM',
    contactName: 'Lê Thanh Bình',
    contactPhone: '0934567890',
    latitude: null,
    longitude: null,
    isActive: true,
    hasCoordinates: false,
    createdAt: '2026-06-03 14:00',
  },
  {
    id: 5,
    storeCode: 'ST-BT-005',
    storeName: 'Điện Máy Gia Phát',
    address: '120 Phan Đăng Lưu, Phú Nhuận, TP. HCM',
    contactName: 'Đặng Gia Phát',
    contactPhone: '0945678901',
    latitude: 10.8062,
    longitude: 106.6907,
    isActive: true,
    hasCoordinates: true,
    createdAt: '2026-06-04 11:00',
  },
  {
    id: 6,
    storeCode: 'ST-BT-006',
    storeName: 'Cửa Hàng Điện Tử Hoàng Long',
    address: '88 Nơ Trang Long, Bình Thạnh, TP. HCM',
    contactName: 'Vũ Hoàng Long',
    contactPhone: '0956789012',
    latitude: null,
    longitude: null,
    isActive: true,
    hasCoordinates: false,
    createdAt: '2026-06-05 16:30',
  },
  {
    id: 7,
    storeCode: 'ST-GV-003',
    storeName: 'Điện Máy Thành Công',
    address: '14 Quang Trung, Gò Vấp, TP. HCM',
    contactName: 'Nguyễn Thành Công',
    contactPhone: '0967890123',
    latitude: 10.8281,
    longitude: 106.6775,
    isActive: false,
    hasCoordinates: true,
    createdAt: '2026-06-06 09:00',
  },
  {
    id: 8,
    storeCode: 'ST-BT-008',
    storeName: 'Điện Lạnh Phương Nam',
    address: '32 Nguyễn Gia Trí, Bình Thạnh, TP. HCM',
    contactName: 'Hoàng Phương Nam',
    contactPhone: '0978901234',
    latitude: 10.8014,
    longitude: 106.7125,
    isActive: true,
    hasCoordinates: true,
    createdAt: '2026-06-08 10:00',
  },
];

function delay(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const mockStoreApi = {
  async getStores(params: StoreQueryParams = {}): Promise<StorePageResponse> {
    await delay();

    const keyword = params.keyword?.trim().toLowerCase() || '';
    const page = params.page ?? 0;
    const size = params.size ?? 20;

    let filtered = [...mockStores];

    if (keyword) {
      filtered = filtered.filter(
        (item) =>
          item.storeCode.toLowerCase().includes(keyword) ||
          item.storeName.toLowerCase().includes(keyword) ||
          item.address.toLowerCase().includes(keyword)
      );
    }

    if (params.isActive !== undefined && params.isActive !== '') {
      const activeValue = String(params.isActive) === 'true';
      filtered = filtered.filter((item) => item.isActive === activeValue);
    }

    if (params.hasRoute !== undefined && params.hasRoute !== '') {
      const hasRouteValue = String(params.hasRoute) === 'true';
      filtered = filtered.filter((item) => {
        const hasRoute = !!item.assignedRoutes && item.assignedRoutes.length > 0;
        return hasRoute === hasRouteValue;
      });
    }

    filtered.sort((a, b) => b.id - a.id);

    const start = page * size;
    const content = filtered.slice(start, start + size);

    return {
      content,
      page,
      size,
      totalElements: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / size)),
    };
  },

  async getStore(id: number): Promise<StoreItem> {
    await delay();
    const found = mockStores.find((item) => item.id === id);
    if (!found) {
      throw new Error('Không tìm thấy cửa hàng.');
    }
    return found;
  },

  async createStore(payload: StorePayload): Promise<StoreItem> {
    await delay();
    const storeCode = payload.storeCode?.trim().toUpperCase();
    if (!storeCode) {
      throw new Error('Vui lòng nhập mã cửa hàng.');
    }

    const duplicated = mockStores.some(
      (item) => item.storeCode.toUpperCase() === storeCode
    );

    if (duplicated) {
      const error = new Error('Mã cửa hàng đã tồn tại.') as any;
      error.status = 409;
      error.body = {
        error: {
          field: 'storeCode',
          message: 'Mã cửa hàng đã tồn tại.',
        },
      };
      throw error;
    }

    const lat = payload.latitude != null ? Number(payload.latitude) : null;
    const lng = payload.longitude != null ? Number(payload.longitude) : null;
    const hasCoordinates = lat !== null && lng !== null;

    const newStore: StoreItem = {
      id: Math.max(...mockStores.map((item) => item.id), 0) + 1,
      storeCode,
      storeName: payload.storeName.trim(),
      address: `${payload.addressDetail}, ${payload.wardCode}, ${payload.districtCode}, ${payload.provinceCode}`,
      provinceCode: payload.provinceCode,
      districtCode: payload.districtCode,
      wardCode: payload.wardCode,
      addressDetail: payload.addressDetail,
      allowedDeliveryHours: payload.allowedDeliveryHours || null,
      maxAllowedVehicleWeight: payload.maxAllowedVehicleWeight || null,
      imageUrl: payload.imageUrl || null,
      contactName: payload.contactName?.trim() || null,
      contactPhone: payload.contactPhone?.trim() || null,
      latitude: lat,
      longitude: lng,
      isActive: true,
      hasCoordinates,
      createdAt: new Date().toLocaleString('vi-VN'),
    };

    mockStores = [newStore, ...mockStores];
    return newStore;
  },

  async updateStore(id: number, payload: StorePayload): Promise<StoreItem> {
    await delay();
    const index = mockStores.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error('Không tìm thấy cửa hàng.');
    }

    const lat = payload.latitude != null ? Number(payload.latitude) : null;
    const lng = payload.longitude != null ? Number(payload.longitude) : null;
    const hasCoordinates = lat !== null && lng !== null;

    const updated: StoreItem = {
      ...mockStores[index],
      storeName: payload.storeName.trim(),
      address: `${payload.addressDetail}, ${payload.wardCode}, ${payload.districtCode}, ${payload.provinceCode}`,
      provinceCode: payload.provinceCode,
      districtCode: payload.districtCode,
      wardCode: payload.wardCode,
      addressDetail: payload.addressDetail,
      allowedDeliveryHours: payload.allowedDeliveryHours || null,
      maxAllowedVehicleWeight: payload.maxAllowedVehicleWeight || null,
      imageUrl: payload.imageUrl || null,
      contactName: payload.contactName?.trim() || null,
      contactPhone: payload.contactPhone?.trim() || null,
      latitude: lat,
      longitude: lng,
      hasCoordinates,
    };

    mockStores[index] = updated;
    return updated;
  },

  async updateStatus(id: number, isActive: boolean): Promise<StoreItem> {
    await delay();
    const index = mockStores.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new Error('Không tìm thấy cửa hàng.');
    }

    const updated: StoreItem = {
      ...mockStores[index],
      isActive,
    };

    mockStores[index] = updated;
    return updated;
  },
};
