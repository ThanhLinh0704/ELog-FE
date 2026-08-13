import { loginWithRealBackend, resetE2EState } from '../support/testHelpers';

describe('FULLSTACK US-04 — Store Management', () => {
  beforeEach(resetE2EState);
  afterEach(resetE2EState);

  it('FS-04-01: admin thật tải được Store Management và dữ liệu GPS', () => {
    loginWithRealBackend();
    cy.intercept('GET', '**/api/v1/stores*').as('getStores');
    cy.visit('/stores');
    cy.wait('@getStores').its('response.statusCode').should('eq', 200);
    cy.contains('Quản lý cửa hàng').should('be.visible');
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
    cy.get('.ant-alert-error').should('not.exist');
  });
});
