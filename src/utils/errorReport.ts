import * as XLSX from "xlsx";
import type { ImportResult } from "../types/import";

export const downloadErrorReport = (result: ImportResult) => {
  const rows = result.errors.map((error) => ({
    "Dòng": error.rowNumber,
    "Nội dung gốc": error.originalContent,
    "Lý do lỗi": error.errorReason,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Errors"
  );

  XLSX.writeFile(
    workbook,
    `bao_cao_loi_batch_${result.batchId}.xlsx`
  );
};
