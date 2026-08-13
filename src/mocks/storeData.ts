import type { StoreSearchResult } from '../types/route';

export const initialMockStores: StoreSearchResult[] = [
  {
    id: "store-001",
    code: "ST-BT-001",
    name: "Điện Máy Thiên Hà",
    address: "102 Đinh Tiên Hoàng",
    latitude: 10.7992,
    longitude: 106.7061,
    hasCoordinates: true,
    isActive: true,
    routeId: "route-001",
  },
  {
    id: "store-002",
    code: "ST-BT-002",
    name: "Shop Điện Tử Minh Phát",
    address: "45 Bạch Đằng",
    latitude: 10.8031,
    longitude: 106.7094,
    hasCoordinates: true,
    isActive: true,
    routeId: "route-001",
  },
  {
    id: "store-003",
    code: "ST-BT-003",
    name: "Siêu Thị Điện Máy Phú Hoà",
    address: "218 Xô Viết Nghệ Tĩnh",
    latitude: 10.8094,
    longitude: 106.7132,
    hasCoordinates: true,
    isActive: true,
    routeId: "route-001",
  },
  {
    id: "store-004",
    code: "ST-BT-004",
    name: "Điện Lạnh Thanh Bình",
    address: "67 Nguyễn Xí",
    latitude: null,
    longitude: null,
    hasCoordinates: false,
    isActive: true,
    routeId: "route-001",
  },
  {
    id: "store-005",
    code: "ST-BT-005",
    name: "Điện Máy Gia Phát",
    address: "120 Phan Đăng Lưu",
    latitude: 10.8062,
    longitude: 106.6907,
    hasCoordinates: true,
    isActive: true,
    routeId: null,
  },
  {
    id: "store-006",
    code: "ST-BT-006",
    name: "Cửa Hàng Điện Tử Hoàng Long",
    address: "88 Nơ Trang Long",
    latitude: null,
    longitude: null,
    hasCoordinates: false,
    isActive: true,
    routeId: null,
  },
  {
    id: "store-007",
    code: "ST-GV-003",
    name: "Điện Máy Thành Công",
    address: "14 Quang Trung",
    latitude: 10.8281,
    longitude: 106.6775,
    hasCoordinates: true,
    isActive: false,
    routeId: null,
  },
  {
    id: "store-008",
    code: "ST-BT-008",
    name: "Điện Lạnh Phương Nam",
    address: "32 Nguyễn Gia Trí",
    latitude: 10.8014,
    longitude: 106.7125,
    hasCoordinates: true,
    isActive: true,
    routeId: "route-002",
  },
];

const STORES_STORAGE_KEY = 'elog_mock_stores';

const getStoredStores = (): StoreSearchResult[] => {
  const stored = localStorage.getItem(STORES_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse mock stores', e);
    }
  }
  return initialMockStores;
};

export let mockStores: StoreSearchResult[] = getStoredStores();

export const saveMockStores = (stores: StoreSearchResult[]) => {
  mockStores = stores;
  localStorage.setItem(STORES_STORAGE_KEY, JSON.stringify(stores));
};

export const resetMockStores = () => {
  mockStores = [...initialMockStores];
  localStorage.setItem(STORES_STORAGE_KEY, JSON.stringify(mockStores));
};
