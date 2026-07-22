export type TestRole =
  | 'SYSTEM_ADMIN'
  | 'DISPATCHER'
  | 'LOGISTICS_MANAGER'
  | 'WAREHOUSE_STAFF'
  | 'DRIVER';

export function visitAs(
  path: string,
  roles: TestRole[] = ['SYSTEM_ADMIN'],
  username = 'admin'
) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('token', `mock-e2e-token-${username}`);
      win.localStorage.setItem('refreshToken', `mock-e2e-refresh-${username}`);
      win.localStorage.setItem('username', username);
      win.localStorage.setItem('userId', username === 'admin' ? '1' : '99');
      win.localStorage.setItem('roles', JSON.stringify(roles));
    },
  });
}

export function loginWithRealBackend() {
  const username = String(Cypress.env('E2E_ADMIN_USERNAME') ?? '').trim();
  const password = String(Cypress.env('E2E_ADMIN_PASSWORD') ?? '');

  if (!username || !password) {
    throw new Error(
      'Full-stack E2E requires E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD Cypress environment variables.'
    );
  }

  resetE2EState();
  cy.visit('/login');
  cy.get('input[placeholder="Enter your email or username"]').type(username, { log: false });
  cy.get('input[placeholder="Enter your password"]').type(password, { log: false });
  cy.contains('button', 'Sign In').click();
  cy.url().should('include', '/dashboard');
  cy.window().then((win) => {
    expect(win.localStorage.getItem('token')).to.be.a('string').and.not.be.empty;
    expect(win.localStorage.getItem('refreshToken')).to.be.a('string').and.not.be.empty;
  });
}

export function resetE2EState() {
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.window({ log: false }).then((win) => {
    win.sessionStorage.clear();
  });
}

export function apiSuccess<T>(
  data: T,
  pagination?: {
    page?: number;
    size?: number;
    totalElements?: number;
    totalPages?: number;
  }
) {
  return {
    statusCode: 200,
    body: {
      success: true,
      data,
      ...(pagination ? { pagination } : {}),
    },
  };
}

export function apiError(
  statusCode: number,
  code: string,
  message: string,
  field?: string
) {
  return {
    statusCode,
    body: {
      success: false,
      error: {
        code,
        message,
        ...(field ? { field } : {}),
      },
    },
  };
}

export function confirmPopconfirm() {
  cy.get('.ant-popover:visible')
    .last()
    .within(() => {
      cy.contains('button', 'Đồng ý').click();
    });
}

export function selectAntOption(optionText: string) {
  cy.contains('[role="option"], .ant-select-item-option-content', optionText).click({
    force: true,
  });
  cy.get('body').type('{esc}');
  cy.get('.ant-select-dropdown:visible').should('not.exist');
}
