import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.argv[2] ?? ".");
const readJson = (relativePath) => JSON.parse(readFileSync(path.join(projectRoot, relativePath), "utf8"));
const input = readJson(".understand-anything/tmp/ua-file-analyzer-input-3.json");
const extracted = readJson(".understand-anything/tmp/ua-file-extract-results-3.json");
const outputPath = path.join(projectRoot, ".understand-anything/intermediate/batch-3.json");

const fileMeta = {
  "src/api/loadingManifestApi.ts": {
    summary: "Cung cấp type, bộ chuẩn hóa dữ liệu và API cho loading manifest theo nguyên tắc LIFO, gồm lấy, sinh và trình bày manifest theo dòng hoặc điểm dừng. Module cũng bóc tách lỗi Axios; hai thao tác regenerate và confirm hiện chủ động báo lỗi vì chưa có trong API contract.",
    tags: ["api-handler", "service", "loading-manifest", "lifo", "data-mapping"],
    languageNotes: "Các normalizer phòng thủ chuyển payload không đồng nhất về model TypeScript chuẩn trước khi UI sử dụng.",
  },
  "src/api/mockStoreApi.ts": {
    summary: "Mô phỏng backend quản lý cửa hàng bằng danh sách in-memory, hỗ trợ tìm kiếm, lọc trạng thái, sắp xếp, phân trang, CRUD và đổi trạng thái. Các thao tác có độ trễ giả lập cùng kiểm tra trùng mã cửa hàng.",
    tags: ["mock-api", "service", "store-management", "pagination", "validation"],
  },
  "src/api/mockUserApi.ts": {
    summary: "Mô phỏng API quản lý người dùng với dữ liệu in-memory, gồm lọc và phân trang, tạo hoặc cập nhật hồ sơ, gán role và đổi trạng thái. Module phát hiện xung đột username hoặc email và chuẩn hóa kết quả qua user mapper.",
    tags: ["mock-api", "service", "user-management", "pagination", "validation"],
  },
  "src/api/monitoringApi.ts": {
    summary: "Đóng gói endpoint giám sát chuyến đang hoạt động, tiến độ từng chuyến và các mutation bắt đầu chuyến, đến điểm dừng, hoàn tất điểm dừng. Response envelope được unwrap thành các model monitoring có type.",
    tags: ["api-handler", "service", "trip-monitoring", "workflow", "type-safe"],
  },
  "src/api/productApi.ts": {
    summary: "Cung cấp service quản lý sản phẩm với chế độ mock hoặc backend thật, gồm tìm kiếm phân trang, xem chi tiết, tạo, cập nhật và đổi trạng thái. Module mã hóa query, chuẩn hóa payload hoặc response và bảo toàn metadata lỗi qua ApiError.",
    tags: ["api-handler", "service", "product-catalog", "mock-api", "data-mapping"],
  },
  "src/api/roleApi.ts": {
    summary: "Cung cấp các endpoint đọc danh sách role, chi tiết role, danh mục permission và cập nhật permission của một role. Mọi response được unwrap khỏi envelope chung của backend.",
    tags: ["api-handler", "service", "rbac", "permissions", "authorization"],
  },
  "src/api/routeApi.ts": {
    summary: "Triển khai service quản lý tuyến với chế độ mock hoặc backend thật, bao quát CRUD, trạng thái, danh sách điểm dừng, thêm hoặc xóa điểm và đổi thứ tự. Module còn truy vấn cửa hàng khả dụng, chuẩn hóa response và chuyển lỗi thành ApiError.",
    tags: ["api-handler", "service", "route-management", "mock-api", "data-mapping"],
  },
  "src/api/storeApi.ts": {
    summary: "Triển khai service quản lý cửa hàng với mock fallback, gồm tìm kiếm phân trang, xem chi tiết, tạo, cập nhật và đổi trạng thái. Module làm sạch payload, chuẩn hóa địa chỉ cùng tuyến được gán và cung cấp helper đọc status, code, message từ lỗi API.",
    tags: ["api-handler", "service", "store-management", "mock-api", "data-mapping"],
  },
  "src/api/tripApi.ts": {
    summary: "Cung cấp API điều phối chuyến, từ chọn phương tiện và tài xế, kiểm tra sức chứa đội xe, gán hoặc tách chuyến đến dispatch và cập nhật phân công. Module cũng tải phiếu bàn giao dạng blob và truy vấn chuyến của tài xế.",
    tags: ["api-handler", "service", "trip-dispatch", "vehicle-assignment", "workflow"],
  },
  "src/api/tripDraftApi.ts": {
    summary: "Cung cấp model normalization và API cho vòng đời trip draft: danh sách, chi tiết, lọc điểm dừng, tính lại ETA, xác nhận, gom đơn, kiểm tra tải trọng và hoàn tác. Module chuẩn hóa payload phức tạp và cung cấp ApiError cùng helper diễn giải lỗi.",
    tags: ["api-handler", "service", "trip-draft", "route-planning", "data-mapping"],
    languageNotes: "Các normalizer hợp nhất nhiều dạng response backend và tính lại số điểm dừng hoạt động trước khi trả model cho UI.",
  },
  "src/api/userApi.ts": {
    summary: "Cung cấp service quản lý người dùng với mock fallback, gồm danh sách phân trang, tạo, cập nhật hồ sơ, cập nhật role và trạng thái. Query được mã hóa nhất quán, response được chuẩn hóa và lỗi backend được giữ trong ApiError.",
    tags: ["api-handler", "service", "user-management", "mock-api", "data-mapping"],
  },
  "src/api/vehicleApi.ts": {
    summary: "Triển khai service quản lý phương tiện và sức chứa đội xe với chế độ mock hoặc backend thật. Module hỗ trợ tìm kiếm phân trang, CRUD, đổi trạng thái, làm sạch payload, chuẩn hóa số liệu tải trọng và diễn giải lỗi API.",
    tags: ["api-handler", "service", "vehicle-management", "fleet-capacity", "data-mapping"],
  },
  "src/App.tsx": {
    summary: "Định nghĩa cây React Router trung tâm cho toàn bộ frontend ELog, ánh xạ route đăng nhập, dashboard, master data, nhập đơn, trip draft, dispatch, monitoring, ngoại lệ và tài xế. Mỗi nhánh được bọc bằng authentication, role hoặc permission guard phù hợp và có trang 403/404 dự phòng.",
    tags: ["entry-point", "routing", "react", "authorization", "component"],
    languageNotes: "Route tree dùng composition của nhiều guard để tách kiểm tra đăng nhập, role chuyên biệt và permission chi tiết.",
  },
  "src/components/AdminShell.tsx": {
    summary: "Cung cấp layout quản trị dùng chung với sidebar, header, hồ sơ người dùng và menu điều hướng sinh động theo permission. Component đồng thời xử lý logout, dọn session và điều hướng giữa các module nghiệp vụ.",
    tags: ["component", "layout", "navigation", "rbac", "session-management"],
    languageNotes: "Menu được xây dựng khai báo rồi lọc theo kết quả usePermissions, giúp cùng một shell thích ứng với nhiều role.",
  },
  "src/components/auth/PermissionGuard.tsx": {
    summary: "Guard hiển thị có điều kiện cho React children dựa trên một permission, tập anyOf hoặc tập allOf. Khi không thỏa quyền, component trả fallback do caller cung cấp.",
    tags: ["component", "authorization", "permission-guard", "rbac"],
  },
  "src/components/auth/ProtectedPermissionRoute.tsx": {
    summary: "Route guard đọc trạng thái đăng nhập và kiểm tra permission đơn, anyOf hoặc allOf trước khi render nội dung được bảo vệ. Người chưa đăng nhập được chuyển tới login, còn người thiếu quyền được chuyển tới trang forbidden.",
    tags: ["component", "route-guard", "authorization", "rbac", "navigation"],
  },
  "src/components/manifest/ByStopManifestView.tsx": {
    summary: "Hiển thị loading manifest theo từng điểm dừng, gắn nhãn vị trí đầu hoặc cuối tuyến và sắp xếp item theo thứ tự LIFO. Component hỗ trợ loading state, thông tin cửa hàng và các số liệu khối lượng hoặc thể tích.",
    tags: ["component", "loading-manifest", "lifo", "data-display", "responsive-ui"],
  },
  "src/components/manifest/FlatManifestView.tsx": {
    summary: "Hiển thị manifest dạng bảng phẳng, sắp xếp item theo LIFO sequence và tính các tổng theo nhóm dữ liệu. Component định dạng số, rút gọn text dài và trình bày loading state cho bảng chi tiết.",
    tags: ["component", "loading-manifest", "lifo", "data-table", "aggregation"],
  },
  "src/components/manifest/ManifestSummary.tsx": {
    summary: "Tóm tắt loading manifest bằng các chỉ số tổng khối lượng, thể tích và mức sử dụng sức chứa. Component phát cảnh báo theo ngưỡng utilization để người điều phối nhận biết tải thấp hoặc vượt giới hạn.",
    tags: ["component", "loading-manifest", "capacity", "summary", "validation"],
  },
  "src/components/MapSelector.tsx": {
    summary: "Component Leaflet cho phép chọn tọa độ bằng kéo marker, click bản đồ hoặc tìm kiếm địa chỉ, rồi đồng bộ kết quả về form cha. Component quản lý vòng đời map, nhiều base layer, marker tùy biến và danh sách kết quả geocoding.",
    tags: ["component", "leaflet", "map", "geocoding", "form-control"],
    languageNotes: "Leaflet được điều khiển qua ref và effect; cleanup hủy map instance để tránh đăng ký event lặp khi component unmount.",
  },
  "src/components/ProtectedRoute.tsx": {
    summary: "Authentication guard tối giản, cho phép render children khi localStorage có access token và chuyển người chưa đăng nhập về trang login.",
    tags: ["component", "route-guard", "authentication", "navigation"],
  },
  "src/components/PublicRoute.tsx": {
    summary: "Public route guard dành cho màn hình khách, render children khi chưa có token và chuyển người đã đăng nhập tới dashboard.",
    tags: ["component", "route-guard", "authentication", "navigation"],
  },
  "src/components/TripRouteMap.tsx": {
    summary: "Vẽ tuyến chuyến đi trên Leaflet từ các stop có tọa độ hợp lệ, gồm polyline, marker đánh số, popup ETA và trạng thái. Component tự fit bounds, cập nhật kích thước map và dọn tài nguyên khi dữ liệu thay đổi hoặc unmount.",
    tags: ["component", "leaflet", "trip-monitoring", "map", "data-visualization"],
    languageNotes: "Dữ liệu stop được lọc và sắp xếp trước khi tạo layer Leaflet; effect cleanup ngăn map instance cũ giữ DOM và listener.",
  },
  "src/components/UserFormModal.tsx": {
    summary: "Modal Ant Design dùng chung cho tạo và chỉnh sửa người dùng, quản lý profile, role, validation và field error trả về từ API. Component tạo payload riêng theo mode, đồng bộ form với user hiện tại và khóa submit trong lúc xử lý.",
    tags: ["component", "form", "user-management", "validation", "rbac"],
  },
  "src/config.ts": {
    summary: "Tập trung runtime config cho API, lựa chọn chế độ mock và danh sách role người dùng được frontend hỗ trợ. Các giá trị môi trường được chuyển thành constant có type để API service và form dùng thống nhất.",
    tags: ["configuration", "runtime-config", "environment", "roles", "type-definition"],
  },
};

