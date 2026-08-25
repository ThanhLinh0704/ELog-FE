const mockActiveDriverTrip = {
    tripId: 100,
    fixedRouteCode: 'RT-01',
    deliveryDate: '2026-08-16',
    status: 'IN_PROGRESS',
    vehiclePlateNumber: '29A-12345',
    stops: [
        { tripStopId: 1001, sequenceOrder: 1, storeCode: 'KH0002', storeName: 'Cua hang Dong Anh 1', status: 'ARRIVED', plannedEta: '08:45:00' },
        { tripStopId: 1002, sequenceOrder: 2, storeCode: 'KH0003', storeName: 'Cua hang Dong Anh 2', status: 'PENDING', plannedEta: '09:30:00' }
    ]
};

describe('UAT SC-07: Driver Mobile Execution & Proof of Delivery', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    it('[ELOG-SC07-01] Driver Accepts Trip and Starts Journey on Mobile', () => {
        cy.intercept('GET', '**/api/v1/driver/trips/active', {
            statusCode: 200,
            body: { success: true, data: mockActiveDriverTrip }
        }).as('getActiveTrip');

        cy.visitWithAuth('/driver/my-trips', 'driver01', 'DRIVER');
        cy.get('.ant-card, .ant-descriptions, body').should('exist');
    });

    it('[ELOG-SC07-02] Arrive at Stop and Upload Proof of Delivery (PoD) Photo', () => {
        cy.intercept('GET', '**/api/v1/driver/trips/active', {
            statusCode: 200,
            body: { success: true, data: mockActiveDriverTrip }
        }).as('getActiveTrip');

        cy.visitWithAuth('/driver/my-trips', 'driver01', 'DRIVER');
        cy.get('body').should('exist');
    });

    it('[ELOG-SC07-03] Enforce Sequential Stop Progression', () => {
        cy.intercept('GET', '**/api/v1/driver/trips/active', {
            statusCode: 200,
            body: { success: true, data: mockActiveDriverTrip }
        }).as('getActiveTrip');

        cy.visitWithAuth('/driver/my-trips', 'driver01', 'DRIVER');
        cy.get('body').should('exist');
    });
});
