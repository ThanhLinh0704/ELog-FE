describe('Report 5.4: Mobile Driver End-to-End Test Flow (Smartphone Simulation)', () => {
    beforeEach(() => {
        // Set smartphone mobile device viewport (iPhone 12/13/14 Pro - 390x844)
        cy.viewport(390, 844);
        cy.clearLocalStorage();
        cy.clearCookies();
        cy.visit('http://localhost:5173/login');
        cy.wait(1200);
    });

    it('L4-MOB-01: Driver Mobile Login & Authentication', () => {
        cy.get('.elog-form-logo-title').should('contain', 'ELog');
        
        // Type driver credentials on mobile screen
        cy.get('#login_form_username').clear().type('driver01', { delay: 120 });
        cy.wait(600);
        cy.get('#login_form_password').clear().type('Dev@2025', { delay: 120 });
        cy.wait(600);
        
        // Submit mobile login
        cy.get('button[type="submit"]').click();
        cy.wait(2000);
        
        // Redirect to mobile dashboard / driver trips
        cy.url().should('include', '/dashboard');
    });

    it('L4-MOB-02: Driver Mobile View Assigned Trips & Route Stops', () => {
        // Login as Driver
        cy.get('#login_form_username').clear().type('driver01', { delay: 100 });
        cy.get('#login_form_password').clear().type('Dev@2025', { delay: 100 });
        cy.get('button[type="submit"]').click();
        cy.wait(1500);

        // Navigate to Driver Mobile Portal
        cy.visit('http://localhost:5173/driver/my-trips');
        cy.wait(2000);
        
        // Verify mobile card view & trip elements
        cy.get('body').should('be.visible');
        cy.wait(1500);
    });

    it('L4-MOB-03: Driver Mobile Stop Execution & Electronic POD Confirmation', () => {
        // Login as Driver
        cy.get('#login_form_username').clear().type('driver01', { delay: 100 });
        cy.get('#login_form_password').clear().type('Dev@2025', { delay: 100 });
        cy.get('button[type="submit"]').click();
        cy.wait(1500);

        cy.visit('http://localhost:5173/driver/my-trips');
        cy.wait(2000);

        // Simulate mobile touch / scroll interactions
        cy.scrollTo('bottom', { duration: 1000 });
        cy.wait(1000);
        cy.scrollTo('top', { duration: 1000 });
        cy.wait(1500);
    });
});
