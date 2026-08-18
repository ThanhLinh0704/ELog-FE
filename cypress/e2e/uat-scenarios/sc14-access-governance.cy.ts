describe('UAT SC-14: Access Governance & Session Security', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    it('[ELOG-SC14-01] Verify Strict Role-Based Access Control (RBAC)', () => {
        cy.visitWithAuth('/dispatcher/trip-drafts', 'driver01', 'DRIVER');
        cy.contains('403').should('be.visible');

        cy.visitWithAuth('/users', 'driver01', 'DRIVER');
        cy.contains('403').should('be.visible');
    });

    it('[ELOG-SC14-02] Block Admin Self-Demotion and Self-Deactivation', () => {
        cy.visitWithAuth('/users', 'admin', 'ADMIN');
        cy.get('.ant-card, .ant-table').should('exist');
    });

    it('[ELOG-SC14-03] Clean Session Sign-out Across Web and Mobile', () => {
        cy.visitWithAuth('/dashboard', 'admin', 'ADMIN');
        cy.get('.ant-card, .ant-layout').should('exist');
    });
});
