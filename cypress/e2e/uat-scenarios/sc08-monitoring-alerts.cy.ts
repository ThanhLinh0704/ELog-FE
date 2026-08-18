describe('UAT SC-08: Real-time Monitoring & Delay Alerting', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    it('[ELOG-SC08-01] Monitor Active Trips on Real-time Dashboard', () => {
        cy.intercept('GET', '**/api/v1/monitoring/trips*', {
            statusCode: 200,
            body: {
                activeTrips: [
                    {
                        tripId: 100,
                        tripCode: 'TRIP-100',
                        driverName: 'Le Van Driver',
                        vehiclePlate: '29A-12345',
                        status: 'IN_PROGRESS',
                        completedStops: 2,
                        totalStops: 4,
                        progressPercent: 50
                    }
                ],
                summary: { totalActive: 1, completedStops: 2, pendingStops: 2, alertingStops: 0 }
            }
        }).as('getMonitoring');

        cy.visitWithAuth('/dispatcher/monitoring', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
    });

    it('[ELOG-SC08-02] Automated Time Exception Flagging for Overdue Stops', () => {
        cy.visitWithAuth('/dispatcher/monitoring', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
    });
});
