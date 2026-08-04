const AdmZip = require('adm-zip');
const fs = require('fs');

const templatePath = 'D:/FULearning/semester 9/Elog/Report5/Report 5.0_TestPlan_Template.docx';
const outputPath = 'D:/FULearning/semester 9/Elog/Report5/Report 5.0_ELog_Master_TestPlan.docx';

function xmlEscape(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const zip = new AdmZip(templatePath);
let xml = zip.readAsText('word/document.xml');

// Key-value replacements map with proper XML escaping
const replacements = [
  { from: '[Project Name]', to: 'ELogistics (ELog) System' },
  { from: '[CODE]', to: 'ELog' },
  { from: '[DD/MM/YYYY]', to: '02/08/2026' },
  { from: '[Name / Role]', to: 'QA Engineering Team / Antigravity AI' },
  { from: '[ProjectName]', to: 'ELog' },
  { from: '[X.X]', to: '2.5.0' },
  { from: '[Author]', to: 'QA Team' },
  { from: '[Description of changes]', to: 'Official Test Plan covering L1 Unit, L2 Integration, L3 API, L4 E2E, L5 UAT (US-02 to US-20)' },
  
  // Features
  { from: '[FT-01]', to: 'FT-01' },
  { from: '[Feature name and brief description]', to: 'Authenticate, JWT Tokens, Refresh Tokens & Role Redirects (US-02)' },
  { from: '[FT-02]', to: 'FT-02' },
  { from: '[FT-03]', to: 'FT-03' },
  { from: '[FT-04]', to: 'FT-04' },
  { from: '[FT-05]', to: 'FT-05' },

  // NFRs
  { from: '[NFR-P01]', to: 'NFR-P01' },
  { from: '[Performance: e.g. p95 response &lt; Xms at N concurrent users]', to: 'Performance: Response time p95 < 500ms cho các tác vụ gom đơn và API core' },
  { from: '[NFR-S01]', to: 'NFR-S01' },
  { from: '[Scalability: e.g. system stable at N concurrent users]', to: 'Scalability: Đảm bảo xử lý đồng thời 1,000+ đơn hàng và 50+ chuyến đi trong ngày' },
  { from: '[NFR-SEC01]', to: 'NFR-SEC01' },
  { from: '[Security: e.g. all traffic over HTTPS/TLS 1.2+]', to: 'Security: Phân quyền 100% endpoints bằng Spring Security JWT' },
  { from: '[NFR-SEC02]', to: 'NFR-SEC02' },
  { from: '[Security: e.g. passwords stored as bcrypt cost ≥ 12]', to: 'Security: Mật khẩu lưu trữ BCrypt (cost = 12), số liệu GPS và tải trọng chính xác' },
  { from: '[NFR-U01]', to: 'NFR-U01' },
  { from: '[Usability: e.g. key flow completed in ≤ N steps]', to: 'Usability: Giao diện Tiếng Việt Ant Design 5 thân thiện, responsive, hỗ trợ mobile browser' },

  // Out of Scope
  { from: '[e.g. Third-party API internal logic]', to: 'Third-party SMS / Email Gateways Internal Logic' },
  { from: '[Only integration points tested; internal vendor logic is out of scope]', to: 'Chỉ kiểm thử integration interface; logic phát tin nhắn thuộc vendor' },
  { from: '[e.g. Mobile native app (iOS/Android)]', to: 'Native Mobile Apps (iOS / Android)' },
  { from: '[Web-responsive only in this release]', to: 'Hệ thống hỗ trợ Web-responsive cho Driver trên điện thoại trong release này' },
  { from: '[e.g. Hardware / infrastructure procurement]', to: 'Hardware Procurement / Physical Data Center' },
  { from: '[Not a software testing concern]', to: 'Hạ tầng được triển khai theo mô hình Containerized Docker/K8s' },

  // Constraints & Assumptions
  { from: '[e.g. Test environment must mirror production configuration]', to: 'Môi trường Staging/Local được trang bị Spring Boot 3.2, PostgreSQL 16 và Redis 7' },
  { from: '[e.g. Payment sandbox may impose rate limits (N req/min)]', to: 'Cổng thanh toán sandbox có giới hạn rate limit 100 req/phút' },
  { from: '[e.g. No production customer data used in any test environment]', to: 'Không sử dụng dữ liệu sản xuất thật, toàn bộ dữ liệu kiểm thử được giả lập an toàn' },
  { from: '[e.g. Testcontainers requires a Docker daemon on CI runner]', to: 'Tích hợp Testcontainers yêu cầu môi trường Docker trên máy kiểm thử' },
  { from: '[Category]', to: 'Process & Security' },
  { from: '[Add constraint]', to: 'Tuân thủ các quy định bảo mật dữ liệu cá nhân' },
  { from: '[Add assumption]', to: 'Môi trường chạy automation test đạt sự ổn định cao' },

  // Strategy & Levels
  { from: '[State what functional testing verifies — e.g. every feature, business rule, and API endpoint behaves according to SRS AC-xx and NAC-xx specifications.]', to: 'Xác minh mọi tính năng nghiệp vụ (BR-01..BR-08) và API endpoints đúng theo tài liệu SRS ELog_Report3_SRS_v2.5.0.' },
  { from: '[List techniques used, e.g.: · State Transition — for order lifecycle, workflow states · Equivalence Partitioning (EP) — for input domain partitioning · Boundary Value Analysis (BVA) — for all numeric constraints · Branch Coverage (BC) + Condition Coverage (CC) — for business rule logic]', to: 'Áp dụng kỹ thuật State Transition (chu trình TripDraft -> Dispatched -> Completed), Equivalence Partitioning (EP), Boundary Value Analysis (BVA cho tải trọng/thể tích), và Branch Coverage > 90%.' },
  { from: '[e.g. All P1 test cases pass. No open P1/P2 defects. 100% AC-xx coverage for all features. Branch Coverage ≥ 80% in service layer.]', to: 'Tất cả P1/P2 test cases PASS 100%, 0 lỗi tồn đọng, Branch Coverage >= 90%.' },

  { from: '[State what integration testing verifies — e.g. services integrate correctly with real DB, message broker, and cache. Verify transaction boundaries and idempotency.]', to: 'Xác minh tích hợp giữa Controllers, Services, PostgreSQL DB và Redis Cache. Kiểm thử giao dịch rollback và tính toàn vẹn dữ liệu.' },
  { from: '[e.g.: · Testcontainers for real infrastructure (PostgreSQL, RabbitMQ, Redis) · WireMock for external API stubs · Concurrency tests (CountDownLatch) for shared resource contention · AFTER_COMMIT boundary verification · Idempotency tests: same event_id sent twice → no duplicate]', to: 'Sử dụng Spring Boot Test + Testcontainers PostgreSQL & Redis để xác minh các giao dịch rollback tự động khi gặp lỗi batch import.' },
  { from: '[e.g. All integration tests pass. Zero data inconsistency. Idempotency verified for all async consumers. Atomic rollback confirmed.]', to: '100% Integration test cases PASS, không lệch dữ liệu, xác nhận Atomic Rollback thành công.' },

  { from: '[State NFR targets to verify — e.g. system meets response time and throughput requirements under expected and peak load.]', to: 'Đo đạc hiệu năng NFR-P01 (p95 < 500ms cho 1,000 VUs) và NFR-S01.' },
  { from: '[e.g.: · k6 Load Test: ramp to target VUs → steady state → ramp-down · k6 Stress Test: ramp to peak VUs to find breaking point · Separate cold-cache and warm-cache runs for cached endpoints]', to: 'k6 Load Test kịch bản 1,000 VUs tải đồng thời cho các endpoints gom đơn và tra cứu danh mục.' },
  { from: '[e.g. NFR-P01: p95 &lt; Xms at N VUs. NFR-S01: no HTTP 5xx at peak VUs. Error rate &lt; 0.5% in all load tests.]', to: 'p95 < 500ms tại 1,000 VUs, tỷ lệ lỗi HTTP 5xx < 0.1%.' },

  { from: '[State security requirements to verify — e.g. system protected against OWASP Top 10; all NFR-SEC requirements met.]', to: 'Xác minh hệ thống chống chịu các lỗ hổng OWASP Top 10 (A01 Access Control, A02 Crypto, A03 Injection, A07 Auth).' },
  { from: '[e.g.: · OWASP ZAP automated scan · REST Assured manual security tests: JWT tampering, brute force, SQL injection, CORS check · DB inspection for cryptographic compliance (bcrypt cost, no plaintext secrets)]', to: 'REST Assured security tests: Giả mạo JWT token, SQL/XSS injection, mã hóa BCrypt cost=12.' },
  { from: '[e.g. No Critical or High OWASP findings. All NFR-SEC requirements verified. Account lockout after N failures confirmed.]', to: '0 lỗi bảo mật OWASP mức High/Critical, phân quyền 100% endpoints.' },

  { from: '[State the UAT goal — e.g. confirm the system meets business requirements through realistic end-to-end scenarios executed by the Product Owner or business representative.]', to: 'Xác nhận hệ thống đáp ứng 100% nhu cầu nghiệp vụ vận hành thực tế thông qua 10 kịch bản UAT (SC-01 đến SC-10).' },
  { from: '[e.g.: · Script-based UAT using business-language test scripts (SC-01..SC-NN) · Exploratory testing by end users for usability · Business scenario walkthrough (end-to-end value stream)]', to: 'Kịch bản UAT ngôn ngữ nghiệp vụ dành cho Product Owner nghiệm thu trước go-live.' },
  { from: '[e.g. All UAT scenarios executed and signed off by Product Owner. No critical business process blockers. Written sign-off document obtained.]', to: 'Tất cả 10 kịch bản UAT (SC-01..SC-10) được ký duyệt sign-off bởi Product Owner.' },

  // Tools Table
  { from: '[e.g. JUnit 5]', to: 'JUnit 5' },
  { from: '[Vendor]', to: 'Org JUnit / Spring' },
  { from: '[x.x]', to: '5.10.x' },
  { from: '[e.g. Mockito]', to: 'Mockito' },
  { from: '[e.g. AssertJ]', to: 'AssertJ' },
  { from: '[e.g. Vitest]', to: 'Vitest / React Testing' },
  { from: '[e.g. React Testing Library]', to: 'React Testing Library' },
  { from: '[e.g. MSW]', to: 'MSW' },
  { from: '[e.g. Testcontainers]', to: 'Testcontainers' },
  { from: '[e.g. WireMock]', to: 'WireMock' },
  { from: '[e.g. REST Assured]', to: 'REST Assured' },
  { from: '[e.g. k6]', to: 'k6' },
  { from: '[e.g. OWASP ZAP]', to: 'OWASP ZAP' },
  { from: '[e.g. Playwright]', to: 'Cypress' },
  { from: '[e.g. JaCoCo]', to: 'JaCoCo' }
];

replacements.forEach(({ from, to }) => {
  const safeFrom = from.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const escapedTo = xmlEscape(to);
  xml = xml.replace(new RegExp(safeFrom, 'g'), escapedTo);
});

zip.updateFile('word/document.xml', Buffer.from(xml, 'utf8'));
zip.writeZip(outputPath);

// Also remove old problematic file Report 5.0_ELog_TestPlan.docx if exists
if (fs.existsSync('D:/FULearning/semester 9/Elog/Report5/Report 5.0_ELog_TestPlan.docx')) {
  try {
    fs.unlinkSync('D:/FULearning/semester 9/Elog/Report5/Report 5.0_ELog_TestPlan.docx');
  } catch (e) {
    console.log('Old file unlinked or locked by word');
  }
}

console.log('Successfully generated valid OpenXML Word Document:', outputPath);
