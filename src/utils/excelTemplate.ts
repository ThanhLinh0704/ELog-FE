import * as XLSX from "xlsx";

export const downloadImportTemplate = () => {
  const rows = [
    {
      "Mã đơn hàng": "DH160326-01",
      "Mã cửa hàng": "ST-Q1-001",
      SKU: "TV-SAM-55",
      "Số lượng": 2,
      "Ngày giao hàng": "2026-07-30",
      "Khung giờ giao": "08:00 - 12:00",
      "Tên người nhận": "Nguyễn Văn A",
      "Số điện thoại": "0901234567",
      "Ghi chú": "Giao giờ hành chính",
    },
    {
      "Mã đơn hàng": "DH160326-01",
      "Mã cửa hàng": "ST-Q1-001",
      SKU: "ACC-HDMI-2M",
      "Số lượng": 3,
      "Ngày giao hàng": "2026-07-30",
      "Khung giờ giao": "08:00 - 12:00",
      "Tên người nhận": "Nguyễn Văn A",
      "Số điện thoại": "0901234567",
      "Ghi chú": "",
    },
    {
      "Mã đơn hàng": "DH160326-02",
      "Mã cửa hàng": "ST-BT-004",
      SKU: "REF-LG-450",
      "Số lượng": 1,
      "Ngày giao hàng": "2026-07-31",
      "Khung giờ giao": "13:00 - 17:00",
      "Tên người nhận": "Trần Văn B",
      "Số điện thoại": "0908888999",
      "Ghi chú": "",
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
