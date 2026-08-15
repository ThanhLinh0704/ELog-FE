import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.argv[2] ?? ".");
const inputPath = path.join(projectRoot, ".understand-anything/tmp/ua-file-analyzer-input-2.json");
const outputPath = path.join(projectRoot, ".understand-anything/intermediate/batch-2.json");
const input = JSON.parse(readFileSync(inputPath, "utf8"));

const nodes = [
  {
    id: "file:index.html",
    type: "file",
    name: "index.html",
    filePath: "index.html",
    summary: "HTML shell tối giản của Vite, khai báo metadata responsive, favicon và phần tử root để React mount ứng dụng. Module src/main.tsx được nạp trực tiếp làm entry point phía trình duyệt.",
    tags: ["entry-point", "html", "vite", "bootstrap"],
    complexity: "simple",
  },
  {
    id: "file:src/App.css",
    type: "file",
    name: "App.css",
    filePath: "src/App.css",
    summary: "Định nghĩa style cho giao diện mẫu gồm counter, hero, khu vực nội dung, liên kết tài liệu và các breakpoint responsive. File sử dụng CSS nesting, pseudo-element và design token từ stylesheet toàn cục.",
    tags: ["styling", "responsive-ui", "css", "vite-template"],
    complexity: "moderate",
    languageNotes: "CSS nesting được dùng trực tiếp cho state hover, focus, media query và selector con.",
  },
  {
    id: "file:src/index.css",
    type: "file",
    name: "index.css",
    filePath: "src/index.css",
    summary: "Cung cấp design token, typography và reset toàn cục cho ứng dụng, đồng thời hỗ trợ light/dark color scheme. Phần còn lại định kiểu AdminShell với sidebar cố định, hồ sơ người dùng, nút đăng xuất và header sticky.",
    tags: ["styling", "design-tokens", "admin-layout", "responsive-ui", "dark-mode"],
    complexity: "moderate",
    languageNotes: "CSS custom properties kết hợp prefers-color-scheme để chuyển theme mà không cần logic JavaScript.",
  },
  {
    id: "file:src/styles/login/LoginPage.css",
    type: "file",
    name: "LoginPage.css",
    filePath: "src/styles/login/LoginPage.css",
    summary: "Stylesheet chuyên biệt cho trang đăng nhập ELog, bao quát navbar, hero, lưới tính năng, mô phỏng bản đồ tuyến, form, validation state, animation và footer. Style được scope theo elog-login-page và có breakpoint điều chỉnh bố cục cho màn hình nhỏ.",
    tags: ["styling", "login-page", "responsive-ui", "animation", "form-design"],
    complexity: "complex",
    languageNotes: "Selector :has() được dùng để nới ràng buộc của root khi trang đăng nhập hoạt động; các animation mô phỏng tuyến và điểm dừng trên bản đồ.",
  },
];

const flowDefinitions = [
  ["cypress/e2e/address-flow.cy.ts", "địa chỉ", "/address", "address-flow"],
  ["cypress/e2e/auth-flow.cy.ts", "xác thực", "/auth", "authentication"],
  ["cypress/e2e/capacityvalidation-flow.cy.ts", "kiểm tra tải trọng", "/capacityvalidation", "capacity-validation"],
  ["cypress/e2e/consolidation-flow.cy.ts", "gom tuyến", "/consolidation", "route-consolidation"],
  ["cypress/e2e/constraintvalidation-flow.cy.ts", "kiểm tra ràng buộc", "/constraintvalidation", "constraint-validation"],
  ["cypress/e2e/drivertrip-flow.cy.ts", "chuyến đi của tài xế", "/drivertrip", "driver-trip"],
  ["cypress/e2e/exception-flow.cy.ts", "quản lý ngoại lệ", "/exception", "exception-management"],
  ["cypress/e2e/import-flow.cy.ts", "nhập đơn hàng", "/import", "excel-import"],
  ["cypress/e2e/kpi-flow.cy.ts", "KPI", "/kpi", "kpi-reporting"],
  ["cypress/e2e/route-flow.cy.ts", "quản lý tuyến", "/route", "route-management"],
  ["cypress/e2e/store-flow.cy.ts", "quản lý cửa hàng", "/store", "store-management"],
  ["cypress/e2e/trip-flow.cy.ts", "quản lý chuyến đi", "/trip", "trip-management"],
  ["cypress/e2e/tripdraft-flow.cy.ts", "bản nháp chuyến đi", "/tripdraft", "trip-draft"],
  ["cypress/e2e/tripmonitoring-flow.cy.ts", "giám sát chuyến đi", "/tripmonitoring", "trip-monitoring"],
  ["cypress/e2e/user-flow.cy.ts", "quản lý người dùng", "/user", "user-management"],
  ["cypress/e2e/vehicle-flow.cy.ts", "quản lý phương tiện", "/vehicle", "vehicle-management"],
];

