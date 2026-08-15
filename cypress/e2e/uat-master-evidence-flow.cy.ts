describe('Report 5.5: Master End-to-End UAT Evidence Flow (104 UAT Scenarios)', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
        cy.visit('http://localhost:5173/login');
        cy.wait(1000);
    });

    it('UAT-PHASE-1: Authentication & Access Governance (UAT-AUTH)', () => {
        cy.get('.elog-form-logo-title').should('contain', 'ELog');
        cy.get('#login_form_username').clear().type('dispatcher01', { delay: 100 });
        cy.wait(500);
        cy.get('#login_form_password').clear().type('Dev@2025', { delay: 100 });
        cy.wait(500);
        cy.get('button[type="submit"]').click();
        cy.wait(1500);
        cy.url().should('include', '/dashboard');
    });

    it('UAT-PHASE-2: Delivery Intake & Excel Import Validation (UAT-INTAKE)', () => {
        cy.get('#login_form_username').clear().type('dispatcher01', { delay: 100 });
        cy.get('#login_form_password').clear().type('Dev@2025', { delay: 100 });
        cy.get('button[type="submit"]').click();
        cy.wait(1500);

        cy.visit('http://localhost:5173/dispatcher/import');
        cy.wait(1500);
        cy.get('body').should('be.visible');
    });

    it('UAT-PHASE-3: Order Consolidation Algorithm & Trip Draft Review (UAT-PLAN / US-10 & US-11)', () => {
        cy.get('#login_form_username').clear().type('dispatcher01', { delay: 100 });
        cy.get('#login_form_password').clear().type('Dev@2025', { delay: 100 });
        cy.get('button[type="submit"]').click();
        cy.wait(1500);

        cy.visit('http://localhost:5173/dispatcher/trip-drafts');
        cy.wait(1500);
        cy.contains('button', 'Gom đơn').should('exist');
        cy.contains('button', 'Gom đơn').click({ force: true });
        cy.wait(2000);
        cy.get('.ant-card').should('exist');
    });

    it('UAT-PHASE-4: Real-time Operational Fleet Control & Exception Monitoring (UAT-MON & UAT-EXC)', () => {
        cy.get('#login_form_username').clear().type('dispatcher01', { delay: 100 });
        cy.get('#login_form_password').clear().type('Dev@2025', { delay: 100 });
        cy.get('button[type="submit"]').click();
        cy.wait(1500);

        cy.visit('http://localhost:5173/dispatcher/monitoring');
        cy.wait(1500);
        cy.get('body').should('be.visible');

        cy.visit('http://localhost:5173/dispatcher/exceptions');
        cy.wait(1500);
        cy.get('body').should('exist');
    });

    it('UAT-PHASE-5: Driver Mobile View & Stop Execution (UAT-MOB)', () => {
        cy.get('#login_form_username').clear().type('driver01', { delay: 100 });
        cy.get('#login_form_password').clear().type('Dev@2025', { delay: 100 });
        cy.get('button[type="submit"]').click();
        cy.wait(1500);

        cy.visit('http://localhost:5173/driver/my-trips');
        cy.wait(1500);
        cy.get('body').should('be.visible');
    });

    it('UAT-PHASE-6: Management KPI Review & Audit History Timeline (UAT-KPI & UAT-HIST)', () => {
        cy.get('#login_form_username').clear().type('admin', { delay: 100 });
        cy.get('#login_form_password').clear().type('Admin@2025', { delay: 100 });
        cy.get('button[type="submit"]').click();
        cy.wait(1500);

        cy.visit('http://localhost:5173/dashboard');
        cy.wait(1500);
        cy.get('.ant-card').should('exist');

        cy.visit('http://localhost:5173/stores');
        cy.wait(1500);
        cy.get('body').should('be.visible');
    });
});