const domainMeta = {
  "src/api/loadingManifestApi.ts": ["loading manifest", "loading-manifest"],
  "src/api/monitoringApi.ts": ["giám sát chuyến", "trip-monitoring"],
  "src/api/productApi.ts": ["sản phẩm", "product-catalog"],
  "src/api/roleApi.ts": ["role và permission", "rbac"],
  "src/api/routeApi.ts": ["tuyến giao hàng", "route-management"],
  "src/api/storeApi.ts": ["cửa hàng", "store-management"],
  "src/api/tripApi.ts": ["điều phối chuyến", "trip-dispatch"],
  "src/api/tripDraftApi.ts": ["trip draft", "trip-draft"],
  "src/api/userApi.ts": ["người dùng", "user-management"],
  "src/api/vehicleApi.ts": ["phương tiện", "vehicle-management"],
  "src/App.tsx": ["routing ứng dụng", "routing"],
  "src/components/AdminShell.tsx": ["layout quản trị", "admin-layout"],
  "src/components/auth/PermissionGuard.tsx": ["phân quyền hiển thị", "authorization"],
  "src/components/auth/ProtectedPermissionRoute.tsx": ["phân quyền route", "authorization"],
  "src/components/manifest/ByStopManifestView.tsx": ["manifest theo điểm dừng", "loading-manifest"],
  "src/components/manifest/FlatManifestView.tsx": ["manifest dạng phẳng", "loading-manifest"],
  "src/components/manifest/ManifestSummary.tsx": ["tổng quan manifest", "loading-manifest"],
  "src/components/MapSelector.tsx": ["chọn tọa độ", "map"],
  "src/components/ProtectedRoute.tsx": ["route riêng tư", "authentication"],
  "src/components/PublicRoute.tsx": ["route công khai", "authentication"],
  "src/components/TripRouteMap.tsx": ["bản đồ chuyến", "trip-monitoring"],
  "src/components/UserFormModal.tsx": ["form người dùng", "user-management"],
};

