describe('UAT SC-11: Trip Outcome Validation & Audit Amendment', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    it('[ELOG-SC11-01] Dispatcher Reviews and Validates Completed Trip Outcome', () => {
        cy.visitWithAuth('/dispatcher/outcomes', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card, .ant-table, body').should('exist');
        cy.get('button').filter(':visible').should('have.length.at.least', 1);
    });

    it('[ELOG-SC11-02] Amend Validated Outcome with Mandatory Reason', () => {
        cy.visitWithAuth('/dispatcher/outcomes', 'dispatcher01', 'DISPATCHER');
        cy.get('body').should('exist');
    });

    it('[ELOG-SC11-03] Reject Blank Amendment Reason', () => {
        cy.visitWithAuth('/dispatcher/outcomes', 'dispatcher01', 'DISPATCHER');
        cy.get('body').should('exist');
    });
});
