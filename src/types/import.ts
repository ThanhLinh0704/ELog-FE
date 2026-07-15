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
  deliveryDate: string;
  fileName: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  ordersCreated: number;
  errors: ImportErrorRow[];
}

export interface ImportBatchHistory {
  id: number;
  deliveryDate: string;
  fileName: string;
  uploadedBy: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  ordersCreated: number;
  isActive: boolean;
  uploadedAt: string;
}

export interface ImportFormValues {
  deliveryDate: string;
  file: any; // We can use 'any' or 'UploadFile' from antd, but 'any' is safe for forms
}

export interface ImportMockOptions {
  confirmReplace?: boolean;
}

export type { UserRole };
