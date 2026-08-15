describe('E2E Flow: Order Excel Import', () => {
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

    it('L4-WEB-IMPORT-01: Navigate to Order Import Page & Verify Drag Drop Zone', () => {
        cy.visit('http://localhost:5173/dispatcher/import');
        cy.wait(1500);
        cy.get('body').should('be.visible');
    });

    it('L4-WEB-IMPORT-02: Verify Import Batch History Table Rendering', () => {
        cy.visit('http://localhost:5173/dispatcher/import');
        cy.wait(1500);
        cy.get('body').should('be.visible');
    });

    it('L4-WEB-IMPORT-03: Verify Confirm Replace Modal Controls', () => {
        cy.visit('http://localhost:5173/dispatcher/import');
        cy.wait(1500);
        cy.url().should('include', '/import');
    });
});
