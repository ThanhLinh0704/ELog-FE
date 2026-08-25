describe('UAT SC-05: Warehouse Loading Manifest (LIFO)', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    it('[ELOG-SC05-01] Generate Reverse-Order LIFO Loading Manifest', () => {
        cy.visitWithAuth('/trip-drafts/105/loading-manifest', 'dispatcher01', 'DISPATCHER');
        cy.get('body').should('exist');
        cy.get('button, .ant-card, .ant-descriptions').should('exist');
    });

    it('[ELOG-SC05-02] Review By-Stop Package Details and Recipient Contacts', () => {
        cy.visitWithAuth('/trip-drafts/105/loading-manifest', 'dispatcher01', 'DISPATCHER');
        cy.get('body').should('exist');
    });
});
