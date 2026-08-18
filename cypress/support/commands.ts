/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      loginAs(username?: string, role?: 'ADMIN' | 'DISPATCHER' | 'DRIVER'): Chainable<void>;
      visitWithAuth(url: string, username?: string, role?: 'ADMIN' | 'DISPATCHER' | 'DRIVER'): Chainable<void>;
    }
  }
}

const ALL_PERMS = [
  'user:read', 'user:write', 'role:read', 'role:write',
  'route:read', 'route:write', 'store:read', 'store:write',
  'vehicle:read', 'vehicle:write', 'product:read', 'product:write',
  'driver:read', 'driver:write',
  'order:import',
  'trip:read', 'trip:write', 'trip:confirm', 'trip:coordinate', 'trip:execute',
  'kpi:read', 'planning-history:read'
];

const waitForUatStepDelay = () => {
  cy.env(['UAT_STEP_DELAY_MS']).then((envValues) => {
    const rawDelay = envValues?.UAT_STEP_DELAY_MS;
    const delayMs = Number(rawDelay || 0);
    if (delayMs > 0) {
      cy.wait(delayMs, { log: false });
    }
  });
};


Cypress.Commands.add('loginAs', (username = 'dispatcher01', role = 'DISPATCHER') => {
  cy.window().then((win) => {
    const roles = role === 'ADMIN' ? ['ROLE_ADMIN', 'ADMIN', 'ROLE_DISPATCHER', 'DISPATCHER']
      : role === 'DRIVER' ? ['ROLE_DRIVER', 'DRIVER']
      : ['ROLE_DISPATCHER', 'DISPATCHER'];
    
    const perms = role === 'DRIVER' ? [] : ALL_PERMS;

    win.localStorage.setItem('remember', 'true');
    win.localStorage.setItem('accessToken', 'mock-uat-jwt-token');
    win.localStorage.setItem('token', 'mock-uat-jwt-token');
    win.localStorage.setItem('refreshToken', 'mock-uat-refresh-token');
    win.localStorage.setItem('userId', role === 'ADMIN' ? '1' : role === 'DRIVER' ? '2' : '3');
    win.localStorage.setItem('username', username);
    win.localStorage.setItem('roles', JSON.stringify(roles));
    win.localStorage.setItem('permissions', JSON.stringify(perms));
  });
});

Cypress.Commands.add('visitWithAuth', (url: string, username = 'dispatcher01', role = 'DISPATCHER') => {
  const roles = role === 'ADMIN' ? ['ROLE_ADMIN', 'ADMIN', 'ROLE_DISPATCHER', 'DISPATCHER']
    : role === 'DRIVER' ? ['ROLE_DRIVER', 'DRIVER']
    : ['ROLE_DISPATCHER', 'DISPATCHER'];
  const perms = role === 'DRIVER' ? [] : ALL_PERMS;

  cy.visit(url, {
    onBeforeLoad(win) {
      win.localStorage.setItem('remember', 'true');
      win.localStorage.setItem('accessToken', 'mock-uat-jwt-token');
      win.localStorage.setItem('token', 'mock-uat-jwt-token');
      win.localStorage.setItem('refreshToken', 'mock-uat-refresh-token');
      win.localStorage.setItem('userId', role === 'ADMIN' ? '1' : role === 'DRIVER' ? '2' : '3');
      win.localStorage.setItem('username', username);
      win.localStorage.setItem('roles', JSON.stringify(roles));
      win.localStorage.setItem('permissions', JSON.stringify(perms));
    },
    failOnStatusCode: false
  });

  waitForUatStepDelay();
});
