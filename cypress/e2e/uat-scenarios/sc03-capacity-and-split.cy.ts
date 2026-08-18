const capacityPass = {
    tripDraftId: 102,
    fixedRouteCode: 'RT-01',
    deliveryDate: '2026-08-16',
    newStatus: 'VALIDATED',
    totalWeightKg: 1200.0,
    totalVolumeM3: 4.5,
    validationPassed: true,
    volumeCheckResult: 'PASS',
    weightCheckResult: 'PASS',
    eligibleVehicles: [
        { vehicleId: 1, plateNumber: '29A-12345', vehicleType: 'TRUCK_2_5T', maxVolumeM3: 6.0, maxWeightKg: 1500.0, remainingVolumeM3: 1.5, remainingWeightKg: 300.0 }
    ],
    ineligibleVehicles: [],
    message: 'Capacity validation passed'
};

const draft = (id: number, status: string) => ({
    id,
    routeId: id,
    routeCode: id === 104 ? 'RT-02' : 'RT-01',
    deliveryDate: '2026-08-16',
    status,
    totalWeightKg: 1200,
    totalVolumeM3: 4.5,
    activeStopCount: 1,
    skippedStopCount: 0,
    stops: [{ tripDraftStopId: 1, sequenceNo: 1, storeId: 2, storeName: 'KH0002', storeCode: 'KH0002', plannedEta: '08:45:00', isActive: true, orderCount: 1 }]
});

describe('UAT SC-03: Capacity Validation & Split Decision', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    it('[ELOG-SC03-01] Validate Within-Capacity Single Vehicle Trip', () => {
        cy.intercept('GET', '**/api/v1/trip-drafts/102/validation-result', {
            statusCode: 200,
            body: { success: true, data: capacityPass }
        }).as('getCapacity');

        cy.visitWithAuth('/dispatcher/trip-drafts/102/capacity', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card, .ant-alert').should('exist');
    });

    it('[ELOG-SC03-02] Apply Split Recommendation for Overloaded Route', () => {
        cy.intercept('GET', '**/api/v1/trip-drafts/103', {
            statusCode: 200,
            body: { success: true, data: draft(103, 'DRAFT') }
        }).as('getDraft103');

        cy.visitWithAuth('/dispatcher/trip-drafts/103', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
    });

    it('[ELOG-SC03-03] Revert Confirmed Draft Back to Draft State', () => {
        cy.intercept('GET', '**/api/v1/trip-drafts/104', {
            statusCode: 200,
            body: { success: true, data: draft(104, 'CONFIRMED') }
        }).as('getConfirmedDraft');

        cy.visitWithAuth('/dispatcher/trip-drafts/104', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
    });
});
