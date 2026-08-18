/**
 * US-05 — Route Management E2E Tests
 *
 * Correct project mapping:
 * - US-04 = Store Management
 * - US-05 = Route Management
 *
 * Run note:
 * - Route API has a VITE_USE_MOCK switch in the FE source.
 * - For deterministic cy.intercept() tests, start the FE with VITE_USE_MOCK=false.
 */

import { apiError, apiSuccess, visitAs } from './support/testHelpers';

const ROUTES = [
  {
    id: 3,
    code: 'RT-BT-01',
    name: 'Tuyến Bình Thạnh 01',
    description: 'Phục vụ khu vực Bình Thạnh',
    isActive: false,
    stopCount: 1,
    coordinatesWarningCount: 1,
    createdAt: '2026-06-01T08:00:00',
    updatedAt: '2026-06-01T08:00:00',
  },
  {
    id: 4,
    code: 'RT-GV-01',
    name: 'Tuyến Gò Vấp 01',
    description: 'Phục vụ khu vực Gò Vấp',
    isActive: true,
    stopCount: 3,
    coordinatesWarningCount: 0,
    createdAt: '2026-06-02T08:00:00',
    updatedAt: '2026-06-02T08:00:00',
  },
];

const ROUTE_DETAIL = {
  ...ROUTES[0],
  stops: [
    {
      id: 31,
      routeId: 3,
      sequenceOrder: 1,
      store: {
        id: 2,
        storeCode: 'ST-GV-005',
        storeName: 'Điện Máy Phúc Anh',
        address: '120 Nguyễn Oanh, Gò Vấp',
        latitude: null,
        longitude: null,
        hasCoordinates: false,
      },
    },
  ],
};

const AVAILABLE_STORES = [
  {
    id: 8,
    storeCode: 'ST-BT-008',
    storeName: 'Điện Lạnh Thanh Bình',
    address: '67 Nguyễn Xí, Bình Thạnh',
    latitude: 10.814,
    longitude: 106.712,
    hasCoordinates: true,
    isActive: true,
    assignedRoute: null,
  },
];

const ROUTE_DETAIL_THREE_STOPS = {
  ...ROUTES[0],
  stopCount: 3,
  stops: [
    {
      id: 31,
      routeId: 3,
      sequenceOrder: 1,
      store: {
        id: 2,
        storeCode: 'ST-GV-005',
        storeName: 'Điện Máy Phúc Anh',
        address: '120 Nguyễn Oanh, Gò Vấp',
        latitude: null,
        longitude: null,
        hasCoordinates: false,
      },
    },
    {
      id: 32,
      routeId: 3,
      sequenceOrder: 2,
      store: {
        id: 8,
        storeCode: 'ST-BT-008',
        storeName: 'Điện Lạnh Thanh Bình',
        address: '67 Nguyễn Xí, Bình Thạnh',
        latitude: 10.814,
        longitude: 106.712,
        hasCoordinates: true,
      },
    },
    {
      id: 33,
      routeId: 3,
      sequenceOrder: 3,
      store: {
        id: 9,
        storeCode: 'ST-BT-009',
        storeName: 'Điện Máy Hoàng Gia',
        address: '80 Bạch Đằng, Bình Thạnh',
        latitude: 10.82,
        longitude: 106.71,
        hasCoordinates: true,
      },
    },
  ],
};

function interceptRouteList() {
  cy.intercept('GET', '**/api/routes*', (req) => {
    const isActive = String(req.query.isActive ?? '');
    const data =
      isActive === 'true'
        ? ROUTES.filter((route) => route.isActive)
        : isActive === 'false'
          ? ROUTES.filter((route) => !route.isActive)
          : ROUTES;

    req.reply(
      apiSuccess(data, {
        page: 0,
        size: Number(req.query.size ?? 10),
        totalElements: data.length,
        totalPages: 1,
      })
    );
  }).as('getRoutes');
}

