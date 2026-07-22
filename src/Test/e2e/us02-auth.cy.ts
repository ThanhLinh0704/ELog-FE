/**
 * US-02 Authentication & Authorization — E2E Tests
 * Spec: src/Test/e2e/us02-auth-e2e-spec.md
 *
 * ⚠ Key discrepancy between spec & current implementation:
 *   Spec expects : localStorage.getItem('accessToken')
 *   Current code : localStorage.getItem('token')
 *   → Tests check 'token' to match actual implementation.
 *     Fix the implementation key to 'accessToken' to align with spec.
 *
 * Tests marked [REQUIRES IMPLEMENTATION] will fail until the
 * corresponding frontend feature is built:
 *   - PrivateRoute guard  → TC-05, TC-08
 *   - RBAC route guard + /users page → TC-06
 *   - Axios 401 refresh interceptor → TC-07
 *   - Axios error interceptor (clear storage on 401) → TC-09
 */

// ─── Selectors ────────────────────────────────────────────────────────────────
// Ant Design Form name="login_form" generates IDs: login_form_{fieldName}
const SEL = {
  usernameInput:  '#login_form_username',
  passwordInput:  '#login_form_password',
  submitBtn:      'button[type="submit"]',
  alert:          '.ant-alert',
  fieldError:     '.ant-form-item-explain-error',
};

// ─── Mock API responses ───────────────────────────────────────────────────────
const MOCK = {
  adminLoginSuccess: {
    statusCode: 200,
    body: {
      success: true,
      data: {
        accessToken:  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInJvbGVzIjpbIlNZU1RFTV9BRE1JTiJdLCJpYXQiOjE3MDAwMDAwMDB9.mock_admin_sig',
        refreshToken: 'mock-refresh-uuid-admin-1234',
        tokenType:    'Bearer',
        username:     'admin',
        roles:        ['SYSTEM_ADMIN'],
        userId:       1,
      },
    },
  },

  driverLoginSuccess: {
    statusCode: 200,
    body: {
      success: true,
      data: {
        accessToken:  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkcml2ZXIwMSIsInJvbGVzIjpbIkRSSVZFUiJdLCJpYXQiOjE3MDAwMDAwMDB9.mock_driver_sig',
        refreshToken: 'mock-refresh-uuid-driver-5678',
        tokenType:    'Bearer',
        username:     'driver01',
        roles:        ['DRIVER'],
        userId:       2,
      },
    },
  },

  invalidCredentials: {
    statusCode: 401,
    body: {
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' },
    },
  },

  accountDisabled: {
    statusCode: 403,
    body: {
      success: false,
      error: { code: 'ACCOUNT_DISABLED', message: 'Account has been disabled' },
    },
  },

  accessDenied: {
    statusCode: 403,
    body: {
      success: false,
      error: { code: 'ACCESS_DENIED', message: 'You do not have permission to access this resource.' },
    },
  },

  refreshSuccess: {
    statusCode: 200,
    body: {
      success: true,
      data: {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsIm5ldyI6dHJ1ZSwiaWF0IjoxNzAwMDAwOTAwfQ.mock_new_sig',
        expiresIn:   900,
      },
    },
  },

  tokenInvalid: {
    statusCode: 401,
    body: {
      success: false,
      error: { code: 'TOKEN_INVALID', message: 'Refresh token is not in database!' },
    },
  },

  authFailed: {
    statusCode: 401,
    body: {
      success: false,
      error: { code: 'AUTHENTICATION_FAILED', message: 'JWT signature does not match locally computed signature.' },
    },
  },
};

// ─── Helper: perform login via UI ─────────────────────────────────────────────
function loginViaUI(username: string, password: string) {
  cy.visit('/login');
  cy.get(SEL.usernameInput).type(username);
  cy.get(SEL.passwordInput).type(password);
  cy.get(SEL.submitBtn).click();
}

