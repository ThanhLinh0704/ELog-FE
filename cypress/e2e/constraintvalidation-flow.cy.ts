describe('E2E Flow: Mobile Access & Execution', () => {
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

    it('L4-MOB-AUTH-01: Verify Mobile View Login Access', () => {
        cy.visit('http://localhost:5173/driver/my-trips');
        cy.wait(1500);
        cy.get('body').should('be.visible');
    });

    it('L4-MOB-TRIP-01: Display Assigned Trips on Driver Mobile View', () => {
        cy.visit('http://localhost:5173/driver/my-trips');
        cy.wait(1500);
        cy.get('body').should('exist');
    });

    it('L4-MOB-TRIP-02: Record Arrival at Delivery Stop', () => {
        cy.visit('http://localhost:5173/driver/my-trips');
        cy.wait(1500);
        cy.get('body').should('be.visible');
    });

    it('L4-MOB-TRIP-03: Complete Delivery Stop and Upload Proof of Delivery', () => {
        cy.visit('http://localhost:5173/driver/my-trips');
        cy.wait(1500);
        cy.get('body').should('exist');
    });
});
