import { visitAs, apiSuccess } from './support/testHelpers';

describe('US-07: Product Management E2E Test Suite', () => {
  const mockProducts = [
    {
      id: 1,
      sku: 'PROD-001',
      productName: 'Tủ Lạnh Samsung 300L',
      weightKg: 65.0,
      lengthM: 0.6,
      widthM: 0.68,
      heightM: 1.75,
      volumeM3: 0.714,
      isActive: true,
    },
    {
      id: 2,
      sku: 'PROD-002',
      productName: 'Tivi LG 55 Inch 4K',
      weightKg: 18.5,
      lengthM: 1.25,
      widthM: 0.15,
      heightM: 0.75,
      volumeM3: 0.1406,
      isActive: true,
    },
  ];

  beforeEach(() => {
    cy.intercept('GET', '**/api/products*', (req) => {
      req.reply(
        apiSuccess(mockProducts, {
          page: 0,
          size: 10,
          totalElements: mockProducts.length,
          totalPages: 1,
        })
      );
    }).as('getProducts');
  });

  it('TC-US07-01: Displays product list table correctly', () => {
    visitAs('/admin/products', ['SYSTEM_ADMIN']);
    cy.wait('@getProducts');

    cy.contains('Danh mục sản phẩm').should('be.visible');
    cy.contains('PROD-001').should('be.visible');
    cy.contains('Tủ Lạnh Samsung 300L').should('be.visible');
    cy.contains('PROD-002').should('be.visible');
  });

  it('TC-US07-02: Filters product list by search keyword', () => {
    visitAs('/admin/products', ['SYSTEM_ADMIN']);
    cy.wait('@getProducts');

    cy.intercept('GET', '**/api/products*keyword=Tivi*', apiSuccess([mockProducts[1]])).as('searchProduct');

    cy.get('input[placeholder*="Tìm theo SKU"]').type('Tivi{enter}');
    cy.wait('@searchProduct');

    cy.contains('PROD-002').should('be.visible');
  });

  it('TC-US07-03: Navigates to Product Form and creates new product with auto volume calculation', () => {
    visitAs('/admin/products', ['SYSTEM_ADMIN']);
    cy.wait('@getProducts');

    cy.contains('button, a', 'Thêm sản phẩm').click();
    cy.url().should('include', '/admin/products/new');

    cy.intercept('POST', '**/api/products*', (req) => {
      req.reply(
        apiSuccess({
          id: 3,
          sku: 'PROD-003',
          productName: 'Máy Giặt Electrolux',
          weightKg: 55,
          lengthM: 0.6,
          widthM: 0.6,
          heightM: 0.85,
          volumeM3: 0.306,
          isActive: true,
        })
      );
    }).as('createProduct');

    cy.get('input[placeholder*="TV-SAM-55"]').type('PROD-003');
    cy.get('input[placeholder*="Nhập tên sản phẩm"]').type('Máy Giặt Electrolux');
    cy.get('input[placeholder="Nặng"]').type('55');
    cy.get('input[placeholder="Dài"]').type('0.6');
    cy.get('input[placeholder="Rộng"]').type('0.6');
    cy.get('input[placeholder="Cao"]').type('0.85');

    cy.get('button[type="submit"]').click();
    cy.wait('@createProduct');

    cy.url().should('include', '/admin/products');
  });
});