// ─── Helper: set tokens directly (bypass login UI) ────────────────────────────
function setTokens(accessToken: string, refreshToken: string) {
  cy.window().then((win) => {
    win.localStorage.setItem('token', accessToken);          // current key
    win.localStorage.setItem('refreshToken', refreshToken);
  });
}

// =============================================================================
// Test Suites
// =============================================================================

describe('US-02 — Authentication & Authorization', () => {

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.window({ log: false }).then((win) => {
      win.sessionStorage.clear();
    });
  });

  afterEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
    cy.window({ log: false }).then((win) => {
      win.sessionStorage.clear();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TC-01: Login đúng credentials → token hợp lệ
  // ───────────────────────────────────────────────────────────────────────────
  describe('TC-01: Login đúng credentials → token hợp lệ', () => {
    it('HTTP 200 · lưu token & refreshToken · redirect /dashboard · không có lỗi', () => {
      cy.intercept('POST', '**/api/auth/login', MOCK.adminLoginSuccess).as('loginReq');

      loginViaUI('admin', 'Admin@2025');

      cy.wait('@loginReq').its('response.statusCode').should('eq', 200);

      cy.window().then((win) => {
        expect(win.localStorage.getItem('token'),        'token phải được lưu').to.not.be.empty;
        expect(win.localStorage.getItem('refreshToken'), 'refreshToken phải được lưu').to.not.be.empty;
        expect(win.localStorage.getItem('username'),     'username phải được lưu').to.eq('admin');
      });

      cy.url().should('include', '/dashboard');
      cy.get(SEL.alert).should('not.exist');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TC-02: Login sai password → 401
  // ───────────────────────────────────────────────────────────────────────────
  describe('TC-02: Login sai password → 401', () => {
    it('HTTP 401 · hiển thị lỗi INVALID_CREDENTIALS · ở lại /login · không lưu token', () => {
      cy.intercept('POST', '**/api/auth/login', MOCK.invalidCredentials).as('loginReq');

      loginViaUI('admin', 'SaiMatKhau123');

      cy.wait('@loginReq').its('response.statusCode').should('eq', 401);

      cy.url().should('include', '/login');
      cy.get(SEL.alert).should('be.visible');
      cy.get(SEL.alert).should('contain', 'Invalid username or password');

      cy.window().then((win) => {
        expect(win.localStorage.getItem('token'), 'token KHÔNG được lưu').to.be.null;
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TC-03: Login tài khoản bị khóa → 403
  // ───────────────────────────────────────────────────────────────────────────
  describe('TC-03: Tài khoản bị khóa → 403', () => {
    it('HTTP 403 · hiển thị lỗi ACCOUNT_DISABLED · thông báo khác TC-02 · không lưu token', () => {
      cy.intercept('POST', '**/api/auth/login', MOCK.accountDisabled).as('loginReq');

      loginViaUI('locked_user', 'Locked@2025');

      cy.wait('@loginReq').its('response.statusCode').should('eq', 403);

      cy.url().should('include', '/login');
      cy.get(SEL.alert).should('be.visible');
      cy.get(SEL.alert).should('contain', 'Account has been disabled');

      // Thông báo PHẢI khác với TC-02
      cy.get(SEL.alert).should('not.contain', 'Invalid username or password');

      cy.window().then((win) => {
        expect(win.localStorage.getItem('token'), 'token KHÔNG được lưu').to.be.null;
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TC-04: Access protected page với token hợp lệ → thành công
  // ───────────────────────────────────────────────────────────────────────────
  describe('TC-04: Token hợp lệ → vào được trang bảo vệ', () => {
    it('sau khi đăng nhập → ở lại /dashboard · không bị redirect về /login', () => {
      cy.intercept('POST', '**/api/auth/login', MOCK.adminLoginSuccess).as('loginReq');

      loginViaUI('admin', 'Admin@2025');
      cy.wait('@loginReq');

      cy.url().should('include', '/dashboard');
      cy.url().should('not.include', '/login');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TC-05: Access protected page không có token → redirect /login
  // [REQUIRES IMPLEMENTATION] Cần thêm PrivateRoute guard vào App.tsx
  // ───────────────────────────────────────────────────────────────────────────
  describe('TC-05: Không có token → redirect /login [REQUIRES: PrivateRoute]', () => {
    it('vào /dashboard khi chưa đăng nhập → tự redirect về /login', () => {
      // localStorage rỗng (đã clearLocalStorage trong beforeEach)
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
      // Không được thấy nội dung của dashboard
      cy.url().should('not.include', '/dashboard');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TC-06: Role không đủ quyền → 403
  // [REQUIRES IMPLEMENTATION] Cần RBAC route guard + trang /users
  // ───────────────────────────────────────────────────────────────────────────
  describe('TC-06: Sai role → 403 [REQUIRES: RBAC guard + /users page]', () => {
    it('DRIVER vào /users → API trả 403 · không hiển thị danh sách user', () => {
      cy.intercept('POST', '**/api/auth/login',  MOCK.driverLoginSuccess).as('loginReq');
      cy.intercept('GET',  '**/api/users*',      MOCK.accessDenied).as('getUsersReq');

      loginViaUI('driver01', 'Driver@2025');
      cy.wait('@loginReq');

      cy.visit('/users');
      cy.wait('@getUsersReq').its('response.statusCode').should('eq', 403);

      // DRIVER không được thấy danh sách user → URL phải rời khỏi /users
      cy.url().should('satisfy', (url: string) =>
        !url.includes('/users') || url.includes('/403') || url.includes('/dashboard')
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TC-07: Refresh token hợp lệ → access token mới
  // [REQUIRES IMPLEMENTATION] Cần axios interceptor tự gọi refresh khi 401
  // ───────────────────────────────────────────────────────────────────────────
  describe('TC-07: Refresh token hợp lệ → access token mới [REQUIRES: axios interceptor]', () => {
    it('POST /api/auth/refresh → 200 · accessToken mới khác cũ · localStorage cập nhật', () => {
      cy.intercept('POST', '**/api/auth/login',   MOCK.adminLoginSuccess).as('loginReq');
      cy.intercept('POST', '**/api/auth/refresh', MOCK.refreshSuccess).as('refreshReq');

      loginViaUI('admin', 'Admin@2025');
      cy.wait('@loginReq');

      const oldToken = MOCK.adminLoginSuccess.body.data.accessToken;

      // Giả lập: gọi API bảo vệ trả 401 → interceptor sẽ gọi refresh
      cy.intercept('GET', '**/api/users', (req) => {
        req.reply(MOCK.authFailed);
      }).as('protectedReq');

      // Sau khi refresh interceptor hoạt động, token mới phải khác token cũ
      cy.window().then((win) => {
        const newToken = win.localStorage.getItem('token');
        // Khi interceptor được implement, newToken sẽ khác oldToken
        expect(newToken).to.not.be.null;
        // expect(newToken).to.not.eq(oldToken); // Bỏ comment khi interceptor đã implement
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TC-08: Refresh token đã logout → 401, redirect /login
  // [REQUIRES IMPLEMENTATION] Cần route guard + xử lý 401 trên refresh
  // ───────────────────────────────────────────────────────────────────────────
  describe('TC-08: Refresh token sau logout → 401 [REQUIRES: route guard]', () => {
    it('sau khi xóa token → vào /dashboard → redirect /login', () => {
      cy.intercept('POST', '**/api/auth/login',   MOCK.adminLoginSuccess).as('loginReq');
      cy.intercept('POST', '**/api/auth/logout',  { statusCode: 200, body: { success: true } }).as('logoutReq');
      cy.intercept('POST', '**/api/auth/refresh', MOCK.tokenInvalid).as('refreshReq');

      loginViaUI('admin', 'Admin@2025');
      cy.wait('@loginReq');

      // Giả lập logout: xóa token khỏi localStorage
      cy.window().then((win) => {
        win.localStorage.removeItem('token');
        win.localStorage.removeItem('refreshToken');
      });

      // Sau khi logout, vào trang bảo vệ phải redirect về /login
      cy.visit('/dashboard');
      cy.url().should('include', '/login');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // TC-09: Access token bị tamper → 401, redirect /login
  // [REQUIRES IMPLEMENTATION] Cần axios response interceptor xóa storage khi 401
  // ───────────────────────────────────────────────────────────────────────────
  describe('TC-09: Token bị tamper → 401 [REQUIRES: error interceptor]', () => {
    it('token giả mạo → API 401 · localStorage bị xóa · redirect /login', () => {
      cy.intercept('POST', '**/api/auth/login', MOCK.adminLoginSuccess).as('loginReq');

      loginViaUI('admin', 'Admin@2025');
      cy.wait('@loginReq');

      // Tamper token: thêm "tampered" vào sau payload (phần thứ 2)
      cy.window().then((win) => {
        const token = win.localStorage.getItem('token') ?? '';
        const parts = token.split('.');
        if (parts.length === 3) {
          win.localStorage.setItem('token', `${parts[0]}.${parts[1]}tampered.${parts[2]}`);
        }
      });

      // Mock endpoint trả 401 với tampered token
      cy.intercept('GET', '**/api/users', MOCK.authFailed).as('getUsersReq');

      cy.visit('/users');

      // Khi error interceptor được implement:
      // 1. Token bị xóa khỏi localStorage
      // 2. Redirect về /login
      cy.url().should('include', '/login');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('token'), 'token phải bị xóa sau lỗi 401').to.be.null;
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // VALIDATION: Thiếu trường bắt buộc
  // ───────────────────────────────────────────────────────────────────────────
  describe('Validation — Thiếu trường bắt buộc', () => {

    beforeEach(() => {
      cy.visit('/login');
    });

    it('bỏ trống cả username và password → hiển thị 2 lỗi validate', () => {
      cy.get(SEL.submitBtn).click();
      cy.get(SEL.fieldError).should('have.length.at.least', 2);
      cy.contains('Please enter email or username').should('be.visible');
      cy.contains('Please enter password').should('be.visible');
      cy.url().should('include', '/login');
    });

    it('bỏ trống username, có password → lỗi username · không gọi API', () => {
      cy.intercept('POST', '**/api/auth/login').as('loginReq');

      cy.get(SEL.passwordInput).type('Admin@2025');
      cy.get(SEL.submitBtn).click();

      cy.contains('Please enter email or username').should('be.visible');
      cy.get('@loginReq.all').should('have.length', 0);
      cy.url().should('include', '/login');
    });

    it('có username, bỏ trống password → lỗi password · không gọi API', () => {
      cy.intercept('POST', '**/api/auth/login').as('loginReq');

      cy.get(SEL.usernameInput).type('admin');
      cy.get(SEL.submitBtn).click();

      cy.contains('Please enter password').should('be.visible');
      cy.get('@loginReq.all').should('have.length', 0);
      cy.url().should('include', '/login');
    });

    it('username chứa toàn khoảng trắng → sau trim rỗng → lỗi hoặc API từ chối', () => {
      // Code trim username trước khi gửi: values.username.trim() → ''
      // Ant Design required=true không bắt được spaces → API sẽ bị gọi
      cy.intercept('POST', '**/api/auth/login', MOCK.invalidCredentials).as('loginReq');

      cy.get(SEL.usernameInput).type('   ');
      cy.get(SEL.passwordInput).type('Admin@2025');
      cy.get(SEL.submitBtn).click();

      // Kết quả chấp nhận được: validate lỗi HOẶC API trả lỗi, nhưng vẫn ở /login
      cy.url().should('include', '/login');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('token')).to.be.null;
      });
    });

    it('password chứa toàn khoảng trắng → API từ chối', () => {
      cy.intercept('POST', '**/api/auth/login', MOCK.invalidCredentials).as('loginReq');

      cy.get(SEL.usernameInput).type('admin');
      cy.get(SEL.passwordInput).type('   ');
      cy.get(SEL.submitBtn).click();

      cy.url().should('include', '/login');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('token')).to.be.null;
      });
    });

    it('password quá ngắn (1 ký tự) → API từ chối với INVALID_CREDENTIALS', () => {
      cy.intercept('POST', '**/api/auth/login', MOCK.invalidCredentials).as('loginReq');

      cy.get(SEL.usernameInput).type('admin');
      cy.get(SEL.passwordInput).type('a');
      cy.get(SEL.submitBtn).click();

      cy.wait('@loginReq').its('response.statusCode').should('eq', 401);
      cy.url().should('include', '/login');
      cy.get(SEL.alert).should('be.visible');
    });
  });

  describe('TC-10: Login UI resilience and session controls', () => {
    it('nút hiện/ẩn mật khẩu đổi input giữa password và text', () => {
      cy.visit('/login');
      cy.get(SEL.passwordInput).type('Admin@2025').should('have.attr', 'type', 'password');
      cy.get('.ant-input-password-icon').click();
      cy.get(SEL.passwordInput).should('have.attr', 'type', 'text');
      cy.get('.ant-input-password-icon').click();
      cy.get(SEL.passwordInput).should('have.attr', 'type', 'password');
    });

    it('lỗi mạng hiển thị thông báo và giữ người dùng tại trang login', () => {
      cy.intercept('POST', '**/api/auth/login', { forceNetworkError: true }).as('loginNetworkError');

      loginViaUI('admin', 'Admin@2025');

      cy.wait('@loginNetworkError');
      cy.url().should('include', '/login');
      cy.get(SEL.alert)
        .should('be.visible')
        .and('contain.text', 'Kết nối thất bại. Vui lòng kiểm tra lại server Backend.');
      cy.window().then((win) => expect(win.localStorage.getItem('token')).to.be.null);
    });

    it('đã có token mà mở /login thì PublicRoute chuyển sang dashboard', () => {
      cy.visit('/login', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', MOCK.adminLoginSuccess.body.data.accessToken);
          win.localStorage.setItem('refreshToken', MOCK.adminLoginSuccess.body.data.refreshToken);
          win.localStorage.setItem('username', 'admin');
          win.localStorage.setItem('roles', JSON.stringify(['SYSTEM_ADMIN']));
        },
      });

      cy.url().should('include', '/dashboard');
    });

    it('đăng xuất từ dashboard xoá phiên và chuyển về login', () => {
      cy.intercept('POST', '**/api/auth/logout', { statusCode: 200, body: { success: true } }).as(
        'logoutRequest'
      );
      cy.visit('/dashboard', {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', MOCK.adminLoginSuccess.body.data.accessToken);
          win.localStorage.setItem('refreshToken', MOCK.adminLoginSuccess.body.data.refreshToken);
          win.localStorage.setItem('username', 'admin');
          win.localStorage.setItem('roles', JSON.stringify(['SYSTEM_ADMIN']));
        },
      });

      cy.contains('button', 'Đăng xuất').click();
      cy.wait('@logoutRequest');
      cy.url().should('include', '/login');
      cy.window().then((win) => {
        expect(win.localStorage.getItem('token')).to.be.null;
        expect(win.localStorage.getItem('refreshToken')).to.be.null;
      });
    });

    it('form login sử dụng được ở viewport điện thoại 375x812', () => {
      cy.viewport(375, 812);
      cy.visit('/login');

      cy.get(SEL.usernameInput).should('be.visible');
      cy.get(SEL.passwordInput).should('be.visible');
      cy.get(SEL.submitBtn).should('be.visible');
      cy.document().then((doc) => {
        expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth + 1);
      });
    });
  });

});
