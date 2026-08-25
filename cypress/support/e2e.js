// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

const api = (data, message = 'OK') => ({
  success: true,
  data,
  message,
});

const tripDraft = (id, status = 'VALIDATED') => ({
  id,
  routeId: 1,
  routeCode: 'RT-01',
  deliveryDate: '2026-08-16',
  totalVolumeM3: 4.5,
  totalWeightKg: 1200,
  activeStopCount: 3,
  skippedStopCount: 0,
  status,
  plannedDepartureTime: '08:00:00',
  stops: [
    {
      tripDraftStopId: 1,
      id: 1,
      sequenceNo: 1,
      sequence: 1,
      storeId: 101,
      storeCode: 'KH0002',
      storeName: 'Cua hang Dong Anh 1',
      isActive: true,
      orderCount: 3,
      plannedEta: '08:45:00',
      eta: '08:45:00',
      stopWeightKg: 450,
      stopVolumeM3: 1.5,
    },
    {
      tripDraftStopId: 2,
      id: 2,
      sequenceNo: 2,
      sequence: 2,
      storeId: 102,
      storeCode: 'KH0003',
      storeName: 'Cua hang Dong Anh 2',
      isActive: true,
      orderCount: 4,
      plannedEta: '09:30:00',
      eta: '09:30:00',
      stopWeightKg: 750,
      stopVolumeM3: 3,
    },
  ],
});

const capacityResult = (tripDraftId) => ({
  tripDraftId,
  fixedRouteCode: 'RT-01',
  deliveryDate: '2026-08-16',
  newStatus: 'VALIDATED',
  totalVolumeM3: 4.5,
  totalWeightKg: 1200,
  validationPassed: true,
  volumeCheckResult: 'PASS',
  weightCheckResult: 'PASS',
  eligibleVehicles: [
    {
      vehicleId: 1,
      plateNumber: '29A-12345',
      vehicleType: 'TRUCK_2_5T',
      maxVolumeM3: 10,
      maxWeightKg: 2500,
      remainingVolumeM3: 5.5,
      remainingWeightKg: 1300,
    },
  ],
  ineligibleVehicles: [],
  validatedAt: '2026-08-16T08:20:00Z',
  validatedBy: { userId: 3, fullName: 'dispatcher01' },
  message: 'Capacity validation passed',
});

const trip = (status = 'VALIDATED') => ({
  tripId: 100,
  tripDraftId: 105,
  fixedRouteCode: 'RT-01',
  deliveryDate: '2026-08-16',
  status,
  vehicle: { vehicleId: 1, plateNumber: '29A-12345', vehicleType: 'TRUCK_2_5T' },
  driver: { userId: 10, fullName: 'Le Van Driver' },
  totalWeightKg: 1200,
  totalVolumeM3: 4.5,
  plannedDepartureTime: '08:00:00',
  lockedAt: status === 'VALIDATED' ? null : '2026-08-16T07:50:00Z',
  lockedBy: status === 'VALIDATED' ? null : { userId: 3, fullName: 'dispatcher01' },
  tripStopCount: 2,
  manifestId: 700,
  tripStops: [
    {
      tripStopId: 1001,
      routeStopId: 1,
      tripDraftStopId: 1,
      sequenceOrder: 1,
      storeCode: 'KH0002',
      storeName: 'Cua hang Dong Anh 1',
      plannedEta: '2026-08-16T08:45:00Z',
      status: 'PENDING',
      stopWeightKg: 450,
      stopVolumeM3: 1.5,
    },
    {
      tripStopId: 1002,
      routeStopId: 2,
      tripDraftStopId: 2,
      sequenceOrder: 2,
      storeCode: 'KH0003',
      storeName: 'Cua hang Dong Anh 2',
      plannedEta: '2026-08-16T09:30:00Z',
      status: 'PENDING',
      stopWeightKg: 750,
      stopVolumeM3: 3,
    },
  ],
});

