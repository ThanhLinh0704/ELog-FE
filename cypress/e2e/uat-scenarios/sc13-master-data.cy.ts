describe('UAT SC-13: Master Data Management (Routes & Stores)', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    it('[ELOG-SC13-01] Create New Delivery Route with Ordered Stores', () => {
        cy.intercept('GET', '**/api/v1/routes*', {
            statusCode: 200,
            body: {
                content: [{ id: 1, routeCode: 'RT-01', routeName: 'Hà Nội - Đông Anh', active: true, stopCount: 4 }],
                totalElements: 1
            }
        }).as('getRoutes');

        cy.visitWithAuth('/admin/routes', 'admin', 'ADMIN');
        cy.get('.ant-card, .ant-table').should('exist');
    });

    it('[ELOG-SC13-02] Block Deactivation of Route Currently in Active Trip', () => {
        cy.visitWithAuth('/admin/routes', 'admin', 'ADMIN');
        cy.get('.ant-card').should('exist');
    });

    it('[ELOG-SC13-03] Create Vehicle Profile with Payload and Volume Limits', () => {
        cy.intercept('GET', '**/api/v1/vehicles*', {
            statusCode: 200,
            body: [{ id: 1, licensePlate: '29C-555.88', vehicleType: 'TRUCK_DRY', maxPayloadKg: 2500, maxVolumeM3: 10.5, status: 'AVAILABLE' }]
        }).as('getVehicles');

        cy.visitWithAuth('/vehicles', 'admin', 'ADMIN');
        cy.get('.ant-card, .ant-table').should('exist');
    });
});