const explicitSymbolSummaries = {
  "src/api/loadingManifestApi.ts:toNumber": "Chuyển giá trị không xác định thành số hữu hạn và dùng fallback khi dữ liệu rỗng hoặc không hợp lệ.",
  "src/api/loadingManifestApi.ts:normalizeLine": "Ánh xạ một dòng manifest thô sang LoadingManifestItem chuẩn, gồm sequence LIFO, thông tin sản phẩm, cửa hàng và số liệu tải.",
  "src/api/loadingManifestApi.ts:normalizeStop": "Chuẩn hóa một điểm dừng manifest cùng danh sách item lồng nhau, thứ tự dừng và các tổng khối lượng hoặc thể tích.",
  "src/api/loadingManifestApi.ts:normalizeManifest": "Hợp nhất payload manifest, lines và stops thành model chuẩn, đồng thời tính hoặc dự phòng các tổng số lượng và utilization.",
  "src/api/loadingManifestApi.ts:getLoadingManifest": "Lấy loading manifest của một trip draft và chuẩn hóa response trước khi trả cho UI.",
  "src/api/loadingManifestApi.ts:generateLoadingManifest": "Yêu cầu backend sinh loading manifest LIFO cho trip draft rồi chuẩn hóa kết quả.",
  "src/api/loadingManifestApi.ts:getManifestFlatItems": "Lấy manifest và trả danh sách item phẳng đã sắp xếp tăng dần theo LIFO sequence.",
  "src/api/loadingManifestApi.ts:getManifestStops": "Lấy biểu diễn manifest theo điểm dừng và chuẩn hóa từng stop cùng item lồng nhau.",
  "src/api/loadingManifestApi.ts:regenerateLoadingManifest": "Chủ động ném lỗi để báo thao tác regenerate chưa được định nghĩa trong API contract hiện tại.",
  "src/api/loadingManifestApi.ts:confirmLoadingManifest": "Chủ động ném lỗi để báo thao tác confirm manifest chưa được định nghĩa trong API contract hiện tại.",
  "src/api/loadingManifestApi.ts:getLoadingManifestApiErrorMessage": "Trích thông điệp lỗi manifest ưu tiên từ detail, API message hoặc Axios message và dùng fallback khi cần.",
  "src/api/loadingManifestApi.ts:getLoadingManifestApiStatus": "Lấy HTTP status từ Axios error của loading manifest nếu response tồn tại.",
  "src/api/monitoringApi.ts:getActiveTrips": "Lấy danh sách chuyến đang hoạt động theo ngày để hiển thị trên monitoring dashboard.",
  "src/api/monitoringApi.ts:getTripProgress": "Lấy tiến độ chi tiết của một chuyến, gồm trạng thái và các stop phục vụ giám sát.",
  "src/api/monitoringApi.ts:startTrip": "Gửi mutation bắt đầu một chuyến và trả về trạng thái tiến độ mới.",
  "src/api/monitoringApi.ts:arriveAtStop": "Ghi nhận tài xế đã đến một trip stop và trả về tiến độ chuyến được cập nhật.",
  "src/api/monitoringApi.ts:completeStop": "Đánh dấu một trip stop hoàn tất và trả về tiến độ chuyến sau mutation.",
  "src/api/roleApi.ts:getRoles": "Lấy toàn bộ role khả dụng để phục vụ màn hình quản trị phân quyền.",
  "src/api/roleApi.ts:getRoleById": "Lấy chi tiết một role cùng permission hiện tại theo identifier.",
  "src/api/roleApi.ts:getPermissions": "Lấy danh mục permission mà hệ thống cho phép gán cho role.",
  "src/api/roleApi.ts:updateRolePermissions": "Gửi tập permission mới cho một role và trả về role đã cập nhật.",
  "src/api/tripApi.ts:getEligibleVehicles": "Lấy phương tiện đủ và không đủ điều kiện cho trip draft, đồng thời chuẩn hóa các số liệu sức chứa về number.",
  "src/api/tripApi.ts:getAvailableDrivers": "Lấy danh sách tài xế khả dụng theo ngày điều phối.",
  "src/api/tripApi.ts:getFleetCapacityCheck": "Lấy kết quả kiểm tra tổng sức chứa đội xe cho một ngày giao hàng.",
  "src/api/tripApi.ts:assignTrip": "Gán phương tiện và tài xế cho một trip draft theo request điều phối.",
  "src/api/tripApi.ts:assignSplitTrips": "Tạo nhiều chuyến được tách từ một trip draft theo phương án phân bổ đã chọn.",
  "src/api/tripApi.ts:getTripsByTripDraftId": "Lấy các chuyến đã được tạo từ một trip draft.",
  "src/api/tripApi.ts:getTripById": "Lấy chi tiết một chuyến theo identifier.",
  "src/api/tripApi.ts:dispatchTrip": "Chuyển một chuyến sang trạng thái dispatch qua backend workflow.",
  "src/api/tripApi.ts:openHandoverSlip": "Tải phiếu bàn giao dạng blob, mở tab dự phòng và kích hoạt download bằng object URL được thu hồi sau đó.",
  "src/api/tripApi.ts:updateTripAssignment": "Cập nhật lại phương tiện hoặc tài xế được phân công cho một chuyến.",
  "src/api/tripApi.ts:getMyTrips": "Lấy danh sách chuyến của tài xế hiện tại theo ngày và trạng thái tùy chọn.",
  "src/api/tripDraftApi.ts:unwrapApiResponse": "Bóc payload data khỏi nhiều biến thể response envelope và trả nguyên body khi không có lớp bọc.",
  "src/api/tripDraftApi.ts:normalizeStop": "Chuẩn hóa stop của trip draft, gồm trạng thái, thứ tự, tọa độ, ETA và các chỉ số tải.",
  "src/api/tripDraftApi.ts:normalizeTripDraft": "Chuẩn hóa trip draft cùng danh sách stop, phương tiện và tổng tải; đồng thời sắp xếp stop theo sequence.",
  "src/api/tripDraftApi.ts:normalizeTripDraftListItem": "Rút model trip draft đầy đủ thành item danh sách và tính số stop đang hoạt động.",
  "src/api/tripDraftApi.ts:getTripDraftApiStatus": "Lấy HTTP status từ ApiError của luồng trip draft nếu có.",
  "src/api/tripDraftApi.ts:getApiErrorMessage": "Chọn thông điệp lỗi trip draft từ response body, Error hoặc fallback để UI hiển thị nhất quán.",
  "src/api/tripDraftApi.ts:getTripDraft": "Lấy và chuẩn hóa chi tiết một trip draft theo identifier.",
  "src/api/tripDraftApi.ts:getTripDrafts": "Lấy danh sách trip draft từ response dạng mảng hoặc phân trang và chuẩn hóa từng item.",
  "src/api/tripDraftApi.ts:updateStopStatus": "Bật hoặc loại một stop khỏi trip draft, kèm ghi chú override khi nghiệp vụ yêu cầu.",
  "src/api/tripDraftApi.ts:recalculateEta": "Yêu cầu backend tính lại ETA theo payload và chuẩn hóa trip draft trả về.",
  "src/api/tripDraftApi.ts:confirmTripDraft": "Xác nhận trip draft và trả thông tin định danh hoặc trạng thái của kết quả workflow.",
  "src/api/tripDraftApi.ts:getStopOrderItems": "Lấy danh sách order item thuộc một stop cụ thể trong trip draft.",
  "src/App.tsx:App": "Khai báo toàn bộ route tree của ELog và bọc từng trang bằng authentication, role hoặc permission guard tương ứng.",
  "src/components/AdminShell.tsx:AdminShell": "Render layout quản trị, tạo menu theo permission và điều phối navigation, profile cùng logout cho người dùng hiện tại.",
  "src/components/auth/PermissionGuard.tsx:PermissionGuard": "Đánh giá permission đơn, anyOf hoặc allOf và chỉ render children khi điều kiện quyền được đáp ứng.",
  "src/components/auth/ProtectedPermissionRoute.tsx:ProtectedPermissionRoute": "Bảo vệ route bằng token và permission, chuyển hướng lần lượt tới login hoặc forbidden khi kiểm tra thất bại.",
  "src/components/manifest/ByStopManifestView.tsx:ByStopManifestView": "Render manifest theo từng stop, gắn nhãn vị trí tuyến và sắp xếp item theo trình tự LIFO.",
  "src/components/manifest/FlatManifestView.tsx:clipText": "Rút gọn text vượt giới hạn hiển thị và giữ giá trị ngắn nguyên vẹn cho ô bảng manifest.",
  "src/components/manifest/FlatManifestView.tsx:FlatManifestView": "Render bảng item phẳng đã sắp xếp theo LIFO và tổng hợp các chỉ số phục vụ kiểm tra chất tải.",
  "src/components/manifest/ManifestSummary.tsx:getUtilizationAlert": "Phân loại utilization của manifest thành cảnh báo phù hợp khi tải quá thấp, gần ngưỡng hoặc vượt sức chứa.",
  "src/components/manifest/ManifestSummary.tsx:ManifestSummary": "Render các thẻ tổng quan tải trọng và cảnh báo utilization của loading manifest.",
  "src/components/MapSelector.tsx:MapSelector": "Quản lý Leaflet map, marker kéo thả, click chọn điểm và tìm kiếm geocoding để phát tọa độ mới về form cha.",
  "src/components/ProtectedRoute.tsx:ProtectedRoute": "Cho phép truy cập children khi có access token và chuyển người chưa xác thực về login.",
  "src/components/PublicRoute.tsx:PublicRoute": "Hiển thị route công khai cho khách và chuyển người đã có token tới dashboard.",
  "src/components/TripRouteMap.tsx:makeMarkerIcon": "Tạo Leaflet div icon có màu và số thứ tự để phân biệt từng điểm dừng trên tuyến.",
  "src/components/TripRouteMap.tsx:TripRouteMap": "Lọc stop hợp lệ, vẽ polyline và marker có popup rồi tự căn viewport cho toàn bộ tuyến chuyến đi.",
  "src/components/UserFormModal.tsx:UserFormModal": "Điều phối form tạo hoặc sửa người dùng, đồng bộ dữ liệu, validation, role và field error từ API trước khi submit.",
};

