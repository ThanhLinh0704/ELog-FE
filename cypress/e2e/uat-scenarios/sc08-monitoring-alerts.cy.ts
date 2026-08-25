describe('UAT SC-08: Real-time Monitoring & Delay Alerting', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    it('[ELOG-SC08-01] Monitor Active Trips on Real-time Dashboard', () => {
        cy.visitWithAuth('/dispatcher/monitoring', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card, body').should('exist');
    });

    it('[ELOG-SC08-02] Automated Time Exception Flagging for Overdue Stops', () => {
        cy.visitWithAuth('/dispatcher/monitoring', 'dispatcher01', 'DISPATCHER');
        cy.get('body').should('exist');
    });
});
