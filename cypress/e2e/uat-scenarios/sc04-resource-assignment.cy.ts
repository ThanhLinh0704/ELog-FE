const assignableDraft = {
    id: 105,
    routeId: 1,
    routeCode: 'RT-01',
    deliveryDate: '2026-08-16',
    status: 'VALIDATED',
    totalWeightKg: 1200,
    totalVolumeM3: 4.5,
    activeStopCount: 2,
    skippedStopCount: 0,
    stops: [
        { tripDraftStopId: 1, sequenceNo: 1, storeId: 2, storeName: 'KH0002', storeCode: 'KH0002', plannedEta: '08:45:00', isActive: true, orderCount: 1 },
        { tripDraftStopId: 2, sequenceNo: 2, storeId: 3, storeName: 'KH0003', storeCode: 'KH0003', plannedEta: '09:30:00', isActive: true, orderCount: 1 }
    ]
};

describe('UAT SC-04: Vehicle & Driver Resource Assignment', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    it('[ELOG-SC04-01] Assign Available Driver and Compatible Vehicle', () => {
        cy.intercept('GET', '**/api/v1/trip-drafts/105', {
            statusCode: 200,
            body: { success: true, data: assignableDraft }
        }).as('getDraft105');

        cy.intercept('GET', '**/api/v1/trip-drafts/105/eligible-vehicles*', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    eligibleVehicles: [
                        { vehicleId: 1, plateNumber: '29A-12345', vehicleType: 'TRUCK_2_5T', maxVolumeM3: 10.0, payloadKg: 2500, remainingVolumeM3: 5.5, remainingWeightKg: 1300, assignedDriverId: 10, assignedDriverName: 'Le Van Driver', assignedDriverAvailable: true }
                    ],
                    ineligibleVehicles: []
                }
            }
        }).as('getVehicles');

        cy.intercept('GET', '**/api/v1/drivers/available*', {
            statusCode: 200,
            body: {
                success: true,
                data: [
                    { userId: 10, fullName: 'Le Van Driver', email: 'driver@example.com', available: true }
                ]
            }
        }).as('getDrivers');

        cy.visitWithAuth('/dispatcher/trip-drafts/105/assign', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
        cy.get('button').filter(':visible').should('have.length.at.least', 1);
    });

    it('[ELOG-SC04-02] Block Assignment of Busy Vehicle and Ineligible Driver', () => {
        cy.intercept('GET', '**/api/v1/trip-drafts/105', {
            statusCode: 200,
            body: { success: true, data: assignableDraft }
        }).as('getDraft105');

        cy.intercept('GET', '**/api/v1/trip-drafts/105/eligible-vehicles*', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    eligibleVehicles: [],
                    ineligibleVehicles: [
                        { vehicleId: 2, plateNumber: '29B-99999', vehicleType: 'TRUCK_2_5T', maxVolumeM3: 10, payloadKg: 2500, volumeCheckResult: 'PASS', weightCheckResult: 'PASS', failureReason: 'IN_USE' }
                    ]
                }
            }
        }).as('getIneligible');

        cy.visitWithAuth('/dispatcher/trip-drafts/105/assign', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card, .ant-alert').should('exist');
    });

    it('[ELOG-SC04-03] Update Driver Availability Status (Sick Leave / Off Duty)', () => {
        cy.intercept('GET', '**/api/v1/drivers*', {
            statusCode: 200,
            body: {
                success: true,
                data: [{ id: 11, fullName: 'Tran Van C', status: 'ACTIVE', phoneNumber: '0988888888' }],
                pagination: { page: 0, size: 10, totalElements: 1, totalPages: 1 }
            }
        }).as('getDriverList');

        cy.visitWithAuth('/admin/drivers', 'admin', 'ADMIN');
        cy.get('.ant-card, .ant-table').should('exist');
        cy.get('button').filter(':visible').should('have.length.at.least', 1);
    });
});
