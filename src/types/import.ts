import type { UserRole } from './route';

export interface ImportErrorRow {
  rowNumber: number;
  errorCode: string;
  fieldName: string;
  rawData: string;
  errorReason: string;
  originalContent?: string;
}

export interface ImportResult {
  batchId: number;
  deliveryDate?: string | null;
  fileName: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  ordersCreated: number;
  errors: ImportErrorRow[];
}

export interface ImportBatchHistory {
  id: number;
  deliveryDate?: string | null;
  fileName: string;
  uploadedBy: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  ordersCreated: number;
  isActive: boolean;
  uploadedAt: string;
}

export interface ImportedOrderDetail {
  orderRef: string;
  deliveryDate?: string | null;
  storeCode?: string | null;
  storeName?: string | null;
  sku?: string | null;
  productName?: string | null;
  quantity?: number | null;
  weightKg?: number | null;
  volumeM3?: number | null;
  deliveryTimeWindow?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  notes?: string | null;
}

export interface ImportFormValues {
  deliveryDate: string;
  file: any; // We can use 'any' or 'UploadFile' from antd, but 'any' is safe for forms
}

export type { UserRole };
