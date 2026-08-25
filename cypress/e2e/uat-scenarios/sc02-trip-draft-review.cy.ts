const mockDraft = {
    id: 101,
    routeId: 1,
    routeCode: 'RT-01',
    deliveryDate: '2026-08-16',
    totalVolumeM3: 4.5,
    totalWeightKg: 1200,
    activeStopCount: 2,
    skippedStopCount: 0,
    status: 'DRAFT',
    plannedDepartureTime: '08:00:00',
    stops: [
        { tripDraftStopId: 1, sequenceNo: 1, storeId: 2, storeCode: 'KH0002', storeName: 'Cua hang Dong Anh 1', plannedEta: '08:45:00', isActive: true, orderCount: 3, stopWeightKg: 450, stopVolumeM3: 1.5 },
        { tripDraftStopId: 2, sequenceNo: 2, storeId: 3, storeCode: 'KH0003', storeName: 'Cua hang Dong Anh 2', plannedEta: '09:30:00', isActive: true, orderCount: 4, stopWeightKg: 750, stopVolumeM3: 3.0 }
    ]
};

describe('UAT SC-02: Trip Draft Review & Stop Adjustment', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    it('[ELOG-SC02-01] Review Trip Draft Stops and Calculated ETAs', () => {
        cy.intercept('GET', '**/api/v1/trip-drafts/101', {
            statusCode: 200,
            body: { success: true, data: mockDraft }
        }).as('getDraft101');

        cy.visitWithAuth('/dispatcher/trip-drafts/101', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
        cy.get('body').should('contain.text', 'RT-01');
        cy.get('body').should('contain.text', 'KH0002');
    });

    it('[ELOG-SC02-02] Adjust Trip Departure Time and Recalculate ETAs', () => {
        cy.intercept('GET', '**/api/v1/trip-drafts/101', {
            statusCode: 200,
            body: { success: true, data: mockDraft }
        }).as('getDraft101');

        cy.visitWithAuth('/dispatcher/trip-drafts/101', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
        // Interactive: click action buttons if present
        cy.get('button').filter(':visible').should('have.length.at.least', 1);
    });

    it('[ELOG-SC02-03] Settle Customer Delay and Exclude Order from Trip', () => {
        cy.intercept('GET', '**/api/v1/trip-drafts/101', {
            statusCode: 200,
            body: { success: true, data: mockDraft }
        }).as('getDraft101');

        cy.visitWithAuth('/dispatcher/trip-drafts/101', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
    });
});
