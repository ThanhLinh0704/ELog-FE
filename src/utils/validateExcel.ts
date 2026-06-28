export const validateExcelFile = (file?: File): string | null => {
  if (!file) {
    return "Vui lòng chọn file Excel";
  }

  const isXlsx = file.name
    .toLowerCase()
    .endsWith(".xlsx");

  if (!isXlsx) {
    return "Chỉ hỗ trợ file .xlsx";
  }

  const maxSize = 10 * 1024 * 1024; // 10 MB

  if (file.size > maxSize) {
    return "Dung lượng file không được vượt quá 10 MB";
  }

  return null;
};
