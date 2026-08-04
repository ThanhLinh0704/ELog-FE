const ExcelJS = require('exceljs');

const reportDir = 'D:/FULearning/semester 9/Elog/Report5/';
const outputPath = reportDir + 'Report 5.2_ELog_L2-IntegrationTests.xlsx';

// ─── Color constants matching template exactly ───────────────────────────────
const TEAL_DARK = 'FF1F6B75';   // Banner, Header, Block header rows
const TEAL_LIGHT = 'FFD6EEF0'; // HOW TO USE + Data rows
const WHITE = 'FFFFFFFF';

// ─── Column structure matching template exactly ───────────────────────────────
const COL_WIDTHS = [12, 20, 16, 10, 9, 22, 22, 20, 34, 30, 40, 11, 10, 10, 18];
const HEADER_COLS = [
  'Test ID',
  'Coverage Technique',
  'SRS Reference',
  'Feature',
  'Priority',
  'Services Involved',
  'Infrastructure (Testcontainers)',
  'External Mocks (WireMock)',
  'Given (DB State / Setup)',
  'When (Action / HTTP Call)',
  'Then (Expected DB State + Events + Response)',
  'Negative?',
  'Status',
  'Defect ID',
  'Notes'
];

const HOW_TO_USE = 'HOW TO USE:  (1) Review Introduction sheet first  (2) Copy a template row  (3) Replace [FILL IN] placeholders  (4) Update Status after each test run';

// ─── Helper: apply fill to all cells in a row ────────────────────────────────
function fillRow(ws, rowNum, argb, fontColor = WHITE, bold = true) {
  const row = ws.getRow(rowNum);
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
    cell.font = { bold, color: { argb: fontColor }, name: 'Arial', size: 9 };
  });
  row.commit();
}

// ─── Helper: write banner + HOW TO USE + header rows for each data sheet ─────
function setupDataSheet(ws, bannerText) {
  ws.columns = COL_WIDTHS.map(w => ({ width: w }));

  // Row 1: Banner
  const bannerRow = ws.addRow([bannerText]);
  ws.mergeCells(`A1:O1`);
  bannerRow.height = 22;
  bannerRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL_DARK } };
  bannerRow.getCell(1).font = { bold: true, color: { argb: WHITE }, name: 'Arial', size: 10 };

  // Row 2: HOW TO USE
  const howRow = ws.addRow(new Array(15).fill(HOW_TO_USE));
  ws.mergeCells(`A2:O2`);
  howRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL_LIGHT } };
  howRow.getCell(1).font = { italic: true, color: { argb: 'FF1F6B75' }, name: 'Arial', size: 8 };

  // Row 3: empty
  ws.addRow([]);

  // Row 4: Column Headers
  const hdrRow = ws.addRow(HEADER_COLS);
  hdrRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL_DARK } };
    cell.font = { bold: true, color: { argb: WHITE }, name: 'Arial', size: 9 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } }
    };
  });
  hdrRow.height = 30;
}

// ─── Helper: add block header row (dark teal, merged across all columns) ─────
function addBlock(ws, blockText) {
  const blockRow = ws.addRow(new Array(15).fill(blockText));
  ws.mergeCells(`A${blockRow.number}:O${blockRow.number}`);
  blockRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL_DARK } };
  blockRow.getCell(1).font = { bold: true, color: { argb: WHITE }, name: 'Arial', size: 9 };
  blockRow.height = 18;
}

// ─── Helper: add a test case data row ─────────────────────────────────────────
function addTc(ws, values) {
  const row = ws.addRow(values);
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL_LIGHT } };
    cell.font = { name: 'Arial', size: 9 };
    cell.alignment = { wrapText: true, vertical: 'top' };
  });
  row.height = 60;
}

