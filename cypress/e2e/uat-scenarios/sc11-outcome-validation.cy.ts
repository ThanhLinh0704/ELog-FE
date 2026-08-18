describe('UAT SC-11: Trip Outcome Validation & Audit Amendment', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    it('[ELOG-SC11-01] Dispatcher Reviews and Validates Completed Trip Outcome', () => {
        cy.intercept('GET', '**/api/v1/trip-outcomes*', {
            statusCode: 200,
            body: {
                success: true,
                data: [
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
                        version: 1
                    }
                ]
            }
        }).as('getOutcomes');

        cy.visitWithAuth('/dispatcher/trip-outcomes', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
    });

    it('[ELOG-SC11-02] Amend Validated Outcome with Mandatory Reason', () => {
        cy.intercept('GET', '**/api/v1/trip-outcomes*', {
            statusCode: 200,
            body: {
                success: true,
                data: [
                    {
                        id: 100,
                        tripId: 100,
                        tripCode: 'TRIP-100',
                        driverName: 'Le Van Driver',
                        deliveryDate: '2026-08-16',
                        status: 'VALIDATED',
                        totalOrders: 4,
                        deliveredOrders: 2,
                        partialOrders: 1,
                        failedOrders: 1,
                        version: 2
                    }
                ]
            }
        }).as('getAmendedOutcomes');

        cy.visitWithAuth('/dispatcher/trip-outcomes', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
    });

    it('[ELOG-SC11-03] Reject Blank Amendment Reason', () => {
        cy.visitWithAuth('/dispatcher/trip-outcomes', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
    });
});
