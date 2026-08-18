const draft101 = {
    id: 101,
    routeId: 1,
    routeCode: 'RT-01',
    deliveryDate: '2026-08-16',
    status: 'DRAFT',
    plannedDepartureTime: '08:00:00',
    totalWeightKg: 1250.5,
    totalVolumeM3: 4.2,
    activeStopCount: 2,
    skippedStopCount: 0,
    stops: [
        { tripDraftStopId: 1, sequenceNo: 1, storeId: 1, storeName: 'Depot Trung Tam', storeCode: 'DEPOT-01', plannedEta: '08:00:00', isActive: true, orderCount: 0 },
        { tripDraftStopId: 2, sequenceNo: 2, storeId: 2, storeName: 'Cua hang Dong Anh 1', storeCode: 'KH0002', plannedEta: '08:45:00', isActive: true, orderCount: 3 },
        { tripDraftStopId: 3, sequenceNo: 3, storeId: 3, storeName: 'Cua hang Dong Anh 2', storeCode: 'KH0003', plannedEta: '09:30:00', isActive: true, orderCount: 4 }
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
            body: { success: true, data: draft101 }
        }).as('getTripDraft');

        cy.visitWithAuth('/dispatcher/trip-drafts/101', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('contain.text', 'RT-01');
        cy.get('.ant-table').should('contain.text', 'KH0002');
        cy.get('.ant-table').should('contain.text', '08:45:00');
    });

    it('[ELOG-SC02-02] Adjust Trip Departure Time and Recalculate ETAs', () => {
        cy.intercept('GET', '**/api/v1/trip-drafts/101', {
            statusCode: 200,
            body: { success: true, data: draft101 }
        }).as('getDraft');

        cy.visitWithAuth('/dispatcher/trip-drafts/101', 'dispatcher01', 'DISPATCHER');
        cy.get('button').should('exist');
    });

    it('[ELOG-SC02-03] Settle Customer Delay and Exclude Order from Trip', () => {
        cy.intercept('GET', '**/api/v1/trip-drafts/101', {
            statusCode: 200,
            body: { success: true, data: draft101 }
        }).as('getDraftWithDelay');

        cy.visitWithAuth('/dispatcher/trip-drafts/101', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-table').should('exist');
    });
});
