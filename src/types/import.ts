import type { UserRole } from './route';

export interface ImportErrorRow {
  rowNumber: number;
  originalContent: string;
  errorReason: string;
}

export interface ImportResult {
  batchId: number;
  deliveryDate: string;
  fileName: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  createdOrders: number;
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
  createdOrders: number;
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