for (const [filePath, domain, route, domainTag] of flowDefinitions) {
  nodes.push({
    id: `file:${filePath}`,
    type: "file",
    name: path.posix.basename(filePath),
    filePath,
    summary: `Cypress spec dạng placeholder cho luồng ${domain}, khai báo 10 test case theo cùng mẫu nhưng hiện chỉ kiểm tra mệnh đề hằng đúng. Lệnh cy.visit('${route}') đang bị comment nên file chưa thực thi hành vi trình duyệt thực tế.`,
    tags: ["test", "cypress", "e2e", "placeholder", domainTag],
    complexity: "simple",
  });
}

nodes.push(
  {
    id: "file:eslint.config.js",
    type: "file",
    name: "eslint.config.js",
    filePath: "eslint.config.js",
    summary: "Cấu hình ESLint flat config cho toàn bộ TS/TSX, kết hợp rule khuyến nghị của JavaScript, TypeScript, React Hooks và React Refresh. File khai báo browser globals và loại thư mục dist khỏi lint.",
    tags: ["configuration", "linting", "typescript", "react", "build-system"],
    complexity: "simple",
    languageNotes: "ES module export một flat config thay cho định dạng eslintrc truyền thống.",
  },
  {
    id: "file:src/api/addressApi.ts",
    type: "file",
    name: "addressApi.ts",
    filePath: "src/api/addressApi.ts",
    summary: "Cung cấp service lấy danh mục tỉnh, quận hoặc huyện và phường hoặc xã cho luồng địa chỉ cửa hàng. Module chuyển đổi giữa dữ liệu mock và Axios endpoint theo runtime config, đồng thời chuẩn hóa lỗi API và lỗi mạng.",
    tags: ["api-handler", "service", "address-data", "mock-api", "error-handling"],
    complexity: "moderate",
  },
  {
    id: "function:src/api/addressApi.ts:handleAxiosCall",
    type: "function",
    name: "handleAxiosCall",
    filePath: "src/api/addressApi.ts",
    lineRange: [74, 87],
    summary: "Thực thi một Axios call, lấy payload data và chuyển lỗi response hoặc network thành Error có thông điệp ổn định cho tầng UI.",
    tags: ["api-handler", "error-handling", "utility", "serialization"],
    complexity: "simple",
  },
  {
    id: "file:src/api/axiosInstance.ts",
    type: "file",
    name: "axiosInstance.ts",
    filePath: "src/api/axiosInstance.ts",
    summary: "Khởi tạo Axios client dùng chung, tự gắn Bearer token vào request và xử lý response 401 bằng cơ chế refresh token. Module xếp hàng request đồng thời, cập nhật session trong localStorage và chuyển về trang đăng nhập khi refresh thất bại.",
    tags: ["api-client", "authentication", "token-refresh", "interceptor", "singleton"],
    complexity: "moderate",
    languageNotes: "Hàng đợi Promise bảo đảm chỉ một refresh request chạy tại một thời điểm rồi phát token mới cho các request đang chờ.",
  },
  {
    id: "function:src/api/axiosInstance.ts:processQueue",
    type: "function",
    name: "processQueue",
    filePath: "src/api/axiosInstance.ts",
    lineRange: [23, 32],
    summary: "Resolve hoặc reject toàn bộ request đang chờ sau một lần refresh token, sau đó xóa hàng đợi để tránh tái xử lý.",
    tags: ["authentication", "queue", "promise", "token-refresh"],
    complexity: "simple",
  },
  {
    id: "file:src/api/exceptionApi.ts",
    type: "file",
    name: "exceptionApi.ts",
    filePath: "src/api/exceptionApi.ts",
    summary: "Triển khai API service cho US-18 Exception Management, gồm ghi nhận giao hàng bị từ chối, lọc danh sách ngoại lệ, lấy chi tiết và đánh dấu đã xử lý. Mọi endpoint dùng Axios client chung và unwrap response envelope có type.",
    tags: ["api-handler", "service", "exception-management", "data-fetching", "type-safe"],
    complexity: "moderate",
  },
  {
    id: "function:src/api/exceptionApi.ts:rejectDelivery",
    type: "function",
    name: "rejectDelivery",
    filePath: "src/api/exceptionApi.ts",
    lineRange: [31, 40],
    summary: "Gửi yêu cầu từ chối giao hàng cho một trip stop và trả về ngoại lệ giao nhận đã được backend tạo.",
    tags: ["api-handler", "exception-management", "delivery", "mutation"],
    complexity: "simple",
  },
  {
    id: "function:src/api/exceptionApi.ts:getExceptions",
    type: "function",
    name: "getExceptions",
    filePath: "src/api/exceptionApi.ts",
    lineRange: [48, 61],
    summary: "Chuyển bộ lọc ngày, loại và trạng thái xử lý thành query parameters rồi lấy toàn bộ danh sách ngoại lệ phù hợp.",
    tags: ["api-handler", "exception-management", "filtering", "data-fetching"],
    complexity: "simple",
  },
  {
    id: "function:src/api/exceptionApi.ts:getExceptionById",
    type: "function",
    name: "getExceptionById",
    filePath: "src/api/exceptionApi.ts",
    lineRange: [69, 76],
    summary: "Truy vấn chi tiết đầy đủ của một ngoại lệ theo identifier và unwrap response envelope thành model có type.",
    tags: ["api-handler", "exception-management", "data-fetching", "detail-view"],
    complexity: "simple",
  },
  {
    id: "function:src/api/exceptionApi.ts:resolveException",
    type: "function",
    name: "resolveException",
    filePath: "src/api/exceptionApi.ts",
    lineRange: [84, 93],
    summary: "Gửi PATCH request để Dispatcher hoặc Logistics Manager đóng một ngoại lệ và trả về trạng thái ngoại lệ mới.",
    tags: ["api-handler", "exception-management", "mutation", "authorization"],
    complexity: "simple",
  },
  {
    id: "file:src/api/importApi.ts",
    type: "file",
    name: "importApi.ts",
    filePath: "src/api/importApi.ts",
    summary: "Cung cấp service đầu-cuối cho nhập đơn Excel: upload multipart, lịch sử, chi tiết batch, phân trang lỗi và export báo cáo. Module hỗ trợ cả mock lẫn backend thật, ánh xạ response sang model UI và giữ nguyên status/body qua ApiError.",
    tags: ["api-handler", "service", "excel-import", "mock-api", "data-mapping"],
    complexity: "moderate",
  },
  {
    id: "class:src/api/importApi.ts:ApiError",
    type: "class",
    name: "ApiError",
    filePath: "src/api/importApi.ts",
    lineRange: [15, 25],
    summary: "Error tùy biến lưu message, HTTP status và response body để UI có thể phân biệt lỗi nghiệp vụ của luồng import.",
    tags: ["error-handling", "api-error", "type-definition", "serialization"],
    complexity: "simple",
  },
  {
    id: "function:src/api/importApi.ts:handleAxiosCall",
    type: "function",
    name: "handleAxiosCall",
    filePath: "src/api/importApi.ts",
    lineRange: [27, 40],
    summary: "Bao Axios call và chuyển lỗi response hoặc network thành ApiError, đồng thời bảo toàn status cùng body để tầng gọi xử lý theo contract.",
    tags: ["api-handler", "error-handling", "utility", "api-error"],
    complexity: "simple",
  },
);

