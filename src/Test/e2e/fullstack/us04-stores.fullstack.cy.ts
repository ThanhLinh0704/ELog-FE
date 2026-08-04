import { loginWithRealBackend, resetE2EState } from '../support/testHelpers';

describe('FULLSTACK US-04 — Store Management', () => {
  beforeEach(resetE2EState);
  afterEach(resetE2EState);

  it('FS-04-01: admin thật tải được Store Management và dữ liệu GPS', () => {
    loginWithRealBackend();
    cy.visit('/stores');
    cy.contains('h2', 'Quản lý cửa hàng').should('be.visible');
    cy.contains('Thiếu toạ độ GPS').should('be.visible');
    cy.get('.ant-alert-error').should('not.exist');
  });
});
