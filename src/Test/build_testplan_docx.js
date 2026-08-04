const fs = require('fs');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
  ShadingType,
} = require('docx');

const outputPath = 'D:/FULearning/semester 9/Elog/Report5/Report 5.0_ELog_TestPlan.docx';

function createHeaderCell(text, widthPercent = 25) {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    shading: { fill: '1F4E79', type: ShadingType.CLEAR },
    margins: { top: 120, bottom: 120, left: 150, right: 150 },
    children: [
      new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 20 })],
      }),
    ],
  });
}

function createCell(text, widthPercent = 25, bold = false) {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    margins: { top: 100, bottom: 100, left: 150, right: 150 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, size: 20 })],
      }),
    ],
  });
}

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [
        // Title
        new Paragraph({
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: 'ELogistics (ELog) System — Test Plan',
              bold: true,
              size: 32,
              color: '1F4E79',
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: 'Document Title: ELog Master Test Plan (Report 5.0)',
              italic: true,
              size: 22,
              color: '595959',
            }),
          ],
        }),
        new Paragraph({ text: '' }),

        // Metadata Table
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createHeaderCell('Attribute', 30),
                createHeaderCell('Value', 70),
              ],
            }),
            new TableRow({ children: [createCell('Project Name', 30, true), createCell('ELogistics (ELog) System', 70)] }),
            new TableRow({ children: [createCell('Project Code', 30, true), createCell('ELog', 70)] }),
            new TableRow({ children: [createCell('Version', 30, true), createCell('v1.0', 70)] }),
            new TableRow({ children: [createCell('Date', 30, true), createCell('02/08/2026', 70)] }),
            new TableRow({ children: [createCell('Status', 30, true), createCell('Approved', 70)] }),
            new TableRow({ children: [createCell('Author(s)', 30, true), createCell('QA Engineering Team / Antigravity AI Pair Programmer', 70)] }),
            new TableRow({ children: [createCell('Reviewer(s)', 30, true), createCell('Project Lead / Software Architecture Team', 70)] }),
            new TableRow({ children: [createCell('SRS Reference', 30, true), createCell('ELog_Report3_SRS_v2.5.0_Vietnamese.docx', 70)] }),
            new TableRow({ children: [createCell('TDS Reference', 30, true), createCell('ELog_TDS_v2.5.0', 70)] }),
            new TableRow({ children: [createCell('RTW Reference', 30, true), createCell('Report 5.4_ELog_L4-E2ETests.xlsx', 70)] }),
          ],
        }),
        new Paragraph({ text: '' }),

        // Version History
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: 'Version History', bold: true, color: '1F4E79' })],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createHeaderCell('Version', 15),
                createHeaderCell('Date', 20),
                createHeaderCell('Author', 30),
                createHeaderCell('Description', 35),
              ],
            }),
            new TableRow({
              children: [
                createCell('v1.0', 15, true),
                createCell('02/08/2026', 20),
                createCell('QA Team / Antigravity', 30),
                createCell('Initial Master Test Plan covering L1 Unit, L2 Integration, L3 API, L4 E2E (US-02 to US-20)', 35),
              ],
            }),
          ],
        }),
        new Paragraph({ text: '' }),

        // SECTION I: SCOPE OF TESTING
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: 'I. Scope of Testing', bold: true, color: '1F4E79' })],
        }),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: '1.1 In Scope (Functional Requirements)', bold: true })],
        }),
        new Paragraph({
          text: 'Tất cả các tính năng nghiệp vụ và yêu cầu chức năng từ US-02 đến US-20 nêu trong ELog_Report3_SRS_v2.5.0_Vietnamese.docx:',
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createHeaderCell('Code', 15),
                createHeaderCell('Feature / Requirement Name', 40),
                createHeaderCell('Module & SRS Scope Description', 45),
              ],
            }),
            new TableRow({ children: [createCell('FT-01', 15, true), createCell('Authenticate & JWT Token Security', 40), createCell('US-02: Đăng nhập, JWT Token, Refresh Token & Phân quyền Role', 45)] }),
            new TableRow({ children: [createCell('FT-02', 15, true), createCell('User & Role Management', 40), createCell('US-03 & US-20: Quản lý người dùng, phân vai trò & trạng thái tài khoản', 45)] }),
            new TableRow({ children: [createCell('FT-03', 15, true), createCell('Store Management & Address', 40), createCell('US-04: Quản lý cửa hàng, địa chỉ Tỉnh/Quận/Xã, toạ độ GPS', 45)] }),
            new TableRow({ children: [createCell('FT-04', 15, true), createCell('Route Management & Stops', 40), createCell('US-05: Quản lý tuyến đường, danh sách stop, cảnh báo GPS', 45)] }),
            new TableRow({ children: [createCell('FT-05', 15, true), createCell('Vehicle Management & Capacity', 40), createCell('US-06: Đội xe, tải trọng kg, thể tích m³, Fleet Capacity Card', 45)] }),
            new TableRow({ children: [createCell('FT-06', 15, true), createCell('Product Management & Volume', 40), createCell('US-07: Quản lý sản phẩm, quy đổi m³ tự động từ D x R x C', 45)] }),
            new TableRow({ children: [createCell('FT-07', 15, true), createCell('Order Excel Import', 40), createCell('US-08 & US-09: Import đơn hàng từ Excel, kiểm tra lỗi dòng Batch', 45)] }),
            new TableRow({ children: [createCell('FT-08', 15, true), createCell('Route Consolidation & Drafts', 40), createCell('US-10 & US-11: Tự động gom đơn theo tuyến, xem chi tiết Trip Draft', 45)] }),
            new TableRow({ children: [createCell('FT-09', 15, true), createCell('Capacity Check & LIFO Manifest', 40), createCell('US-12 & US-13: Kiểm tra quá tải, thứ tự xếp hàng LIFO', 45)] }),
            new TableRow({ children: [createCell('FT-10', 15, true), createCell('Vehicle Assignment & Dispatch', 40), createCell('US-15 & US-16: Phân xe, phân tài xế, tách chuyến (BR-07), Dispatch', 45)] }),
            new TableRow({ children: [createCell('FT-11', 15, true), createCell('Monitoring & Exceptions', 40), createCell('US-17 & US-18: Giám sát vận hành thời gian thực, xử lý sự cố', 45)] }),
            new TableRow({ children: [createCell('FT-12', 15, true), createCell('Driver Web App View', 40), createCell('US-19 & US-20: Giao diện tài xế, xem chuyến và cập nhật trạng thái', 45)] }),
          ],
        }),
        new Paragraph({ text: '' }),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: '1.2 Non-functional Requirements (NFRs)', bold: true })],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createHeaderCell('Code', 20),
                createHeaderCell('NFR Description & Target', 80),
              ],
            }),
            new TableRow({ children: [createCell('NFR-P01', 20, true), createCell('Performance: Response time p95 < 500ms cho các tác vụ gom đơn và API core', 80)] }),
            new TableRow({ children: [createCell('NFR-S01', 20, true), createCell('Scalability: Đảm bảo xử lý đồng thời 1,000+ đơn hàng và 50+ chuyến đi trong ngày', 80)] }),
            new TableRow({ children: [createCell('NFR-SEC01', 20, true), createCell('Security: Phân quyền 100% endpoints bằng Spring Security JWT', 80)] }),
            new TableRow({ children: [createCell('NFR-SEC02', 20, true), createCell('Data Integrity: Mật khẩu lưu trữ BCrypt (cost = 12), số liệu GPS và tải trọng chính xác', 80)] }),
            new TableRow({ children: [createCell('NFR-U01', 20, true), createCell('Usability: Giao diện Tiếng Việt Ant Design 5 thân thiện, responsive, hỗ trợ mobile browser', 80)] }),
          ],
        }),
        new Paragraph({ text: '' }),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: '1.3 Out of Scope', bold: true })],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createHeaderCell('Item / Module', 40),
                createHeaderCell('Reason for Exclusions', 60),
              ],
            }),
            new TableRow({ children: [createCell('Third-party SMS/Email Gateways', 40, true), createCell('Chỉ kiểm thử integration interface; logic phát tin nhắn thuộc vendor', 60)] }),
            new TableRow({ children: [createCell('Native Mobile Apps (iOS/Android)', 40, true), createCell('Hệ thống hỗ trợ Web-responsive cho Driver trên điện thoại trong release này', 60)] }),
            new TableRow({ children: [createCell('Hardware Procurement / Physical Server', 40, true), createCell('Hạ tầng được triển khai theo mô hình Containerized Docker/K8s', 60)] }),
          ],
        }),
        new Paragraph({ text: '' }),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: '1.4 Assumptions', bold: true })],
        }),
        new Paragraph({ text: '1. Môi trường Staging/Local đã được cài đặt đầy đủ Backend Spring Boot (port 8080) và Frontend React Vite (port 5173).' }),
        new Paragraph({ text: '2. PostgreSQL 16 và Redis 7 sẵn sàng kết nối.' }),
        new Paragraph({ text: '3. Dữ liệu thử nghiệm E2E được khởi tạo và khôi phục độc lập.' }),
        new Paragraph({ text: '' }),

        // SECTION II: TEST STRATEGY
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: 'II. Test Strategy', bold: true, color: '1F4E79' })],
        }),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: '2.1 Testing Types', bold: true })],
        }),
        new Paragraph({ text: '• Functional Testing: Xác minh mọi quy tắc nghiệp vụ BR-01 đến BR-08 và AC-xx.' }),
        new Paragraph({ text: '• Integration Testing: Kiểm thử giao tiếp giữa Services, Database PostgreSQL và Cache Redis.' }),
        new Paragraph({ text: '• System & API Testing: Kiểm thử chuẩn REST API, status code và error mapping.' }),
        new Paragraph({ text: '• End-to-End Testing (E2E): Tự động hóa 100% bằng Cypress 15.19.0 trên trình duyệt thật.' }),
        new Paragraph({ text: '• User Acceptance Testing (UAT): Xác nhận kịch bản nghiệp vụ với Product Owner.' }),
        new Paragraph({ text: '' }),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: '2.2 Test Levels & Matrix', bold: true })],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createHeaderCell('Test Level', 20),
                createHeaderCell('In-charge', 20),
                createHeaderCell('Tools & Frameworks', 30),
                createHeaderCell('Deliverables / Files', 30),
              ],
            }),
            new TableRow({ children: [createCell('Level 1 — Unit Test', 20, true), createCell('Developers', 20), createCell('JUnit 5 + Mockito + AssertJ', 30), createCell('Report5.2_ELog_L1-UnitTests.xlsx', 30)] }),
            new TableRow({ children: [createCell('Level 2 — Integration', 20, true), createCell('BE Dev / QA', 20), createCell('Spring Boot Test + Testcontainers', 30), createCell('Report 5.2_L2-IntegrationTests.xlsx', 30)] }),
            new TableRow({ children: [createCell('Level 3 — System API', 20, true), createCell('QA Lead', 20), createCell('REST Assured / Cypress API', 30), createCell('Report 5.3_L3-SystemAPITests.xlsx', 30)] }),
            new TableRow({ children: [createCell('Level 4 — E2E Test', 20, true), createCell('QA Automation', 20), createCell('Cypress 15.19.0 (Electron)', 30), createCell('Report 5.4_ELog_L4-E2ETests.xlsx', 30)] }),
            new TableRow({ children: [createCell('Acceptance (UAT)', 20, true), createCell('Product Owner', 20), createCell('Scripted Walkthroughs', 30), createCell('Report 5.5_UAT_Scripts.xlsx', 30)] }),
          ],
        }),
        new Paragraph({ text: '' }),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: '2.3 Supporting Tools', bold: true })],
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createHeaderCell('Purpose', 35),
                createHeaderCell('Tool', 35),
                createHeaderCell('Version', 30),
              ],
            }),
            new TableRow({ children: [createCell('Backend Core Framework', 35, true), createCell('Spring Boot / Java', 35), createCell('3.2.x / Java 21', 30)] }),
            new TableRow({ children: [createCell('Unit Testing (Backend)', 35, true), createCell('JUnit 5 + Mockito', 35), createCell('5.10.x', 30)] }),
            new TableRow({ children: [createCell('Frontend Web Application', 35, true), createCell('React + Vite + TypeScript', 35), createCell('19.x / 6.x', 30)] }),
            new TableRow({ children: [createCell('UI Component Library', 35, true), createCell('Ant Design', 35), createCell('5.x / 6.4.3', 30)] }),
            new TableRow({ children: [createCell('E2E Automation Testing', 35, true), createCell('Cypress', 35), createCell('15.19.0', 30)] }),
            new TableRow({ children: [createCell('Database Engine', 35, true), createCell('PostgreSQL', 35), createCell('16.x', 30)] }),
            new TableRow({ children: [createCell('Caching Service', 35, true), createCell('Redis', 35), createCell('7.x', 30)] }),
          ],
        }),
        new Paragraph({ text: '' }),

        // SECTION III: DELIVERABLES & SIGN-OFF
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: 'III. Deliverables & Acceptance Criteria', bold: true, color: '1F4E79' })],
        }),
        new Paragraph({ text: '1. Master Test Plan Document (Report 5.0_ELog_TestPlan.docx).' }),
        new Paragraph({ text: '2. L1 Unit Test Execution Sheet (Report5.2_ELog_L1-UnitTests.xlsx — 234 tests PASS).' }),
        new Paragraph({ text: '3. L4 E2E Test Execution Sheet (Report 5.4_ELog_L4-E2ETests.xlsx — 99 tests PASS).' }),
        new Paragraph({ text: '4. Tỷ lệ vượt qua kiểm thử đạt 100% (Pass Rate = 100%), không có lỗi P1/P2 tồn đọng.' }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(outputPath, buffer);
  console.log('Successfully generated Report 5.0_ELog_TestPlan.docx at:', outputPath);
});
