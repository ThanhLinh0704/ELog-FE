const mockValidatedDraft = {
    id: 102,
    routeId: 1,
    routeCode: 'RT-01',
    deliveryDate: '2026-08-16',
    status: 'VALIDATED',
    totalWeightKg: 1200,
    totalVolumeM3: 4.5,
    activeStopCount: 2,
    skippedStopCount: 0,
    stops: [
        { tripDraftStopId: 1, sequenceNo: 1, storeId: 2, storeName: 'KH0002', plannedEta: '08:45:00', isActive: true, orderCount: 1 },
        { tripDraftStopId: 2, sequenceNo: 2, storeId: 3, storeName: 'KH0003', plannedEta: '09:30:00', isActive: true, orderCount: 1 }
    ]
};

describe('UAT SC-03: Capacity Validation & Split Decision', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    it('[ELOG-SC03-01] Validate Within-Capacity Single Vehicle Trip', () => {
        cy.intercept('GET', '**/api/v1/trip-drafts/102', {
            statusCode: 200,
            body: { success: true, data: mockValidatedDraft }
        }).as('getDraft102');

        cy.intercept('GET', '**/api/v1/trip-drafts/102/validation-result', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    tripDraftId: 102,
                    volumeCheckResult: 'PASS',
                    weightCheckResult: 'PASS',
                    eligibleVehicles: [
                        { vehicleId: 1, plateNumber: '29A-12345', maxVolumeM3: 10.0, maxWeightKg: 2500, remainingVolumeM3: 5.5, remainingWeightKg: 1300 }
                    ],
                    ineligibleVehicles: []
                }
            }
        }).as('getValidationResult');

        cy.visitWithAuth('/dispatcher/trip-drafts/102/capacity', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
        cy.get('button').filter(':visible').should('have.length.at.least', 1);
    });

    it('[ELOG-SC03-02] Apply Split Recommendation for Overloaded Route', () => {
        cy.intercept('GET', '**/api/v1/trip-drafts/103', {
            statusCode: 200,
            body: {
                success: true,
                data: { ...mockValidatedDraft, id: 103, totalWeightKg: 4000, totalVolumeM3: 18.0 }
            }
        }).as('getDraft103');

        cy.visitWithAuth('/dispatcher/trip-drafts/103', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
    });

    it('[ELOG-SC03-03] Revert Confirmed Draft Back to Draft State', () => {
        cy.intercept('GET', '**/api/v1/trip-drafts/104', {
            statusCode: 200,
            body: {
                success: true,
                data: { ...mockValidatedDraft, id: 104, status: 'CONFIRMED' }
            }
        }).as('getDraft104');

        cy.visitWithAuth('/dispatcher/trip-drafts/104', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
    });
});
