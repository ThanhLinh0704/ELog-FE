import { loginWithRealBackend, resetE2EState } from '../support/testHelpers';

describe('FULLSTACK US-06 — Vehicle Management', () => {
  beforeEach(resetE2EState);
  afterEach(resetE2EState);

  it('FS-06-01: admin thật tải vehicle list và fleet capacity', () => {
    loginWithRealBackend();
    cy.visit('/vehicles');
    cy.contains('h2', 'Quản lý đội xe').should('be.visible');
    cy.contains('Đội xe đang hoạt động').should('be.visible');
    cy.contains('Tổng tải trọng').should('be.visible');
    cy.get('.ant-alert-error').should('not.exist');
  });
});
