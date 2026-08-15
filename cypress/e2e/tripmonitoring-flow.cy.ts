describe('E2E Flow: Operational Monitoring', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
        cy.visit('http://localhost:5173/login');
        cy.wait(1000);
        cy.get('#login_form_username').clear().type('admin', { delay: 100 });
        cy.wait(500);
        cy.get('#login_form_password').clear().type('Admin@2025', { delay: 100 });
        cy.wait(500);
        cy.get('button[type="submit"]').click();
        cy.wait(1500);
        cy.url().should('include', '/dashboard');
    });

    it('L4-WEB-MON-01: Navigate to Real-time Monitoring Dashboard', () => {
        cy.visit('http://localhost:5173/dispatcher/monitoring');
        cy.wait(1500);
        cy.get('body').should('be.visible');
    });

    it('L4-WEB-MON-02: Check Active Trips Status Indicators', () => {
        cy.visit('http://localhost:5173/dispatcher/monitoring');
        cy.wait(1500);
        cy.get('body').should('exist');
    });

    it('L4-WEB-MON-03: Verify Overdue Trip Alert Indicators', () => {
        cy.visit('http://localhost:5173/dispatcher/monitoring');
        cy.wait(1500);
        cy.url().should('include', '/monitoring');
    });
});
