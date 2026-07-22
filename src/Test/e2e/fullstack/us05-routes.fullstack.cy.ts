import { loginWithRealBackend, resetE2EState } from '../support/testHelpers';

describe('FULLSTACK US-05 — Route Management', () => {
  beforeEach(resetE2EState);
  afterEach(resetE2EState);

  it('FS-05-01: admin thật tải route list và mở được route detail', () => {
    loginWithRealBackend();
    cy.visit('/admin/routes');
    cy.contains('h2', 'Quản lý tuyến').should('be.visible');
    cy.contains('a', 'RT-001').click();
    cy.url().should('match', /\/admin\/routes\/\d+$/);
    cy.contains('Thông tin tuyến').should('be.visible');
  });
});
