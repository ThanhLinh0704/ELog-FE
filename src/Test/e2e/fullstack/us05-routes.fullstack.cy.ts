import { loginWithRealBackend, resetE2EState } from '../support/testHelpers';

describe('FULLSTACK US-05 — Route Management', () => {
  beforeEach(resetE2EState);
  afterEach(resetE2EState);

  it('FS-05-01: admin thật tải route list và mở được route detail', () => {
    loginWithRealBackend();
    cy.intercept('GET', '**/api/v1/routes*').as('getRoutes');
    cy.visit('/admin/routes');
    cy.wait('@getRoutes').its('response.statusCode').should('eq', 200);
    cy.contains('Quản lý tuyến').should('be.visible');
    cy.get('table tbody a').first().click();
    cy.contains('Chọn tuyến để xem & điều chỉnh').should('be.visible');
    cy.get('.leaflet-container').should('be.visible');
    cy.get('body').should('not.contain.text', 'Something went wrong');
  });
});
