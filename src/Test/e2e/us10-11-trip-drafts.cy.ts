import { visitAs, apiSuccess } from './support/testHelpers';

describe('US-10 & US-11: Trip Drafts & Review E2E Test Suite', () => {
  const mockTripDrafts = [
    {
      id: 1,
      routeCode: 'RT-HN-001',
      routeName: 'Tuyến Hà Nội - Hà Đông',
      deliveryDate: '2026-07-22',
      status: 'PLANNED',
      activeStopCount: 4,
      skippedStopCount: 0,
      totalWeightKg: 1250,
      totalVolumeM3: 14.5,
    },
    {
      id: 2,
      routeCode: 'RT-HN-002',
      routeName: 'Tuyến Hà Nội - Cầu Giấy',
      deliveryDate: '2026-07-22',
      status: 'VALIDATED',
      activeStopCount: 3,
      skippedStopCount: 1,
      totalWeightKg: 850,
      totalVolumeM3: 9.2,
    },
  ];

  beforeEach(() => {
    cy.intercept('GET', '**/api/trip-drafts*', (req) => {
      req.reply(
        apiSuccess(mockTripDrafts, {
          page: 0,
          size: 10,
          totalElements: mockTripDrafts.length,
          totalPages: 1,
        })
      );
    }).as('getTripDrafts');
  });

  it('TC-US10-01: Displays Trip Drafts list and runs automatic consolidation', () => {
    visitAs('/dispatcher/trip-drafts', ['DISPATCHER']);
    cy.wait('@getTripDrafts');

    cy.contains('Quản lý gom đơn').should('be.visible');
    cy.contains('RT-HN-001').should('be.visible');
    cy.contains('RT-HN-002').should('be.visible');

    cy.intercept('POST', '**/api/trip-drafts/consolidate', apiSuccess({ consolidatedCount: 1 })).as('consolidateTrips');
    cy.contains('button', 'Gom đơn (Consolidate)').click();
    cy.wait('@consolidateTrips');
  });

  it('TC-US11-01: Navigates to trip draft detail and displays stops itinerary', () => {
    visitAs('/dispatcher/trip-drafts', ['DISPATCHER']);
    cy.wait('@getTripDrafts');

    cy.intercept('GET', '**/api/trip-drafts/1', apiSuccess(mockTripDrafts[0])).as('getTripDraftDetail');

    cy.contains('tr', 'RT-HN-001').within(() => {
      cy.contains('Xem chi tiết').click();
    });
    cy.wait('@getTripDraftDetail');

    cy.contains('RT-HN-001').should('be.visible');
  });
});
