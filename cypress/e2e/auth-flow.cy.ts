describe('E2E Flow: Web Access & Authentication', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
        cy.visit('http://localhost:5173/login');
        cy.wait(1000);
    });

    it('L4-WEB-AUTH-01: Render Login Page UI and verify branding elements', () => {
        cy.get('.elog-form-logo-title').should('contain', 'ELog');
        cy.get('#login_form_username').should('be.visible');
        cy.get('#login_form_password').should('be.visible');
        cy.wait(1000);
    });

    it('L4-WEB-AUTH-02: User journey via browser - Admin Login Success & Redirect to Dashboard', () => {
        cy.get('#login_form_username').clear().type('admin', { delay: 100 });
        cy.wait(500);
        cy.get('#login_form_password').clear().type('Admin@2025', { delay: 100 });
        cy.wait(500);
        cy.get('button[type="submit"]').click();
        cy.wait(1500);
        cy.url().should('include', '/dashboard');
    });

    it('L4-WEB-AUTH-03: User journey via browser - Dispatcher Role Login & Route Access', () => {
        cy.get('#login_form_username').clear().type('dispatcher01', { delay: 100 });
        cy.wait(500);
        cy.get('#login_form_password').clear().type('Dev@2025', { delay: 100 });
        cy.wait(500);
        cy.get('button[type="submit"]').click();
        cy.wait(1500);
        cy.url().should('include', '/dashboard');
    });
});
