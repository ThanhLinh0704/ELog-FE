import { resolveRoute } from './support/l4Catalog.mjs';
import { extractFixtureIds } from './support/report5Fixture.mjs';

type Account = 'admin' | 'dispatcher01' | 'manager01' | 'warehouse01';

interface WebJourney {
  id: string;
  title: string;
  route: string;
  account: Account;
  expectedSurface: RegExp;
}

const PASSWORDS: Record<Account, string> = {
  admin: 'Admin@2025',
  dispatcher01: 'Dev@2025',
  manager01: 'Dev@2025',
  warehouse01: 'Dev@2025',
};

let fixtureIds: ReturnType<typeof extractFixtureIds>;
const fixtureEvidencePath = Cypress.env('REPORT5_FIXTURE_EVIDENCE')
  || '../../../ELog-BE/test-execution/evidence/l3-rerun-results.json';

const webJourneys: WebJourney[] = [
  { id: 'L4-WEB-IMPORT-01', title: 'Dispatcher imports an approved delivery file', route: '/dispatcher/import', account: 'dispatcher01', expectedSurface: /Nhập đơn hàng từ Excel/i },
  { id: 'L4-WEB-IMPORT-02', title: 'Dispatcher reviews mixed accepted and rejected rows', route: '/dispatcher/import/history/:batchId', account: 'dispatcher01', expectedSurface: /Thông tin tổng quan|Chi tiết lô nhập/i },
  { id: 'L4-WEB-IMPORT-03', title: 'Dispatcher exports the batch rejection report', route: '/dispatcher/import/history/:batchId', account: 'dispatcher01', expectedSurface: /Lỗi|Tải xuống|Xuất/i },
  { id: 'L4-WEB-PLAN-01', title: 'Dispatcher consolidates eligible orders by delivery date', route: '/dispatcher/trip-drafts', account: 'dispatcher01', expectedSurface: /Quản lý gom đơn/i },
  { id: 'L4-WEB-PLAN-03', title: 'Dispatcher reviews draft totals and route context', route: '/dispatcher/trip-drafts/:id', account: 'dispatcher01', expectedSurface: /Thông tin tổng quan/i },
  { id: 'L4-WEB-PLAN-04', title: 'Dispatcher reviews ordered stops and order items', route: '/trip-drafts/:draftId/review', account: 'dispatcher01', expectedSurface: /điểm dừng|Tổng đơn hàng/i },
  { id: 'L4-WEB-PLAN-05', title: 'Dispatcher recalculates ETA after planning input is ready', route: '/trip-drafts/:draftId/review', account: 'dispatcher01', expectedSurface: /ETA|thời gian dự kiến/i },
  { id: 'L4-WEB-PLAN-06', title: 'Dispatcher adjusts planned departure and receives refreshed ETA', route: '/dispatcher/trip-drafts/:id', account: 'dispatcher01', expectedSurface: /Khởi hành|ETA|kế hoạch/i },
  { id: 'L4-WEB-PLAN-07', title: 'Dispatcher reviews ranked feasible recommendations', route: '/dispatcher/trip-drafts/:id', account: 'dispatcher01', expectedSurface: /Đề xuất|phương án|recommendation/i },
  { id: 'L4-WEB-PLAN-08', title: 'Dispatcher confirms a displayed feasible plan', route: '/dispatcher/trip-drafts/:id', account: 'dispatcher01', expectedSurface: /Xác nhận|Đã xác nhận/i },
  { id: 'L4-WEB-PLAN-09', title: 'Dispatcher withdraws a plan before execution', route: '/dispatcher/trip-drafts/:id', account: 'dispatcher01', expectedSurface: /Thu hồi|gom đơn/i },
  { id: 'L4-WEB-CAP-01', title: 'Dispatcher validates draft payload and volume', route: '/dispatcher/trip-drafts/:id/capacity', account: 'dispatcher01', expectedSurface: /Tổng thể tích|Tổng trọng lượng/i },
  { id: 'L4-WEB-CAP-02', title: 'Infeasible single-vehicle result offers the split path', route: '/dispatcher/trip-drafts/:id/capacity', account: 'dispatcher01', expectedSurface: /tách|Phân xe|tải trọng/i },
  { id: 'L4-WEB-ASSIGN-01', title: 'Dispatcher assigns one eligible vehicle and driver', route: '/dispatcher/trip-drafts/:id/assign', account: 'dispatcher01', expectedSurface: /Phân xe|Tài xế/i },
  { id: 'L4-WEB-ASSIGN-02', title: 'Dispatcher assigns a validated two-vehicle split', route: '/dispatcher/trip-drafts/:id/assign', account: 'dispatcher01', expectedSurface: /tách chuyến|Chuyến 1/i },
  { id: 'L4-WEB-ASSIGN-03', title: 'Dispatcher changes resources before dispatch lock', route: '/dispatcher/trip-drafts/:id/assign', account: 'dispatcher01', expectedSurface: /Xe|Tài xế/i },
  { id: 'L4-WEB-MANIFEST-01', title: 'Warehouse user generates and reviews LIFO guidance', route: '/trip-drafts/:tripDraftId/loading-manifest', account: 'warehouse01', expectedSurface: /LIFO|xếp hàng/i },
  { id: 'L4-WEB-DISPATCH-01', title: 'Dispatcher reviews assignment readiness', route: '/dispatcher/trips/:tripId/dispatch', account: 'dispatcher01', expectedSurface: /Sẵn sàng|Tải trọng|Trip ID/i },
  { id: 'L4-WEB-DISPATCH-02', title: 'Dispatcher locks and publishes an eligible trip', route: '/dispatcher/trips/:tripId/dispatch', account: 'dispatcher01', expectedSurface: /Điều phối|Khóa|Dispatch/i },
  { id: 'L4-WEB-DISPATCH-03', title: 'Repeated dispatch keeps the existing locked trip', route: '/dispatcher/trips/:tripId/dispatch', account: 'dispatcher01', expectedSurface: /Đã điều phối|DISPATCHED|Trip ID/i },
  { id: 'L4-WEB-MON-01', title: 'Dispatcher reviews active-trip fleet status', route: '/dispatcher/monitoring', account: 'dispatcher01', expectedSurface: /Theo dõi|Tổng|Chờ/i },
  { id: 'L4-WEB-MON-02', title: 'Dispatcher drills into trip progress', route: '/manager/monitoring', account: 'manager01', expectedSurface: /Theo dõi|Tiến độ|điểm dừng/i },
  { id: 'L4-WEB-MON-03', title: 'Dispatcher reviews current operational violations', route: '/dispatcher/monitoring', account: 'dispatcher01', expectedSurface: /ngoại lệ|vi phạm|Theo dõi/i },
  { id: 'L4-WEB-EXC-01', title: 'Dispatcher filters and inspects exception detail', route: '/dispatcher/exceptions', account: 'dispatcher01', expectedSurface: /ngoại lệ|sự cố|Chưa xử lý/i },
  { id: 'L4-WEB-EXC-02', title: 'Manager resolves an exception with an audit note', route: '/manager/exceptions', account: 'manager01', expectedSurface: /ngoại lệ|Giải quyết|Chưa xử lý/i },
  { id: 'L4-WEB-OUT-01', title: 'Dispatcher reviews submitted trip outcomes', route: '/dispatcher/trip-outcomes', account: 'dispatcher01', expectedSurface: /Kết quả|Chờ nghiệm thu/i },
  { id: 'L4-WEB-OUT-02', title: 'Manager validates a submitted outcome', route: '/manager/trip-outcomes', account: 'manager01', expectedSurface: /Đã nghiệm thu|Chờ nghiệm thu/i },
  { id: 'L4-WEB-OUT-03', title: 'Manager returns an outcome for audited correction', route: '/manager/trip-outcomes', account: 'manager01', expectedSurface: /Cần điều chỉnh|Gửi lại/i },
  { id: 'L4-WEB-KPI-01', title: 'Manager reviews dated KPI summary, trend, and route performance', route: '/manager/kpi', account: 'manager01', expectedSurface: /Tỷ lệ đúng giờ|Hiệu suất theo tuyến/i },
  { id: 'L4-WEB-HIST-01', title: 'Auditor searches immutable planning events', route: '/dispatcher/activity-history', account: 'admin', expectedSurface: /Lịch sử|Timeline|hoạt động/i },
  { id: 'L4-WEB-HIST-02', title: 'Auditor opens a trip outcome timeline', route: '/manager/activity-history', account: 'admin', expectedSurface: /Lịch sử|Timeline|hoạt động/i },
  { id: 'L4-WEB-ADMIN-01', title: 'Administrator creates an internal user', route: '/users', account: 'admin', expectedSurface: /Quản lý người dùng|Tạo người dùng/i },
  { id: 'L4-WEB-ADMIN-02', title: 'Administrator changes the roles of another user', route: '/users', account: 'admin', expectedSurface: /Vai trò|Quản lý người dùng/i },
  { id: 'L4-WEB-ADMIN-03', title: 'Administrator updates a role permission set', route: '/roles', account: 'admin', expectedSurface: /Quản lý vai trò|Permission/i },
  { id: 'L4-WEB-ADMIN-04', title: 'Administrator creates an active mapped store', route: '/stores', account: 'admin', expectedSurface: /Quản lý cửa hàng/i },
  { id: 'L4-WEB-ADMIN-05', title: 'Administrator registers an eligible vehicle', route: '/vehicles', account: 'admin', expectedSurface: /Quản lý đội xe/i },
  { id: 'L4-WEB-ADMIN-06', title: 'Administrator creates a product with physical attributes', route: '/admin/products/new', account: 'admin', expectedSurface: /Thêm sản phẩm|Thông số vật lý/i },
  { id: 'L4-WEB-ADMIN-07', title: 'Administrator maintains ordered route stops', route: '/admin/routes/:routeId', account: 'admin', expectedSurface: /Thông tin tuyến|điểm dừng/i },
  { id: 'L4-WEB-ADMIN-08', title: 'Administrator records driver availability status', route: '/admin/drivers', account: 'admin', expectedSurface: /Quản lý tài xế|Lịch sử trạng thái/i },
];

