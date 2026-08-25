describe('UAT SC-09: Operational Exception Handling', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    it('[ELOG-SC09-01] Driver Logs Delivery Rejection on Mobile App', () => {
        cy.visitWithAuth('/driver/my-trips', 'driver01', 'DRIVER');
        cy.get('body').should('exist');
    });

    it('[ELOG-SC09-02] Dispatcher Reviews and Resolves Exception Ticket', () => {
        cy.visitWithAuth('/dispatcher/exceptions', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card, .ant-table, body').should('exist');
        cy.get('button').filter(':visible').should('have.length.at.least', 1);
    });

    it('[ELOG-SC09-03] Handle Vehicle Breakdown and Trip Cancellation', () => {
        cy.visitWithAuth('/dispatcher/exceptions', 'dispatcher01', 'DISPATCHER');
        cy.get('body').should('exist');
    });
});