function interceptRouteDetail(route = ROUTE_DETAIL) {
  cy.intercept('GET', '**/api/routes/3', apiSuccess(route)).as('getRouteDetail');
}

describe('US-05 — Route Management', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('TC-01: SYSTEM_ADMIN xem danh sách route, trạng thái và cảnh báo thiếu GPS', () => {
    interceptRouteList();

    visitAs('/admin/routes');
    cy.wait('@getRoutes');

    cy.contains('h2', 'Quản lý tuyến').should('be.visible');
    cy.contains('RT-BT-01').should('be.visible');
    cy.contains('Tuyến Bình Thạnh 01').should('be.visible');
    cy.contains('Chưa kích hoạt').should('be.visible');
    cy.contains('RT-GV-01').should('be.visible');
    cy.contains('Đang hoạt động').should('be.visible');
  });

  it('TC-02: DISPATCHER được xem route nhưng không được tạo/sửa/kích hoạt', () => {
    interceptRouteList();

    visitAs('/admin/routes', ['DISPATCHER'], 'dispatcher01');
    cy.wait('@getRoutes');

    cy.contains('h2', 'Quản lý tuyến').should('be.visible');
    cy.contains('button', 'Tạo tuyến').should('not.exist');
    cy.get('button[title="Chỉnh sửa"]').should('not.exist');
    cy.get('button[title="Kích hoạt"]').should('not.exist');
    cy.get('button[title="Vô hiệu hoá"]').should('not.exist');
  });

  it('TC-03: tạo route mới thành công và điều hướng sang trang chi tiết', () => {
    cy.intercept('POST', '**/api/routes', (req) => {
      expect(req.body).to.deep.eq({
        code: 'RT-TD-01',
        name: 'Tuyến Thủ Đức 01',
        description: 'Khu vực Thủ Đức',
      });
      req.reply(
        apiSuccess({
          id: 10,
          ...req.body,
          isActive: false,
          stopCount: 0,
          coordinatesWarningCount: 0,
          createdAt: '2026-06-10T08:00:00',
          updatedAt: '2026-06-10T08:00:00',
          stops: [],
        })
      );
    }).as('createRoute');
    cy.intercept(
      'GET',
      '**/api/routes/10',
      apiSuccess({
        id: 10,
        code: 'RT-TD-01',
        name: 'Tuyến Thủ Đức 01',
        description: 'Khu vực Thủ Đức',
        isActive: false,
        stopCount: 0,
        coordinatesWarningCount: 0,
        createdAt: '2026-06-10T08:00:00',
        updatedAt: '2026-06-10T08:00:00',
        stops: [],
      })
    ).as('getNewRoute');

    visitAs('/admin/routes/new');
    cy.contains('h2', 'Tạo tuyến mới').should('be.visible');
    cy.get('input[placeholder="Ví dụ: RT-BT-01"]').type('rt-td-01');
    cy.get('input[placeholder="Nhập tên tuyến"]').type('Tuyến Thủ Đức 01');
    cy.get('textarea[placeholder="Mô tả phạm vi hoặc khu vực của tuyến"]').type('Khu vực Thủ Đức');
    cy.contains('button', 'Tạo tuyến').click();

    cy.wait('@createRoute');
    cy.url().should('include', '/admin/routes/10');
  });

  it('TC-04: route code trùng được hiển thị lỗi tại field Mã tuyến', () => {
    cy.intercept(
      'POST',
      '**/api/routes',
      apiError(409, 'ROUTE_CODE_DUPLICATE', 'Mã tuyến này đã tồn tại', 'code')
    ).as('createDuplicateRoute');

    visitAs('/admin/routes/new');
    cy.get('input[placeholder="Ví dụ: RT-BT-01"]').type('RT-BT-01');
    cy.get('input[placeholder="Nhập tên tuyến"]').type('Tuyến trùng mã');
    cy.contains('button', 'Tạo tuyến').click();

    cy.wait('@createDuplicateRoute');
    cy.contains('.ant-form-item-explain-error', 'Mã tuyến này đã tồn tại').should('be.visible');
  });

  it('TC-05: route có dưới 2 stops thì nút kích hoạt bị disabled', () => {
    interceptRouteDetail();

    visitAs('/admin/routes/3');
    cy.wait('@getRouteDetail');

    cy.contains('Chi tiết tuyến đường RT-BT-01').should('be.visible');
    cy.contains('1 điểm dừng').should('be.visible');
    cy.contains('button', 'Kích hoạt tuyến').should('be.disabled');
  });

  it('TC-06: thêm điểm dừng từ danh sách store khả dụng', () => {
    interceptRouteDetail();
    cy.intercept('GET', '**/api/stores*', apiSuccess(AVAILABLE_STORES)).as('getAvailableStores');
    cy.intercept('POST', '**/api/routes/3/stops', (req) => {
      expect(req.body).to.deep.eq({ storeId: 8 });
      req.reply(
        apiSuccess({
          id: 32,
          routeId: 3,
          sequenceOrder: 2,
          store: AVAILABLE_STORES[0],
        })
      );
    }).as('addStop');

    visitAs('/admin/routes/3');
    cy.wait('@getRouteDetail');

    cy.contains('button', 'Thêm điểm dừng').click();
    cy.contains('.ant-drawer', 'Thêm điểm dừng').should('be.visible');
    cy.contains('Điện Lạnh Thanh Bình').should('be.visible');
    cy.contains('button', 'Thêm vào tuyến').click();

    cy.wait('@addStop');
    cy.contains('Điện Lạnh Thanh Bình').should('be.visible');
  });

  it('TC-07: role DRIVER không được vào Route Management Guard', () => {
    visitAs('/admin/routes', ['DRIVER'], 'driver01');

    cy.url().should('include', '/403');
    cy.contains('403').should('be.visible');
  });

  it('TC-08: tạo route thiếu mã và tên thì hiển thị validation errors', () => {
    cy.intercept('POST', '**/api/routes').as('createRouteShouldNotRun');

    visitAs('/admin/routes/new');
    cy.contains('button', 'Tạo tuyến').click();

    cy.contains('.ant-form-item-explain-error', 'Vui lòng nhập mã tuyến').should('be.visible');
    cy.contains('.ant-form-item-explain-error', 'Vui lòng nhập tên tuyến').should('be.visible');
    cy.get('@createRouteShouldNotRun.all').should('have.length', 0);
  });

  it('TC-09: mã route chứa ký tự không hợp lệ thì frontend không gọi API', () => {
    cy.intercept('POST', '**/api/routes').as('createRouteShouldNotRun');

    visitAs('/admin/routes/new');
    cy.get('input[placeholder="Ví dụ: RT-BT-01"]').type('RT BT 01!');
    cy.get('input[placeholder="Nhập tên tuyến"]').type('Tuyến mã sai format');
    cy.contains('button', 'Tạo tuyến').click();

    cy.contains('.ant-form-item-explain-error', 'Mã tuyến chỉ được chứa chữ in hoa').should(
      'be.visible'
    );
    cy.get('@createRouteShouldNotRun.all').should('have.length', 0);
  });

  it('TC-10: thêm stop bị backend báo store trùng thì hiển thị lỗi và không thêm vào danh sách', () => {
    interceptRouteDetail();
    cy.intercept('GET', '**/api/stores*', apiSuccess(AVAILABLE_STORES)).as('getAvailableStores');
    cy.intercept(
      'POST',
      '**/api/routes/3/stops',
      apiError(409, 'ROUTE_STOP_DUPLICATE', 'Cửa hàng đã tồn tại trong tuyến.')
    ).as('addDuplicateStop');

    visitAs('/admin/routes/3');
    cy.wait('@getRouteDetail');

    cy.contains('button', 'Thêm điểm dừng').click();
    cy.contains('Điện Lạnh Thanh Bình').should('be.visible');
    cy.contains('button', 'Thêm vào tuyến').click();

    cy.wait('@addDuplicateStop');
    cy.contains('Không thể thêm cửa hàng vào tuyến.').should('be.visible');
    cy.contains('2 điểm dừng').should('not.exist');
  });

  it('TC-11: drawer chỉ yêu cầu store active chưa thuộc tuyến và không hiện store đã gắn', () => {
    interceptRouteDetail();
    cy.intercept('GET', '**/api/stores*', (req) => {
      expect(String(req.query.isActive ?? '')).to.eq('true');
      expect(String(req.query.hasRoute ?? '')).to.eq('false');
      req.reply(apiSuccess(AVAILABLE_STORES));
    }).as('getOnlyAvailableStores');

    visitAs('/admin/routes/3');
    cy.wait('@getRouteDetail');
    cy.contains('button', 'Thêm điểm dừng').click();
    cy.wait('@getOnlyAvailableStores');

    cy.contains('.ant-drawer', 'Điện Lạnh Thanh Bình').should('be.visible');
    cy.contains('.ant-drawer', 'Điện Máy Phúc Anh').should('not.exist');
  });

  it('TC-12: route detail hiển thị banner và cảnh báo inline cho stop thiếu GPS', () => {
    interceptRouteDetail();
    visitAs('/admin/routes/3');
    cy.wait('@getRouteDetail');

    cy.contains('1 điểm dừng trong tuyến này chưa có toạ độ GPS').should('be.visible');
    cy.contains('Cửa hàng này chưa có toạ độ. ETA sẽ không chính xác').should('be.visible');
  });

  it('TC-13: form chỉnh sửa giữ mã tuyến readonly và chỉ gửi tên, mô tả', () => {
    cy.intercept('GET', '**/api/routes/3', apiSuccess(ROUTE_DETAIL_THREE_STOPS)).as('getRouteForEdit');
    cy.intercept('PUT', '**/api/routes/3', (req) => {
      expect(req.body).to.deep.eq({
        name: 'Tuyến Bình Thạnh cập nhật',
        description: 'Mô tả đã cập nhật',
      });
      expect(req.body).not.to.have.property('code');
      req.reply(apiSuccess({ ...ROUTE_DETAIL_THREE_STOPS, ...req.body }));
    }).as('updateRoute');

    visitAs('/admin/routes/3/edit');
    cy.wait('@getRouteForEdit');
    cy.get('input[value="RT-BT-01"]').should('be.disabled');
    cy.get('input[placeholder="Nhập tên tuyến"]').clear().type('Tuyến Bình Thạnh cập nhật');
    cy.get('textarea[placeholder="Mô tả phạm vi hoặc khu vực của tuyến"]')
      .clear()
      .type('Mô tả đã cập nhật');
    cy.contains('button', 'Lưu thay đổi').click();

    cy.wait('@updateRoute');
  });

  it('TC-14: xoá stop ở giữa loại khỏi danh sách và đánh lại thứ tự liên tục', () => {
    cy.intercept('GET', '**/api/routes/3', apiSuccess(ROUTE_DETAIL_THREE_STOPS)).as('getRouteForDelete');
    cy.intercept('DELETE', '**/api/routes/3/stops/32', { statusCode: 200, body: { success: true } }).as(
      'deleteMiddleStop'
    );

    visitAs('/admin/routes/3');
    cy.wait('@getRouteForDelete');
    cy.contains('.stop-item-wrapper', 'Điện Lạnh Thanh Bình').find('button').click();
    cy.contains('.ant-modal', 'Xoá điểm dừng khỏi tuyến?').within(() => {
      cy.contains('button', 'Xác nhận xoá').click();
    });
    cy.wait('@deleteMiddleStop');

    cy.contains('.stop-item-wrapper', 'Điện Lạnh Thanh Bình').should('not.exist');
    cy.get('.stop-item-wrapper').should('have.length', 2);
    cy.get('.stop-item-wrapper').eq(0).should('contain.text', '1');
    cy.get('.stop-item-wrapper').eq(1).should('contain.text', '2');
  });

  it('TC-15: reorder bằng bàn phím gửi đủ orderedStopIds theo thứ tự mới', () => {
    cy.intercept('GET', '**/api/routes/3', apiSuccess(ROUTE_DETAIL_THREE_STOPS)).as('getRouteForReorder');
    cy.intercept('PUT', '**/api/routes/3/stops/reorder', (req) => {
      expect(req.body.orderedStopIds).to.deep.eq([32, 31, 33]);
      req.reply(
        apiSuccess([
          { ...ROUTE_DETAIL_THREE_STOPS.stops[1], sequenceOrder: 1 },
          { ...ROUTE_DETAIL_THREE_STOPS.stops[0], sequenceOrder: 2 },
          { ...ROUTE_DETAIL_THREE_STOPS.stops[2], sequenceOrder: 3 },
        ])
      );
    }).as('reorderStops');

    visitAs('/admin/routes/3');
    cy.wait('@getRouteForReorder');
    cy.get('[aria-label="Kéo để thay đổi thứ tự điểm dừng"]').eq(0).focus().type(' {downArrow} ');
    cy.wait('@reorderStops');

    cy.get('.stop-item-wrapper').eq(0).should('contain.text', 'Điện Lạnh Thanh Bình');
  });

  it('TC-16: kích hoạt route đủ stops cập nhật trạng thái ngay trên detail', () => {
    cy.intercept('GET', '**/api/routes/3', apiSuccess(ROUTE_DETAIL_THREE_STOPS)).as('getActivatableRoute');
    cy.intercept('PATCH', '**/api/routes/3/status', (req) => {
      expect(req.body).to.deep.eq({ isActive: true });
      req.reply(apiSuccess({ ...ROUTE_DETAIL_THREE_STOPS, isActive: true }));
    }).as('activateRoute');

    visitAs('/admin/routes/3');
    cy.wait('@getActivatableRoute');
    cy.contains('button', 'Kích hoạt tuyến').click();
    cy.contains('.ant-modal', 'Kích hoạt tuyến?').within(() => {
      cy.contains('button', 'Xác nhận kích hoạt').click();
    });
    cy.wait('@activateRoute');

    cy.contains('Đang hoạt động').should('be.visible');
  });

  it('TC-17: vô hiệu hoá route active cập nhật trạng thái ngay trên detail', () => {
    const activeRoute = { ...ROUTE_DETAIL_THREE_STOPS, isActive: true };
    cy.intercept('GET', '**/api/routes/3', apiSuccess(activeRoute)).as('getActiveRoute');
    cy.intercept('PATCH', '**/api/routes/3/status', (req) => {
      expect(req.body).to.deep.eq({ isActive: false });
      req.reply(apiSuccess({ ...activeRoute, isActive: false }));
    }).as('deactivateRoute');

    visitAs('/admin/routes/3');
    cy.wait('@getActiveRoute');
    cy.contains('button', 'Vô hiệu hoá tuyến').click();
    cy.contains('.ant-modal', 'Vô hiệu hoá tuyến?').within(() => {
      cy.contains('button', 'Xác nhận vô hiệu hoá').click();
    });
    cy.wait('@deactivateRoute');

    cy.contains('Chưa kích hoạt').should('be.visible');
  });

  it('TC-18: tìm kiếm route không có kết quả hiển thị empty state', () => {
    interceptRouteList();
    visitAs('/admin/routes');
    cy.wait('@getRoutes');
    cy.intercept('GET', '**/api/routes?*keyword=khong-ton-tai*', (req) => {
      expect(String(req.query.keyword ?? '')).to.eq('khong-ton-tai');
      req.reply(apiSuccess([], { page: 0, size: 10, totalElements: 0, totalPages: 1 }));
    }).as('searchRoutesEmpty');
    cy.get('input[placeholder="Tìm theo mã hoặc tên tuyến..."]').type('khong-ton-tai');
    cy.wait('@searchRoutesEmpty');

    cy.contains('Không tìm thấy tuyến phù hợp').should('be.visible');
  });
});
