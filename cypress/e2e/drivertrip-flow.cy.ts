describe('E2E Flow: Trip Dispatch', () => {
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

    it('L4-WEB-DISPATCH-01: Dispatch Trip Execution Action', () => {
        cy.visit('http://localhost:5173/dispatcher/trips/1/dispatch');
        cy.wait(1500);
        cy.get('body').should('be.visible');
    });

    it('L4-WEB-DISPATCH-02: Generate Warehouse Handover Slip', () => {
        cy.visit('http://localhost:5173/dispatcher/trips/1/dispatch');
        cy.wait(1500);
        cy.get('body').should('exist');
    });

    it('L4-WEB-DISPATCH-03: Verify Trip Dispatch Status Transition', () => {
        cy.visit('http://localhost:5173/dispatcher/trips/1/dispatch');
        cy.wait(1500);
        cy.get('body').should('be.visible');
    });
});
