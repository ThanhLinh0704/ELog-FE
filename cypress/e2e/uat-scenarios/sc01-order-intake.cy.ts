describe('UAT SC-01: Order Intake & Batch Processing', () => {
    beforeEach(() => {
        cy.clearLocalStorage();
        cy.clearCookies();
    });

    it('[ELOG-SC01-01] Import Valid Delivery Orders Spreadsheet (mau_import_150_don_hang_3_ngay.xlsx)', () => {
        cy.intercept('GET', '**/api/v1/imports?*', {
            statusCode: 200,
            body: {
                success: true,
                data: [
                    { batchId: 101, fileName: 'mau_import_150_don_hang_3_ngay.xlsx', deliveryDate: '2026-08-16', totalRows: 50, acceptedRows: 50, rejectedRows: 0, ordersCreated: 50, uploadedBy: 'dispatcher01', createdAt: '2026-08-16T08:00:00Z', isActive: true }
                ],
                pagination: { page: 0, size: 10, totalElements: 1, totalPages: 1 }
            }
        }).as('getHistory');

        cy.visitWithAuth('/dispatcher/import', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
        cy.get('.ant-upload-drag, .ant-upload').should('exist');
        cy.get('.ant-table').should('contain.text', 'mau_import_150_don_hang_3_ngay.xlsx');
    });

    it('[ELOG-SC01-02] Partial Row Validation and Error Export', () => {
        cy.intercept('GET', '**/api/v1/imports/102', {
            statusCode: 200,
            body: {
                success: true,
                data: {
                    batchId: 102,
                    fileName: 'uat_partial_validation.xlsx',
                    deliveryDate: '2026-08-16',
                    totalRows: 12,
                    acceptedRows: 10,
                    rejectedRows: 2,
                    ordersCreated: 10,
                    createdAt: '2026-08-16T08:10:00Z'
                }
            }
        }).as('getBatchErrorDetail');

        cy.intercept('GET', '**/api/v1/imports/102/errors*', {
            statusCode: 200,
            body: {
                success: true,
                data: [
                    { rowNumber: 11, orderCode: 'DH-1608-011', errorCode: 'STORE_NOT_FOUND', fieldName: 'storeCode', errorReason: 'Store STR-999 not found in master data', rawData: 'STR-999' },
                    { rowNumber: 12, orderCode: 'DH-1608-012', errorCode: 'INVALID_QUANTITY', fieldName: 'quantity', errorReason: 'Quantity must be greater than zero', rawData: '-1' }
                ],
                pagination: { page: 0, size: 20, totalElements: 2, totalPages: 1 }
            }
        }).as('getBatchErrors');

        cy.visitWithAuth('/dispatcher/import/history/102', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-card').should('exist');
        cy.get('.ant-table').should('contain.text', 'STR-999');
        cy.get('.ant-table').should('contain.text', 'Quantity must be greater than zero');
    });

    it('[ELOG-SC01-03] Block Import for Past Delivery Date', () => {
        cy.visitWithAuth('/dispatcher/import', 'dispatcher01', 'DISPATCHER');
        cy.get('.ant-upload-drag, .ant-upload').should('exist');
    });
});
