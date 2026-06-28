import type { ImportBatchHistory, ImportResult } from '../types/import';

export const mockImportResult: ImportResult = {
  batchId: 9,
  deliveryDate: "2026-03-16",
  fileName: "donhang_16-03.xlsx",
  totalRows: 6,
  acceptedRows: 4,
  rejectedRows: 2,
  ordersCreated: 3,
  errors: [
    {
      rowNumber: 5,
      errorCode: "STORE_NOT_FOUND",
      fieldName: "store_code",
      rawData: "DH160325-04, ST-HD-099, REF-SAM-300, 1",
      errorReason: 'Mã cửa hàng "ST-HD-099" không tồn tại',
      originalContent: "DH160325-04, ST-HD-099, REF-SAM-300, 1",
    },
    {
      rowNumber: 6,
      errorCode: "SKU_NOT_FOUND",
      fieldName: "sku",
      rawData: "DH160325-05, ST-Q1-001, ACC-HDMI-2M, 5",
      errorReason: 'SKU "ACC-HDMI-2M" chưa có trong danh mục sản phẩm',
      originalContent: "DH160325-05, ST-Q1-001, ACC-HDMI-2M, 5",
    },
  ],
};

export const initialImportHistory: ImportBatchHistory[] = [
  {
    id: 9,
    deliveryDate: "2026-03-16",
    fileName: "donhang_16-03.xlsx",
    uploadedBy: "Nguyễn Văn Dispatcher",
    totalRows: 6,
    acceptedRows: 4,
    rejectedRows: 2,
    ordersCreated: 3,
    isActive: true,
    uploadedAt: "2026-03-15T14:30:00",
  },
  {
    id: 8,
    deliveryDate: "2026-03-16",
    fileName: "donhang_16-03_v1.xlsx",
    uploadedBy: "Nguyễn Văn Dispatcher",
    totalRows: 5,
    acceptedRows: 3,
    rejectedRows: 2,
    ordersCreated: 2,
    isActive: false,
    uploadedAt: "2026-03-15T10:20:00",
  },
  {
    id: 7,
    deliveryDate: "2026-03-15",
    fileName: "donhang_15-03.xlsx",
    uploadedBy: "Trần Minh Anh",
    totalRows: 12,
    acceptedRows: 12,
    rejectedRows: 0,
    ordersCreated: 8,
    isActive: true,
    uploadedAt: "2026-03-14T16:10:00",
  },
];

// In-memory store that persists across navigation as long as page is not fully refreshed
let importHistoryStore: ImportBatchHistory[] = [...initialImportHistory];

// Optional: cache in localStorage to persist on refresh
const STORAGE_KEY = 'elog_import_history_store';
try {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    importHistoryStore = JSON.parse(cached);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(importHistoryStore));
  }
} catch (e) {
  console.error("Failed to load/save import history to localStorage", e);
}

export const getImportHistory = (): ImportBatchHistory[] => {
  return importHistoryStore;
};

export const saveImportHistory = (history: ImportBatchHistory[]) => {
  importHistoryStore = history;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save history", e);
  }
};