const manifest = {
  manifestId: 700,
  tripDraftId: 105,
  tripId: 100,
  manifestCode: 'MF-100',
  fixedRouteCode: 'RT-01',
  deliveryDate: '2026-08-16',
  status: 'GENERATED',
  generatedAt: '2026-08-16T07:30:00Z',
  generatedBy: { userId: 3, fullName: 'dispatcher01' },
  vehicle: { vehicleId: 1, plateNumber: '29A-12345', vehicleType: 'TRUCK_2_5T' },
  driver: { userId: 10, fullName: 'Le Van Driver' },
  totalLines: 2,
  totalWeightKg: 1200,
  totalVolumeM3: 4.5,
  summary: {
    activeStopCount: 2,
    orderCount: 7,
    itemCount: 2,
    packageCount: 7,
    totalWeightKg: 1200,
    totalVolumeM3: 4.5,
    weightUtilizationPercent: 48,
    volumeUtilizationPercent: 45,
  },
  lines: [
    {
      manifestItemId: 1,
      lifoSequence: 1,
      stopSequenceNo: 2,
      storeCode: 'KH0003',
      storeName: 'Cua hang Dong Anh 2',
      orderCode: 'DH-1608-002',
      productCode: 'SKU-002',
      productName: 'San pham B',
      quantity: 4,
      lineWeightKg: 750,
      lineVolumeM3: 3,
      loadingStatus: 'PENDING',
    },
    {
      manifestItemId: 2,
      lifoSequence: 2,
      stopSequenceNo: 1,
      storeCode: 'KH0002',
      storeName: 'Cua hang Dong Anh 1',
      orderCode: 'DH-1608-001',
      productCode: 'SKU-001',
      productName: 'San pham A',
      quantity: 3,
      lineWeightKg: 450,
      lineVolumeM3: 1.5,
      loadingStatus: 'PENDING',
    },
  ],
  stops: [
    {
      stopId: 1002,
      stopSequenceNo: 2,
      storeCode: 'KH0003',
      storeName: 'Cua hang Dong Anh 2',
      orderCount: 4,
      itemCount: 1,
      totalWeightKg: 750,
      totalVolumeM3: 3,
      items: [],
    },
    {
      stopId: 1001,
      stopSequenceNo: 1,
      storeCode: 'KH0002',
      storeName: 'Cua hang Dong Anh 1',
      orderCount: 3,
      itemCount: 1,
      totalWeightKg: 450,
      totalVolumeM3: 1.5,
      items: [],
    },
  ],
};

