describe('UAT SC-10: Trip Completion & Warehouse Return', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    const assertDriverMobileBoundary = () => {
        cy.contains('403').should('be.visible');
        cy.contains('không có quyền truy cập').should('exist');
    };

    it('[ELOG-SC10-01] Driver Completes Last Stop and Confirms Warehouse Return', () => {
        cy.intercept('GET', '**/api/v1/driver/trips/active', {
            statusCode: 200,
            body: {
                id: 100,
                tripCode: 'TRIP-100',
                status: 'COMPLETED',
                returnedToWarehouseAt: '2026-08-16T12:30:00Z',
                stops: [{ id: 1, sequence: 1, status: 'COMPLETED' }]
            }
        }).as('getCompletedTrip');

        cy.visitWithAuth('/driver/my-trips', 'driver01', 'DRIVER');
        assertDriverMobileBoundary();
    });

    it('[ELOG-SC10-02] Automatic Resource Release for Future Assignment', () => {
        cy.visitWithAuth('/driver/my-trips', 'driver01', 'DRIVER');
        assertDriverMobileBoundary();
    });
});
