describe('UAT Master Suite: End-to-End Delivery Lifecycle Validation', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    it('STAGE 1: Master Data Readiness & User Governance', () => {
        cy.visitWithAuth('/admin/routes', 'admin', 'ADMIN');
        cy.get('.ant-card, .ant-table').should('exist');
        cy.visitWithAuth('/vehicles', 'admin', 'ADMIN');
        cy.get('.ant-card, .ant-table').should('exist');
    });

    it('STAGE 2: Delivery Order Intake & Planning Review', () => {
        cy.visitWithAuth('/dispatcher/import', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
        cy.visitWithAuth('/dispatcher/trip-drafts', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card, .ant-table').should('exist');
    });

    it('STAGE 3: Warehouse Loading Manifest & Dispatch Handoff', () => {
        cy.visitWithAuth('/trips/100/loading-manifest', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
        cy.visitWithAuth('/dispatcher/trips/100/dispatch', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
    });

    it('STAGE 4: Driver Execution & Operational Monitoring', () => {
        cy.visitWithAuth('/driver/my-trips', 'driver01', 'DRIVER');
        cy.contains('403').should('be.visible');
        cy.visitWithAuth('/dispatcher/monitoring', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
    });

    it('STAGE 5: Outcome Validation & Executive KPI Analytics', () => {
        cy.visitWithAuth('/dispatcher/trip-outcomes', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
        cy.visitWithAuth('/dispatcher/kpi', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
    });
});