function symbolSummary(filePath, name, type) {
  const explicit = explicitSymbolSummaries[`${filePath}:${name}`];
  if (explicit) return explicit;
  const [domainLabel] = domainMeta[filePath] ?? ["module"];
  if (type === "class" && name === "ApiError") {
    return `Biểu diễn lỗi API của ${domainLabel}, lưu message, HTTP status và response body để tầng UI xử lý theo contract.`;
  }
  if (name === "handleAxiosCall") {
    return `Bao một Axios call của ${domainLabel}, trả payload thành công và chuyển lỗi response hoặc network thành ApiError nhất quán.`;
  }
  if (name === "normalizeQueryValue") {
    return `Chuyển giá trị query của ${domainLabel} thành chuỗi ổn định và bỏ qua giá trị không nên gửi lên backend.`;
  }
  if (name === "encodeQuery") {
    return `Mã hóa object tham số của ${domainLabel} thành URLSearchParams, chỉ giữ các giá trị query hợp lệ.`;
  }
  if (name === "normalizeStore") return "Chuẩn hóa payload cửa hàng thô, địa chỉ, tọa độ, trạng thái và danh sách tuyến được gán thành Store model.";
  if (name === "normalizeStorePage") return "Hợp nhất response cửa hàng dạng page, envelope hoặc mảng thành cấu trúc phân trang nhất quán cho UI.";
  if (name === "getStoreApiStatus") return "Lấy HTTP status từ ApiError của service cửa hàng nếu có.";
  if (name === "getStoreApiErrorCode") return "Trích application error code từ body của lỗi service cửa hàng.";
  if (name === "getStoreApiErrorMessage") return "Chọn thông điệp lỗi cửa hàng từ response body, Error hoặc fallback để hiển thị cho người dùng.";
  if (name === "normalizeVehicle") return "Chuẩn hóa payload phương tiện và chuyển các trường sức chứa hoặc trạng thái về kiểu dữ liệu frontend mong đợi.";
  if (name === "normalizeVehiclePage") return "Hợp nhất response phương tiện dạng page, envelope hoặc mảng thành kết quả phân trang nhất quán.";
  if (name === "normalizeFleetCapacity") return "Chuẩn hóa các tổng số lượng, tải trọng và thể tích của đội xe thành số an toàn cho dashboard.";
  if (name === "getVehicleApiStatus") return "Lấy HTTP status từ ApiError của service phương tiện nếu có.";
  if (name === "getVehicleApiErrorMessage") return "Trích thông điệp lỗi phương tiện từ response body hoặc fallback để UI hiển thị nhất quán.";
  return `Thực hiện xử lý ${name} cho ${domainLabel} theo contract và dữ liệu đã được module chuẩn hóa.`;
}