const planningJourneyIds = new Set([
  'L4-WEB-PLAN-03',
  'L4-WEB-PLAN-04',
  'L4-WEB-PLAN-05',
  'L4-WEB-PLAN-06',
  'L4-WEB-PLAN-07',
  'L4-WEB-PLAN-08',
  'L4-WEB-PLAN-09',
]);

const splitAssignmentJourneyIds = new Set([
  'L4-WEB-ASSIGN-02',
]);

const webJourneyExecutionOrder = [...webJourneys];
const plan07Index = webJourneyExecutionOrder.findIndex((journey) => journey.id === 'L4-WEB-PLAN-07');
const plan08Index = webJourneyExecutionOrder.findIndex((journey) => journey.id === 'L4-WEB-PLAN-08');
[webJourneyExecutionOrder[plan07Index], webJourneyExecutionOrder[plan08Index]] = [
  webJourneyExecutionOrder[plan08Index],
  webJourneyExecutionOrder[plan07Index],
];

function loginThroughUi(account: Account) {
  cy.session(account, () => {
    cy.visit('/login');
    cy.get('input#login_form_username').type(account, { log: false });
    cy.get('input#login_form_password').type(PASSWORDS[account], { log: false });
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
    cy.window().its('localStorage').invoke('getItem', 'token').should('be.a', 'string').and('not.be.empty');
  }, {
    validate() {
      cy.window().its('localStorage').invoke('getItem', 'token').should('be.a', 'string').and('not.be.empty');
    },
  });
}

