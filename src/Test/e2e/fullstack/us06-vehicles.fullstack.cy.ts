import { loginWithRealBackend, resetE2EState } from '../support/testHelpers';

describe('FULLSTACK US-06 — Vehicle Management', () => {
  beforeEach(resetE2EState);
  afterEach(resetE2EState);

  it('FS-06-01: admin thật tải vehicle list và fleet capacity', () => {
    loginWithRealBackend();
    cy.intercept('GET', '**/api/v1/vehicles*').as('getVehicles');
    cy.visit('/vehicles');
    cy.wait('@getVehicles').its('response.statusCode').should('eq', 200);
    cy.contains('Quản lý đội xe').should('be.visible');
    cy.get('table tbody tr').should('have.length.greaterThan', 0);
    cy.get('.ant-alert-error').should('not.exist');
  });
});