const edges = [
  {
    source: "file:index.html",
    target: "file:src/main.tsx",
    type: "depends_on",
    direction: "forward",
    weight: 0.6,
  },
  {
    source: "file:src/App.css",
    target: "file:src/App.tsx",
    type: "related",
    direction: "forward",
    weight: 0.5,
  },
  {
    source: "file:src/index.css",
    target: "file:src/main.tsx",
    type: "related",
    direction: "forward",
    weight: 0.5,
  },
  {
    source: "file:src/styles/login/LoginPage.css",
    target: "file:src/pages/login/LoginPage.tsx",
    type: "related",
    direction: "forward",
    weight: 0.5,
  },
];

for (const file of input.batchFiles.filter((entry) => entry.fileCategory === "code")) {
  for (const importedPath of input.batchImportData[file.path] ?? []) {
    edges.push({
      source: `file:${file.path}`,
      target: `file:${importedPath}`,
      type: "imports",
      direction: "forward",
      weight: 0.7,
    });
  }
}

const semanticEdges = [
  ["file:src/api/addressApi.ts", "function:src/api/addressApi.ts:handleAxiosCall", "contains", 1.0],
  ["file:src/api/axiosInstance.ts", "function:src/api/axiosInstance.ts:processQueue", "contains", 1.0],
  ["file:src/api/exceptionApi.ts", "function:src/api/exceptionApi.ts:rejectDelivery", "contains", 1.0],
  ["file:src/api/exceptionApi.ts", "function:src/api/exceptionApi.ts:getExceptions", "contains", 1.0],
  ["file:src/api/exceptionApi.ts", "function:src/api/exceptionApi.ts:getExceptionById", "contains", 1.0],
  ["file:src/api/exceptionApi.ts", "function:src/api/exceptionApi.ts:resolveException", "contains", 1.0],
  ["file:src/api/exceptionApi.ts", "function:src/api/exceptionApi.ts:rejectDelivery", "exports", 0.8],
  ["file:src/api/exceptionApi.ts", "function:src/api/exceptionApi.ts:getExceptions", "exports", 0.8],
  ["file:src/api/exceptionApi.ts", "function:src/api/exceptionApi.ts:getExceptionById", "exports", 0.8],
  ["file:src/api/exceptionApi.ts", "function:src/api/exceptionApi.ts:resolveException", "exports", 0.8],
  ["file:src/api/importApi.ts", "class:src/api/importApi.ts:ApiError", "contains", 1.0],
  ["file:src/api/importApi.ts", "class:src/api/importApi.ts:ApiError", "exports", 0.8],
  ["file:src/api/importApi.ts", "function:src/api/importApi.ts:handleAxiosCall", "contains", 1.0],
];

for (const [source, target, type, weight] of semanticEdges) {
  edges.push({ source, target, type, direction: "forward", weight });
}

writeFileSync(outputPath, `${JSON.stringify({ nodes, edges }, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ nodes: nodes.length, edges: edges.length })}\n`);
