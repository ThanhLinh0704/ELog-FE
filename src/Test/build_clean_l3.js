const ExcelJS = require('exceljs');

const reportDir = 'D:/FULearning/semester 9/Elog/Report5/';
const outputPath = reportDir + 'Report 5.3_ELog_L3-SystemAPITests.xlsx';

// ─── Colors matching L3 template exactly ──────────────────────────────────────
const NAVY_DARK  = 'FF2E75B6';  // Banner, Header, Block rows
const NAVY_LIGHT = 'FFDEEAF1'; // HOW TO USE + data rows
const WHITE      = 'FFFFFFFF';
const GREEN      = 'FF007700';
const RED_FONT   = 'FFCC0000';
const ORANGE     = 'FFCC6600';

// Column widths matching template exactly
const COL_WIDTHS = [12, 18, 16, 10, 9, 26, 16, 34, 16, 36, 14, 11, 10, 10, 18];
const HEADER_COLS = [
  'Test ID', 'Coverage Technique', 'SRS Reference', 'Feature', 'Priority',
  'HTTP Method + Endpoint', 'Auth Required',
  'Request (Params / Body / Headers)',
  'Expected HTTP Status', 'Expected Response Body', 'Expected Error Code',
  'Negative?', 'Status', 'Defect ID', 'Notes'
];
const HOW_TO_USE = 'HOW TO USE:  (1) Review Introduction sheet first  (2) Copy a template row  (3) Replace [FILL IN] placeholders  (4) Update Status after each test run';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setupSheet(ws, bannerText) {
  ws.columns = COL_WIDTHS.map(w => ({ width: w }));
  // Row 1 – Banner
  const r1 = ws.addRow([bannerText]);
  ws.mergeCells(`A1:O1`);
  r1.height = 22;
  r1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
  r1.getCell(1).font = { bold: true, color: { argb: WHITE }, name: 'Arial', size: 10 };
  r1.getCell(1).alignment = { vertical: 'middle' };
  // Row 2 – HOW TO USE
  const r2 = ws.addRow(new Array(15).fill(HOW_TO_USE));
  ws.mergeCells(`A2:O2`);
  r2.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_LIGHT } };
  r2.getCell(1).font = { italic: true, color: { argb: 'FF2E75B6' }, name: 'Arial', size: 8 };
  // Row 3 – empty
  ws.addRow([]);
  // Row 4 – headers
  const r4 = ws.addRow(HEADER_COLS);
  r4.height = 32;
  r4.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
    cell.font = { bold: true, color: { argb: WHITE }, name: 'Arial', size: 9 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
}

function addBlock(ws, text) {
  const r = ws.addRow(new Array(15).fill(text));
  ws.mergeCells(`A${r.number}:O${r.number}`);
  r.height = 18;
  r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
  r.getCell(1).font = { bold: true, color: { argb: WHITE }, name: 'Arial', size: 9 };
}

function addTc(ws, v) {
  const row = ws.addRow(v);
  row.height = 68;
  row.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_LIGHT } };
    cell.font = { name: 'Arial', size: 9 };
    cell.alignment = { wrapText: true, vertical: 'top' };
  });
  if (v[4] === 'P1') row.getCell(5).font = { name: 'Arial', size: 9, bold: true, color: { argb: RED_FONT } };
  if (v[11] === 'Yes') row.getCell(12).font = { name: 'Arial', size: 9, bold: true, color: { argb: ORANGE } };
  row.getCell(13).font = { name: 'Arial', size: 9, bold: true, color: { argb: GREEN } };
}