function assertEtaRecalculation(draftId: number) {
  cy.contains('button', /T\u00ednh l\u1ea1i ETA/i).should('be.enabled').click();
  cy.get('.ant-message-notice', { timeout: 15000 }).should('contain.text', 'ETA');
  cy.window().then((window) => {
    const token = window.localStorage.getItem('token');
    expect(token, 'browser session token').to.be.a('string').and.not.be.empty;
    return cy.request({
      method: 'GET',
      url: `http://localhost:8080/api/v1/trip-drafts/${draftId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
  }).then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body.data.stops.some((stop: { plannedEta?: string }) => Boolean(stop.plannedEta))).to.eq(true);
  });
}

function assertDraftConfirmation(draftId: number) {
  cy.contains('button', /X\u00e1c nh\u1eadn b\u1ea3n nh\u00e1p/i).should('be.enabled').click();
  cy.get('.ant-modal').find('.ant-btn-primary').should('be.enabled').click();
  cy.location('pathname', { timeout: 15000 }).should('eq', `/dispatcher/trip-drafts/${draftId}`);
  cy.window().then((window) => {
    const token = window.localStorage.getItem('token');
    expect(token, 'browser session token').to.be.a('string').and.not.be.empty;
    return cy.request({
      method: 'GET',
      url: `http://localhost:8080/api/v1/trip-drafts/${draftId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
  }).then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body.data.status).to.match(/PLANNED|VALIDATED/);
  });
}

