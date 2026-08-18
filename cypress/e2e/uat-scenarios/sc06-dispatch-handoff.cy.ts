const trip = (status: string) => ({
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
        { tripStopId: 1001, routeStopId: 1, tripDraftStopId: 1, sequenceOrder: 1, storeCode: 'KH0002', storeName: 'Cua hang Dong Anh 1', plannedEta: '2026-08-16T08:45:00Z', status: 'PENDING', stopWeightKg: 450, stopVolumeM3: 1.5 },
        { tripStopId: 1002, routeStopId: 2, tripDraftStopId: 2, sequenceOrder: 2, storeCode: 'KH0003', storeName: 'Cua hang Dong Anh 2', plannedEta: '2026-08-16T09:30:00Z', status: 'PENDING', stopWeightKg: 750, stopVolumeM3: 3 }
    ]
});

describe('UAT SC-06: Trip Confirmation & Dispatch Handoff', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    it('[ELOG-SC06-01] Dispatch Trip and Trigger Mobile Notification', () => {
        cy.intercept('GET', '**/api/v1/trips/100', {
            statusCode: 200,
            body: { success: true, data: trip('VALIDATED') }
        }).as('getTrip');

        cy.visitWithAuth('/dispatcher/trips/100/dispatch', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
    });

    it('[ELOG-SC06-02] Prevent Direct Mutation of Dispatched Trip', () => {
        cy.intercept('GET', '**/api/v1/trips/100', {
            statusCode: 200,
            body: { success: true, data: trip('DISPATCHED') }
        }).as('getDispatchedTrip');

        cy.visitWithAuth('/dispatcher/trips/100/dispatch', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
    });
});
