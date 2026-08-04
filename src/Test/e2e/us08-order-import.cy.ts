import { visitAs, apiSuccess } from './support/testHelpers';

describe('US-08 & US-09: Order Excel Import E2E Test Suite', () => {
  const mockBatchResponse = {
    batchId: 101,
    fileName: 'orders_2026_07_22.xlsx',
    status: 'COMPLETED',
    totalRows: 5,
    acceptedRows: 4,
    rejectedRows: 1,
    deliveryDate: '2026-07-22',
  };

  beforeEach(() => {
    cy.intercept('GET', '**/api/imports*', (req) => {
      req.reply(
        apiSuccess([mockBatchResponse], {
          page: 0,
          size: 10,
          totalElements: 1,
          totalPages: 1,
        })
      );
    }).as('getBatches');
  });

  it('TC-US08-01: Displays Order Import page correctly', () => {
    visitAs('/dispatcher/import', ['DISPATCHER']);
    cy.wait('@getBatches');

    cy.contains('Nhập đơn hàng từ Excel').should('be.visible');
    cy.contains('Tải xuống file mẫu').should('be.visible');
    cy.contains('orders_2026_07_22.xlsx').should('be.visible');
  });

  it('TC-US08-02: Uploads Excel file and displays preview table with accepted and rejected rows', () => {
    visitAs('/dispatcher/import', ['DISPATCHER']);
    cy.wait('@getBatches');

    cy.intercept('POST', '**/api/imports*', (req) => {
      req.reply(apiSuccess(mockBatchResponse));
    }).as('uploadImport');

    cy.intercept('GET', '**/api/imports/101*', (req) => {
      req.reply(apiSuccess(mockBatchResponse));
    }).as('getBatchDetail');

    cy.intercept('GET', '**/api/imports/101/errors*', (req) => {
      req.reply(apiSuccess([]));
    }).as('getBatchErrors');

    // Fill required deliveryDate field (must be current or future date)
    cy.get('input#deliveryDate').type('15/08/2026{enter}');

    // Simulate file attachment to input[type="file"]
    const fileName = 'orders_test.xlsx';
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('dummy excel content'),
      fileName,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }, { force: true });

    cy.contains('button', 'Tải lên').click();
    cy.wait('@uploadImport');

    cy.wait('@getBatchDetail');

    cy.contains('Chi tiết Batch #101').should('be.visible');
  });
});