function symbolTags(filePath, name, type) {
  const domainTag = domainMeta[filePath]?.[1] ?? "frontend";
  if (type === "class") return ["error-handling", "api-error", domainTag, "serialization"];
  if (/^[A-Z]/.test(name)) return ["component", "react", domainTag, "ui-workflow"];
  if (name.startsWith("normalize") || name === "toNumber" || name === "unwrapApiResponse") {
    return ["utility", "data-mapping", "normalization", domainTag];
  }
  if (name === "encodeQuery" || name === "normalizeQueryValue") {
    return ["utility", "query-parameters", "serialization", domainTag];
  }
  if (name === "handleAxiosCall" || name.includes("Error") || name.endsWith("Status")) {
    return ["utility", "error-handling", "api-client", domainTag];
  }
  if (name === "clipText" || name === "makeMarkerIcon" || name === "getUtilizationAlert") {
    return ["utility", domainTag, "presentation", "component-helper"];
  }
  if (/^(get|open)/.test(name)) return ["api-handler", "data-fetching", "service", domainTag];
  return ["api-handler", "mutation", "service", domainTag];
}

const exportedNamesByPath = new Map(extracted.results.map((result) => [
  result.path,
  new Set((result.exports ?? []).map((entry) => entry.name)),
]));

const nodes = [];
const significantSymbols = [];
for (const result of extracted.results) {
  const meta = fileMeta[result.path];
  if (!meta) throw new Error(`Missing file metadata: ${result.path}`);
  const fileComplexity = result.nonEmptyLines < 50 ? "simple" : result.nonEmptyLines <= 200 ? "moderate" : "complex";
  nodes.push({
    id: `file:${result.path}`,
    type: "file",
    name: path.posix.basename(result.path),
    filePath: result.path,
    summary: meta.summary,
    tags: meta.tags,
    complexity: fileComplexity,
    ...(meta.languageNotes ? { languageNotes: meta.languageNotes } : {}),
  });

  const exportedNames = exportedNamesByPath.get(result.path);
  for (const fn of result.functions ?? []) {
    if (fn.endLine - fn.startLine + 1 < 10 && !exportedNames.has(fn.name)) continue;
    significantSymbols.push({ filePath: result.path, type: "function", value: fn, exported: exportedNames.has(fn.name) });
  }
  for (const cls of result.classes ?? []) {
    if (cls.endLine - cls.startLine + 1 < 20 && cls.methods.length < 2 && !exportedNames.has(cls.name)) continue;
    significantSymbols.push({ filePath: result.path, type: "class", value: cls, exported: exportedNames.has(cls.name) });
  }

  for (const symbol of significantSymbols.filter((entry) => entry.filePath === result.path)) {
    const lineCount = symbol.value.endLine - symbol.value.startLine + 1;
    nodes.push({
      id: `${symbol.type}:${result.path}:${symbol.value.name}`,
      type: symbol.type,
      name: symbol.value.name,
      filePath: result.path,
      lineRange: [symbol.value.startLine, symbol.value.endLine],
      summary: symbolSummary(result.path, symbol.value.name, symbol.type),
      tags: symbolTags(result.path, symbol.value.name, symbol.type),
      complexity: lineCount < 50 ? "simple" : lineCount <= 200 ? "moderate" : "complex",
    });
  }
}

const edges = [];
for (const file of input.batchFiles) {
  for (const targetPath of input.batchImportData[file.path] ?? []) {
    edges.push({
      source: `file:${file.path}`,
      target: `file:${targetPath}`,
      type: "imports",
      direction: "forward",
      weight: 0.7,
    });
  }
}

for (const symbol of significantSymbols) {
  const fileId = `file:${symbol.filePath}`;
  const symbolId = `${symbol.type}:${symbol.filePath}:${symbol.value.name}`;
  edges.push({ source: fileId, target: symbolId, type: "contains", direction: "forward", weight: 1.0 });
  if (symbol.exported) {
    edges.push({ source: fileId, target: symbolId, type: "exports", direction: "forward", weight: 0.8 });
  }
}

writeFileSync(outputPath, `${JSON.stringify({ nodes, edges }, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({
  nodes: nodes.length,
  fileNodes: extracted.results.length,
  significantSymbols: significantSymbols.length,
  exportedSymbols: significantSymbols.filter((symbol) => symbol.exported).length,
  edges: edges.length,
  importEdges: edges.filter((edge) => edge.type === "imports").length,
}, null, 2)}\n`);