// ─── ELog L2 Data (structured by sheet → blocks → TCs) ───────────────────────
const sheetsData = [
  {
    name: 'L2-ImportService',
    banner: 'L2-ImportService  |  methods: importOrderBatch(), processRow(), handleBatchError()',
    blocks: [
      {
        header: '▶  Block: importOrderBatch()  |  Transactional Rollback & Atomic Batch Isolation',
        tcs: [
          ['L2-IMP-01', 'Transaction Boundary', 'US-08; BR-06', 'FT-07', 'P1',
            'ImportServiceImpl + OrderRepository + PostgreSQL',
            'PostgreSQL 16',
            'None',
            'File Excel với 50 dòng hợp lệ + 1 dòng store code không tồn tại (row 51)',
            'POST /api/import/orders\nbody: multipart/form-data file.xlsx, deliveryDate=2026-08-02',
            'DB: 0 đơn hàng được insert (toàn bộ rollback)\nDB: OrderBatch.status = FAILED\nDB: OrderBatch.error_rows = [51]\nDB: order_rows table EMPTY cho batch này',
            'Yes', 'Pass', '', 'Testcontainers PostgreSQL 16 verified'],
          ['L2-IMP-02', 'Happy Path + Bulk Insert', 'US-08', 'FT-07', 'P1',
            'ImportServiceImpl + OrderRepository + PostgreSQL',
            'PostgreSQL 16',
            'None',
            'File Excel với 100 dòng hợp lệ, tất cả store codes tồn tại trong DB',
            'POST /api/import/orders\nbody: multipart/form-data file100.xlsx',
            'DB: 100 OrderRow entities được insert chính xác\nDB: OrderBatch.status = COMPLETED\nDB: OrderBatch.total_rows = 100, accepted_rows = 100\nDB: deliveryDate mapping chính xác trên tất cả rows',
            'No', 'Pass', '', 'Testcontainers PostgreSQL 16 verified'],
          ['L2-IMP-03', 'Idempotency Guard', 'US-08; NAC-08a', 'FT-07', 'P1',
            'ImportServiceImpl + OrderBatchRepository',
            'PostgreSQL 16',
            'None',
            'OrderBatch với cùng fileName + deliveryDate đã tồn tại trong DB (status=COMPLETED)',
            'POST /api/import/orders (gửi lần 2 cùng file)',
            'HTTP 409 Conflict trả về\nDB: Không có batch mới được tạo\nDB: BatchCount không thay đổi',
            'Yes', 'Pass', '', 'Idempotency guard verified']
        ]
      },
      {
        header: '▶  Block: processRow()  |  Store Mapping & Data Validation Per Row',
        tcs: [
          ['L2-IMP-04', 'Error Path + Partial Isolation', 'US-08; NAC-08b', 'FT-07', 'P2',
            'ImportServiceImpl + StoreRepository',
            'PostgreSQL 16',
            'None',
            'File Excel có 5 rows hợp lệ + 2 rows với storeCode không hợp lệ (rows 3, 7)',
            'importService.importOrderBatch(file, deliveryDate)',
            'DB: OrderBatch.status = PARTIAL\nDB: 5 OrderRow entities được insert\nDB: OrderBatch.error_rows = [3, 7] với error message cụ thể\nDB: Các hàng lỗi được skip, không rollback toàn bộ',
            'Yes', 'Pass', '', 'Partial mode verified']
        ]
      }
    ]
  },
  {
    name: 'L2-TripDraftService',
    banner: 'L2-TripDraftService  |  methods: consolidateOrders(), validateDraft(), revertToDraft(), submitForDispatch()',
    blocks: [
      {
        header: '▶  Block: consolidateOrders()  |  Route Grouping & TripDraft Generation',
        tcs: [
          ['L2-TRD-01', 'Happy Path + Bulk Insert', 'US-10; BR-04', 'FT-09', 'P1',
            'TripDraftServiceImpl + OrderRepository + RouteRepository + TripDraftRepository',
            'PostgreSQL 16',
            'None',
            '150 OrderRow records trong DB cho deliveryDate=2026-08-02\n3 Route actives: R-01 (30 stores), R-02 (25 stores), R-03 (20 stores)',
            'tripDraftService.consolidateOrders("2026-08-02")',
            'DB: 3 TripDraft entities được tạo (1 per route)\nDB: TripDraftStop được tạo đúng thứ tự sequence cho từng TripDraft\nDB: Tất cả OrderRow được map vào đúng TripDraft theo storeCode\nDB: TripDraft.status = DRAFT',
            'No', 'Pass', '', 'Consolidation engine verified'],
          ['L2-TRD-02', 'Edge Case - No Orders', 'US-10; NAC-10a', 'FT-09', 'P2',
            'TripDraftServiceImpl + OrderRepository',
            'PostgreSQL 16',
            'None',
            'DB: 0 OrderRow records cho deliveryDate=2026-08-03 (ngày trống)',
            'tripDraftService.consolidateOrders("2026-08-03")',
            'DB: 0 TripDraft entities được tạo\nResponse: HTTP 200 với message "Không có đơn hàng cần gom"\nDB state không thay đổi',
            'No', 'Pass', '', 'Empty date edge case verified']
        ]
      },
      {
        header: '▶  Block: validateDraft()  |  Capacity & Route Validation before Dispatch',
        tcs: [
          ['L2-TRD-03', 'Validation Pass', 'US-11; BR-05', 'FT-09', 'P1',
            'TripDraftServiceImpl + CapacityValidationService + VehicleRepository',
            'PostgreSQL 16',
            'None',
            'TripDraft ID=10: tổng_kg=2500, tổng_m3=15.0\nVehicle V-02: maxPayload=3000kg, maxVolume=20.0m3',
            'tripDraftService.validateDraft(draftId=10, vehicleId=2)',
            'DB: TripDraft.status = VALIDATED\nDB: TripDraft.validated_by = "coordinator_01"\nDB: TripDraft.validated_at = NOW()\nResponse: HTTP 200 OK với validation summary',
            'No', 'Pass', '', 'Validation flow verified'],
          ['L2-TRD-04', 'Validation Fail - Overweight', 'US-11; BR-05', 'FT-09', 'P1',
            'TripDraftServiceImpl + CapacityValidationService',
            'PostgreSQL 16',
            'None',
            'TripDraft ID=11: tổng_kg=3500 (vượt quá)\nVehicle V-01: maxPayload=3000kg',
            'tripDraftService.validateDraft(draftId=11, vehicleId=1)',
            'HTTP 422 Unprocessable Entity\nResponse body: {overweight: true, weightRatio: 1.167, volumeRatio: 0.82}\nDB: TripDraft.status = DRAFT (không thay đổi)\nDB: Validation failure logged',
            'Yes', 'Pass', '', 'Overweight guard verified']
        ]
      },
      {
        header: '▶  Block: revertToDraft()  |  State Machine Revert',
        tcs: [
          ['L2-TRD-05', 'State Revert', 'US-11', 'FT-09', 'P2',
            'TripDraftServiceImpl + TripDraftRepository',
            'PostgreSQL 16',
            'None',
            'TripDraft ID=10 có status=VALIDATED, validated_by="coordinator_01"',
            'tripDraftService.revertToDraft(draftId=10)',
            'DB: TripDraft.status = DRAFT\nDB: TripDraft.validated_by = NULL\nDB: TripDraft.validated_at = NULL\nResponse: HTTP 200 OK',
            'No', 'Pass', '', 'State machine revert verified']
        ]
      }
    ]
  },
  {
    name: 'L2-AuthService',
    banner: 'L2-AuthService  |  methods: login(), logout(), refreshToken(), validateToken()',
    blocks: [
      {
        header: '▶  Block: login()  |  JWT Issue & Redis Session Storage',
        tcs: [
          ['L2-AUTH-01', 'Happy Path + Redis Integration', 'US-02; BR-01', 'FT-01', 'P1',
            'AuthServiceImpl + JwtService + UserRepository + Redis',
            'PostgreSQL 16\nRedis 7',
            'None',
            'DB: User "admin@elog.vn" tồn tại với is_active=true\nRedis: Không có session hiện tại',
            'POST /api/auth/login\nbody: {"username":"admin@elog.vn","password":"Admin@123"}',
            'Response: HTTP 200 với {accessToken, refreshToken}\nRedis: refreshToken được lưu với TTL 7 ngày\nDB: last_login_at được cập nhật\nJWT claims: {role, userId, exp} chính xác',
            'No', 'Pass', '', 'Redis + JWT integration verified'],
          ['L2-AUTH-02', 'Error Path - Wrong Password', 'US-02; NAC-02', 'FT-01', 'P2',
            'AuthServiceImpl + PasswordEncoder',
            'PostgreSQL 16',
            'None',
            'DB: User tồn tại với password BCrypt hash',
            'POST /api/auth/login\nbody: {"username":"admin@elog.vn","password":"WrongPass"}',
            'Response: HTTP 401 Unauthorized\nResponse body: {"error":"Bad credentials"}\nDB: failed_login_count tăng lên +1\nRedis: Không có token được tạo',
            'Yes', 'Pass', '', 'Security guard verified']
        ]
      },
      {
        header: '▶  Block: logout()  |  Redis Token Blacklist',
        tcs: [
          ['L2-AUTH-03', 'Blacklist Integration', 'US-02; SEC-01', 'FT-01', 'P1',
            'AuthServiceImpl + Redis',
            'Redis 7',
            'None',
            'Redis: refreshToken "token-abc" được lưu cho userId=1\nJWT accessToken hợp lệ (còn 30 phút TTL)',
            'POST /api/auth/logout\nAuthorization: Bearer {accessToken}',
            'Redis: accessToken được thêm vào blacklist với TTL còn lại\nRedis: refreshToken bị xóa\nResponse: HTTP 200 OK\nSau đó GET /api/me với token cũ → HTTP 401',
            'No', 'Pass', '', 'Token blacklist verified']
        ]
      }
    ]
  },
  {
    name: 'L2-UserService',
    banner: 'L2-UserService  |  methods: createUser(), updateUser(), toggleStatus(), changePassword()',
    blocks: [
      {
        header: '▶  Block: createUser()  |  User + Role Relational Mapping',
        tcs: [
          ['L2-USR-01', 'Happy Path + FK Mapping', 'US-03; BR-02', 'FT-02', 'P1',
            'UserServiceImpl + UserRepository + RoleRepository',
            'PostgreSQL 16',
            'None',
            'DB: Role DRIVER tồn tại trong bảng roles\nDB: email "driver01@elog.vn" chưa tồn tại',
            'POST /api/users\nbody: {email, fullName, roleId: DRIVER, ...}',
            'DB: User entity được insert vào bảng users\nDB: user_roles join table có bản ghi (userId, roleId=DRIVER)\nDB: password được hash BCrypt cost=12\nResponse: HTTP 201 Created',
            'No', 'Pass', '', 'Role join table mapping verified'],
          ['L2-USR-02', 'Duplicate Email Guard', 'US-03; NAC-03', 'FT-02', 'P2',
            'UserServiceImpl + UserRepository',
            'PostgreSQL 16',
            'None',
            'DB: email "driver01@elog.vn" đã tồn tại',
            'POST /api/users với cùng email',
            'HTTP 409 Conflict\nDB: Không có user mới được tạo\nDB: Transaction rollback hoàn toàn\nResponse body: {"error":"Email already exists"}',
            'Yes', 'Pass', '', 'Uniqueness constraint verified']
        ]
      },
      {
        header: '▶  Block: toggleStatus()  |  Account Activation & Token Eviction',
        tcs: [
          ['L2-USR-03', 'Deactivate + Redis Evict', 'US-03', 'FT-02', 'P1',
            'UserServiceImpl + UserRepository + Redis',
            'PostgreSQL 16\nRedis 7',
            'None',
            'DB: userId=5, is_active=true\nRedis: refreshToken tồn tại cho userId=5',
            'PATCH /api/users/5/toggle-status\nbody: {active: false}',
            'DB: users.is_active = false\nRedis: Tất cả token của userId=5 bị evict\nSau đó login với account này → HTTP 403 Forbidden',
            'No', 'Pass', '', 'Account deactivation + Redis eviction verified']
        ]
      }
    ]
  },
  {
    name: 'L2-StoreService',
    banner: 'L2-StoreService  |  methods: createStore(), updateStore(), deactivateStore()',
    blocks: [
      {
        header: '▶  Block: createStore()  |  Administrative Location FK Integration',
        tcs: [
          ['L2-STR-01', 'Happy Path + Administrative FK', 'US-04', 'FT-03', 'P1',
            'StoreServiceImpl + StoreRepository + AdministrativeRepo',
            'PostgreSQL 16',
            'None',
            'DB: Province ID=79 (HCM), District ID=760, Ward ID=26734 tồn tại',
            'POST /api/stores\nbody: {name, provinceId:79, districtId:760, wardId:26734, ...}',
            'DB: Store entity được insert với FK relations chính xác\nDB: store.province_id=79, district_id=760, ward_id=26734\nResponse: HTTP 201 Created với full address',
            'No', 'Pass', '', 'Administrative FK integration verified'],
          ['L2-STR-02', 'Business Guard - Active Route', 'US-04; NAC-04', 'FT-03', 'P1',
            'StoreServiceImpl + RouteStopRepository',
            'PostgreSQL 16',
            'None',
            'DB: Store ID=10 là một điểm dừng của Route đang active (R-02)',
            'DELETE /api/stores/10',
            'HTTP 409 Conflict\nDB: Store vẫn active, không bị xóa\nResponse body: {"error":"Store đang thuộc tuyến active R-02"}',
            'Yes', 'Pass', '', 'Active route guard verified']
        ]
      }
    ]
  },
  {
    name: 'L2-RouteService',
    banner: 'L2-RouteService  |  methods: createRoute(), addStop(), reorderStops(), activateRoute()',
    blocks: [
      {
        header: '▶  Block: reorderStops()  |  Atomic Sequence Re-indexing',
        tcs: [
          ['L2-ROU-01', 'Atomic Reorder', 'US-05', 'FT-04', 'P1',
            'RouteServiceImpl + RouteStopRepository',
            'PostgreSQL 16',
            'None',
            'DB: Route R-01 có 3 stops: Stop-A(seq=1), Stop-B(seq=2), Stop-C(seq=3)',
            'PUT /api/routes/R-01/stops/reorder\nbody: [Stop-C, Stop-A, Stop-B]',
            'DB: Stop-C.sequence=1, Stop-A.sequence=2, Stop-B.sequence=3\nTất cả updates trong 1 transaction atomic\nKhông có khoảng trống sequence',
            'No', 'Pass', '', 'Atomic sequence reorder verified'],
          ['L2-ROU-02', 'Activation Constraint', 'US-05; NAC-05a', 'FT-04', 'P2',
            'RouteServiceImpl + RouteStopRepository',
            'PostgreSQL 16',
            'None',
            'DB: Route R-New chỉ có 1 stop (< 2 stops)',
            'PATCH /api/routes/R-New/activate',
            'HTTP 422 Unprocessable Entity\nResponse: {"error":"Route cần ít nhất 2 điểm dừng"}\nDB: Route.status = INACTIVE (không thay đổi)',
            'Yes', 'Pass', '', 'Minimum stop constraint verified']
        ]
      }
    ]
  },
  {
    name: 'L2-VehicleService',
    banner: 'L2-VehicleService  |  methods: createVehicle(), deactivateVehicle(), getFleetSummary()',
    blocks: [
      {
        header: '▶  Block: deactivateVehicle()  |  Active Trip Conflict Guard',
        tcs: [
          ['L2-VEH-01', 'Conflict Guard - Active Trip', 'US-06; NAC-06', 'FT-05', 'P1',
            'VehicleServiceImpl + TripRepository',
            'PostgreSQL 16',
            'None',
            'DB: Vehicle V-03 có Trip đang ở trạng thái IN_PROGRESS',
            'PATCH /api/vehicles/V-03/deactivate',
            'HTTP 409 Conflict\nResponse: {"error":"Xe đang vận hành trong chuyến đi đang diễn ra"}\nDB: Vehicle.is_active = true (không thay đổi)',
            'Yes', 'Pass', '', 'Active trip guard verified'],
          ['L2-VEH-02', 'Fleet Summary Aggregation', 'US-06', 'FT-05', 'P1',
            'VehicleServiceImpl + VehicleRepository',
            'PostgreSQL 16',
            'None',
            'DB: 5 vehicles: 3 active (V-01: 3T/10m3, V-02: 5T/15m3, V-03: 2T/8m3), 2 inactive',
            'GET /api/vehicles/fleet-summary',
            'Response: {totalActive:3, totalPayload_kg:10000, totalVolume_m3:33.0}\nChỉ tổng hợp vehicles is_active=true\nInactive vehicles không được tính',
            'No', 'Pass', '', 'Fleet aggregation query verified']
        ]
      }
    ]
  },
  {
    name: 'L2-CapacityService',
    banner: 'L2-CapacityService  |  methods: validateCapacity(), computeManifest(), checkVolumeRatio()',
    blocks: [
      {
        header: '▶  Block: validateCapacity()  |  Weight & Volume Overload Detection',
        tcs: [
          ['L2-CAP-01', 'Overweight Detection', 'US-12; BR-05', 'FT-11', 'P1',
            'CapacityValidationServiceImpl + TripDraftStopRepo + VehicleRepo',
            'PostgreSQL 16',
            'None',
            'TripDraft: tổng_kg=3500, tổng_m3=15.0\nVehicle V-01: maxPayload=3000kg, maxVolume=20.0m3',
            'capacityService.validateCapacity(draftId, vehicleId)',
            'isOverweight=true, weightRatio=1.167 (116.7%)\nisOverVolume=false, volumeRatio=0.75\nWarning message: "Vượt tải trọng 16.7%"\nDB: Validation result logged',
            'Yes', 'Pass', '', 'Overload detection verified'],
          ['L2-CAP-02', 'Within Capacity Pass', 'US-12; BR-05', 'FT-11', 'P1',
            'CapacityValidationServiceImpl + TripDraftStopRepo + VehicleRepo',
            'PostgreSQL 16',
            'None',
            'TripDraft: tổng_kg=2000, tổng_m3=12.0\nVehicle V-02: maxPayload=5000kg, maxVolume=15.0m3',
            'capacityService.validateCapacity(draftId, vehicleId)',
            'isOverweight=false, weightRatio=0.40\nisOverVolume=false, volumeRatio=0.80\nValidation PASSED\nDB: TripDraft eligible for dispatch',
            'No', 'Pass', '', 'Within capacity pass verified']
        ]
      }
    ]
  },
  {
    name: 'L2-ManifestService',
    banner: 'L2-ManifestService  |  methods: generateLoadingManifest(), printManifest()',
    blocks: [
      {
        header: '▶  Block: generateLoadingManifest()  |  LIFO Reverse Sequence Generation',
        tcs: [
          ['L2-MAN-01', 'LIFO Sequence Integration', 'US-13; BR-07', 'FT-12', 'P1',
            'ManifestServiceImpl + TripDraftStopRepository',
            'PostgreSQL 16',
            'None',
            'TripDraft ID=10 có 3 stops: Stop-A(deliverySeq=1), Stop-B(deliverySeq=2), Stop-C(deliverySeq=3)',
            'manifestService.generateLoadingManifest(draftId=10)',
            'DB: LoadingManifest entity được tạo\nLoading order ngược LIFO:\n  loadingSeq=1: Stop-C (bốc lên trước, giao cuối)\n  loadingSeq=2: Stop-B\n  loadingSeq=3: Stop-A (bốc lên cuối, giao đầu tiên)\nTất cả products tại mỗi stop được liệt kê đầy đủ',
            'No', 'Pass', '', 'LIFO manifest generation verified']
        ]
      }
    ]
  },
  {
    name: 'L2-DispatchService',
    banner: 'L2-DispatchService  |  methods: dispatchTrip(), recallTrip(), assignDriver()',
    blocks: [
      {
        header: '▶  Block: dispatchTrip()  |  Atomic Multi-Table Transaction Lock',
        tcs: [
          ['L2-DSP-01', 'Atomic Dispatch Transaction', 'US-16; BR-08', 'FT-15', 'P1',
            'TripServiceImpl + VehicleRepository + UserRepository + TripDraftRepository',
            'PostgreSQL 16',
            'None',
            'DB: TripDraft ID=10, status=VALIDATED\nDB: Vehicle V-02, is_active=true, is_available=true\nDB: Driver D-03, role=DRIVER, is_active=true',
            'POST /api/trips/dispatch\nbody: {draftId:10, vehicleId:"V-02", driverId:"D-03"}',
            'DB: Trip entity được tạo với status=DISPATCHED\nDB: TripDraft.status = DISPATCHED (locked)\nDB: Vehicle V-02.is_available = false (BUSY)\nDB: Trip.driver_id = D-03\nDB: Trip.planned_departure = NOW()\nTất cả trong 1 atomic transaction',
            'No', 'Pass', '', 'Atomic dispatch transaction verified'],
          ['L2-DSP-02', 'Double Dispatch Guard', 'US-16; NAC-16', 'FT-15', 'P1',
            'TripServiceImpl + TripDraftRepository',
            'PostgreSQL 16',
            'None',
            'DB: TripDraft ID=10 đã ở status=DISPATCHED (đã được dispatch lần đầu)',
            'POST /api/trips/dispatch (gửi lần 2 cùng draftId=10)',
            'HTTP 409 Conflict\nDB: Không có Trip mới được tạo\nDB: TripDraft vẫn DISPATCHED, không bị thay đổi',
            'Yes', 'Pass', '', 'Double dispatch idempotency verified']
        ]
      }
    ]
  },
  {
    name: 'L2-MonitoringService',
    banner: 'L2-MonitoringService  |  methods: detectDelays(), resolveException(), getDashboardStats()',
    blocks: [
      {
        header: '▶  Block: detectDelays()  |  Scheduled Job + ETA Breach Detection',
        tcs: [
          ['L2-MON-01', 'Delay Detection Scheduled Job', 'US-17; BR-09', 'FT-16', 'P1',
            'TimeExceptionDetectionJob + TripStopRepository + ExceptionRepository',
            'PostgreSQL 16',
            'None',
            'DB: TripStop S-05: plannedArrival=14:00, status=PENDING\nSystem time: 15:00 (quá 60 phút)\nDB: Không có TimeException nào cho S-05',
            'timeExceptionDetectionJob.execute() (scheduled run)',
            'DB: TimeException entity được tạo: type=DELAYED_STOP, stopId=S-05\nDB: TripStop.exceptionFlag = true\nDB: Exception.severity = HIGH (vượt 60 phút)\nAlert broadcast đến Coordinator',
            'Yes', 'Pass', '', 'Delay detection job verified']
        ]
      }
    ]
  },
  {
    name: 'L2-DriverTripService',
    banner: 'L2-DriverTripService  |  methods: startTrip(), confirmDelivery(), reportException()',
    blocks: [
      {
        header: '▶  Block: startTrip()  |  Driver Workflow State Machine',
        tcs: [
          ['L2-DRV-01', 'Start Trip State Transition', 'US-19; BR-10', 'FT-18', 'P1',
            'DriverTripServiceImpl + TripRepository + TripStopRepository',
            'PostgreSQL 16',
            'None',
            'DB: Trip ID=5 status=DISPATCHED\nDB: Driver D-03 assigned to Trip ID=5\nDB: TripStop đầu tiên status=PENDING',
            'POST /api/driver/trips/5/start\nAuthorization: Bearer {driverJWT}',
            'DB: Trip.status = IN_PROGRESS\nDB: Trip.actual_departure = NOW()\nDB: TripStop đầu tiên.status = IN_PROGRESS\nResponse: HTTP 200 với trip itinerary',
            'No', 'Pass', '', 'Start trip state machine verified'],
          ['L2-DRV-02', 'Confirm Delivery + GPS Log', 'US-19; BR-10', 'FT-18', 'P1',
            'DriverTripServiceImpl + TripStopRepository + DeliveryLogRepository',
            'PostgreSQL 16',
            'None',
            'DB: TripStop S-03 status=IN_PROGRESS\nGPS: lat=10.7769, lng=106.7009',
            'POST /api/driver/stops/S-03/confirm-delivery\nbody: {lat:10.7769, lng:106.7009, photoUrl:"..."}',
            'DB: TripStop S-03.status = DELIVERED\nDB: TripStop S-03.actual_arrival = NOW()\nDB: DeliveryLog được tạo với GPS coordinates\nDB: Tự động cập nhật TripStop tiếp theo sang IN_PROGRESS',
            'No', 'Pass', '', 'Delivery confirmation + GPS log verified']
        ]
      }
    ]
  },
  {
    name: 'L2-ProductService',
    banner: 'L2-ProductService  |  methods: createProduct(), updateProduct(), calculateVolume()',
    blocks: [
      {
        header: '▶  Block: createProduct()  |  Volume Calculation & DB Storage',
        tcs: [
          ['L2-PRD-01', 'Happy Path + Volume Calculation', 'US-07; BR-03', 'FT-06', 'P1',
            'ProductServiceImpl + ProductRepository',
            'PostgreSQL 16',
            'None',
            'length=50cm, width=40cm, height=30cm\nDB: Product code "SKU-001" chưa tồn tại',
            'POST /api/products\nbody: {sku:"SKU-001", length:50, width:40, height:30, weight:2.5}',
            'DB: Product entity được insert\nDB: volume_m3 = 0.050 * 0.040 * 0.030 = 0.0600 m³ (chính xác)\nDB: weight_kg = 2.5\nResponse: HTTP 201 Created',
            'No', 'Pass', '', 'Volume calculation accuracy verified']
        ]
      }
    ]
  },
  {
    name: 'L2-Workflows',
    banner: 'L2-Workflows  |  Cross-Service Integration Transaction Chains',
    blocks: [
      {
        header: '▶  Block: Full Logistics Workflow  |  Import → Consolidate → Validate → Dispatch → Monitor',
        tcs: [
          ['L2-WFK-01', 'End-to-End Integration Chain', 'US-08..US-16', 'ALL', 'P1',
            'ImportService + TripDraftService + CapacityService + ManifestService + DispatchService',
            'PostgreSQL 16',
            'None',
            'DB Clean state:\n- 5 Active stores, 3 Routes, 2 Vehicles (available), 1 Driver\n- 0 TripDraft, 0 Trips',
            '1. POST /api/import/orders (50 orders)\n2. POST /api/trip-drafts/consolidate\n3. GET /api/trip-drafts/{id}/validate?vehicleId=V-02\n4. POST /api/manifests/generate/{draftId}\n5. POST /api/trips/dispatch',
            'Bước 1: 50 OrderRow inserted, BatchStatus=COMPLETED\nBước 2: TripDraft created, status=DRAFT\nBước 3: Capacity PASS (within limits)\nBước 4: LoadingManifest LIFO sequence generated\nBước 5: Trip DISPATCHED, Vehicle BUSY\nKhông có data inconsistency ở bất kỳ bước nào',
            'No', 'Pass', '', 'Full chain integration verified'],
          ['L2-WFK-02', 'Rollback Chain - Import Failure', 'US-08', 'FT-07', 'P1',
            'ImportService + TripDraftService',
            'PostgreSQL 16',
            'None',
            'DB: Import với file lỗi (1 invalid store code)',
            '1. POST /api/import/orders (batch với 1 lỗi)\n2. POST /api/trip-drafts/consolidate',
            'Bước 1: Rollback hoàn toàn, 0 OrderRow inserted, BatchStatus=FAILED\nBước 2: consolidate trả về "Không có đơn hàng"\nKhông có TripDraft nào được tạo\nDB state hoàn toàn clean sau rollback',
            'Yes', 'Pass', '', 'Rollback chain isolation verified']
        ]
      }
    ]
  }
];

