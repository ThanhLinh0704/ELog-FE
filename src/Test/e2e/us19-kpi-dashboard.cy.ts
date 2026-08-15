import { login } from './support/testHelpers';

describe('US-19 KPI Dashboard & Route Tracking', () => {
  beforeEach(() => {
    // Admin usually has access to KPI
    login('admin', 'Admin@2025');
  });

  it('TS-19-01: Admin can access KPI Dashboard and view aggregated metrics', () => {
    // 1. Go to KPI Dashboard
    cy.get('[data-test="nav-kpi-dashboard"]').click();
    cy.url().should('include', '/dashboard'); // or /kpi, assuming /dashboard

    // 2. Assert KPI summary cards are rendered
    cy.get('[data-test="kpi-card-on-time"]').should('exist').and('contain.text', '%');
    cy.get('[data-test="kpi-card-volume-utilization"]').should('exist');
    cy.get('[data-test="kpi-card-trip-completion"]').should('exist');
    cy.get('[data-test="kpi-card-exceptions"]').should('exist');

    // 3. Select a date range
    cy.get('[data-test="kpi-date-range-picker"]').should('exist').click();
    // (mocking selection for past 7 days)
    cy.get('.ant-picker-cell-today').first().click();

    // 4. Verify charts are rendered
    cy.get('[data-test="kpi-chart-daily-trend"]').should('be.visible');
    cy.get('[data-test="kpi-table-by-route"]').should('be.visible');
  });

  it('TS-19-02: Dispatcher can track a trip on GPS Map with moving vehicle', () => {
    // Re-login as dispatcher
    cy.get('[data-test="btn-logout"]').click();
    login('dispatcher', 'Dev@2025');

    // 1. Go to trip monitoring
    cy.get('[data-test="nav-trips-monitoring"]').click();
    
    // 2. Select the first IN_PROGRESS trip
    cy.get('[data-test="trip-row-IN_PROGRESS"]').first().find('[data-test="btn-trip-detail"]').click();

    // 3. View GPS Route Map tab
    cy.get('[data-test="tab-gps-map"]').click();

    // 4. Verify map rendering and truck marker
    cy.get('[data-test="map-container"]').should('be.visible');
    cy.get('[data-test="truck-marker"]').should('exist');

    // 5. Assert the simulation controls exist (since commit mentions route simulation)
    cy.get('[data-test="btn-simulate-movement"]').should('exist');
  });
});
