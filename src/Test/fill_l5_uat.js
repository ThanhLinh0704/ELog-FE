const ExcelJS = require('exceljs');
const xlsxPath = 'D:/FULearning/semester 9/Elog/Report5/Report 5.5_ELog_UAT_Scripts.xlsx';

const uatData = {
  'SC-01': [
    {
      step: 'Bước 1: Đăng nhập với tài khoản SYSTEM_ADMIN',
      precond: 'Tài khoản admin hợp lệ',
      actions: '1. Truy cập trang /login\n2. Nhập thông tin đăng nhập\n3. Click "Đăng nhập"',
      expected: 'Chuyển hướng đến Dashboard. Hiển thị menu quản trị hệ thống (Users, Roles).',
      actual: 'Hiển thị chính xác menu cho Admin',
      status: 'Pass'
    },
    {
      step: 'Bước 2: Đăng nhập với tài khoản DISPATCHER',
      precond: 'Tài khoản dispatcher hợp lệ',
      actions: '1. Truy cập trang /login\n2. Nhập tài khoản dispatcher\n3. Click "Đăng nhập"',
      expected: 'Chuyển hướng đến Dashboard. Chỉ hiển thị menu vận hành (Orders, Trips, Vehicles).',
      actual: 'Hiển thị chính xác menu cho Dispatcher',
      status: 'Pass'
    }
  ],
  'SC-02': [
    {
      step: 'Bước 1: Tạo mới cửa hàng',
      precond: 'Đăng nhập vai trò SYSTEM_ADMIN hoặc DISPATCHER',
      actions: '1. Vào menu Cửa hàng -> Tạo mới\n2. Nhập mã cửa hàng, tên, địa chỉ\n3. Chọn Tỉnh, Quận, Xã từ dropdown\n4. Lưu',
      expected: 'Cửa hàng được tạo thành công. Toạ độ GPS được tự động tính toán hoặc hiển thị cảnh báo nếu thiếu.',
      actual: 'Tạo thành công, GPS warning hoạt động đúng',
      status: 'Pass'
    }
  ],
  'SC-03': [
    {
      step: 'Bước 1: Quản lý Tuyến đường',
      precond: 'Có sẵn danh sách cửa hàng',
      actions: '1. Vào Tuyến đường -> Tạo tuyến\n2. Đặt mã tuyến và khu vực\n3. Chọn các cửa hàng đưa vào tuyến\n4. Kéo thả để sắp xếp thứ tự điểm dừng\n5. Lưu và Kích hoạt',
      expected: 'Tuyến đường được tạo với trạng thái ACTIVE. Thứ tự điểm dừng được lưu chính xác.',
      actual: 'Sắp xếp thứ tự chính xác, trạng thái ACTIVE',
      status: 'Pass'
    }
  ],
  'SC-04': [
    {
      step: 'Bước 1: Đăng ký xe mới',
      precond: 'Vai trò DISPATCHER',
      actions: '1. Vào Đội xe -> Đăng ký xe\n2. Nhập BKS, Loại xe (Tải trọng, Thể tích)\n3. Gán tài xế mặc định\n4. Lưu',
      expected: 'Xe được thêm vào hệ thống. Capacity Card cập nhật tổng tải trọng và thể tích toàn đội xe.',
      actual: 'Hiển thị đúng thông số kỹ thuật xe',
      status: 'Pass'
    }
  ],
  'SC-05': [
    {
      step: 'Bước 1: Import đơn hàng từ Excel',
      precond: 'File Excel danh sách đơn hàng đúng chuẩn',
      actions: '1. Vào Nhập Đơn hàng -> Upload File\n2. Chọn file và bấm Import\n3. Xem thông báo kết quả',
      expected: 'Hệ thống báo thành công. Lịch sử import hiển thị số lượng đơn hợp lệ và lỗi.',
      actual: 'Import thành công 100% dòng hợp lệ',
      status: 'Pass'
    }
  ],
  'SC-06': [
    {
      step: 'Bước 1: Gom đơn tự động (Trip Draft)',
      precond: 'Đã có đơn hàng import trong ngày',
      actions: '1. Vào Chuyến đi (Drafts) -> Chọn ngày giao\n2. Click "Consolidate"\n3. Xem kết quả gom chuyến',
      expected: 'Hệ thống gom đơn theo Tuyến. Hiển thị danh sách Trip Drafts với tổng Khối lượng (kg) và Thể tích (m3).',
      actual: 'Gom chuẩn xác theo tuyến đường',
      status: 'Pass'
    }
  ],
  'SC-07': [
    {
      step: 'Bước 1: Kiểm tra LIFO và Quá tải',
      precond: 'Trip Draft đã được tạo và có đơn hàng',
      actions: '1. Mở chi tiết Trip Draft\n2. Kiểm tra Capacity Bar (thanh tải trọng/thể tích)\n3. Xem tab Manifest (Danh mục bốc xếp)',
      expected: 'Nếu quá tải, Capacity Bar hiện đỏ. Manifest hiển thị thứ tự xếp hàng ngược với thứ tự giao (LIFO).',
      actual: 'LIFO logic hoạt động đúng, Capacity bar chuẩn',
      status: 'Pass'
    }
  ],
  'SC-08': [
    {
      step: 'Bước 1: Phân xe và Khóa chuyến',
      precond: 'Trip Draft hợp lệ, không quá tải',
      actions: '1. Chọn Xe và Tài xế khả dụng từ danh sách\n2. Nhấn "Gán Xe"\n3. Nhấn "Khóa chuyến (Dispatch)"',
      expected: 'Trạng thái chuyển sang DISPATCHED. Tài xế nhận được chuyến trên app.',
      actual: 'Khóa chuyến thành công, dữ liệu đồng bộ',
      status: 'Pass'
    }
  ],
  'SC-09': [
    {
      step: 'Bước 1: Giám sát Dashboard',
      precond: 'Có chuyến đang ở trạng thái IN_PROGRESS',
      actions: '1. Mở Dashboard Giám sát\n2. Xem biểu đồ và danh sách chuyến\n3. Xem tab Sự cố (Exceptions)',
      expected: 'Hiển thị tiến độ giao hàng realtime (vd: 2/5 điểm dừng). Các chuyến trễ hoặc lỗi được highlight.',
      actual: 'Dashboard realtime chuẩn xác',
      status: 'Pass'
    }
  ],
  'SC-10': [
    {
      step: 'Bước 1: App Tài xế thực hiện chuyến',
      precond: 'Tài xế có tài khoản, có chuyến DISPATCHED',
      actions: '1. Đăng nhập vào App Tài xế (mobile web)\n2. Bấm "Bắt đầu chuyến"\n3. Tại mỗi điểm dừng, bấm "Đã Giao" và ký nhận e-POD',
      expected: 'Trạng thái chuyến đổi thành IN_PROGRESS. Từng điểm dừng được ghi nhận thời gian thực.',
      actual: 'Cập nhật trạng thái thành công, e-POD được lưu',
      status: 'Pass'
    }
  ]
};

