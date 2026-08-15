/**
 * US-10/11/12 — Trip Planning E2E Tests
 */

import {
  apiSuccess,
  resetE2EState,
  visitAs,
} from './support/testHelpers';

const MOCK_DRAFTS = [
  {
    tripDraftId: 15,
    deliveryDate: '2026-08-08',
    status: 'DRAFT',
    fixedRouteCode: 'HN-HP-01',
    stopCount: 5,
    totalWeightKg: 4500,
    totalVolumeM3: 12.5,
    plannedDepartureTime: '08:00',
    tripStops: [],
  }
];

const MOCK_VALIDATION = {
  tripDraftId: 15,
  status: 'VALIDATED',
  isValid: true,
  warnings: [],
  totalWeight: 4500,
  totalVolume: 12.5,
  checkedAt: '2026-08-08T10:00:00',
};

const MOCK_RECOMMENDATIONS = {
  tripDraftId: 15,
  solutions: [
    {
      solutionId: 1,
      type: 'SINGLE_VEHICLE',
      score: 95.5,
      totalCost: 1200000,
      utilizationRate: 0.85,
      vehicles: [
        { vehicleId: 1, plateNumber: '29A-12345', driverName: 'Lê Văn Tải', score: 95.5 }
      ]
    },
    {
      solutionId: 2,
      type: 'SINGLE_VEHICLE',
      score: 88.2,
      totalCost: 1400000,
      utilizationRate: 0.72,
      vehicles: [
        { vehicleId: 2, plateNumber: '29A-67890', driverName: 'Trần Văn Lái', score: 88.2 }
      ]
    }
  ]
};

describe('US-10/11/12 — Trip Planning Flow', () => {
  beforeEach(() => {
    resetE2EState();
  });

  afterEach(() => {
    resetE2EState();
  });

  it('TC-01: Dispatcher gom đơn hàng và xem danh sách Trip Draft', () => {
    // Intercept API gom đơn và lấy danh sách draft
    cy.intercept('POST', '**/api/trip-drafts/consolidate', apiSuccess({ count: 1 })).as('consolidate');
    cy.intercept('GET', '**/api/trip-drafts?deliveryDate=*', apiSuccess(MOCK_DRAFTS)).as('getDrafts');

    visitAs('/dispatcher/trip-drafts');
    
    // Thực hiện gom đơn
    cy.contains('Gom đơn hàng').click();
    cy.get('input[placeholder="Chọn ngày"]').type('2026-08-08{enter}');
    cy.get('button').contains('Xác nhận').click();
    
    cy.wait('@consolidate');
    cy.wait('@getDrafts');

    // Xác nhận giao diện hiển thị đúng Trip Draft vừa gom
    cy.contains('HN-HP-01').should('be.visible');
    cy.contains('4500 kg').should('be.visible');
    cy.contains('12.5 m³').should('be.visible');
    cy.contains('DRAFT').should('be.visible');
  });

  it('TC-02: Dispatcher thực hiện Validate Capacity và xem Gợi ý xe', () => {
    cy.intercept('GET', '**/api/trip-drafts/15', apiSuccess(MOCK_DRAFTS[0])).as('getDraftDetail');
    cy.intercept('POST', '**/api/trip-drafts/15/validate-capacity', apiSuccess(MOCK_VALIDATION)).as('validateCapacity');
    cy.intercept('GET', '**/api/trip-drafts/15/validation-result', apiSuccess(MOCK_VALIDATION)).as('getValidationResult');
    cy.intercept('GET', '**/api/trip-drafts/15/recommendations', apiSuccess(MOCK_RECOMMENDATIONS)).as('getRecommendations');

    // Truy cập trực tiếp trang chi tiết Draft 15
    visitAs('/dispatcher/trip-drafts/15');
    cy.wait('@getDraftDetail');

    // Click nút Validate Capacity
    cy.contains('Kiểm tra tải trọng').click();
    cy.wait('@validateCapacity');
    cy.wait('@getValidationResult');

    // Xác nhận hiển thị kết quả kiểm tra thành công (VALIDATED)
    cy.contains('Hợp lệ').should('be.visible');

    // Xem gợi ý xe Top-3
    cy.contains('Gợi ý xe tối ưu').click();
    cy.wait('@getRecommendations');

    // Xác nhận hiển thị xe gợi ý với điểm số và biển số xe
    cy.contains('29A-12345').should('be.visible');
    cy.contains('Lê Văn Tải').should('be.visible');
    cy.contains('95.5').should('be.visible'); // Score
  });
});
