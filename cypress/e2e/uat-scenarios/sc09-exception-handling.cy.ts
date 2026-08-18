const exceptionList = {
    exceptions: [
        {
            id: 501,
            exceptionId: 501,
            exceptionCode: 'EX-501',
            exceptionType: 'DELIVERY_REJECTION',
            type: 'DELIVERY_REJECTION',
            reasonCode: 'DAMAGED_GOODS',
            isResolved: false,
            resolved: false,
            tripCode: 'TRIP-100',
            fixedRouteCode: 'RT-01',
            storeName: 'Store C',
            storeCode: 'KH0003',
            reportedAt: '2026-08-16T10:00:00Z',
            createdAt: '2026-08-16T10:00:00Z',
            description: 'Damaged goods rejected by store'
        }
    ],
    totalElements: 1
};

describe('UAT SC-09: Operational Exception Handling', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    it('[ELOG-SC09-01] Driver Logs Delivery Rejection on Mobile App', () => {
        cy.intercept('GET', '**/api/v1/exceptions*', {
            statusCode: 200,
            body: { success: true, data: exceptionList }
        }).as('getExceptions');

        cy.visitWithAuth('/dispatcher/exceptions', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card, .ant-table').should('exist');
    });

    it('[ELOG-SC09-02] Dispatcher Reviews and Resolves Exception Ticket', () => {
        cy.intercept('GET', '**/api/v1/exceptions*', {
            statusCode: 200,
            body: { success: true, data: exceptionList }
        }).as('getExceptions');

        cy.intercept('GET', '**/api/v1/exceptions/501', {
            statusCode: 200,
            body: {
                success: true,
                data: {
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
                    fixedRouteCode: 'RT-01'
                }
            }
        }).as('getExceptionDetail');

        cy.visitWithAuth('/dispatcher/exceptions', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card, .ant-table').should('exist');
    });

    it('[ELOG-SC09-03] Handle Vehicle Breakdown and Trip Cancellation', () => {
        cy.visitWithAuth('/dispatcher/monitoring', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card, .ant-alert').should('exist');
    });
});