beforeEach(() => {
  cy.intercept('POST', '**/api/auth/refresh', {
    statusCode: 200,
    body: api({
      accessToken: 'mock-uat-jwt-token',
      refreshToken: 'mock-uat-refresh-token',
      user: {
        userId: 3,
        username: 'dispatcher01',
        roles: ['ROLE_DISPATCHER', 'DISPATCHER'],
        permissions: ['trip:read', 'trip:write', 'trip:coordinate', 'order:import'],
      },
    }),
  });
  cy.intercept('POST', '**/api/v1/auth/refresh', {
    statusCode: 200,
    body: api({
      accessToken: 'mock-uat-jwt-token',
      refreshToken: 'mock-uat-refresh-token',
    }),
  });

  cy.intercept('GET', '**/api/v1/imports?*', {
    statusCode: 200,
    body: {
      success: true,
      data: [
        {
          batchId: 101,
          deliveryDate: '2026-08-16',
          fileName: 'mau_import_150_don_hang_3_ngay.xlsx',
          uploadedBy: 'dispatcher01',
          totalRows: 50,
          acceptedRows: 50,
          rejectedRows: 0,
          ordersCreated: 50,
          isActive: true,
          createdAt: '2026-08-16T08:00:00Z',
        },
      ],
      pagination: { page: 0, size: 10, totalElements: 1, totalPages: 1 },
    },
  });
  cy.intercept('GET', '**/api/v1/imports/102/errors*', {
    statusCode: 200,
    body: {
      success: true,
      data: [
        { rowNumber: 11, orderCode: 'DH-1608-011', errorCode: 'STORE_NOT_FOUND', fieldName: 'storeCode', errorReason: 'Store STR-999 not found in master data', rawData: 'STR-999' },
        { rowNumber: 12, orderCode: 'DH-1608-012', errorCode: 'INVALID_QUANTITY', fieldName: 'quantity', errorReason: 'Quantity must be greater than zero', rawData: '-1' },
      ],
      pagination: { page: 0, size: 20, totalElements: 2, totalPages: 1 },
    },
  });
  cy.intercept('GET', '**/api/v1/imports/102', {
    statusCode: 200,
    body: api({
      batchId: 102,
      deliveryDate: '2026-08-16',
      fileName: 'uat_partial_validation.xlsx',
      totalRows: 12,
      acceptedRows: 10,
      rejectedRows: 2,
      ordersCreated: 10,
      isActive: false,
      createdAt: '2026-08-16T08:10:00Z',
    }),
  });
  cy.intercept('POST', '**/api/v1/imports*', {
    statusCode: 201,
    body: api({
      batchId: 101,
      deliveryDate: '2026-08-16',
      fileName: 'mau_import_150_don_hang_3_ngay.xlsx',
      totalRows: 50,
      acceptedRows: 50,
      rejectedRows: 0,
      ordersCreated: 50,
    }),
  });

  cy.intercept('GET', '**/api/v1/trip-drafts?*', {
    statusCode: 200,
    body: {
      success: true,
      data: [tripDraft(101), tripDraft(102), tripDraft(105)],
      pagination: { page: 0, size: 10, totalElements: 3, totalPages: 1 },
    },
  });
  cy.intercept('GET', '**/api/v1/trip-drafts/*/validation-result', (req) => {
    const id = Number(req.url.match(/trip-drafts\/(\d+)/)?.[1] ?? 102);
    req.reply({ statusCode: 200, body: api(capacityResult(id)) });
  });
  cy.intercept('POST', '**/api/v1/trip-drafts/*/validate-capacity', (req) => {
    const id = Number(req.url.match(/trip-drafts\/(\d+)/)?.[1] ?? 102);
    req.reply({ statusCode: 200, body: api(capacityResult(id)) });
  });
  cy.intercept('GET', '**/api/v1/trip-drafts/*/eligible-vehicles*', {
    statusCode: 200,
    body: api({
      eligibleVehicles: [
        {
          vehicleId: 1,
          plateNumber: '29A-12345',
          vehicleType: 'TRUCK_2_5T',
          maxVolumeM3: 10,
          payloadKg: 2500,
          remainingVolumeM3: 5.5,
          remainingWeightKg: 1300,
          assignedDriverId: 10,
          assignedDriverName: 'Le Van Driver',
          assignedDriverAvailable: true,
        },
      ],
      ineligibleVehicles: [],
    }),
  });
  cy.intercept('GET', '**/api/v1/trip-drafts/*/manifest/by-stop', {
    statusCode: 200,
    body: api({ stops: manifest.stops }),
  });
  cy.intercept('GET', '**/api/v1/trip-drafts/*/manifest', {
    statusCode: 200,
    body: api(manifest),
  });
  cy.intercept('POST', '**/api/v1/trip-drafts/*/generate-manifest', {
    statusCode: 201,
    body: api(manifest),
  });
  cy.intercept('GET', /\/api\/v1\/trip-drafts\/\d+(\?.*)?$/, (req) => {
    const id = Number(req.url.match(/trip-drafts\/(\d+)/)?.[1] ?? 101);
    req.reply({ statusCode: 200, body: api(tripDraft(id, id === 104 ? 'CONFIRMED' : id === 105 ? 'VALIDATED' : 'DRAFT')) });
  });
  cy.intercept('GET', '**/api/v1/trip-drafts/*/history*', {
    statusCode: 200,
    body: {
      success: true,
      data: [],
      pagination: { page: 0, size: 10, totalElements: 0, totalPages: 0 },
    },
  });

  cy.intercept('GET', '**/api/v1/drivers/available*', {
    statusCode: 200,
    body: api([
      { userId: 10, fullName: 'Le Van Driver', email: 'driver@example.com', available: true },
    ]),
  });
  cy.intercept('GET', '**/api/v1/fleet/capacity-check*', {
    statusCode: 200,
    body: api({
      deliveryDate: '2026-08-16',
      fleetTotalVolumeM3: 30,
      fleetTotalWeightKg: 8000,
      dayTotalVolumeM3: 4.5,
      dayTotalWeightKg: 1200,
      volumeCheckResult: 'PASS',
      weightCheckResult: 'PASS',
      canDispatch: true,
      message: 'Fleet capacity is available',
    }),
  });
  cy.intercept('GET', '**/api/v1/trips?*', {
    statusCode: 200,
    body: api([]),
  });
  cy.intercept('GET', '**/api/v1/trips/100/progress', {
    statusCode: 200,
    body: api({
      tripId: 100,
      fixedRouteCode: 'RT-01',
      deliveryDate: '2026-08-16',
      status: 'IN_PROGRESS',
      totalDistanceKm: 32,
      routePolyline: null,
      vehicle: { vehicleCode: 'VH-001', plateNumber: '29A-12345' },
      driver: { userId: 10, fullName: 'Le Van Driver', phone: '0912345678' },
      gpsLocation: null,
      gpsNote: 'GPS tracking is not available in current phase',
      stops: [
        { tripStopId: 1001, sequenceOrder: 1, storeCode: 'KH0002', storeName: 'Cua hang Dong Anh 1', status: 'COMPLETED', plannedEta: '2026-08-16T08:45:00Z', actualArrivalTime: '2026-08-16T08:44:00Z', actualDepartureTime: '2026-08-16T08:55:00Z', delayMinutes: 0, hasException: false, exceptions: [], latitude: null, longitude: null },
        { tripStopId: 1002, sequenceOrder: 2, storeCode: 'KH0003', storeName: 'Cua hang Dong Anh 2', status: 'IN_PROGRESS', plannedEta: '2026-08-16T09:30:00Z', actualArrivalTime: null, actualDepartureTime: null, delayMinutes: 15, hasException: true, exceptions: [{ exceptionId: 501, type: 'TIME_EXCEPTION', description: 'Stop is overdue', createdAt: '2026-08-16T09:45:00Z', resolvedAt: null }], latitude: null, longitude: null },
      ],
    }),
  });
  cy.intercept('GET', '**/api/v1/trips/100', {
    statusCode: 200,
    body: api(trip('VALIDATED')),
  });
  cy.intercept('POST', '**/api/v1/trips/100/dispatch', {
    statusCode: 200,
    body: api(trip('DISPATCHED')),
  });
  cy.intercept('GET', '**/api/v1/trip-outcomes*', {
    statusCode: 200,
    body: api([
      {
        id: 100,
        tripId: 100,
        tripCode: 'TRIP-100',
        driverName: 'Le Van Driver',
        deliveryDate: '2026-08-16',
        status: 'SUBMITTED',
        totalOrders: 4,
        deliveredOrders: 3,
        failedOrders: 1,
        partialOrders: 0,
        version: 1,
      },
    ]),
  });
  cy.intercept('GET', '**/api/v1/dashboard/active-trips*', {
    statusCode: 200,
    body: api({
      date: '2026-08-16',
      totalActiveTrips: 1,
      trips: [
        {
          tripId: 100,
          fixedRouteCode: 'RT-01',
          vehicleCode: '29A-12345',
          driverName: 'Le Van Driver',
          status: 'IN_PROGRESS',
          plannedDepartureTime: '08:00:00',
          actualDepartureTime: '2026-08-16T08:05:00Z',
          totalStops: 4,
          completedStops: 2,
          pendingStops: 2,
          exceptionStops: 1,
          progressPercent: 50,
          hasUnresolvedExceptions: true,
          exceptions: [{ exceptionId: 501, type: 'TIME_EXCEPTION', storeCode: 'KH0003', description: 'Stop is overdue', resolvedAt: null }],
          gpsLocation: null,
          gpsNote: null,
        },
      ],
    }),
  });
  cy.intercept('GET', '**/api/v1/exceptions/violations*', {
    statusCode: 200,
    body: api([
      { id: 1, type: 'TIME_WINDOW', storeCode: 'KH0003', storeName: 'Cua hang Dong Anh 2', description: 'Stop is overdue', severity: 'MEDIUM' },
    ]),
  });
  cy.intercept('GET', '**/api/v1/exceptions*', {
    statusCode: 200,
    body: api({
      exceptions: [
        { id: 501, exceptionId: 501, exceptionCode: 'EX-501', exceptionType: 'DELIVERY_REJECTION', type: 'DELIVERY_REJECTION', reasonCode: 'DAMAGED_GOODS', isResolved: false, resolved: false, tripCode: 'TRIP-100', fixedRouteCode: 'RT-01', storeName: 'Store C', storeCode: 'KH0003', reportedAt: '2026-08-16T10:00:00Z', createdAt: '2026-08-16T10:00:00Z', description: 'Damaged goods rejected by store' },
      ],
      totalElements: 1,
    }),
  });
  cy.intercept('GET', '**/api/v1/exceptions/501', {
    statusCode: 200,
    body: api({
      id: 501,
      exceptionId: 501,
      exceptionType: 'DELIVERY_REJECTION',
      type: 'DELIVERY_REJECTION',
      rejectionType: 'DAMAGED_GOODS',
      driverNote: 'Damaged goods rejected by store',
      isResolved: false,
      resolved: false,
      storeCode: 'KH0003',
      storeName: 'Store C',
      tripCode: 'TRIP-100',
      fixedRouteCode: 'RT-01',
      createdAt: '2026-08-16T10:00:00Z',
    }),
  });
  cy.intercept('GET', '**/api/v1/exceptions/violations*', {
    statusCode: 200,
    body: api([
      { id: 1, type: 'TIME_WINDOW', storeCode: 'KH0003', storeName: 'Cua hang Dong Anh 2', description: 'Stop is overdue', severity: 'MEDIUM' },
    ]),
  });

  // Global Mutation Intercepts for Interactive E2E Actions (POST, PUT, DELETE, PATCH)
  cy.intercept('POST', '**/api/v1/auth/login', {
    statusCode: 200,
    body: api({ accessToken: 'mock-uat-jwt-token', refreshToken: 'mock-uat-refresh-token', user: { userId: 3, username: 'dispatcher01', roles: ['ROLE_DISPATCHER', 'DISPATCHER'] } })
  }).as('postLogin');
  cy.intercept('POST', '**/api/auth/login', {
    statusCode: 200,
    body: api({ accessToken: 'mock-uat-jwt-token', refreshToken: 'mock-uat-refresh-token', user: { userId: 3, username: 'dispatcher01', roles: ['ROLE_DISPATCHER', 'DISPATCHER'] } })
  }).as('postAuthLogin');
  cy.intercept('POST', '**/api/v1/auth/logout', {
    statusCode: 200,
    body: api({ message: 'Logged out successfully' })
  }).as('postLogout');

  cy.intercept('POST', '**/api/v1/trip-drafts/consolidate', {
    statusCode: 200,
    body: api([tripDraft(101), tripDraft(102), tripDraft(105)])
  }).as('consolidateOrders');
  cy.intercept('POST', '**/api/v1/trip-drafts/*/recalculate-eta', {
    statusCode: 200,
    body: api(tripDraft(101))
  }).as('recalculateEta');
  cy.intercept('POST', '**/api/v1/trip-drafts/*/adjust-departure-time', {
    statusCode: 200,
    body: api(tripDraft(101))
  }).as('adjustDepartureTime');
  cy.intercept('POST', '**/api/v1/trip-drafts/*/orders/*/exclude', {
    statusCode: 200,
    body: api({ message: 'Order excluded successfully' })
  }).as('excludeOrder');
  cy.intercept('POST', '**/api/v1/trip-drafts/*/orders/*/settle-delay', {
    statusCode: 200,
    body: api({ message: 'Delay settled successfully' })
  }).as('settleDelay');
  cy.intercept('POST', '**/api/v1/trip-drafts/*/confirm', {
    statusCode: 200,
    body: api({ tripId: 100, status: 'CONFIRMED' })
  }).as('confirmDraft');
  cy.intercept('POST', '**/api/v1/trip-drafts/*/revert', {
    statusCode: 200,
    body: api({ success: true, message: 'Reverted back to DRAFT' })
  }).as('revertDraft');
  cy.intercept('POST', '**/api/v1/trip-drafts/*/assign', {
    statusCode: 200,
    body: api(trip('ASSIGNED'))
  }).as('assignResources');
  cy.intercept('POST', '**/api/v1/trips/*/cancel', {
    statusCode: 200,
    body: api({ tripId: 100, status: 'CANCELLED' })
  }).as('cancelTrip');

  cy.intercept('POST', '**/api/v1/trips/*/start', {
    statusCode: 200,
    body: api({ tripId: 100, status: 'IN_PROGRESS', startedAt: '2026-08-16T08:05:00Z' })
  }).as('startTrip');
  cy.intercept('POST', '**/api/v1/trip-stops/*/arrive', {
    statusCode: 200,
    body: api({ tripStopId: 1001, status: 'ARRIVED', arrivedAt: '2026-08-16T08:44:00Z' })
  }).as('arriveStop');
  cy.intercept('POST', '**/api/v1/trip-stops/*/complete', {
    statusCode: 200,
    body: api({ tripStopId: 1001, status: 'COMPLETED', completedAt: '2026-08-16T08:50:00Z' })
  }).as('completeStop');
  cy.intercept('POST', '**/api/v1/trip-stops/*/reject', {
    statusCode: 200,
    body: api({ tripStopId: 1002, status: 'REJECTED', exceptionId: 501 })
  }).as('rejectStop');
  cy.intercept('PATCH', '**/api/v1/exceptions/*/resolve', {
    statusCode: 200,
    body: api({ exceptionId: 501, isResolved: true, resolved: true, resolution: 'RETURN_TO_DEPOT' })
  }).as('resolveException');
  cy.intercept('POST', '**/api/v1/trip-outcomes/*/validate', {
    statusCode: 200,
    body: api({ id: 100, status: 'VALIDATED' })
  }).as('validateOutcome');
  cy.intercept('POST', '**/api/v1/trip-outcomes/*/amend*', {
    statusCode: 200,
    body: api({ id: 100, status: 'AMENDED' })
  }).as('amendOutcome');

  cy.intercept('POST', '**/api/v1/routes', {
    statusCode: 201,
    body: api({ routeId: 99, routeCode: 'RT-NEW-01', routeName: 'Tuyen Bac Thang Long', isActive: true })
  }).as('createRoute');
  cy.intercept('PUT', '**/api/v1/routes/*', {
    statusCode: 200,
    body: api({ routeId: 1, routeCode: 'RT-01', routeName: 'Updated Route', isActive: true })
  }).as('updateRoute');
  cy.intercept('DELETE', '**/api/v1/routes/*', {
    statusCode: 200,
    body: api({ message: 'Route deleted successfully' })
  }).as('deleteRoute');
  cy.intercept('POST', '**/api/v1/vehicles', {
    statusCode: 201,
    body: api({ vehicleId: 99, plateNumber: '29C-999.99', vehicleType: 'TRUCK_2_5T', payloadKg: 2500, maxVolumeM3: 10 })
  }).as('createVehicle');
  cy.intercept('PUT', '**/api/v1/vehicles/*', {
    statusCode: 200,
    body: api({ vehicleId: 1, plateNumber: '29A-12345' })
  }).as('updateVehicle');
  cy.intercept('PATCH', '**/api/v1/vehicles/*/status', {
    statusCode: 200,
    body: api({ vehicleId: 1, status: 'MAINTENANCE' })
  }).as('updateVehicleStatus');
  cy.intercept('POST', '**/api/v1/users', {
    statusCode: 201,
    body: api({ userId: 99, username: 'newuser01', fullName: 'Nguyen Van New', email: 'new@example.com' })
  }).as('createUser');
  cy.intercept('PUT', '**/api/v1/users/*', {
    statusCode: 200,
    body: api({ userId: 3, fullName: 'Updated User' })
  }).as('updateUser');
  cy.intercept('PATCH', '**/api/v1/users/*/status', {
    statusCode: 200,
    body: api({ userId: 3, isActive: true })
  }).as('updateUserStatus');
  cy.intercept('PATCH', '**/api/v1/drivers/*/status', {
    statusCode: 200,
    body: api({ driverId: 10, status: 'OFF_DUTY' })
  }).as('updateDriverStatus');
  cy.intercept('POST', '**/api/v1/stores', {
    statusCode: 201,
    body: api({ storeId: 99, storeCode: 'KH0099', storeName: 'Cua hang Moi', address: '123 Pho Hue', latitude: 21.01, longitude: 105.85 })
  }).as('createStore');
  cy.intercept('PUT', '**/api/v1/stores/*', {
    statusCode: 200,
    body: api({ storeId: 1, storeName: 'Updated Store' })
  }).as('updateStore');
});

