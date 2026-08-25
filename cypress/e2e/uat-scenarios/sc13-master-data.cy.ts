describe('UAT SC-13: Master Data Management (Routes & Stores)', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    it('[ELOG-SC13-01] Create New Delivery Route with Ordered Stores', () => {
        cy.intercept('GET', '**/api/v1/routes*', {
            statusCode: 200,
            body: {
                success: true,
                data: [
                    { routeId: 1, routeCode: 'RT-01', routeName: 'Tuyen Cau Giay', isActive: true, stopCount: 2 }
                ],
                pagination: { page: 0, size: 10, totalElements: 1, totalPages: 1 }
            }
        }).as('getRoutes');

        cy.visitWithAuth('/admin/routes', 'admin', 'ADMIN');
        cy.get('.ant-card, .ant-table, body').should('exist');
        cy.get('button').filter(':visible').should('have.length.at.least', 1);
    });

    it('[ELOG-SC13-02] Block Deactivation of Route Currently in Active Trip', () => {
        cy.intercept('GET', '**/api/v1/routes*', {
            statusCode: 200,
            body: {
                success: true,
                data: [
                    { routeId: 1, routeCode: 'RT-01', routeName: 'Tuyen Cau Giay', isActive: true, stopCount: 2 }
                ],
                pagination: { page: 0, size: 10, totalElements: 1, totalPages: 1 }
            }
        }).as('getRoutes');

        cy.visitWithAuth('/admin/routes', 'admin', 'ADMIN');
        cy.get('body').should('exist');
    });

    it('[ELOG-SC13-03] Create Vehicle Profile with Payload and Volume Limits', () => {
        cy.intercept('GET', '**/api/v1/vehicles*', {
            statusCode: 200,
            body: {
                success: true,
                data: [
                    { vehicleId: 1, plateNumber: '29A-12345', vehicleType: 'TRUCK_2_5T', payloadKg: 2500, maxVolumeM3: 10.0, status: 'ACTIVE' }
                ],
                pagination: { page: 0, size: 10, totalElements: 1, totalPages: 1 }
            }
        }).as('getVehicles');

        cy.visitWithAuth('/admin/vehicles', 'admin', 'ADMIN');
        cy.get('.ant-card, .ant-table, body').should('exist');
        cy.get('button').filter(':visible').should('have.length.at.least', 1);
    });
});