function assertVehicleRecommendations() {
  cy.contains('button', /G\u1ee3i \u00fd ph\u00e2n xe/i).should('be.enabled').click();
  cy.contains(/G\u1ee3i \u00fd ph\u00e2n xe t\u1ef1 \u0111\u1ed9ng/i, { timeout: 15000 }).should('be.visible');
}

function assertRealJourneySurface(journey: WebJourney) {
  loginThroughUi(journey.account);
  const routeFixtureIds = splitAssignmentJourneyIds.has(journey.id)
    ? { ...fixtureIds, id: fixtureIds.splitDraftId, draftId: fixtureIds.splitDraftId, tripDraftId: fixtureIds.splitDraftId }
    : planningJourneyIds.has(journey.id)
    ? { ...fixtureIds, id: fixtureIds.planningDraftId, draftId: fixtureIds.planningDraftId, tripDraftId: fixtureIds.planningDraftId }
    : fixtureIds;
  const route = journey.id === 'L4-WEB-PLAN-08'
    ? `/trip-drafts/${fixtureIds.planningDraftId}/review`
    : resolveRoute(journey.route, routeFixtureIds);
  cy.visit(route);
  cy.location('pathname').should('eq', route);
  cy.get('body').should('not.contain.text', '403').and('not.contain.text', '404');
  if (journey.id === 'L4-WEB-PLAN-05') {
    assertEtaRecalculation(fixtureIds.planningDraftId);
    cy.screenshot(journey.id, { capture: 'fullPage' });
    return;
  }
  if (journey.id === 'L4-WEB-PLAN-08') {
    assertDraftConfirmation(fixtureIds.planningDraftId);
    cy.screenshot(journey.id, { capture: 'fullPage' });
    return;
  }
  if (journey.id === 'L4-WEB-PLAN-07') {
    assertVehicleRecommendations();
    cy.screenshot(journey.id, { capture: 'fullPage' });
    return;
  }
  if (journey.id === 'L4-WEB-HIST-01' || journey.id === 'L4-WEB-HIST-02') {
    cy.get('.ant-layout-content').contains(journey.expectedSurface, { timeout: 15000 }).should('be.visible');
    cy.screenshot(journey.id, { capture: 'fullPage' });
    return;
  }
  cy.contains(journey.expectedSurface, { timeout: 15000 }).should('be.visible');
  cy.screenshot(journey.id, { capture: 'fullPage' });
}

describe('Report 5 L4 — real backend web journeys', () => {
  before(() => {
    cy.readFile(fixtureEvidencePath).then((contents) => {
      fixtureIds = extractFixtureIds(contents);
      cy.log(`Using L3 fixture batch=${fixtureIds.batchId}, draft=${fixtureIds.tripDraftId}, trip=${fixtureIds.tripId}`);
    });
  });

  it('L4-WEB-AUTH-01 — Approved user signs in to the role landing page', () => {
    cy.visit('/login');
    cy.get('input#login_form_username').type('admin', { log: false });
    cy.get('input#login_form_password').type(PASSWORDS.admin, { log: false });
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
    cy.contains('Quản lý người dùng').click();
    cy.location('pathname').should('eq', '/users');
    cy.screenshot('L4-WEB-AUTH-01', { capture: 'fullPage' });
  });

  it('L4-WEB-AUTH-02 — Protected route returns a guest to sign-in', () => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.visit('/dashboard');
    cy.location('pathname').should('eq', '/login');
    cy.contains('Chào mừng trở lại').should('be.visible');
    cy.screenshot('L4-WEB-AUTH-02', { capture: 'fullPage' });
  });

  it('L4-WEB-AUTH-03 — Signed-in user ends the session', () => {
    loginThroughUi('admin');
    cy.visit('/dashboard');
    cy.contains('button', 'Đăng xuất').click();
    cy.location('pathname').should('eq', '/login');
    cy.visit('/dashboard');
    cy.location('pathname').should('eq', '/login');
    cy.screenshot('L4-WEB-AUTH-03', { capture: 'fullPage' });
  });

  for (const journey of webJourneyExecutionOrder) {
    it(`${journey.id} — ${journey.title}`, () => assertRealJourneySurface(journey));
  }
});
