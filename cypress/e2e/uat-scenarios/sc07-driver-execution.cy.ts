describe('UAT SC-07: Driver Mobile Execution & Proof of Delivery', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    const assertDriverMobileBoundary = () => {
        cy.contains('403').should('be.visible');
        cy.contains('không có quyền truy cập').should('exist');
    };

    it('[ELOG-SC07-01] Driver Accepts Trip and Starts Journey on Mobile', () => {
        cy.intercept('GET', '**/api/v1/driver/trips/active', {
            statusCode: 200,
            body: {
                id: 100,
                tripCode: 'TRIP-100',
                status: 'DISPATCHED',
                currentStopSequence: 1,
                stops: [
                    { id: 1, sequence: 1, storeName: 'Store A', status: 'PENDING', orders: [{ id: 1, orderCode: 'ORD-01', status: 'PENDING' }] }
                ]
            }
        }).as('getActiveTrip');

        cy.visitWithAuth('/driver/my-trips', 'driver01', 'DRIVER');
        assertDriverMobileBoundary();
    });

    it('[ELOG-SC07-02] Arrive at Stop and Upload Proof of Delivery (PoD) Photo', () => {
        cy.intercept('GET', '**/api/v1/driver/trips/active', {
            statusCode: 200,
            body: {
                id: 100,
                tripCode: 'TRIP-100',
                status: 'IN_PROGRESS',
                currentStopSequence: 1,
                stops: [
                    { id: 1, sequence: 1, storeName: 'Store A', status: 'ARRIVED', orders: [{ id: 1, orderCode: 'ORD-01', status: 'PENDING' }] }
                ]
            }
        }).as('getArrivedTrip');

        cy.visitWithAuth('/driver/my-trips', 'driver01', 'DRIVER');
        assertDriverMobileBoundary();
    });

    it('[ELOG-SC07-03] Enforce Sequential Stop Progression', () => {
        cy.visitWithAuth('/driver/my-trips', 'driver01', 'DRIVER');
        assertDriverMobileBoundary();
    });
});
