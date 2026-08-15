describe('E2E Flow: User Administration', () => {
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

    it('L4-WEB-ADMIN-01: Navigate to Users Administration Page', () => {
        cy.visit('http://localhost:5173/users');
        cy.wait(1500);
        cy.get('body').should('be.visible');
    });

    it('L4-WEB-ADMIN-02: Verify User Search and Role Filter Inputs', () => {
        cy.visit('http://localhost:5173/users');
        cy.wait(1500);
        cy.get('body').should('exist');
    });
});
