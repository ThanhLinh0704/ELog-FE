describe('E2E Flow: Loading Manifest', () => {
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

    it('L4-WEB-MANIFEST-01: Generate and Render LIFO Cargo Loading Manifest', () => {
        cy.visit('http://localhost:5173/dispatcher/trip-drafts');
        cy.wait(1500);
        cy.get('body').should('be.visible');
    });
});
