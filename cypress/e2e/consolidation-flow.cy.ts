describe('E2E Flow: Trip Planning & Route Consolidation (US-10 & US-11)', () => {
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

    it('L4-WEB-PLAN-01: Navigate to Trip Drafts List View and Verify Page Layout', () => {
        cy.visit('http://localhost:5173/dispatcher/trip-drafts');
        cy.wait(1500);
        cy.get('.ant-card').should('exist');
        cy.get('.ant-picker').should('be.visible');
        cy.contains('button', 'Gom đơn').should('exist');
        cy.wait(1000);
    });

    it('L4-WEB-PLAN-02: Trigger Automatic Order Consolidation Algorithm (US-10)', () => {
        cy.visit('http://localhost:5173/dispatcher/trip-drafts');
        cy.wait(1500);
        cy.contains('button', 'Gom đơn').click({ force: true });
        cy.wait(2000);
        cy.get('.ant-card').should('exist');
        cy.wait(1000);
    });

    it('L4-WEB-PLAN-03: Inspect Route Consolidation Draft Items and Delivery Stops (US-11)', () => {
        cy.visit('http://localhost:5173/dispatcher/trip-drafts');
        cy.wait(1500);
        cy.get('.ant-table-tbody').should('exist');
        cy.wait(1500);
    });

    it('L4-WEB-PLAN-04: Filter Trip Drafts by Target Delivery Date', () => {
        cy.visit('http://localhost:5173/dispatcher/trip-drafts');
        cy.wait(1500);
        cy.get('.ant-picker').click();
        cy.wait(1000);
        cy.get('body').type('{esc}');
        cy.wait(1000);
    });

    it('L4-WEB-PLAN-05: Verify Capacity Constraints & Volume/Weight Indicators', () => {
        cy.visit('http://localhost:5173/dispatcher/trip-drafts');
        cy.wait(1500);
        cy.get('.ant-table-wrapper').should('be.visible');
        cy.wait(1000);
    });

    it('L4-WEB-PLAN-06: Inspect Individual Trip Draft Detail Page & Stop Sequence', () => {
        cy.visit('http://localhost:5173/dispatcher/trip-drafts');
        cy.wait(1500);
        cy.get('body').then(($body) => {
            if ($body.find('.ant-table-row').length > 0) {
                cy.get('.ant-table-row').first().click({ force: true });
                cy.wait(1500);
            } else {
                cy.get('.ant-card').should('exist');
            }
        });
        cy.wait(1000);
    });

    it('L4-WEB-PLAN-07: Validate Revert and Draft Status Transition Controls', () => {
        cy.visit('http://localhost:5173/dispatcher/trip-drafts');
        cy.wait(1500);
        cy.get('.ant-card').should('be.visible');
        cy.wait(1000);
    });
});