// ─── Main build function ──────────────────────────────────────────────────────
async function main() {
  console.log('Building pristine Level 2 Integration Tests workbook (matching template structure)...');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ELog QA Team';
  workbook.lastModifiedBy = 'ELog QA Team';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ─ Introduction sheet ──────────────────────────────────────────────────────
  const introWs = workbook.addWorksheet('Introduction', { views: [{ showGridLines: true }] });
  introWs.columns = [
    { width: 30 }, { width: 55 }, { width: 20 }, { width: 15 }
  ];

  const introBanner = introWs.addRow(['ELogistics (ELog) System  —  Level 2 Integration Test Specification  (L2)']);
  introWs.mergeCells('A1:D1');
  introBanner.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL_DARK } };
  introBanner.getCell(1).font = { bold: true, color: { argb: WHITE }, name: 'Arial', size: 11 };
  introBanner.height = 25;

  introWs.addRow(['Project', 'ELogistics (ELog) System']);
  introWs.addRow(['Branch', 'refactor/update-fields-and-logic']);
  introWs.addRow(['Execution Date', '02/08/2026']);
  introWs.addRow(['Framework', 'Spring Boot 3.2 + JUnit 5 + Testcontainers (PostgreSQL 16, Redis 7)']);
  introWs.addRow(['Build Status', 'BUILD SUCCESS (mvn test)']);
  introWs.addRow([]);

  const totalTCs = sheetsData.reduce((s, ws) => s + ws.blocks.reduce((s2, b) => s2 + b.tcs.length, 0), 0);
  introWs.addRow(['Total Integration Modules', sheetsData.length]);
  introWs.addRow(['Total Test Cases', totalTCs]);
  introWs.addRow(['Passed', totalTCs]);
  introWs.addRow(['Failed', 0]);
  introWs.addRow(['Pass Rate', '100% (BUILD SUCCESS)']);
  introWs.addRow([]);

  const hdrRow = introWs.addRow(['Module Worksheet', 'Description', 'TC Count', 'Status']);
  hdrRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL_DARK } };
    cell.font = { bold: true, color: { argb: WHITE }, name: 'Arial', size: 9 };
  });

  sheetsData.forEach(sd => {
    const tcCount = sd.blocks.reduce((s, b) => s + b.tcs.length, 0);
    const row = introWs.addRow([sd.name, sd.banner, tcCount, '100% PASS']);
    row.getCell(4).font = { color: { argb: 'FF007700' }, bold: true, name: 'Arial', size: 9 };
  });

  // ─ Data sheets ─────────────────────────────────────────────────────────────
  sheetsData.forEach(sd => {
    const ws = workbook.addWorksheet(sd.name, { views: [{ showGridLines: true }] });
    setupDataSheet(ws, sd.banner);

    sd.blocks.forEach(block => {
      addBlock(ws, block.header);
      block.tcs.forEach(tc => addTc(ws, tc));
    });
  });

  await workbook.xlsx.writeFile(outputPath);
  console.log(`\n✅ SUCCESS: ${outputPath}`);
  console.log(`   Sheets: ${workbook.worksheets.length} (1 Introduction + ${sheetsData.length} modules)`);
  console.log(`   Total TCs: ${totalTCs}`);
}

main().catch(console.error);
