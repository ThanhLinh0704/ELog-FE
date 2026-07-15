import * as XLSX from "xlsx";

export const downloadImportTemplate = () => {
  const rows = [
    {
      "Mã đơn": "DH160326-01",
      "Mã cửa hàng": "ST-Q1-001",
      SKU: "TV-SAM-55",
      "Số lượng": 2,
    },
    {
      "Mã đơn": "DH160326-01",
      "Mã cửa hàng": "ST-Q1-001",
      SKU: "ACC-HDMI-2M",
      "Số lượng": 3,
    },
    {
      "Mã đơn": "DH160326-02",
      "Mã cửa hàng": "ST-BT-004",
      SKU: "REF-LG-450",
      "Số lượng": 1,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Orders"
  );

  XLSX.writeFile(
    workbook,
    "mau_nhap_don_hang.xlsx"
  );
};
