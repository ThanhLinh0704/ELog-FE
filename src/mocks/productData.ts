import type { Product } from '../types/product';

export const initialMockProducts: Product[] = [
  {
    id: "product-001",
    sku: "TV-SAM-55",
    productName: "Samsung Smart TV 55 inch",
    lengthM: 1.35,
    widthM: 0.18,
    heightM: 0.82,
    weightKg: 28.5,
    volumeM3: 0.199260,
    status: "ACTIVE",
    createdAt: "2026-06-10T08:30:00",
    updatedAt: "2026-06-20T14:15:00",
  },
  {
    id: "product-002",
    sku: "REF-LG-450",
    productName: "LG Refrigerator 450L",
    lengthM: 0.78,
    widthM: 0.74,
    heightM: 1.78,
    weightKg: 82,
    volumeM3: 1.027416,
    status: "ACTIVE",
    createdAt: "2026-06-11T09:00:00",
    updatedAt: "2026-06-19T10:20:00",
  },
  {
    id: "product-003",
    sku: "WM-PANA-10",
    productName: "Panasonic Washing Machine 10kg",
    lengthM: 0.65,
    widthM: 0.70,
    heightM: 1.05,
    weightKg: 48,
    volumeM3: 0.477750,
    status: "INACTIVE",
    createdAt: "2026-06-12T11:10:00",
    updatedAt: "2026-06-18T16:40:00",
  },
];

const STORAGE_KEY = 'elog_mock_products';

const getStoredProducts = (): Product[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse mock products from localStorage', e);
    }
  }
  return initialMockProducts;
};

export let mockProducts: Product[] = getStoredProducts();

export const saveMockProducts = (products: Product[]) => {
  mockProducts = products;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
};

export const resetMockProducts = () => {
  mockProducts = [...initialMockProducts];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mockProducts));
};
