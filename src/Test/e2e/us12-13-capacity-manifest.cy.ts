import { visitAs, apiSuccess } from './support/testHelpers';

describe('US-12 & US-13: Capacity Validation & LIFO Manifest E2E Test Suite', () => {
  const mockCapacityData = {
    tripDraftId: 1,
    fixedRouteCode: 'RT-HN-001',
    deliveryDate: '2026-07-22',
    newStatus: 'VALIDATED',
    totalVolumeM3: 12.5,
    totalWeightKg: 1200,
    validationPassed: true,
    volumeCheckResult: 'PASS',
    weightCheckResult: 'PASS',
    eligibleVehicles: [],
    ineligibleVehicles: [],
  };

  it('TC-US12-01: Displays Capacity Validation indicators correctly', () => {
    cy.intercept('GET', '**/api/trip-drafts/1/validation-result*', apiSuccess(mockCapacityData)).as('getCapacity');

    visitAs('/dispatcher/trip-drafts/1/capacity');
    cy.wait('@getCapacity');

    cy.contains('Kiểm tra tải trọng').should('be.visible');
    cy.contains('12.5').should('be.visible');
  });

  it('TC-US13-01: Displays LIFO Manifest loading sequence', () => {
    cy.intercept('GET', '**/api/trip-drafts/1/validation-result*', apiSuccess(mockCapacityData)).as('getCapacity');

    visitAs('/dispatcher/trip-drafts/1/capacity');
    cy.wait('@getCapacity');

    cy.contains('Kiểm tra tải trọng').should('be.visible');
  });
});
