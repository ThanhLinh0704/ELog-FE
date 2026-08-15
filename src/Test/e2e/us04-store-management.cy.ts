/**
 * US-04 — Store Management E2E Tests
 *
 * Correct project mapping:
 * - US-04 = Store Management
 * - US-05 = Route Management
 */

import {
  apiError,
  apiSuccess,
  confirmPopconfirm,
  selectAntOption,
  visitAs,
} from './support/testHelpers';

const STORES = [
  {
    id: 1,
    storeCode: 'ST-BT-001',
    storeName: 'Điện Máy Thiên Hà',
    address: '102 Đinh Tiên Hoàng, Bình Thạnh',
    provinceCode: '79',
    districtCode: '760',
    wardCode: '26740',
    addressDetail: '102 Đinh Tiên Hoàng, Bình Thạnh',
    contactName: 'Anh Hà',
    contactPhone: '0901111003',
    latitude: 10.8021,
    longitude: 106.7112,
    isActive: true,
    hasCoordinates: true,
    assignedRoutes: [{ id: 3, code: 'RT-BT-01', name: 'Tuyến Bình Thạnh 01' }],
    createdAt: '2026-06-01T08:00:00',
  },
  {
    id: 2,
    storeCode: 'ST-GV-005',
    storeName: 'Điện Máy Phúc Anh',
    address: '120 Nguyễn Oanh, Gò Vấp',
    provinceCode: '79',
    districtCode: '760',
    wardCode: '26740',
    addressDetail: '120 Nguyễn Oanh, Gò Vấp',
    contactName: 'Phúc Anh',
    contactPhone: '0901234567',
    latitude: null,
    longitude: null,
    isActive: true,
    hasCoordinates: false,
    assignedRoutes: [],
    createdAt: '2026-06-02T08:00:00',
  },
];

function storePage(data = STORES) {
  return apiSuccess({
    content: data,
    page: 0,
    size: 10,
    totalElements: data.length,
    totalPages: 1,
  });
}

function interceptStoreList(data = STORES) {
  cy.intercept('GET', '**/api/stores*', storePage(data)).as('getStores');
  cy.intercept('GET', '**/api/address*/provinces*', apiSuccess([
    { code: '79', name: 'Thành phố Hồ Chí Minh', fullName: 'Thành phố Hồ Chí Minh' }
  ])).as('getProvinces');
  cy.intercept('GET', '**/api/address*/provinces/*/districts*', apiSuccess([
    { code: '760', name: 'Quận 1', fullName: 'Quận 1' }
  ])).as('getDistricts');
  cy.intercept('GET', '**/api/address*/districts/*/wards*', apiSuccess([
    { code: '26740', name: 'Phường Bến Nghé', fullName: 'Phường Bến Nghé' }
  ])).as('getWards');
}

function fillRequiredStoreFields(code: string, name: string, address: string) {
  cy.get('input[placeholder="VD: ST-GV-005"]').type(code);
  cy.get('input[placeholder="VD: Điện Máy Phúc Anh"]').type(name);
  cy.get('#provinceCode').parents('.ant-select').click();
  selectAntOption('Thành phố Hồ Chí Minh');
  cy.wait('@getDistricts');
  cy.wait(300);
  cy.get('#districtCode').parents('.ant-select').click({ force: true });
  selectAntOption('Quận 1');
  cy.wait('@getWards');
  cy.wait(300);
  cy.get('#wardCode').parents('.ant-select').click({ force: true });
  selectAntOption('Phường Bến Nghé');
  cy.get('input#addressDetail').type(address);
}

