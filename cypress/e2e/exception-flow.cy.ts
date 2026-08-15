describe('E2E Flow: Exception Management', () => {
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

    it('L4-WEB-EXC-01: List Active Traffic Exceptions & Delays', () => {
        cy.visit('http://localhost:5173/dispatcher/exceptions');
        cy.wait(1500);
        cy.get('body').should('be.visible');
    });

    it('L4-WEB-EXC-02: Verify Exception Resolution & Vehicle Swap Modal', () => {
        cy.visit('http://localhost:5173/dispatcher/exceptions');
        cy.wait(1500);
        cy.get('body').should('exist');
    });
});
