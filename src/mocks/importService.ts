import type { ImportBatchHistory, ImportResult, ImportMockOptions, ImportErrorRow } from '../types/import';
import { getImportHistory, saveImportHistory, mockImportResult } from './importData';

const delay = (ms = 1200) => new Promise((resolve) => setTimeout(resolve, ms));

export const findActiveBatchByDate = (deliveryDate: string): ImportBatchHistory | undefined => {
  const history = getImportHistory();
  return history.find(
    (batch) => batch.deliveryDate === deliveryDate && batch.isActive
  );
};

export async function uploadOrdersMock(
  deliveryDate: string,
  file: File,
  options: ImportMockOptions = {}
): Promise<ImportResult> {
  await delay();

  const history = getImportHistory();
  const hasActiveBatch = history.some(
    (batch) => batch.deliveryDate === deliveryDate && batch.isActive
  );

  if (hasActiveBatch && !options.confirmReplace) {
    throw {
      status: 409,
      code: "ACTIVE_BATCH_EXISTS",
      message: "Ngày giao hàng đã có batch hiện hành",
    };
  }

  // Calculate new batch ID
  const maxId = history.reduce((max, item) => (item.id > max ? item.id : max), 0);
  const newBatchId = maxId + 1;

  // Check for 100% error case
  const isAllErrors = file.name.toLowerCase() === "all-errors.xlsx";

  let result: ImportResult;

  if (isAllErrors) {
    result = {
      batchId: newBatchId,
      deliveryDate,
      fileName: file.name,
      totalRows: 5,
      acceptedRows: 0,
      rejectedRows: 5,
      createdOrders: 0,
      errors: [
        { rowNumber: 1, originalContent: "DH160326-ERR01, ST-Q1-999, SKU-999, 1", errorReason: 'Mã cửa hàng "ST-Q1-999" không tồn tại' },
        { rowNumber: 2, originalContent: "DH160326-ERR02, ST-Q1-001, SKU-999, 2", errorReason: 'SKU "SKU-999" không tồn tại trong hệ thống' },
        { rowNumber: 3, originalContent: "DH160326-ERR03, ST-Q1-002, ACC-HDMI-2M, -1", errorReason: 'Số lượng phải lớn hơn 0' },
        { rowNumber: 4, originalContent: "DH160326-ERR04, , ACC-HDMI-2M, 5", errorReason: 'Mã cửa hàng không được để trống' },
        { rowNumber: 5, originalContent: "DH160326-ERR05, ST-Q1-001, , 10", errorReason: 'Mã SKU sản phẩm không được để trống' },
      ],
    };
  } else {
    // Normal successful import with some error lines as mock
    result = {
      ...mockImportResult,
      batchId: newBatchId,
      deliveryDate,
      fileName: file.name,
    };
  }

  // If replacing, mark previous batches on the same date as inactive
  let updatedHistory = [...history];
  if (hasActiveBatch && options.confirmReplace) {
    updatedHistory = updatedHistory.map((batch) =>
      batch.deliveryDate === deliveryDate && batch.isActive
        ? { ...batch, isActive: false }
        : batch
    );
  }

  // Get current user fullName from localStorage or fallback
  const username = localStorage.getItem('username') || 'Nguyễn Văn Dispatcher';

  // Add the new batch to history
  const newHistoryRecord: ImportBatchHistory = {
    id: newBatchId,
    deliveryDate: result.deliveryDate,
    fileName: result.fileName,
    uploadedBy: username,
    totalRows: result.totalRows,
    acceptedRows: result.acceptedRows,
    rejectedRows: result.rejectedRows,
    createdOrders: result.createdOrders,
    isActive: true,
    uploadedAt: new Date().toISOString(),
  };

  updatedHistory = [newHistoryRecord, ...updatedHistory];
  saveImportHistory(updatedHistory);

  return result;
}

export async function getImportHistoryMock(page = 0, size = 10): Promise<{ content: ImportBatchHistory[]; totalElements: number }> {
  await delay(500); // Shorter delay for table loading
  const history = getImportHistory();
  
  // Client-side pagination
  const start = page * size;
  const content = history.slice(start, start + size);
  
  return {
    content,
    totalElements: history.length,
  };
}

export async function getImportBatchDetailMock(batchId: number): Promise<ImportResult | null> {
  await delay(400);
  const history = getImportHistory();
  const batch = history.find((b) => b.id === batchId);
  
  if (!batch) return null;

  // Re-generate error details based on metadata to simulate a real detail fetch
  const isAllErrors = batch.fileName.toLowerCase() === "all-errors.xlsx";

  if (isAllErrors) {
    return {
      batchId: batch.id,
      deliveryDate: batch.deliveryDate,
      fileName: batch.fileName,
      totalRows: batch.totalRows,
      acceptedRows: batch.acceptedRows,
      rejectedRows: batch.rejectedRows,
      createdOrders: batch.createdOrders,
      errors: [
        { rowNumber: 1, originalContent: "DH160326-ERR01, ST-Q1-999, SKU-999, 1", errorReason: 'Mã cửa hàng "ST-Q1-999" không tồn tại' },
        { rowNumber: 2, originalContent: "DH160326-ERR02, ST-Q1-001, SKU-999, 2", errorReason: 'SKU "SKU-999" không tồn tại trong hệ thống' },
        { rowNumber: 3, originalContent: "DH160326-ERR03, ST-Q1-002, ACC-HDMI-2M, -1", errorReason: 'Số lượng phải lớn hơn 0' },
        { rowNumber: 4, originalContent: "DH160326-ERR04, , ACC-HDMI-2M, 5", errorReason: 'Mã cửa hàng không được để trống' },
        { rowNumber: 5, originalContent: "DH160326-ERR05, ST-Q1-001, , 10", errorReason: 'Mã SKU sản phẩm không được để trống' },
      ],
    };
  }

  // If there are rejected rows, simulate the errors
  let errorsList: ImportErrorRow[] = [];
  if (batch.rejectedRows > 0) {
    errorsList = [
      {
        rowNumber: 5,
        originalContent: "DH160325-04, ST-HD-099, REF-SAM-300, 1",
        errorReason: 'Mã cửa hàng "ST-HD-099" không tồn tại',
      },
      {
        rowNumber: 6,
        originalContent: "DH160325-05, ST-Q1-001, ACC-HDMI-2M, 5",
        errorReason: 'SKU "ACC-HDMI-2M" chưa có trong danh mục sản phẩm',
      },
    ];
    // Truncate errors list if mock size differs
    errorsList = errorsList.slice(0, batch.rejectedRows);
  }

  return {
    batchId: batch.id,
    deliveryDate: batch.deliveryDate,
    fileName: batch.fileName,
    totalRows: batch.totalRows,
    acceptedRows: batch.acceptedRows,
    rejectedRows: batch.rejectedRows,
    createdOrders: batch.createdOrders,
    errors: errorsList,
  };
}
