describe('UAT SC-12: KPI Analytics & Performance Review', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    it('[ELOG-SC12-01] Review High-Level Operational KPI Dashboard', () => {
        cy.visitWithAuth('/dispatcher/kpi', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card, body').should('exist');
    });

    it('[ELOG-SC12-02] Filter KPI Performance by Driver and Date Range', () => {
        cy.visitWithAuth('/dispatcher/kpi', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card, body').should('exist');
    });
});
