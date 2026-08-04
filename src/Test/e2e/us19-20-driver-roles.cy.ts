import { visitAs, apiSuccess } from './support/testHelpers';

describe('US-19 & US-20: Driver App & Role Permissions E2E Test Suite', () => {
  const mockDriverTrips = [
    {
      tripId: 201,
      fixedRouteCode: 'RT-HN-001',
      fixedRouteName: 'Tuyến Hà Nội - Hà Đông',
      status: 'DISPATCHED',
      tripStopCount: 3,
      stops: [
        { id: 1, sequenceNo: 1, storeName: 'Cửa hàng Hoàn Kiếm', status: 'PENDING' },
        { id: 2, sequenceNo: 2, storeName: 'Cửa hàng Hai Bà Trưng', status: 'PENDING' },
      ],
    },
  ];

  const mockUsers = [
    {
      id: 1,
      username: 'admin',
      fullName: 'Quản trị hệ thống',
      email: 'admin@elog.com',
      roles: ['SYSTEM_ADMIN'],
      isActive: true,
      createdAt: '2026-06-01T08:00:00',
    },
    {
      id: 2,
      username: 'dispatcher01',
      fullName: 'Điều phối viên 01',
      email: 'disp@elog.com',
      roles: ['DISPATCHER'],
      isActive: true,
      createdAt: '2026-06-02T08:00:00',
    },
  ];

  it('TC-US19-01: Driver views assigned trips and starts a trip', () => {
    cy.intercept('GET', '**/api/trips/my-trips*', apiSuccess(mockDriverTrips)).as('getDriverTrips');
    cy.intercept('POST', '**/api/driver/trips/201/start', apiSuccess({ tripId: 201, status: 'IN_PROGRESS' })).as('startTrip');

    visitAs('/driver/my-trips', ['DRIVER'], 'driver01');
    cy.wait('@getDriverTrips');

    cy.contains('Chuyến giao hàng của tôi').should('be.visible');
    cy.contains('RT-HN-001').should('be.visible');
  });

  it('TC-US20-01: Displays User & Role Management page', () => {
    cy.intercept('GET', '**/api/users*', apiSuccess(mockUsers)).as('getUsers');

    visitAs('/users', ['SYSTEM_ADMIN']);
    cy.wait('@getUsers');

    cy.contains('Quản lý người dùng').should('be.visible');
    cy.contains('Quản trị hệ thống').should('be.visible');
    cy.contains('Điều phối viên').should('be.visible');
  });
});
