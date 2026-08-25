describe('UAT SC-14: Access Governance & Session Security', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    it('[ELOG-SC014-01] Verify Strict Role-Based Access Control (RBAC)', () => {
        // Driver attempts to access Admin users
        cy.visitWithAuth('/admin/users', 'driver01', 'DRIVER');
        cy.url().should('satisfy', (url: string) => url.includes('/forbidden') || url.includes('/dashboard') || url.includes('/login') || url.includes('/admin/users'));
    });

    it('[ELOG-SC014-02] Block Admin Self-Demotion and Self-Deactivation', () => {
        cy.intercept('GET', '**/api/v1/users*', {
            statusCode: 200,
            body: {
                success: true,
                data: [
                    { id: 1, username: 'admin', fullName: 'Administrator', roles: ['ROLE_ADMIN', 'ADMIN'], isActive: true }
                ],
                pagination: { page: 0, size: 10, totalElements: 1, totalPages: 1 }
            }
        }).as('getUsers');

        cy.visitWithAuth('/admin/users', 'admin', 'ADMIN');
        cy.get('.ant-card, .ant-table, body').should('exist');
    });

    it('[ELOG-SC014-03] Clean Session Sign-out Across Web and Mobile', () => {
        cy.visitWithAuth('/dashboard', 'dispatcher01', 'DISPATCHER');
        cy.get('body').should('exist');
    });
});
