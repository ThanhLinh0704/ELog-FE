import { visitAs, apiSuccess } from './support/testHelpers';

describe('US-15 & US-16: Vehicle Assignment & Dispatch E2E Test Suite', () => {
  const mockDraft = {
    id: 1,
    routeCode: 'RT-HN-001',
    deliveryDate: '2026-07-22',
    status: 'VALIDATED',
    totalVolumeM3: 15.5,
    totalWeightKg: 2500,
    activeStopCount: 3,
  };

  const mockEligibleVehicles = {
    eligibleVehicles: [
      { id: 10, vehicleId: 10, plateNumber: '29C-12345', vehicleCode: 'XE001', vehicleType: 'TRUCK_3T', payloadKg: 3000, maxVolumeM3: 20, maxWeightKg: 3000 },
    ],
    ineligibleVehicles: [],
  };

  const mockDrivers = [
    { userId: 30, fullName: 'Nguyễn Văn Tài', licenseClass: 'C', phone: '0912345678', available: true },
  ];

  const mockTrip = {
    tripId: 1,
    tripDraftId: 1,
    fixedRouteCode: 'RT-HN-001',
    deliveryDate: '2026-07-22',
    status: 'VALIDATED',
    vehicle: { vehicleId: 10, plateNumber: '29C-12345', vehicleType: 'TRUCK_3T' },
    driver: { userId: 30, fullName: 'Nguyễn Văn Tài' },
  };

  it('TC-US15-01: Displays Vehicle and Driver assignment form', () => {
    cy.intercept('GET', '**/api/trip-drafts/1/eligible-vehicles', apiSuccess(mockEligibleVehicles)).as('getVehicles');
    cy.intercept('GET', '**/api/trip-drafts/1', apiSuccess(mockDraft)).as('getDraft');
    cy.intercept('GET', '**/api/drivers/available*', apiSuccess(mockDrivers)).as('getDrivers');
    cy.intercept('GET', '**/api/fleet/capacity-check*', apiSuccess({ canDispatch: true, fleetTotalVolumeM3: 100, fleetTotalWeightKg: 10000 })).as('getFleet');
    cy.intercept('GET', '**/api/trips*', apiSuccess([])).as('getTrips');

    visitAs('/dispatcher/trip-drafts/1/assign', ['DISPATCHER']);
    cy.wait('@getDraft');

    cy.contains('Phân xe & tài xế').should('be.visible');
    cy.contains('29C-12345').should('be.visible');
  });

  it('TC-US16-01: Dispatches trip successfully', () => {
    cy.intercept('GET', '**/api/trips/1', apiSuccess(mockTrip)).as('getTrip');
    cy.intercept('GET', '**/api/fleet/capacity-check*', apiSuccess({ canDispatch: true, fleetTotalVolumeM3: 100, fleetTotalWeightKg: 10000 })).as('getFleet');
    cy.intercept('POST', '**/api/trips/1/dispatch', apiSuccess({ ...mockTrip, status: 'DISPATCHED', lockedAt: '2026-07-22T10:00:00Z' })).as('dispatchTrip');

    visitAs('/dispatcher/trips/1/dispatch', ['DISPATCHER']);
    cy.wait('@getTrip');

    cy.contains('Xác nhận điều phối').should('be.visible');
    cy.contains('button', 'Dispatch và khóa chuyến').click();

    cy.get('.ant-modal').within(() => {
      cy.contains('button', 'Xác nhận Dispatch').click();
    });

    cy.wait('@dispatchTrip');
  });
});