describe('US-04 — Store Management', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('TC-01: SYSTEM_ADMIN xem danh sách store, tuyến gắn kèm và cảnh báo thiếu GPS', () => {
    interceptStoreList();

    visitAs('/stores');
    cy.wait('@getStores');

    cy.contains('h2', 'Quản lý cửa hàng').should('be.visible');
    cy.contains('Điện Máy Thiên Hà').should('be.visible');
    cy.contains('RT-BT-01').should('be.visible');
    cy.contains('Điện Máy Phúc Anh').should('be.visible');
    cy.contains('1 cửa hàng chưa có toạ độ GPS.').should('be.visible');
  });

  it('TC-02: tạo store mới thành công, payload được trim và uppercase code', () => {
    interceptStoreList();
    cy.intercept('POST', '**/api/stores', (req) => {
      expect(req.body).to.deep.include({
        storeCode: 'ST-GV-006',
        storeName: 'Điện Máy Gia Phát',
        addressDetail: '18 Phan Văn Trị, Gò Vấp',
        contactName: 'Gia Phát',
        contactPhone: '0909999888',
      });
      expect(req.body.latitude).to.eq(10.8384);
      expect(req.body.longitude).to.eq(106.6644);
      req.reply(
        apiSuccess({
          id: 6,
          ...req.body,
          isActive: true,
          hasCoordinates: true,
          assignedRoute: null,
        })
      );
    }).as('createStore');

    visitAs('/stores');
    cy.wait('@getStores');

    cy.contains('button', 'Thêm cửa hàng').click();
    cy.contains('.ant-modal', 'Tạo cửa hàng mới').should('be.visible');
    fillRequiredStoreFields('st-gv-006', 'Điện Máy Gia Phát', '18 Phan Văn Trị, Gò Vấp');
    cy.get('input[placeholder="VD: Phúc Anh"]').type('Gia Phát');
    cy.get('input[placeholder="VD: 0901234567"]').type('0909999888');
    cy.get('input[placeholder="VD: 10.8384"]').type('10.8384');
    cy.get('input[placeholder="VD: 106.6644"]').type('106.6644');

    cy.get('.ant-modal').within(() => {
      cy.contains('button', 'Tạo cửa hàng').click();
    });

    cy.wait('@createStore');
  });

  it('TC-03: nhập thiếu một trong hai toạ độ thì validate inline', () => {
    interceptStoreList();

    visitAs('/stores');
    cy.wait('@getStores');

    cy.contains('button', 'Thêm cửa hàng').click();
    fillRequiredStoreFields('ST-GV-007', 'Store thiếu kinh độ', '88 Nguyễn Kiệm, Gò Vấp');
    cy.get('input[placeholder="VD: 10.8384"]').type('10.8123');

    cy.get('.ant-modal').within(() => {
      cy.contains('button', 'Tạo cửa hàng').click();
    });

    cy.contains('.ant-form-item-explain-error', 'Vui lòng nhập cả Vĩ độ và Kinh độ, hoặc để trống cả hai.').should(
      'be.visible'
    );
  });

  it('TC-04: duplicate storeCode từ backend được map về field Mã cửa hàng', () => {
    interceptStoreList();
    cy.intercept(
      'POST',
      '**/api/stores',
      apiError(409, 'STORE_CODE_DUPLICATE', 'Mã cửa hàng đã tồn tại.', 'storeCode')
    ).as('createDuplicateStore');

    visitAs('/stores');
    cy.wait('@getStores');

    cy.contains('button', 'Thêm cửa hàng').click();
    fillRequiredStoreFields('ST-BT-001', 'Store trùng mã', '99 Nguyễn Oanh, Gò Vấp');
    cy.get('.ant-modal').within(() => {
      cy.contains('button', 'Tạo cửa hàng').click();
    });

    cy.wait('@createDuplicateStore');
    cy.contains('.ant-form-item-explain-error', 'Mã cửa hàng đã tồn tại.').should('exist');
  });

  it('TC-05: DISPATCHER chỉ được xem, không thấy nút tạo/sửa/kích hoạt', () => {
    interceptStoreList();

    visitAs('/stores', ['DISPATCHER'], 'dispatcher01');
    cy.wait('@getStores');

    cy.contains('h2', 'Quản lý cửa hàng').should('be.visible');
    cy.contains('button', 'Thêm cửa hàng').should('not.exist');
    cy.contains('Chỉ xem').should('be.visible');
    cy.get('button[title="Chỉnh sửa"]').should('not.exist');
    cy.get('button[title="Vô hiệu hoá"]').should('not.exist');
  });

  it('TC-06: backend chặn vô hiệu hoá store đang thuộc tuyến thì mở modal hướng xử lý', () => {
    interceptStoreList();
    cy.intercept(
      'PATCH',
      '**/api/stores/1/status',
      apiError(409, 'STORE_IN_ACTIVE_ROUTE', 'Cửa hàng này đang là điểm dừng của tuyến RT-BT-01.')
    ).as('deactivateBlockedStore');

    visitAs('/stores');
    cy.wait('@getStores');

    cy.get('button[title="Vô hiệu hoá"]').first().click();
    confirmPopconfirm();

    cy.wait('@deactivateBlockedStore');
    cy.contains('.ant-modal', 'Không thể vô hiệu hoá').should('be.visible');
    cy.contains('RT-BT-01').should('be.visible');
    cy.contains('Đến trang quản lý tuyến').should('be.visible');
  });

  it('TC-07: tạo store thiếu field bắt buộc thì hiển thị validation errors', () => {
    interceptStoreList();
    cy.intercept('POST', '**/api/stores').as('createStoreShouldNotRun');
    visitAs('/stores');
    cy.wait('@getStores');

    cy.contains('button', 'Thêm cửa hàng').click();
    cy.get('.ant-modal').within(() => {
      cy.contains('button', 'Tạo cửa hàng').click();
    });

    cy.contains('.ant-form-item-explain-error', 'Vui lòng nhập mã cửa hàng.').should('exist');
    cy.contains('.ant-form-item-explain-error', 'Vui lòng nhập tên cửa hàng.').should('exist');
    cy.contains('.ant-form-item-explain-error', 'Vui lòng chọn Tỉnh/Thành phố.').should('exist');
    cy.get('@createStoreShouldNotRun.all').should('have.length', 0);
  });

  it('TC-08: số điện thoại sai format thì frontend không gọi API', () => {
    interceptStoreList();
    cy.intercept('POST', '**/api/stores').as('createStoreShouldNotRun');
    visitAs('/stores');
    cy.wait('@getStores');

    cy.contains('button', 'Thêm cửa hàng').click();
    cy.get('input[placeholder="VD: ST-GV-005"]').type('ST-GV-009');
    cy.get('input[placeholder="VD: Điện Máy Phúc Anh"]').type('Store sai điện thoại');
    cy.get('input#addressDetail').type(
      '99 Phạm Văn Đồng, Gò Vấp'
    );
    cy.get('input[placeholder="VD: 0901234567"]').type('12345');

    cy.get('.ant-modal').within(() => {
      cy.contains('button', 'Tạo cửa hàng').click();
    });

    cy.contains('.ant-form-item-explain-error', 'Số điện thoại phải gồm 10 số').should(
      'be.visible'
    );
    cy.get('@createStoreShouldNotRun.all').should('have.length', 0);
  });

  it('TC-09: DRIVER không có quyền đọc Store Management thì bị đưa về dashboard', () => {
    cy.intercept('GET', '**/api/stores*').as('getStoresShouldNotRun');
    visitAs('/stores', ['DRIVER'], 'driver01');

    cy.url().should('include', '/dashboard');
    cy.get('@getStoresShouldNotRun.all').should('have.length', 0);
  });

  it('TC-10: tạo store không có GPS vẫn thành công và hiện cảnh báo inline', () => {
    interceptStoreList();
    cy.intercept('POST', '**/api/stores', (req) => {
      expect(req.body.latitude).to.eq(null);
      expect(req.body.longitude).to.eq(null);
      req.reply(apiSuccess({ id: 10, ...req.body, isActive: true, hasCoordinates: false }));
    }).as('createStoreWithoutGps');

    visitAs('/stores');
    cy.wait('@getStores');
    cy.contains('button', 'Thêm cửa hàng').click();
    cy.contains('.ant-alert', 'Chưa có toạ độ GPS.').should('exist');
    fillRequiredStoreFields('ST-GV-010', 'Store Không GPS', '10 Quang Trung, Gò Vấp');
    cy.get('.ant-modal').within(() => cy.contains('button', 'Tạo cửa hàng').click());

    cy.wait('@createStoreWithoutGps');
  });

  it('TC-11: nhập longitude nhưng thiếu latitude bị chặn inline', () => {
    interceptStoreList();
    cy.intercept('POST', '**/api/stores').as('storeLongitudeOnlyShouldNotRun');
    visitAs('/stores');
    cy.wait('@getStores');
    cy.contains('button', 'Thêm cửa hàng').click();
    fillRequiredStoreFields('ST-GV-011', 'Store Thiếu Latitude', '11 Quang Trung, Gò Vấp');
    cy.get('input[placeholder="VD: 106.6644"]').type('106.6644');
    cy.get('.ant-modal').within(() => cy.contains('button', 'Tạo cửa hàng').click());

    cy.contains('.ant-form-item-explain-error', 'Vui lòng nhập cả Vĩ độ và Kinh độ').should(
      'be.visible'
    );
    cy.get('@storeLongitudeOnlyShouldNotRun.all').should('have.length', 0);
  });

  it('TC-12: latitude ngoài range được backend map thành lỗi inline', () => {
    interceptStoreList();
    cy.intercept(
      'POST',
      '**/api/stores',
      apiError(400, 'INVALID_LATITUDE', 'Vĩ độ phải nằm trong khoảng -90 đến 90.', 'latitude')
    ).as('invalidLatitude');

    visitAs('/stores');
    cy.wait('@getStores');
    cy.contains('button', 'Thêm cửa hàng').click();
    fillRequiredStoreFields('ST-GV-012', 'Store Sai Latitude', '12 Quang Trung, Gò Vấp');
    cy.get('input[placeholder="VD: 10.8384"]').type('91');
    cy.get('input[placeholder="VD: 106.6644"]').type('106.6');
    cy.get('.ant-modal').within(() => cy.contains('button', 'Tạo cửa hàng').click());

    cy.wait('@invalidLatitude');
    cy.contains('.ant-form-item-explain-error', 'Vĩ độ phải nằm trong khoảng -90 đến 90.').should(
      'be.visible'
    );
  });

  it('TC-13: longitude ngoài range được backend map thành lỗi inline', () => {
    interceptStoreList();
    cy.intercept(
      'POST',
      '**/api/stores',
      apiError(400, 'INVALID_LONGITUDE', 'Kinh độ phải nằm trong khoảng -180 đến 180.', 'longitude')
    ).as('invalidLongitude');

    visitAs('/stores');
    cy.wait('@getStores');
    cy.contains('button', 'Thêm cửa hàng').click();
    fillRequiredStoreFields('ST-GV-013', 'Store Sai Longitude', '13 Quang Trung, Gò Vấp');
    cy.get('input[placeholder="VD: 10.8384"]').type('10.8');
    cy.get('input[placeholder="VD: 106.6644"]').type('181');
    cy.get('.ant-modal').within(() => cy.contains('button', 'Tạo cửa hàng').click());

    cy.wait('@invalidLongitude');
    cy.contains('.ant-form-item-explain-error', 'Kinh độ phải nằm trong khoảng -180 đến 180.').should(
      'be.visible'
    );
  });

  it('TC-14: form chỉnh sửa giữ storeCode readonly và chỉ gửi field được phép sửa', () => {
    interceptStoreList();
    cy.intercept('GET', '**/api/stores/2', apiSuccess(STORES[1])).as('getStoreDetail');
    cy.intercept('PUT', '**/api/stores/2', (req) => {
      expect(req.body).not.to.have.property('storeCode');
      expect(req.body.addressDetail).to.eq('220 Nguyễn Oanh, Gò Vấp');
      req.reply(apiSuccess({ ...STORES[1], ...req.body }));
    }).as('updateStore');

    visitAs('/stores');
    cy.wait('@getStores');
    cy.contains('tr', 'ST-GV-005').within(() => cy.get('button[title="Chỉnh sửa"]').click());
    cy.wait('@getStoreDetail');
    cy.get('input[placeholder="VD: ST-GV-005"]').should('be.disabled');
    cy.get('input#addressDetail')
      .clear()
      .type('220 Nguyễn Oanh, Gò Vấp');
    cy.get('.ant-modal').within(() => cy.contains('button', 'Lưu thay đổi').click());

    cy.wait('@updateStore');
  });

  it('TC-15: vô hiệu hoá store chưa gắn tuyến cập nhật trạng thái trên bảng', () => {
    let inactive = false;
    cy.intercept('GET', '**/api/stores*', (req) => {
      req.reply(storePage(STORES.map((s) => (s.id === 2 ? { ...s, isActive: !inactive } : s))));
    }).as('getStoresLifecycle');
    cy.intercept('PATCH', '**/api/stores/2/status', (req) => {
      expect(req.body).to.deep.eq({ isActive: false });
      inactive = true;
      req.reply(apiSuccess({ ...STORES[1], isActive: false }));
    }).as('deactivateStore');

    visitAs('/stores');
    cy.wait('@getStoresLifecycle');
    cy.contains('tr', 'ST-GV-005').within(() => cy.get('button[title="Vô hiệu hoá"]').click());
    confirmPopconfirm();
    cy.wait('@deactivateStore');
    cy.contains('tr', 'ST-GV-005').should('contain.text', 'Đã vô hiệu hoá');
  });

  it('TC-16: kích hoạt lại store inactive cập nhật trạng thái trên bảng', () => {
    let active = false;
    const inactiveStores = STORES.map((s) => (s.id === 2 ? { ...s, isActive: false } : s));
    cy.intercept('GET', '**/api/stores*', (req) => {
      req.reply(storePage(inactiveStores.map((s) => (s.id === 2 ? { ...s, isActive: active } : s))));
    }).as('getInactiveStores');
    cy.intercept('PATCH', '**/api/stores/2/status', (req) => {
      expect(req.body).to.deep.eq({ isActive: true });
      active = true;
      req.reply(apiSuccess({ ...STORES[1], isActive: true }));
    }).as('reactivateStore');

    visitAs('/stores');
    cy.wait('@getInactiveStores');
    cy.contains('tr', 'ST-GV-005').within(() => cy.get('button[title="Kích hoạt"]').click());
    confirmPopconfirm();
    cy.wait('@reactivateStore');
    cy.contains('tr', 'ST-GV-005').should('contain.text', 'Hoạt động');
  });

  it('TC-17: tìm kiếm không có kết quả hiển thị empty state tiếng Việt', () => {
    interceptStoreList();
    visitAs('/stores');
    cy.wait('@getStores');
    cy.intercept('GET', '**/api/stores*', (req) => {
      expect(String(req.query.keyword ?? '')).to.eq('khong-ton-tai');
      req.reply(storePage([]));
    }).as('searchStoresEmpty');
    cy.get('input[placeholder="Tìm theo mã hoặc tên cửa hàng..."]').type('khong-ton-tai');
    cy.wait('@searchStoresEmpty');

    cy.contains('Không tìm thấy cửa hàng phù hợp').should('be.visible');
  });

  it('TC-18: filter trạng thái và tuyến gửi đúng query parameters', () => {
    interceptStoreList();
    visitAs('/stores');
    cy.wait('@getStores');
    cy.intercept('GET', '**/api/stores*', (req) => {
      expect(String(req.query.isActive ?? '')).to.eq('false');
      req.reply(storePage([]));
    }).as('filterInactiveStores');
    cy.get('.ant-select').eq(0).click({ force: true });
    cy.contains('[role="option"], .ant-select-item-option-content', 'Đã vô hiệu hoá').click({ force: true });
    cy.wait('@filterInactiveStores');

    cy.intercept('GET', '**/api/stores*', (req) => {
      expect(String(req.query.isActive ?? '')).to.eq('false');
      expect(String(req.query.hasRoute ?? '')).to.eq('false');
      req.reply(storePage([]));
    }).as('filterInactiveUnassignedStores');
    cy.get('.ant-select').eq(1).click({ force: true });
    cy.contains('[role="option"], .ant-select-item-option-content', 'Chưa gắn tuyến').click({ force: true });
    cy.wait('@filterInactiveUnassignedStores');
  });
});
