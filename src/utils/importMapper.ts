import type { ImportBatchHistory, ImportResult, ImportErrorRow } from '../types/import';

export const mapBatchResponseToHistory = (raw: any): ImportBatchHistory => {
  return {
    id: raw.batchId,
    deliveryDate: raw.deliveryDate,
    fileName: raw.fileName,
    uploadedBy: 'N/A', // Backend không trả về thông tin người dùng upload dưới dạng chuỗi, tạm hiển thị N/A
    totalRows: raw.totalRows ?? 0,
    acceptedRows: raw.acceptedRows ?? 0,
    rejectedRows: raw.rejectedRows ?? 0,
    ordersCreated: Number(raw.ordersCreated ?? 0),
    isActive: raw.isActive ?? false,
    uploadedAt: raw.createdAt,
  };
};

export const mapBatchResponseToResult = (raw: any, errors: ImportErrorRow[] = []): ImportResult => {
  return {
    batchId: raw.batchId,
    deliveryDate: raw.deliveryDate,
    fileName: raw.fileName,
    totalRows: raw.totalRows ?? 0,
    acceptedRows: raw.acceptedRows ?? 0,
    rejectedRows: raw.rejectedRows ?? 0,
    ordersCreated: Number(raw.ordersCreated ?? 0),
    errors: errors,
  };
};

export const mapErrorResponseToRow = (raw: any): ImportErrorRow => {
  return {
    rowNumber: raw.rowNumber,
    errorCode: raw.errorCode,
    fieldName: raw.fieldName,
    rawData: raw.rawData,
    errorReason: raw.errorReason,
    originalContent: raw.rawData,
  };
};
