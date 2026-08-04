export type TestRole =
  | 'SYSTEM_ADMIN'
  | 'DISPATCHER'
  | 'LOGISTICS_MANAGER'
  | 'WAREHOUSE_STAFF'
  | 'DRIVER';

export function getPermissionsForRoles(roles: TestRole[]): string[] {
  if (roles.includes('SYSTEM_ADMIN')) {
    return [
      'user:read', 'user:write', 'role:read', 'role:write',
      'store:read', 'store:write', 'vehicle:read', 'vehicle:write',
      'route:read', 'route:write', 'product:read', 'product:write',
      'order:import', 'trip:read', 'trip:write', 'trip:confirm',
      'trip:coordinate', 'trip:execute'
    ];
  }
  const perms = new Set<string>();
  if (roles.includes('DISPATCHER')) {
    ['route:read', 'user:read', 'store:read', 'vehicle:read', 'product:read', 'order:import', 'trip:read', 'trip:write', 'trip:confirm', 'trip:coordinate'].forEach(p => perms.add(p));
  }
  if (roles.includes('LOGISTICS_MANAGER')) {
    ['route:read', 'route:write', 'user:read', 'store:read', 'store:write', 'vehicle:read', 'vehicle:write', 'product:read', 'product:write', 'order:import', 'trip:read', 'trip:write', 'trip:confirm', 'trip:coordinate'].forEach(p => perms.add(p));
  }
  if (roles.includes('WAREHOUSE_STAFF')) {
    ['order:import', 'product:read', 'store:read'].forEach(p => perms.add(p));
  }
  if (roles.includes('DRIVER')) {
    ['trip:read', 'trip:execute'].forEach(p => perms.add(p));
  }
  return Array.from(perms);
}

export function ensureLoggedInSession(
  roles: TestRole[] = ['SYSTEM_ADMIN'],
  username = 'admin'
) {
  cy.window().then((win) => {
    win.localStorage.setItem('accessToken', `mock-e2e-token-${username}`);
    win.localStorage.setItem('token', `mock-e2e-token-${username}`);
    win.localStorage.setItem('refreshToken', `mock-e2e-refresh-${username}`);
    win.localStorage.setItem('username', username);
    win.localStorage.setItem('userId', username === 'admin' ? '1' : '99');
    win.localStorage.setItem('roles', JSON.stringify(roles));
    win.localStorage.setItem('permissions', JSON.stringify(getPermissionsForRoles(roles)));
  });
}

export function visitAs(
  path: string,
  roles: TestRole[] = ['SYSTEM_ADMIN'],
  username = 'admin'
) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem('accessToken', `mock-e2e-token-${username}`);
      win.localStorage.setItem('token', `mock-e2e-token-${username}`);
      win.localStorage.setItem('refreshToken', `mock-e2e-refresh-${username}`);
      win.localStorage.setItem('username', username);
      win.localStorage.setItem('userId', username === 'admin' ? '1' : '99');
      win.localStorage.setItem('roles', JSON.stringify(roles));
      win.localStorage.setItem('permissions', JSON.stringify(getPermissionsForRoles(roles)));
    },
  });

  // Fallback: If redirected to login page due to race condition, re-ensure session and re-visit path
  cy.url().then((url) => {
    if (url.includes('/login') && !path.includes('/login')) {
      ensureLoggedInSession(roles, username);
      cy.visit(path);
    }
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
}