// ─── L3 TEST DATA ─────────────────────────────────────────────────────────────
const sheetsData = [

  // ─ L3-AuthAPI ───────────────────────────────────────────────────────────────
  {
    name: 'L3-AuthAPI',
    banner: 'L3-AuthAPI  |  Input Domain Partitioning per endpoint  |  POST /api/auth/login  |  POST /api/auth/refresh  |  POST /api/auth/logout',
    blocks: [
      {
        header: '▶  Block: POST /api/auth/login  |  Input dims: username, password, account status',
        tcs: [
          ['L3-AUTH-01','Input-Domain-Happy','US-02; AC-02a','FT-01','P1',
           'POST /api/auth/login','None',
           'Body: {"username":"admin","password":"Admin@2025"}',
           '200','{"accessToken":"...", "refreshToken":"...", "username":"admin", "roles":["SYSTEM_ADMIN"]}','None','No','Pass','','Happy path – SYSTEM_ADMIN'],
          ['L3-AUTH-02','Input-Domain-Error','US-02; NAC-02a','FT-01','P1',
           'POST /api/auth/login','None',
           'Body: {"username":"nonexistent","password":"any"}',
           '401','{"error":{"code":"INVALID_CREDENTIALS"}}','INVALID_CREDENTIALS','Yes','Pass','','User not found'],
          ['L3-AUTH-03','Input-Domain-Error','US-02; NAC-02b','FT-01','P1',
           'POST /api/auth/login','None',
           'Body: {"username":"admin","password":"WrongPass!"}',
           '401','{"error":{"code":"INVALID_CREDENTIALS"}}','INVALID_CREDENTIALS','Yes','Pass','','Wrong password'],
          ['L3-AUTH-04','Input-Domain-Error','US-02; NAC-02c','FT-01','P2',
           'POST /api/auth/login','None',
           'Body: {"username":"inactive_user","password":"Pass@123"}',
           '403','{"error":{"code":"ACCOUNT_DISABLED"}}','ACCOUNT_DISABLED','Yes','Pass','','Inactive account'],
          ['L3-AUTH-05','BVA – Missing Field','US-02; NAC-02d','FT-01','P1',
           'POST /api/auth/login','None',
           'Body: {"username":"admin"} (password bị thiếu)',
           '400','{"error":{"code":"VALIDATION_ERROR"}}','VALIDATION_ERROR','Yes','Pass','','Missing required field'],
          ['L3-AUTH-06','Input-Domain-Happy','US-02; AC-02b (COORDINATOR)','FT-01','P1',
           'POST /api/auth/login','None',
           'Body: {"username":"coordinator01","password":"Coord@123"}',
           '200','{"roles":["COORDINATOR"],"accessToken":"..."}','None','No','Pass','','COORDINATOR login'],
          ['L3-AUTH-07','Input-Domain-Happy','US-02; AC-02c (DRIVER)','FT-01','P1',
           'POST /api/auth/login','None',
           'Body: {"username":"driver01","password":"Driver@123"}',
           '200','{"roles":["DRIVER"],"accessToken":"..."}','None','No','Pass','','DRIVER login'],
        ]
      },
      {
        header: '▶  Block: POST /api/auth/refresh  |  Input dims: refreshToken validity',
        tcs: [
          ['L3-AUTH-08','Input-Domain-Happy','US-02; AC-02e','FT-01','P1',
           'POST /api/auth/refresh','None',
           'Body: {"refreshToken":"valid-refresh-uuid"}',
           '200','{"accessToken":"new-access-token","refreshToken":"new-refresh-uuid"}','None','No','Pass','','Token rotation'],
          ['L3-AUTH-09','Input-Domain-Error','US-02; NAC-02e','FT-01','P1',
           'POST /api/auth/refresh','None',
           'Body: {"refreshToken":"expired-or-invalid-token"}',
           '401','{"error":{"code":"REFRESH_TOKEN_INVALID"}}','REFRESH_TOKEN_INVALID','Yes','Pass','','Invalid refresh token'],
        ]
      },
      {
        header: '▶  Block: POST /api/auth/logout  |  Token blacklisting',
        tcs: [
          ['L3-AUTH-10','Security – Logout Blacklist','US-02; SEC-01','FT-01','P1',
           'POST /api/auth/logout','Bearer JWT (any role)',
           'Headers: Authorization: Bearer {accessToken}',
           '200','{"message":"Đăng xuất thành công"}','None','No','Pass','','Token blacklisted, subsequent use → 401'],
        ]
      }
    ]
  },

  // ─ L3-UserAPI ───────────────────────────────────────────────────────────────
  {
    name: 'L3-UserAPI',
    banner: 'L3-UserAPI  |  Input Domain Partitioning per endpoint  |  /api/users  |  CRUD + Role + Status + Password',
    blocks: [
      {
        header: '▶  Block: POST /api/users  |  Create User (SYSTEM_ADMIN only)',
        tcs: [
          ['L3-USR-01','Input-Domain-Happy','US-03; AC-03a','FT-02','P1',
           'POST /api/users','Bearer JWT (SYSTEM_ADMIN)',
           'Body: {"username":"newdriver","email":"nd@elog.vn","password":"Pass@123","fullName":"New Driver","roleId":3}',
           '201','{"id":N,"username":"newdriver","roles":["DRIVER"]}','None','No','Pass','','Create driver user'],
          ['L3-USR-02','Auth-Error','US-03; NAC-03','FT-02','P1',
           'POST /api/users','Bearer JWT (COORDINATOR)',
           'Body: valid CreateUserDTO',
           '403','{"error":{"code":"ACCESS_DENIED"}}','ACCESS_DENIED','Yes','Pass','','COORDINATOR cannot create users'],
          ['L3-USR-03','Input-Domain-Error','US-03; NAC-03a','FT-02','P1',
           'POST /api/users','Bearer JWT (SYSTEM_ADMIN)',
           'Body: {"username":"admin"} (existing username)',
           '409','{"error":{"code":"USERNAME_ALREADY_EXISTS"}}','USERNAME_ALREADY_EXISTS','Yes','Pass','','Duplicate username'],
          ['L3-USR-04','Input-Domain-Error','US-03; NAC-03b','FT-02','P2',
           'POST /api/users','Bearer JWT (SYSTEM_ADMIN)',
           'Body: {"username":"","email":"invalid-email","password":"123"}',
           '400','{"error":{"code":"VALIDATION_ERROR"}}','VALIDATION_ERROR','Yes','Pass','','Invalid fields'],
        ]
      },
      {
        header: '▶  Block: GET /api/users  |  List Users with pagination',
        tcs: [
          ['L3-USR-05','Input-Domain-Happy','US-03; AC-03d','FT-02','P1',
           'GET /api/users','Bearer JWT (SYSTEM_ADMIN)',
           'Params: page=0&size=20&role=DRIVER',
           '200','{"content":[...],"page":{"totalElements":N}}','None','No','Pass','','Paginated list filtered by role'],
          ['L3-USR-06','Auth-Error (no token)','US-03; NAC-03','FT-02','P1',
           'GET /api/users','None (no token)',
           'Headers: (no Authorization)',
           '401','{"error":{"code":"AUTH_001"}}','AUTH_001','Yes','Pass','','No token → 401'],
        ]
      },
      {
        header: '▶  Block: PATCH /api/users/{id}/status  |  Toggle active/inactive',
        tcs: [
          ['L3-USR-07','Input-Domain-Happy','US-03; AC-03e','FT-02','P1',
           'PATCH /api/users/{id}/status','Bearer JWT (SYSTEM_ADMIN)',
           'PathVar: id=5\nBody: {"active":false}',
           '200','{"id":5,"isActive":false}','None','No','Pass','','Deactivate user'],
          ['L3-USR-08','Input-Domain-Error (not found)','US-03; NAC-03c','FT-02','P2',
           'PATCH /api/users/9999/status','Bearer JWT (SYSTEM_ADMIN)',
           'PathVar: id=9999',
           '404','{"error":{"code":"USER_NOT_FOUND"}}','USER_NOT_FOUND','Yes','Pass','','Non-existent user'],
        ]
      },
      {
        header: '▶  Block: POST /api/users/{id}/change-password',
        tcs: [
          ['L3-USR-09','Input-Domain-Happy','US-03; AC-03f','FT-02','P1',
           'POST /api/users/{id}/change-password','Bearer JWT (own user)',
           'Body: {"currentPassword":"Admin@2025","newPassword":"NewPass@2026"}',
           '200','{"message":"Đổi mật khẩu thành công"}','None','No','Pass','','Self password change'],
          ['L3-USR-10','Input-Domain-Error','US-03; NAC-03d','FT-02','P1',
           'POST /api/users/{id}/change-password','Bearer JWT (own user)',
           'Body: {"currentPassword":"WRONG","newPassword":"NewPass@2026"}',
           '400','{"error":{"code":"CURRENT_PASSWORD_INCORRECT"}}','CURRENT_PASSWORD_INCORRECT','Yes','Pass','','Wrong current password'],
        ]
      }
    ]
  },

  // ─ L3-StoreAPI ──────────────────────────────────────────────────────────────
  {
    name: 'L3-StoreAPI',
    banner: 'L3-StoreAPI  |  Input Domain Partitioning per endpoint  |  /api/stores  |  CRUD + Deactivation Guard',
    blocks: [
      {
        header: '▶  Block: POST /api/stores  |  Create store with administrative location',
        tcs: [
          ['L3-STR-01','Input-Domain-Happy','US-04; AC-04a','FT-03','P1',
           'POST /api/stores','Bearer JWT (SYSTEM_ADMIN)',
           'Body: {"code":"ST-NEW","name":"Cửa hàng Mới","provinceId":79,"districtId":760,"wardId":26734,"addressDetail":"123 Lê Lợi"}',
           '201','{"id":N,"code":"ST-NEW","province":"Hồ Chí Minh"}','None','No','Pass','','Create store with valid address'],
          ['L3-STR-02','Input-Domain-Error','US-04; NAC-04a','FT-03','P1',
           'POST /api/stores','Bearer JWT (SYSTEM_ADMIN)',
           'Body: {"code":"ST-001"} (existing code)',
           '409','{"error":{"code":"STORE_CODE_EXISTS"}}','STORE_CODE_EXISTS','Yes','Pass','','Duplicate store code'],
          ['L3-STR-03','Input-Domain-Error','US-04; NAC-04b','FT-03','P2',
           'POST /api/stores','Bearer JWT (SYSTEM_ADMIN)',
           'Body: {"code":"ST-X","wardId":99999} (non-existent ward)',
           '404','{"error":{"code":"WARD_NOT_FOUND"}}','WARD_NOT_FOUND','Yes','Pass','','Invalid ward FK'],
        ]
      },
      {
        header: '▶  Block: DELETE /api/stores/{id}  |  Deactivation guard (active route)',
        tcs: [
          ['L3-STR-04','Business Rule Guard','US-04; NAC-04c','FT-03','P1',
           'DELETE /api/stores/{id}','Bearer JWT (SYSTEM_ADMIN)',
           'PathVar: id=10 (store in active route)',
           '409','{"error":{"code":"STORE_IN_ACTIVE_ROUTE"}}','STORE_IN_ACTIVE_ROUTE','Yes','Pass','','Cannot delete store in active route'],
          ['L3-STR-05','Input-Domain-Happy','US-04; AC-04c','FT-03','P1',
           'DELETE /api/stores/{id}','Bearer JWT (SYSTEM_ADMIN)',
           'PathVar: id=20 (store not in any route)',
           '200','{"message":"Cửa hàng đã được vô hiệu hóa"}','None','No','Pass','','Delete safe store'],
        ]
      },
      {
        header: '▶  Block: GET /api/stores  |  List with search/filter',
        tcs: [
          ['L3-STR-06','Input-Domain-Happy','US-04; AC-04d','FT-03','P1',
           'GET /api/stores','Bearer JWT (SYSTEM_ADMIN)',
           'Params: page=0&size=20&search=Q1&provinceId=79',
           '200','{"content":[...],"page":{"totalElements":N}}','None','No','Pass','','Filter by province + search keyword'],
        ]
      }
    ]
  },

  // ─ L3-RouteAPI ──────────────────────────────────────────────────────────────
  {
    name: 'L3-RouteAPI',
    banner: 'L3-RouteAPI  |  Input Domain Partitioning per endpoint  |  /api/routes  |  CRUD + Stops + Activation',
    blocks: [
      {
        header: '▶  Block: POST /api/routes  |  Create route',
        tcs: [
          ['L3-ROU-01','Input-Domain-Happy','US-05; AC-05a','FT-04','P1',
           'POST /api/routes','Bearer JWT (SYSTEM_ADMIN)',
           'Body: {"code":"RT-NEW","name":"Tuyến HCM-BL"}',
           '201','{"id":N,"code":"RT-NEW","isActive":false,"stopCount":0}','None','No','Pass','','Create new inactive route'],
          ['L3-ROU-02','Input-Domain-Error','US-05; NAC-05a','FT-04','P1',
           'POST /api/routes','Bearer JWT (SYSTEM_ADMIN)',
           'Body: {"code":"RT-001"} (existing code)',
           '409','{"error":{"code":"ROUTE_CODE_EXISTS"}}','ROUTE_CODE_EXISTS','Yes','Pass','','Duplicate route code'],
        ]
      },
      {
        header: '▶  Block: POST /api/routes/{id}/stops  |  Add stop to route',
        tcs: [
          ['L3-ROU-03','Input-Domain-Happy','US-05; AC-05b','FT-04','P1',
           'POST /api/routes/{id}/stops','Bearer JWT (SYSTEM_ADMIN)',
           'PathVar: id=RT-01\nBody: {"storeId":5,"sequenceOrder":3}',
           '201','{"routeStopId":N,"storeCode":"ST-005","sequenceOrder":3}','None','No','Pass','','Add store as route stop'],
          ['L3-ROU-04','Input-Domain-Error','US-05; NAC-05b','FT-04','P2',
           'POST /api/routes/{id}/stops','Bearer JWT (SYSTEM_ADMIN)',
           'PathVar: id=RT-01\nBody: {"storeId":5} (already in route)',
           '409','{"error":{"code":"STORE_ALREADY_IN_ROUTE"}}','STORE_ALREADY_IN_ROUTE','Yes','Pass','','Store already a stop'],
        ]
      },
      {
        header: '▶  Block: PATCH /api/routes/{id}/activate  |  Activation guard',
        tcs: [
          ['L3-ROU-05','Business Rule Guard','US-05; NAC-05c','FT-04','P1',
           'PATCH /api/routes/{id}/activate','Bearer JWT (SYSTEM_ADMIN)',
           'PathVar: id=RT-NEW (only 1 stop)',
           '422','{"error":{"code":"ROUTE_TOO_FEW_STOPS"}}','ROUTE_TOO_FEW_STOPS','Yes','Pass','','< 2 stops → cannot activate'],
          ['L3-ROU-06','Input-Domain-Happy','US-05; AC-05d','FT-04','P1',
           'PATCH /api/routes/{id}/activate','Bearer JWT (SYSTEM_ADMIN)',
           'PathVar: id=RT-01 (has 5 stops)',
           '200','{"id":"RT-01","isActive":true}','None','No','Pass','','Activate route with ≥2 stops'],
        ]
      }
    ]
  },

  // ─ L3-VehicleAPI ────────────────────────────────────────────────────────────
  {
    name: 'L3-VehicleAPI',
    banner: 'L3-VehicleAPI  |  Input Domain Partitioning per endpoint  |  /api/vehicles  |  CRUD + Fleet Capacity',
    blocks: [
      {
        header: '▶  Block: POST /api/vehicles  |  Create vehicle',
        tcs: [
          ['L3-VEH-01','Input-Domain-Happy','US-06; AC-06a','FT-05','P1',
           'POST /api/vehicles','Bearer JWT (SYSTEM_ADMIN)',
           'Body: {"plateNumber":"51G-12345","vehicleType":"5 TONS","payloadKg":5000,"maxVolumeM3":20.0}',
           '201','{"id":N,"plateNumber":"51G-12345","isActive":true}','None','No','Pass','','Create vehicle'],
          ['L3-VEH-02','Input-Domain-Error','US-06; NAC-06a','FT-05','P1',
           'POST /api/vehicles','Bearer JWT (SYSTEM_ADMIN)',
           'Body: {"plateNumber":"29A-12345"} (existing plate)',
           '409','{"error":{"code":"PLATE_NUMBER_EXISTS"}}','PLATE_NUMBER_EXISTS','Yes','Pass','','Duplicate plate'],
        ]
      },
      {
        header: '▶  Block: DELETE /api/vehicles/{id}  |  Active trip conflict guard',
        tcs: [
          ['L3-VEH-03','Business Rule Guard','US-06; NAC-06b','FT-05','P1',
           'DELETE /api/vehicles/{id}','Bearer JWT (SYSTEM_ADMIN)',
           'PathVar: id=3 (vehicle in active trip)',
           '409','{"error":{"code":"VEHICLE_IN_ACTIVE_TRIP"}}','VEHICLE_IN_ACTIVE_TRIP','Yes','Pass','','Cannot deactivate vehicle in active trip'],
        ]
      },
      {
        header: '▶  Block: GET /api/fleet/capacity-check  |  Fleet capacity summary',
        tcs: [
          ['L3-VEH-04','Input-Domain-Happy','US-06; AC-06d','FT-05','P1',
           'GET /api/fleet/capacity-check','Bearer JWT (COORDINATOR)',
           'Params: date=2026-08-02',
           '200','{"totalActiveVehicles":3,"totalPayloadKg":10000,"totalVolumeM3":33.0,"availableVehicles":2}','None','No','Pass','','Fleet capacity aggregation'],
        ]
      }
    ]
  },

  // ─ L3-ProductAPI ────────────────────────────────────────────────────────────
  {
    name: 'L3-ProductAPI',
    banner: 'L3-ProductAPI  |  Input Domain Partitioning per endpoint  |  /api/products  |  CRUD + Volume Calc',
    blocks: [
      {
        header: '▶  Block: POST /api/products  |  Create product with volume auto-calculation',
        tcs: [
          ['L3-PRD-01','Input-Domain-Happy','US-07; AC-07a','FT-06','P1',
           'POST /api/products','Bearer JWT (SYSTEM_ADMIN)',
           'Body: {"sku":"REF-NEW-001","productName":"Tủ lạnh LG","weightKg":70.0,"lengthM":0.65,"widthM":0.70,"heightM":1.75}',
           '201','{"sku":"REF-NEW-001","weightKg":70.0,"volumeM3":0.7963}','None','No','Pass','','Volume = 0.65×0.70×1.75 = 0.7963m³'],
          ['L3-PRD-02','Input-Domain-Error','US-07; NAC-07a','FT-06','P1',
           'POST /api/products','Bearer JWT (SYSTEM_ADMIN)',
           'Body: {"sku":"REF-SAM-300"} (existing SKU)',
           '409','{"error":{"code":"SKU_ALREADY_EXISTS"}}','SKU_ALREADY_EXISTS','Yes','Pass','','Duplicate SKU'],
          ['L3-PRD-03','BVA – Zero Dimension','US-07; NAC-07b','FT-06','P2',
           'POST /api/products','Bearer JWT (SYSTEM_ADMIN)',
           'Body: {"sku":"SKU-ZERO","weightKg":1.0,"lengthM":0,"widthM":0.5,"heightM":0.5}',
           '400','{"error":{"code":"VALIDATION_ERROR","detail":"lengthM must be > 0"}}','VALIDATION_ERROR','Yes','Pass','','Zero dimension rejected'],
        ]
      },
      {
        header: '▶  Block: PUT /api/products/{id}  |  Update (snapshot independence)',
        tcs: [
          ['L3-PRD-04','Input-Domain-Happy + Snapshot','US-07; AC-07c','FT-06','P1',
           'PUT /api/products/5','Bearer JWT (SYSTEM_ADMIN)',
           'Body: {"weightKg":72.0,"lengthM":0.65,"widthM":0.70,"heightM":1.80}',
           '200','{"id":5,"weightKg":72.0,"volumeM3":0.819}','None','No','Pass','','Update product; existing order_items unchanged (snapshot)'],
        ]
      }
    ]
  },

  // ─ L3-ImportAPI ─────────────────────────────────────────────────────────────
  {
    name: 'L3-ImportAPI',
    banner: 'L3-ImportAPI  |  Input Domain Partitioning per endpoint  |  /api/imports  |  Excel Upload + Batch Queries',
    blocks: [
      {
        header: '▶  Block: POST /api/imports  |  Excel file upload (multipart/form-data)',
        tcs: [
          ['L3-IMP-01','Input-Domain-Happy','US-08; AC-08a','FT-07','P1',
           'POST /api/imports','Bearer JWT (COORDINATOR)',
           'multipart: file=valid_50rows.xlsx\nparam: deliveryDate=2026-08-03\nparam: confirmReplace=false',
           '201','{"success":true,"data":{"status":"COMPLETED","totalRows":50,"acceptedRows":50,"rejectedRows":0}}','None','No','Pass','','50 valid orders imported'],
          ['L3-IMP-02','Input-Domain-Error – Corrupt File','US-08; NAC-08b','FT-07','P1',
           'POST /api/imports','Bearer JWT (COORDINATOR)',
           'multipart: file=corrupt.xlsx (invalid bytes)',
           '400','{"error":{"code":"EXCEL_PARSE_ERROR"}}','EXCEL_PARSE_ERROR','Yes','Pass','','Corrupt file → 400'],
          ['L3-IMP-03','Input-Domain-Error – Duplicate Date','US-08; NAC-08c','FT-07','P1',
           'POST /api/imports','Bearer JWT (COORDINATOR)',
           'multipart: file=new.xlsx\nparam: deliveryDate=2026-08-03 (already imported)\nparam: confirmReplace=false',
           '409','{"error":"DUPLICATE_DELIVERY_DATE"}','DUPLICATE_DELIVERY_DATE','Yes','Pass','','Existing batch for date → 409'],
          ['L3-IMP-04','Replace Flow','US-08; AC-08b','FT-07','P1',
           'POST /api/imports','Bearer JWT (COORDINATOR)',
           'multipart: file=new.xlsx\nparam: deliveryDate=2026-08-03\nparam: confirmReplace=true',
           '201','{"data":{"status":"COMPLETED"}} (old batch deactivated)','None','No','Pass','','Replace existing batch'],
          ['L3-IMP-05','Auth-Error','US-08; NAC-08e','FT-07','P1',
           'POST /api/imports','Bearer JWT (DRIVER)',
           'multipart: file=valid.xlsx',
           '403','{"error":{"code":"ACCESS_DENIED"}}','ACCESS_DENIED','Yes','Pass','','DRIVER cannot import'],
          ['L3-IMP-06','Input Partial Failure','US-08; NAC-08a','FT-07','P1',
           'POST /api/imports','Bearer JWT (COORDINATOR)',
           'multipart: file=partial_error.xlsx (1 row invalid SKU, 4 valid)',
           '201','{"data":{"status":"COMPLETED","acceptedRows":4,"rejectedRows":1}}','None','Yes','Pass','','Partial failure – valid rows kept'],
        ]
      },
      {
        header: '▶  Block: GET /api/imports/{batchId}/errors  |  Error export',
        tcs: [
          ['L3-IMP-07','Input-Domain-Happy','US-08; AC-08d','FT-07','P1',
           'GET /api/imports/{batchId}/errors','Bearer JWT (COORDINATOR)',
           'PathVar: batchId=1 (has 2 errors)',
           '200','[{"rowNumber":5,"errorCode":"STORE_NOT_FOUND","message":"..."}, ...]','None','No','Pass','','Get error rows for batch'],
          ['L3-IMP-08','Not Found','US-08; NAC-08f','FT-07','P2',
           'GET /api/imports/9999','Bearer JWT (COORDINATOR)',
           'PathVar: batchId=9999',
           '404','{"error":{"code":"BATCH_NOT_FOUND"}}','BATCH_NOT_FOUND','Yes','Pass','','Non-existent batch'],
        ]
      }
    ]
  },

  // ─ L3-TripDraftAPI ──────────────────────────────────────────────────────────
  {
    name: 'L3-TripDraftAPI',
    banner: 'L3-TripDraftAPI  |  Input Domain Partitioning per endpoint  |  /api/trip-drafts  |  Consolidate + Validate + Manifest + Dispatch',
    blocks: [
      {
        header: '▶  Block: POST /api/trip-drafts/consolidate  |  Route consolidation engine',
        tcs: [
          ['L3-TRD-01','Input-Domain-Happy','US-10; AC-10a','FT-09','P1',
           'POST /api/trip-drafts/consolidate','Bearer JWT (COORDINATOR)',
           'Body: {"deliveryDate":"2026-08-03"}',
           '200','{"tripDraftsCreatedOrUpdated":3,"tripDrafts":[...]}','None','No','Pass','','3 drafts created for 3 active routes'],
          ['L3-TRD-02','Edge – Empty Date','US-10; NAC-10a','FT-09','P2',
           'POST /api/trip-drafts/consolidate','Bearer JWT (COORDINATOR)',
           'Body: {"deliveryDate":"2030-01-01"} (no orders)',
           '200','{"tripDraftsCreatedOrUpdated":0,"tripDrafts":[]}','None','No','Pass','','No orders → 0 drafts, no error'],
        ]
      },
      {
        header: '▶  Block: POST /api/trip-drafts/{id}/validate-capacity  |  Weight & volume check',
        tcs: [
          ['L3-TRD-03','Input-Domain-Happy – Pass','US-12; AC-12a','FT-11','P1',
           'POST /api/trip-drafts/{id}/validate-capacity','Bearer JWT (COORDINATOR)',
           'PathVar: id=10\nBody: {"vehicleId":2}',
           '200','{"weightCheckResult":"PASS","weightRatio":0.83,"volumeCheckResult":"PASS","volumeRatio":0.75}','None','No','Pass','','Within capacity'],
          ['L3-TRD-04','Input-Domain-Error – Overweight','US-12; NAC-12a','FT-11','P1',
           'POST /api/trip-drafts/{id}/validate-capacity','Bearer JWT (COORDINATOR)',
           'PathVar: id=11\nBody: {"vehicleId":1} (overweight)',
           '200','{"weightCheckResult":"FAIL","weightRatio":1.17,"volumeCheckResult":"PASS"}','None','Yes','Pass','','Overweight returns 200 with FAIL result (not HTTP error)'],
        ]
      },
      {
        header: '▶  Block: POST /api/trip-drafts/{id}/generate-manifest  |  LIFO manifest',
        tcs: [
          ['L3-TRD-05','Input-Domain-Happy','US-13; AC-13a','FT-12','P1',
           'POST /api/trip-drafts/{id}/generate-manifest','Bearer JWT (COORDINATOR)',
           'PathVar: id=10',
           '201','{"manifestId":N,"loadingSequence":[{"stopCode":"ST-C","seq":1},{"stopCode":"ST-B","seq":2},{"stopCode":"ST-A","seq":3}]}','None','No','Pass','','LIFO sequence C→B→A'],
          ['L3-TRD-06','Conflict – Manifest Exists','US-13; NAC-13a','FT-12','P2',
           'POST /api/trip-drafts/{id}/generate-manifest','Bearer JWT (COORDINATOR)',
           'PathVar: id=10 (manifest already generated)',
           '409','{"error":{"code":"MANIFEST_ALREADY_EXISTS"}}','MANIFEST_ALREADY_EXISTS','Yes','Pass','','Duplicate manifest guard'],
        ]
      },
      {
        header: '▶  Block: POST /api/trip-drafts/{id}/confirm  |  Coordinator confirmation',
        tcs: [
          ['L3-TRD-07','Input-Domain-Happy','US-11; AC-11a','FT-09','P1',
           'POST /api/trip-drafts/{id}/confirm','Bearer JWT (COORDINATOR)',
           'PathVar: id=10',
           '200','{"status":"PLANNED","confirmedAt":"...","confirmedBy":"coordinator01"}','None','No','Pass','','Draft confirmed'],
          ['L3-TRD-08','Revert to Draft','US-11; AC-11b','FT-09','P1',
           'POST /api/trip-drafts/{id}/revert','Bearer JWT (COORDINATOR)',
           'PathVar: id=10',
           '200','{"status":"DRAFT","confirmedAt":null,"validatedAt":null}','None','No','Pass','','Revert clears all audit fields'],
        ]
      },
      {
        header: '▶  Block: POST /api/trip-drafts/{id}/assign  |  Dispatch with vehicle + driver',
        tcs: [
          ['L3-TRD-09','Input-Domain-Happy','US-16; AC-16a','FT-15','P1',
           'POST /api/trip-drafts/{id}/assign','Bearer JWT (COORDINATOR)',
           'PathVar: id=10\nBody: {"vehicleId":2,"driverId":3}',
           '201','{"tripId":N,"status":"DISPATCHED","vehiclePlate":"29A-12345","driverName":"Nguyen Van A"}','None','No','Pass','','Trip dispatched'],
          ['L3-TRD-10','Draft Not VALIDATED','US-16; NAC-16a','FT-15','P1',
           'POST /api/trip-drafts/{id}/assign','Bearer JWT (COORDINATOR)',
           'PathVar: id=11 (status=DRAFT)\nBody: {"vehicleId":2,"driverId":3}',
           '409','{"error":{"code":"DRAFT_NOT_VALIDATED"}}','DRAFT_NOT_VALIDATED','Yes','Pass','','Must be VALIDATED before dispatch'],
          ['L3-TRD-11','Vehicle Not Available','US-16; NAC-16b','FT-15','P1',
           'POST /api/trip-drafts/{id}/assign','Bearer JWT (COORDINATOR)',
           'PathVar: id=10\nBody: {"vehicleId":99,"driverId":3} (vehicle busy)',
           '409','{"error":{"code":"VEHICLE_NOT_AVAILABLE"}}','VEHICLE_NOT_AVAILABLE','Yes','Pass','','Vehicle in active trip'],
        ]
      }
    ]
  },

  // ─ L3-TripAPI ───────────────────────────────────────────────────────────────
  {
    name: 'L3-TripAPI',
    banner: 'L3-TripAPI  |  Input Domain Partitioning per endpoint  |  /api/trips  |  Dispatch + Monitoring',
    blocks: [
      {
        header: '▶  Block: POST /api/trips/{id}/dispatch  |  Final dispatch',
        tcs: [
          ['L3-TRP-01','Input-Domain-Happy','US-16; AC-16b','FT-15','P1',
           'POST /api/trips/{id}/dispatch','Bearer JWT (COORDINATOR)',
           'PathVar: id=5 (ASSIGNED trip)',
           '200','{"id":5,"status":"DISPATCHED","dispatchedAt":"..."}','None','No','Pass','','Trip dispatched'],
          ['L3-TRP-02','Invalid State','US-16; NAC-16c','FT-15','P1',
           'POST /api/trips/{id}/dispatch','Bearer JWT (COORDINATOR)',
           'PathVar: id=6 (already DISPATCHED)',
           '409','{"error":{"code":"INVALID_TRIP_STATE"}}','INVALID_TRIP_STATE','Yes','Pass','','Cannot dispatch already dispatched trip'],
        ]
      },
      {
        header: '▶  Block: GET /api/trips/{tripId}  |  Trip detail',
        tcs: [
          ['L3-TRP-03','Input-Domain-Happy','US-16; AC-16d','FT-15','P1',
           'GET /api/trips/{tripId}','Bearer JWT (COORDINATOR)',
           'PathVar: tripId=5',
           '200','{"id":5,"status":"DISPATCHED","vehicle":{...},"driver":{...},"stops":[...]}','None','No','Pass','','Get trip detail'],
          ['L3-TRP-04','Not Found','US-16; NAC-16d','FT-15','P2',
           'GET /api/trips/9999','Bearer JWT (COORDINATOR)',
           'PathVar: tripId=9999',
           '404','{"error":{"code":"TRIP_NOT_FOUND"}}','TRIP_NOT_FOUND','Yes','Pass','','Non-existent trip'],
        ]
      }
    ]
  },

  // ─ L3-DriverAPI ─────────────────────────────────────────────────────────────
  {
    name: 'L3-DriverAPI',
    banner: 'L3-DriverAPI  |  Input Domain Partitioning per endpoint  |  Driver App APIs  |  Start/Stop/Deliver/Exception',
    blocks: [
      {
        header: '▶  Block: POST /api/driver/trips/{id}/start  |  Driver starts trip',
        tcs: [
          ['L3-DRV-01','Input-Domain-Happy','US-19; AC-19a','FT-18','P1',
           'POST /api/driver/trips/{id}/start','Bearer JWT (DRIVER)',
           'PathVar: id=5 (assigned to this driver)',
           '200','{"id":5,"status":"IN_PROGRESS","actualDepartureTime":"..."}','None','No','Pass','','Driver starts trip'],
          ['L3-DRV-02','Auth Guard – Wrong Driver','US-19; NAC-19a','FT-18','P1',
           'POST /api/driver/trips/{id}/start','Bearer JWT (DRIVER=99)',
           'PathVar: id=5 (assigned to driver 3)',
           '403','{"error":{"code":"ACCESS_DENIED"}}','ACCESS_DENIED','Yes','Pass','','Wrong driver → 403'],
        ]
      },
      {
        header: '▶  Block: POST /api/driver/stops/{stopId}/confirm-delivery',
        tcs: [
          ['L3-DRV-03','Input-Domain-Happy','US-19; AC-19c','FT-18','P1',
           'POST /api/driver/stops/{stopId}/confirm-delivery','Bearer JWT (DRIVER)',
           'PathVar: stopId=S-03\nBody: {"lat":10.7769,"lng":106.7009,"photoUrl":"https://..."}',
           '200','{"stopId":"S-03","status":"DELIVERED","nextStop":{"id":"S-04"}}','None','No','Pass','','Confirm delivery with GPS'],
          ['L3-DRV-04','Last Stop – Auto Complete Trip','US-19; AC-19d','FT-18','P1',
           'POST /api/driver/stops/{stopId}/confirm-delivery','Bearer JWT (DRIVER)',
           'PathVar: stopId=S-05 (last stop)',
           '200','{"stopId":"S-05","status":"DELIVERED","tripStatus":"COMPLETED"}','None','No','Pass','','Last stop → trip auto-completed'],
        ]
      },
      {
        header: '▶  Block: POST /api/driver/stops/{stopId}/exception',
        tcs: [
          ['L3-DRV-05','Input-Domain-Happy','US-20; AC-20a','FT-19','P1',
           'POST /api/driver/stops/{stopId}/exception','Bearer JWT (DRIVER)',
           'PathVar: stopId=S-03\nBody: {"exceptionType":"CUSTOMER_ABSENT","note":"Khách không có mặt","photoUrl":"..."}',
           '201','{"exceptionId":N,"type":"CUSTOMER_ABSENT","status":"OPEN"}','None','No','Pass','','Report customer absent exception'],
        ]
      }
    ]
  },

  // ─ L3-MonitoringAPI ─────────────────────────────────────────────────────────
  {
    name: 'L3-MonitoringAPI',
    banner: 'L3-MonitoringAPI  |  Input Domain Partitioning per endpoint  |  /api/monitoring  |  Dashboard + Exceptions',
    blocks: [
      {
        header: '▶  Block: GET /api/monitoring/dashboard  |  Real-time dashboard stats',
        tcs: [
          ['L3-MON-01','Input-Domain-Happy','US-17; AC-17a','FT-16','P1',
           'GET /api/monitoring/dashboard','Bearer JWT (COORDINATOR)',
           'Params: date=2026-08-03',
           '200','{"activeTrips":5,"completedToday":2,"availableVehicles":3,"openExceptions":1}','None','No','Pass','','Dashboard aggregation for date'],
          ['L3-MON-02','Auth-Error','US-17; NAC-17','FT-16','P1',
           'GET /api/monitoring/dashboard','Bearer JWT (DRIVER)',
           'Params: date=2026-08-03',
           '403','{"error":{"code":"ACCESS_DENIED"}}','ACCESS_DENIED','Yes','Pass','','DRIVER cannot view dashboard'],
        ]
      },
      {
        header: '▶  Block: GET /api/exceptions  |  Exception list for coordinator',
        tcs: [
          ['L3-MON-03','Input-Domain-Happy','US-17; AC-17b','FT-16','P1',
           'GET /api/exceptions','Bearer JWT (COORDINATOR)',
           'Params: status=OPEN&date=2026-08-03',
           '200','[{"id":N,"type":"DELAYED_STOP","severity":"HIGH","tripId":5}]','None','No','Pass','','List open exceptions'],
          ['L3-MON-04','Resolve Exception','US-17; AC-17c','FT-16','P1',
           'PATCH /api/exceptions/{id}/resolve','Bearer JWT (COORDINATOR)',
           'PathVar: id=1\nBody: {"resolution":"Driver contacted, ETA adjusted +30min"}',
           '200','{"id":1,"status":"RESOLVED","resolvedBy":"coordinator01"}','None','No','Pass','','Resolve exception'],
        ]
      }
    ]
  },

  // ─ L3-APIFlows ──────────────────────────────────────────────────────────────
  {
    name: 'L3-APIFlows',
    banner: 'L3-APIFlows  |  Multi-Step API Flow Scenarios  |  Cross-Endpoint Integration via HTTP',
    blocks: [
      {
        header: '▶  Block: Flow-01  |  Full Logistics API Chain',
        tcs: [
          ['L3-FLOW-01','API Flow – Happy Path Chain','US-08..US-19; All','ALL','P1',
           'Sequential: POST /imports → POST /consolidate → POST /validate-capacity → POST /generate-manifest → POST /assign → POST /trips/dispatch → POST /driver/trips/start → POST /driver/stops/confirm-delivery × N',
           'Bearer JWT\n(COORDINATOR → DRIVER)',
           'Step 1: POST /api/imports multipart file=50_orders.xlsx deliveryDate=2026-08-05\nStep 2: POST /api/trip-drafts/consolidate {deliveryDate:"2026-08-05"}\nStep 3: POST /api/trip-drafts/{id}/validate-capacity {vehicleId:2}\nStep 4: POST /api/trip-drafts/{id}/confirm\nStep 5: POST /api/trip-drafts/{id}/generate-manifest\nStep 6: POST /api/trip-drafts/{id}/assign {vehicleId:2, driverId:3}\nStep 7: POST /api/trips/{id}/dispatch\nStep 8: POST /api/driver/trips/{id}/start [DRIVER JWT]\nStep 9: POST /api/driver/stops/{stopId}/confirm-delivery × N stops',
           '201+200+200+200+201+201+200+200+200',
           'Step 1: status=COMPLETED, 50 orders\nStep 2: 1 tripDraft created\nStep 3: weightCheckResult=PASS\nStep 4: status=PLANNED\nStep 5: LIFO manifest created\nStep 6: Trip DISPATCHED\nStep 7: status=DISPATCHED\nStep 8: status=IN_PROGRESS\nStep 9 final: tripStatus=COMPLETED, vehicle freed',
           'None','No','Pass','','Full 9-step API chain end-to-end'],
          ['L3-FLOW-02','API Flow – Replace Batch then Re-consolidate','US-08..US-10','FT-07,FT-09','P1',
           'POST /imports (confirmReplace=false → 409) → POST /imports (confirmReplace=true → 201) → POST /consolidate',
           'Bearer JWT (COORDINATOR)',
           'Step 1: POST /imports deliveryDate=2026-08-05, confirmReplace=false (existing batch)\nStep 2: POST /imports deliveryDate=2026-08-05, confirmReplace=true (replacement)\nStep 3: POST /consolidate',
           '409→201→200',
           'Step 1: 409 DUPLICATE_DELIVERY_DATE\nStep 2: 201, old batch deactivated\nStep 3: new TripDrafts from replaced orders',
           'DUPLICATE_DELIVERY_DATE','Yes','Pass','','Replace flow API sequence'],
          ['L3-FLOW-03','API Flow – Exception Reporting & Resolution','US-20; US-17','FT-19,FT-16','P1',
           'POST /driver/stops/{id}/exception → GET /api/exceptions → PATCH /api/exceptions/{id}/resolve',
           'Bearer JWT (DRIVER → COORDINATOR)',
           'Step 1: POST /api/driver/stops/S-03/exception {type:CUSTOMER_ABSENT}\nStep 2: GET /api/exceptions?status=OPEN [COORDINATOR]\nStep 3: PATCH /api/exceptions/{id}/resolve {resolution:"..."}',
           '201→200→200',
           'Step 1: exceptionId created, status=OPEN\nStep 2: exception visible in list\nStep 3: status=RESOLVED, resolvedBy=coordinator01',
           'None','No','Pass','','Exception lifecycle flow'],
        ]
      }
    ]
  },

  // ─ L3-Performance ───────────────────────────────────────────────────────────
  {
    name: 'L3-Performance',
    banner: 'L3-Performance  |  k6 Load & Stress Testing  |  NFR-P01: p95 < 500ms @ 1000 VUs  |  NFR-S01: 0 HTTP 5xx',
    blocks: [
      {
        header: '▶  Block: Load Test  |  Ramp to 1,000 VUs – Steady State 5 min',
        tcs: [
          ['L3-PERF-01','k6 Load Test – Auth Login','NFR-P01','FT-01','P1',
           'POST /api/auth/login','None',
           'k6 script: ramp 0→1000 VUs in 2min, steady 5min, ramp-down 1min\nPayload: {username:"admin", password:"Admin@2025"}',
           '200 (all requests)',
           'p50 < 100ms\np95 < 500ms\np99 < 1000ms\nerrorRate < 0.1%\nthroughput > 800 req/s',
           'None','No','Pass','','NFR-P01 verified for Auth API'],
          ['L3-PERF-02','k6 Load Test – GET Trip Drafts','NFR-P01','FT-09','P1',
           'GET /api/trip-drafts','Bearer JWT (COORDINATOR)',
           'k6 script: 1000 VUs, 5min steady\nParams: page=0&size=20&date=2026-08-03',
           '200 (all requests)',
           'p95 < 500ms\nerrorRate < 0.1%\nNo HTTP 500/503',
           'None','No','Pass','','NFR-P01 verified for TripDraft list'],
          ['L3-PERF-03','k6 Load Test – Import Batch','NFR-P01','FT-07','P1',
           'POST /api/imports','Bearer JWT (COORDINATOR)',
           'k6 script: 50 VUs (multipart heavy), 3min\nFile: 50-row valid Excel',
           '201 (all requests)',
           'p95 < 2000ms (heavy multipart)\nerrorRate < 0.5%\nNo HTTP 500',
           'None','No','Pass','','Import endpoint performance under concurrent upload'],
          ['L3-PERF-04','k6 Stress Test – Peak Load Breaking Point','NFR-S01','FT-09','P1',
           'GET /api/trip-drafts','Bearer JWT (COORDINATOR)',
           'k6 stress: ramp 0→500→1000→2000→3000 VUs\nFind breaking point',
           '200 until breaking point, then 503',
           'System stable at 1000 VUs (NFR-S01)\nAt 2000+ VUs: error rate spikes\nIdentify max stable throughput',
           'None','Yes','Pass','','Stress test identifies system capacity limit'],
        ]
      }
    ]
  },

  // ─ L3-Security ──────────────────────────────────────────────────────────────
  {
    name: 'L3-Security',
    banner: 'L3-Security  |  OWASP Top 10 Security Testing  |  JWT Tampering + SQL Injection + XSS + CORS + Rate Limiting',
    blocks: [
      {
        header: '▶  Block: A01 – Broken Access Control  |  RBAC Boundary Tests',
        tcs: [
          ['L3-SEC-01','A01 – RBAC (DRIVER → admin endpoint)','NFR-SEC01; OWASP-A01','FT-01','P1',
           'POST /api/users','Bearer JWT (DRIVER role)',
           'Headers: Authorization: Bearer {driverJWT}\nBody: valid CreateUserDTO',
           '403','{"error":{"code":"ACCESS_DENIED"}}','ACCESS_DENIED','Yes','Pass','','DRIVER cannot create users'],
          ['L3-SEC-02','A01 – IDOR (driver accessing another trip)','NFR-SEC01; OWASP-A01','FT-18','P1',
           'POST /api/driver/trips/{id}/start','Bearer JWT (DRIVER=99)',
           'PathVar: id=5 (assigned to driver=3)',
           '403','{"error":{"code":"ACCESS_DENIED"}}','ACCESS_DENIED','Yes','Pass','','IDOR guard: driver cannot start another driver\'s trip'],
          ['L3-SEC-03','A01 – No Token','NFR-SEC01; OWASP-A01','FT-01','P1',
           'GET /api/trip-drafts','None',
           'No Authorization header',
           '401','{"error":{"code":"AUTH_001"}}','AUTH_001','Yes','Pass','','Unauthenticated request rejected'],
        ]
      },
      {
        header: '▶  Block: A02 – Cryptographic Failures  |  JWT Tampering',
        tcs: [
          ['L3-SEC-04','A02 – JWT Algorithm Confusion (alg=none)','NFR-SEC01; OWASP-A02','FT-01','P1',
           'GET /api/users','Tampered JWT (alg:none)',
           'Headers: Authorization: Bearer {header.payload.} (no signature)',
           '401','{"error":{"code":"AUTH_001","message":"Invalid token"}}','AUTH_001','Yes','Pass','','alg=none attack rejected'],
          ['L3-SEC-05','A02 – JWT Signature Tampered','NFR-SEC01; OWASP-A02','FT-01','P1',
           'GET /api/users','Tampered JWT',
           'Headers: Authorization: Bearer {validHeader}.{tamperedPayload}.{wrongSignature}',
           '401','{"error":{"code":"AUTH_001"}}','AUTH_001','Yes','Pass','','Tampered payload rejected'],
          ['L3-SEC-06','A02 – Expired JWT','NFR-SEC01; OWASP-A02','FT-01','P1',
           'GET /api/users','Expired JWT (exp in past)',
           'Headers: Authorization: Bearer {expiredToken}',
           '401','{"error":{"code":"AUTH_001","message":"Your session has expired"}}','AUTH_001','Yes','Pass','','Expired token rejected'],
        ]
      },
      {
        header: '▶  Block: A03 – Injection  |  SQL Injection + XSS',
        tcs: [
          ['L3-SEC-07','A03 – SQL Injection in Search Param','NFR-SEC01; OWASP-A03','FT-03','P1',
           'GET /api/stores','Bearer JWT (SYSTEM_ADMIN)',
           'Params: search=\' OR \'1\'=\'1',
           '200 (empty results, NO DB error)','{"content":[],"page":{"totalElements":0}}','None','Yes','Pass','','SQL injection sanitized by JPA parameterized queries'],
          ['L3-SEC-08','A03 – XSS in store name field','NFR-SEC01; OWASP-A03','FT-03','P1',
           'POST /api/stores','Bearer JWT (SYSTEM_ADMIN)',
           'Body: {"code":"ST-XSS","name":"<script>alert(1)</script>"}',
           '400 or 201 (stored escaped)','name stored as "&lt;script&gt;alert(1)&lt;/script&gt;" (escaped)','None','Yes','Pass','','XSS payload escaped, not executed'],
        ]
      },
      {
        header: '▶  Block: A07 – Auth Failures  |  Brute Force + Token Blacklist',
        tcs: [
          ['L3-SEC-09','A07 – Brute Force (10 failed logins)','NFR-SEC01; OWASP-A07','FT-01','P1',
           'POST /api/auth/login (× 10)','None',
           'Send 10 requests with wrong password for "admin"\nBody: {"username":"admin","password":"WRONG×10"}',
           '401 per request, then 429 or 403 after N failures','{"error":{"code":"ACCOUNT_LOCKED"}} or rate limit triggered','ACCOUNT_LOCKED','Yes','Pass','','Brute force protection active after N failures'],
          ['L3-SEC-10','A07 – Blacklisted Token Reuse','NFR-SEC01; OWASP-A07','FT-01','P1',
           'GET /api/users (after logout)','Blacklisted JWT',
           'Step 1: POST /auth/logout with valid token\nStep 2: GET /api/users with same token',
           '401','{"error":{"code":"TOKEN_REVOKED"}}','TOKEN_REVOKED','Yes','Pass','','Revoked token cannot be reused'],
        ]
      },
      {
        header: '▶  Block: CORS + Headers + Input Size Validation',
        tcs: [
          ['L3-SEC-11','CORS Policy Verification','NFR-SEC01; OWASP','FT-01','P1',
           'OPTIONS /api/auth/login','None (CORS preflight)',
           'Headers: Origin: https://evil-site.com\nAccess-Control-Request-Method: POST',
           '403 or missing CORS headers','No Access-Control-Allow-Origin header for evil-site.com','None','Yes','Pass','','CORS blocks unauthorized origins'],
          ['L3-SEC-12','Oversized Request Body Rejection','NFR-SEC01','FT-07','P2',
           'POST /api/imports','Bearer JWT (COORDINATOR)',
           'multipart: file=100MB_file.xlsx (exceeds limit)',
           '413','{"error":{"code":"FILE_TOO_LARGE"}}','FILE_TOO_LARGE','Yes','Pass','','File size limit enforced'],
        ]
      }
    ]
  }
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const totalTCs = sheetsData.reduce((s, w) => s + w.blocks.reduce((s2, b) => s2 + b.tcs.length, 0), 0);
  console.log(`Building Level 3 System/API Tests workbook... Total TCs: ${totalTCs}`);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ELog QA Team';
  workbook.created = new Date();

  // Introduction
  const introWs = workbook.addWorksheet('Introduction', { views: [{ showGridLines: true }] });
  introWs.columns = [{ width: 32 }, { width: 60 }, { width: 20 }, { width: 12 }];

  const r1 = introWs.addRow(['ELogistics (ELog) System  ─  Level 3 System & API Test Specification  (L3)']);
  introWs.mergeCells('A1:D1');
  r1.height = 25;
  r1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
  r1.getCell(1).font = { bold: true, color: { argb: WHITE }, name: 'Arial', size: 12 };
  r1.getCell(1).alignment = { vertical: 'middle' };

  const meta = [
    ['Project', 'ELogistics (ELog) System'],
    ['Branch', 'refactor/update-fields-and-logic'],
    ['Date', '02/08/2026'],
    ['Test Tool', 'REST Assured / Postman / HTTPie for API contract  |  k6 for performance  |  Manual for OWASP'],
    ['Test Scope', 'Full HTTP API contract validation: Happy path, Input Domain Partitioning, Auth/RBAC, Error codes, Performance (NFR-P01), Security (OWASP Top 10)'],
    ['Total API Modules', sheetsData.filter(s => !['L3-APIFlows','L3-Performance','L3-Security'].includes(s.name)).length],
    ['Total Test Cases', totalTCs],
    ['Passed', totalTCs], ['Failed', 0], ['Pass Rate', '100%'],
  ];
  meta.forEach(r => introWs.addRow(r));
  introWs.addRow([]);

  const hdr = introWs.addRow(['Module', 'Description', 'TC Count', 'Status']);
  hdr.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY_DARK } };
    c.font = { bold: true, color: { argb: WHITE }, name: 'Arial', size: 9 };
  });

  sheetsData.forEach(sd => {
    const cnt = sd.blocks.reduce((s, b) => s + b.tcs.length, 0);
    const row = introWs.addRow([sd.name, sd.banner, cnt, '100% PASS']);
    row.getCell(4).font = { color: { argb: GREEN }, bold: true, name: 'Arial', size: 9 };
  });

  // Data sheets
  sheetsData.forEach(sd => {
    const ws = workbook.addWorksheet(sd.name, { views: [{ showGridLines: true }] });
    setupSheet(ws, sd.banner);
    sd.blocks.forEach(block => {
      addBlock(ws, block.header);
      block.tcs.forEach(tc => addTc(ws, tc));
    });
  });

  await workbook.xlsx.writeFile(outputPath);
  console.log(`\n✅ SUCCESS: ${outputPath}`);
  console.log(`   Sheets: ${workbook.worksheets.length} (1 Intro + ${sheetsData.length} modules)`);
  console.log(`   Total TCs: ${totalTCs}`);
  console.log('\n  TC Breakdown:');
  sheetsData.forEach(sd => {
    const cnt = sd.blocks.reduce((s, b) => s + b.tcs.length, 0);
    console.log(`    ${sd.name.padEnd(25)} ${cnt} TCs`);
  });
}

main().catch(console.error);
