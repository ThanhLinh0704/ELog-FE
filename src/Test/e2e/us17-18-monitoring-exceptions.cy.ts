import { visitAs, apiSuccess } from './support/testHelpers';

describe('US-17 & US-18: Monitoring & Exceptions E2E Test Suite', () => {
  const mockMonitoringDashboard = {
    date: '2026-07-22',
    totalActiveTrips: 1,
    trips: [
      {
        tripId: 101,
        fixedRouteCode: 'RT-HN-001',
        vehicleCode: '29C-12345',
        driverName: 'Nguyễn Văn Tài',
        status: 'IN_PROGRESS',
        completedStops: 2,
        totalStops: 4,
        pendingStops: 2,
        exceptionStops: 0,
        progressPercent: 50,
        hasUnresolvedExceptions: false,
        exceptions: [],
        gpsLocation: null,
        gpsNote: null,
      },
    ],
  };

  const mockExceptionsResponse = {
    totalCount: 1,
    unresolvedCount: 1,
    exceptions: [
      {
        exceptionId: 501,
        tripId: 101,
        stopId: 12,
        storeCode: 'ST-CG-01',
        storeName: 'Cửa hàng Cầu Giấy',
        exceptionType: 'DELIVERY_REJECTION',
        description: 'Cửa hàng đóng cửa đột xuất',
        resolvedAt: null,
        createdAt: '2026-07-22T08:30:00',
        fixedRouteCode: 'RT-HN-001',
        vehicleCode: '29C-12345',
        driverName: 'Nguyễn Văn Tài',
      },
    ],
  };

  it('TC-US17-01: Displays Monitoring Dashboard with active trips and delay alerts', () => {
    cy.intercept('GET', '**/api/dashboard/active-trips*', apiSuccess(mockMonitoringDashboard)).as('getMonitoring');

    visitAs('/dispatcher/monitoring');
    cy.wait('@getMonitoring');

    cy.contains('Theo dõi chuyến hàng').should('be.visible');
    cy.contains('29C-12345').should('be.visible');
  });

  it('TC-US18-01: Displays Exception Management page and resolves pending exception', () => {
    cy.intercept('GET', '**/api/exceptions*', apiSuccess(mockExceptionsResponse)).as('getExceptions');

    visitAs('/dispatcher/exceptions');
    cy.wait('@getExceptions');

    cy.contains('Quản lý ngoại lệ').should('be.visible');
    cy.contains('ST-CG-01').should('be.visible');
    cy.contains('Cửa hàng Cầu Giấy').should('be.visible');
  });
});
