import { loginWithRealBackend, resetE2EState } from '../support/testHelpers';

describe('FULLSTACK US-03 — User Management', () => {
  beforeEach(resetE2EState);
  afterEach(resetE2EState);

  it('FS-03-01: admin thật tải được danh sách user từ backend', () => {
    loginWithRealBackend();
    cy.visit('/users');
    cy.contains('h2', 'Quản lý người dùng').should('be.visible');
    cy.contains('admin').should('be.visible');
    cy.get('.ant-alert-error').should('not.exist');
  });
});
