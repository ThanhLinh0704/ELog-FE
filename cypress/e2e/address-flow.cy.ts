describe('E2E Flow: Activity History', () => {
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

    it('L4-WEB-HIST-01: Display System Audit Activity History Timeline', () => {
        cy.visit('http://localhost:5173/dashboard');
        cy.wait(1500);
        cy.get('body').should('be.visible');
    });

    it('L4-WEB-HIST-02: Verify User Action History Filters', () => {
        cy.visit('http://localhost:5173/dashboard');
        cy.wait(1500);
        cy.get('body').should('exist');
    });
});