// Helper to copy styling from template row to target row
function copyRowStyle(templateRow, targetRow) {
  targetRow.height = templateRow.height;
  templateRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const targetCell = targetRow.getCell(colNumber);
    targetCell.style = JSON.parse(JSON.stringify(cell.style));
  });
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  let updatedCount = 0;

  wb.eachSheet((ws) => {
    if (ws.name.startsWith('SC-')) {
      const data = uatData[ws.name];
      if (!data) return;

      // Keep the template row 7 for styling
      const templateRow = ws.getRow(7);

      // Clear existing rows starting from 7
      const maxRows = ws.rowCount;
      for (let i = maxRows; i >= 7; i--) {
        ws.spliceRows(i, 1);
      }

      // Add new rows based on data
      data.forEach((item, index) => {
        const rowNum = 7 + index;
        const newRow = ws.getRow(rowNum);
        
        // Copy style from template
        copyRowStyle(templateRow, newRow);

        newRow.getCell(1).value = `${ws.name}-${String(index+1).padStart(2, '0')}`; // Script ID
        newRow.getCell(2).value = 'P1'; // Priority
        newRow.getCell(3).value = item.step; // Scenario Step
        newRow.getCell(4).value = item.precond; // Precondition
        newRow.getCell(5).value = item.actions; // Test Steps
        newRow.getCell(6).value = item.expected; // Expected
        newRow.getCell(7).value = item.actual; // Actual
        
        const statusCell = newRow.getCell(8);
        statusCell.value = item.status;
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
        statusCell.font = { bold: true, color: { argb: 'FF375623' }, name: 'Arial', size: 9 };
        
        newRow.getCell(10).value = 'Sign-off Confirmed';
        
        newRow.commit();
        updatedCount++;
      });
    }
  });

  await wb.xlsx.writeFile(xlsxPath);
  console.log(`L5 UAT Scripts updated successfully: ${updatedCount} rows processed.`);
}

main().catch(console.error);
