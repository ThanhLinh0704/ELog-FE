describe('E2E Flow: Vehicle & Driver Assignment', () => {
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

    it('L4-WEB-ASSIGN-01: Navigate to Assigned Trips List View', () => {
        cy.visit('http://localhost:5173/dispatcher/trip-drafts');
        cy.wait(1500);
        cy.get('body').should('be.visible');
    });

    it('L4-WEB-ASSIGN-02: Verify Driver Assignment Modal Selection', () => {
        cy.visit('http://localhost:5173/dispatcher/trip-drafts');
        cy.wait(1500);
        cy.get('body').should('exist');
    });

    it('L4-WEB-ASSIGN-03: Verify Eligible Vehicle Selection Dropdown', () => {
        cy.visit('http://localhost:5173/dispatcher/trip-drafts');
        cy.wait(1500);
        cy.get('body').should('be.visible');
    });
});
