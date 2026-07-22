/**
 * US-06 — Vehicle Management E2E Tests
 */

import {
  apiError,
  apiSuccess,
  confirmPopconfirm,
  visitAs,
} from './support/testHelpers';

const VEHICLES = [
  {
    id: 1,
    plateNumber: '51B-67890',
    vehicleType: 'Xe tải nhỏ',
    maxWeightKg: 2500,
    maxVolumeM3: 12.5,
    isActive: true,
    createdAt: '2026-06-01T08:00:00',
    updatedAt: '2026-06-01T08:00:00',
  },
  {
    id: 2,
    plateNumber: '51C-12345',
    vehicleType: 'Xe tải trung',
    maxWeightKg: 5000,
    maxVolumeM3: 24,
    isActive: false,
    createdAt: '2026-06-02T08:00:00',
    updatedAt: '2026-06-02T08:00:00',
  },
];

function vehiclePage(data = VEHICLES) {
  return apiSuccess({
    content: data,
    page: 0,
    size: 10,
    totalElements: data.length,
    totalPages: 1,
  });
}

function interceptVehicleList(data = VEHICLES) {
  cy.intercept('GET', '**/api/vehicles*', vehiclePage(data)).as('getVehicles');
  cy.intercept(
    'GET',
    '**/api/vehicles/fleet-capacity',
    apiSuccess({
      activeVehicleCount: data.filter((vehicle) => vehicle.isActive).length,
      totalMaxWeightKg: data
        .filter((vehicle) => vehicle.isActive)
        .reduce((sum, vehicle) => sum + vehicle.maxWeightKg, 0),
      totalMaxVolumeM3: data
        .filter((vehicle) => vehicle.isActive)
        .reduce((sum, vehicle) => sum + vehicle.maxVolumeM3, 0),
    })
  ).as('getFleetCapacity');
}

describe('US-06 — Vehicle Management', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it('TC-01: SYSTEM_ADMIN xem danh sách xe và tổng hợp capacity', () => {
    interceptVehicleList();

    visitAs('/vehicles');
    cy.wait('@getVehicles');
    cy.wait('@getFleetCapacity');

    cy.contains('h2', 'Quản lý đội xe').should('be.visible');
    cy.contains('51B-67890').should('be.visible');
    cy.contains('Xe tải nhỏ').should('be.visible');
    cy.contains('2.500 kg').should('be.visible');
    cy.contains('Đội xe đang hoạt động').should('be.visible');
  });

  it('TC-02: đăng ký xe mới thành công và gửi đúng payload', () => {
    interceptVehicleList();
    cy.intercept('POST', '**/api/vehicles', (req) => {
      expect(req.body).to.deep.eq({
        plateNumber: '51D-88888',
        vehicleType: 'Xe tải lớn',
        maxWeightKg: 8000,
        maxVolumeM3: 36.5,
      });
      req.reply(
        apiSuccess({
          id: 8,
          ...req.body,
          isActive: true,
          createdAt: '2026-06-08T08:00:00',
          updatedAt: '2026-06-08T08:00:00',
        })
      );
    }).as('createVehicle');

    visitAs('/vehicles');
    cy.wait('@getVehicles');

    cy.contains('button', 'Đăng ký xe').click();
    cy.contains('.ant-modal', 'Đăng ký xe mới').should('be.visible');
    cy.get('input[placeholder="VD: 51B-67890"]').type('51d-88888');
    cy.get('input[placeholder="VD: Xe tải nhỏ / Xe tải trung / Xe tải lớn"]').type('Xe tải lớn');
    cy.get('input[placeholder="VD: 2500"]').type('8000');
    cy.get('input[placeholder="VD: 12.5"]').type('36.5');

    cy.get('.ant-modal').within(() => {
      cy.contains('button', 'Đăng ký xe').click();
    });

    cy.wait('@createVehicle');
  });

  it('TC-03: biển số vô nghĩa bị chặn ở validation frontend', () => {
    interceptVehicleList();

    visitAs('/vehicles');
    cy.wait('@getVehicles');

    cy.contains('button', 'Đăng ký xe').click();
    cy.get('input[placeholder="VD: 51B-67890"]').type('------');
    cy.get('input[placeholder="VD: Xe tải nhỏ / Xe tải trung / Xe tải lớn"]').type('Xe tải nhỏ');
    cy.get('input[placeholder="VD: 2500"]').type('2500');
    cy.get('input[placeholder="VD: 12.5"]').type('12.5');

    cy.get('.ant-modal').within(() => {
      cy.contains('button', 'Đăng ký xe').click();
    });

    cy.contains('.ant-form-item-explain-error', 'Biển số không đúng định dạng').should('be.visible');
  });

  it('TC-04: chỉnh sửa xe không gửi plateNumber vì biển số là immutable', () => {
    interceptVehicleList();
    cy.intercept('GET', '**/api/vehicles/1', apiSuccess(VEHICLES[0])).as('getVehicleDetail');
    cy.intercept('PUT', '**/api/vehicles/1', (req) => {
      expect(req.body).to.deep.eq({
        vehicleType: 'Xe tải nhỏ - cập nhật',
        maxWeightKg: 2600,
        maxVolumeM3: 13,
      });
      expect(req.body).not.to.have.property('plateNumber');
      req.reply(
        apiSuccess({
          ...VEHICLES[0],
          vehicleType: 'Xe tải nhỏ - cập nhật',
          maxWeightKg: 2600,
          maxVolumeM3: 13,
        })
      );
    }).as('updateVehicle');

    visitAs('/vehicles');
    cy.wait('@getVehicles');

    cy.get('button[title="Chỉnh sửa"]').first().click();
    cy.wait('@getVehicleDetail');
    cy.contains('.ant-modal', 'Chỉnh sửa xe').should('be.visible');
    cy.get('input[placeholder="VD: 51B-67890"]').should('have.attr', 'readonly');
    cy.get('input[placeholder="VD: Xe tải nhỏ / Xe tải trung / Xe tải lớn"]')
      .clear()
      .type('Xe tải nhỏ - cập nhật');
    cy.get('input[placeholder="VD: 2500"]').clear().type('2600');
    cy.get('input[placeholder="VD: 12.5"]').clear().type('13');

    cy.get('.ant-modal').within(() => {
      cy.contains('button', 'Lưu thay đổi').click();
    });

    cy.wait('@updateVehicle');
  });

  it('TC-05: DISPATCHER chỉ xem được vehicle, không có nút đăng ký/sửa/kích hoạt', () => {
    interceptVehicleList();

    visitAs('/vehicles', ['DISPATCHER'], 'dispatcher01');
    cy.wait('@getVehicles');

    cy.contains('h2', 'Quản lý đội xe').should('be.visible');
    cy.contains('button', 'Đăng ký xe').should('not.exist');
    cy.get('button[title="Chỉnh sửa"]').should('not.exist');
    cy.get('button[title="Vô hiệu hoá"]').should('not.exist');
    cy.get('button[title="Xem chi tiết"]').should('exist');
  });

  it('TC-06: backend chặn vô hiệu hoá xe đang có trip thì hiện cảnh báo', () => {
    interceptVehicleList();
    cy.intercept(
      'PATCH',
      '**/api/vehicles/1/status',
      apiError(409, 'VEHICLE_IN_ACTIVE_TRIP', 'Xe 51B-67890 đang được gắn với chuyến đang vận hành.')
    ).as('deactivateBlockedVehicle');

    visitAs('/vehicles');
    cy.wait('@getVehicles');

    cy.get('button[title="Vô hiệu hoá"]').first().click();
    confirmPopconfirm();

    cy.wait('@deactivateBlockedVehicle');
    cy.contains('Xe 51B-67890 đang được gắn với chuyến đang vận hành.').should('be.visible');
  });

  it('TC-07: đăng ký xe thiếu field bắt buộc thì hiển thị validation errors', () => {
    interceptVehicleList();
    cy.intercept('POST', '**/api/vehicles').as('createVehicleShouldNotRun');

    visitAs('/vehicles');
    cy.wait('@getVehicles');

    cy.contains('button', 'Đăng ký xe').click();
    cy.get('.ant-modal').within(() => {
      cy.contains('button', 'Đăng ký xe').click();
    });

    cy.contains('.ant-form-item-explain-error', 'Vui lòng nhập biển số xe.').should('be.visible');
    cy.contains('.ant-form-item-explain-error', 'Vui lòng nhập loại xe.').should('be.visible');
    cy.contains('.ant-form-item-explain-error', 'Vui lòng nhập tải trọng tối đa.').should('be.visible');
    cy.contains('.ant-form-item-explain-error', 'Vui lòng nhập thể tích tối đa.').should('be.visible');
    cy.get('@createVehicleShouldNotRun.all').should('have.length', 0);
  });

  it('TC-08: tải trọng bằng 0 bị chặn, thể tích bằng 0 được clamp về min trước khi gọi API', () => {
    interceptVehicleList();
    cy.intercept('POST', '**/api/vehicles').as('createVehicleShouldNotRun');

    visitAs('/vehicles');
    cy.wait('@getVehicles');

    cy.contains('button', 'Đăng ký xe').click();
    cy.get('input[placeholder="VD: 51B-67890"]').type('51E-99999');
    cy.get('input[placeholder="VD: Xe tải nhỏ / Xe tải trung / Xe tải lớn"]').type('Xe tải lỗi số liệu');
    cy.get('input[placeholder="VD: 2500"]').type('0');
    cy.get('input[placeholder="VD: 12.5"]').type('0');

    cy.get('.ant-modal').within(() => {
      cy.contains('button', 'Đăng ký xe').click();
    });

    cy.contains('.ant-form-item-explain-error', 'Tải trọng phải lớn hơn 0.').should('be.visible');
    cy.get('input[placeholder="VD: 12.5"]').should('have.value', '0.01');
    cy.get('@createVehicleShouldNotRun.all').should('have.length', 0);
  });

  it('TC-09: duplicate plateNumber từ backend được map về field Biển số', () => {
    interceptVehicleList();
    cy.intercept(
      'POST',
      '**/api/vehicles',
      apiError(409, 'VEHICLE_PLATE_DUPLICATE', 'Biển số xe đã tồn tại.', 'plateNumber')
    ).as('createDuplicateVehicle');

    visitAs('/vehicles');
    cy.wait('@getVehicles');

    cy.contains('button', 'Đăng ký xe').click();
    cy.get('input[placeholder="VD: 51B-67890"]').type('51B-67890');
    cy.get('input[placeholder="VD: Xe tải nhỏ / Xe tải trung / Xe tải lớn"]').type('Xe tải nhỏ');
    cy.get('input[placeholder="VD: 2500"]').type('2500');
    cy.get('input[placeholder="VD: 12.5"]').type('12.5');

    cy.get('.ant-modal').within(() => {
      cy.contains('button', 'Đăng ký xe').click();
    });

    cy.wait('@createDuplicateVehicle');
    cy.contains('.ant-form-item-explain-error', 'Biển số xe đã tồn tại.').should('be.visible');
  });

  it('TC-10: DRIVER không có quyền đọc Vehicle Management thì bị đưa về dashboard', () => {
    cy.intercept('GET', '**/api/vehicles*').as('getVehiclesShouldNotRun');

    visitAs('/vehicles', ['DRIVER'], 'driver01');

    cy.url().should('include', '/dashboard');
    cy.get('@getVehiclesShouldNotRun.all').should('have.length', 0);
  });

  it('TC-11: Fleet Capacity Card cập nhật ngay sau khi đăng ký xe mới', () => {
    let created = false;
    const newVehicle = {
      id: 8,
      plateNumber: '51D-88888',
      vehicleType: 'Xe tải lớn',
      maxWeightKg: 3490.5,
      maxVolumeM3: 16.25,
      isActive: true,
      createdAt: '2026-06-08T08:00:00',
      updatedAt: '2026-06-08T08:00:00',
    };
    cy.intercept('GET', '**/api/vehicles*', (req) => {
      req.reply(vehiclePage(created ? [...VEHICLES, newVehicle] : VEHICLES));
    }).as('getVehiclesAfterCreate');
    cy.intercept('GET', '**/api/vehicles/fleet-capacity', (req) => {
      req.reply(
        apiSuccess(
          created
            ? { activeVehicleCount: 2, totalMaxWeightKg: 5990.5, totalMaxVolumeM3: 28.75 }
            : { activeVehicleCount: 1, totalMaxWeightKg: 2500, totalMaxVolumeM3: 12.5 }
        )
      );
    }).as('getCapacityAfterCreate');
    cy.intercept('POST', '**/api/vehicles', (req) => {
      created = true;
      req.reply(apiSuccess(newVehicle));
    }).as('createVehicleForCapacity');

    visitAs('/vehicles');
    cy.wait('@getVehiclesAfterCreate');
    cy.wait('@getCapacityAfterCreate');
    cy.contains('button', 'Đăng ký xe').click();
    cy.get('input[placeholder="VD: 51B-67890"]').type('51D-88888');
    cy.get('input[placeholder="VD: Xe tải nhỏ / Xe tải trung / Xe tải lớn"]').type('Xe tải lớn');
    cy.get('input[placeholder="VD: 2500"]').type('3490.5');
    cy.get('input[placeholder="VD: 12.5"]').type('16.25');
    cy.get('.ant-modal').within(() => cy.contains('button', 'Đăng ký xe').click());
    cy.wait('@createVehicleForCapacity');
    cy.wait('@getCapacityAfterCreate');

    cy.contains('.ant-statistic-title', 'Đội xe đang hoạt động')
      .closest('.ant-statistic')
      .find('.ant-statistic-content-value')
      .should('contain.text', '2');
  });

  it('TC-12: Fleet Capacity Card giảm ngay sau khi vô hiệu hoá xe', () => {
    let deactivated = false;
    cy.intercept('GET', '**/api/vehicles*', (req) => {
      req.reply(vehiclePage(VEHICLES.map((v) => (v.id === 1 ? { ...v, isActive: !deactivated } : v))));
    }).as('getVehiclesAfterDeactivate');
    cy.intercept('GET', '**/api/vehicles/fleet-capacity', (req) => {
      req.reply(
        apiSuccess(
          deactivated
            ? { activeVehicleCount: 0, totalMaxWeightKg: 0, totalMaxVolumeM3: 0 }
            : { activeVehicleCount: 1, totalMaxWeightKg: 2500, totalMaxVolumeM3: 12.5 }
        )
      );
    }).as('getCapacityAfterDeactivate');
    cy.intercept('PATCH', '**/api/vehicles/1/status', (req) => {
      expect(req.body).to.deep.eq({ isActive: false });
      deactivated = true;
      req.reply(apiSuccess({ ...VEHICLES[0], isActive: false }));
    }).as('deactivateVehicleSuccessfully');

    visitAs('/vehicles');
    cy.wait('@getVehiclesAfterDeactivate');
    cy.wait('@getCapacityAfterDeactivate');
    cy.contains('tr', '51B-67890').within(() => cy.get('button[title="Vô hiệu hoá"]').click());
    confirmPopconfirm();
    cy.wait('@deactivateVehicleSuccessfully');
    cy.wait('@getCapacityAfterDeactivate');

    cy.contains('.ant-statistic-title', 'Đội xe đang hoạt động')
      .closest('.ant-statistic')
      .find('.ant-statistic-content-value')
      .should('contain.text', '0');
  });

  it('TC-13: kích hoạt lại vehicle inactive cập nhật trạng thái trên bảng', () => {
    let activated = false;
    cy.intercept('GET', '**/api/vehicles*', (req) => {
      req.reply(vehiclePage(VEHICLES.map((v) => (v.id === 2 ? { ...v, isActive: activated } : v))));
    }).as('getVehiclesForReactivate');
    cy.intercept(
      'GET',
      '**/api/vehicles/fleet-capacity',
      apiSuccess({ activeVehicleCount: 1, totalMaxWeightKg: 2500, totalMaxVolumeM3: 12.5 })
    ).as('getCapacityForReactivate');
    cy.intercept('PATCH', '**/api/vehicles/2/status', (req) => {
      expect(req.body).to.deep.eq({ isActive: true });
      activated = true;
      req.reply(apiSuccess({ ...VEHICLES[1], isActive: true }));
    }).as('reactivateVehicle');

    visitAs('/vehicles');
    cy.wait('@getVehiclesForReactivate');
    cy.contains('tr', '51C-12345').within(() => cy.get('button[title="Kích hoạt"]').click());
    confirmPopconfirm();
    cy.wait('@reactivateVehicle');

    cy.contains('tr', '51C-12345').should('contain.text', 'Hoạt động');
  });

  it('TC-14: tìm kiếm và filter trạng thái gửi đúng query, empty state hiển thị rõ', () => {
    interceptVehicleList();
    visitAs('/vehicles');
    cy.wait('@getVehicles');
    cy.intercept('GET', '**/api/vehicles*', (req) => {
      expect(String(req.query.keyword ?? '')).to.eq('khong-ton-tai');
      req.reply(vehiclePage([]));
    }).as('searchVehiclesEmpty');
    cy.get('input[placeholder="Tìm theo biển số hoặc loại xe..."]').type('khong-ton-tai');
    cy.wait('@searchVehiclesEmpty');
    cy.contains('Không tìm thấy xe phù hợp').should('be.visible');

    cy.intercept('GET', '**/api/vehicles*', (req) => {
      expect(String(req.query.keyword ?? '')).to.eq('khong-ton-tai');
      expect(String(req.query.isActive ?? '')).to.eq('false');
      req.reply(vehiclePage([]));
    }).as('filterInactiveVehicles');
    cy.get('.ant-select').eq(0).click({ force: true });
    cy.contains('[role="option"], .ant-select-item-option-content', 'Đã vô hiệu hoá').click({ force: true });
    cy.wait('@filterInactiveVehicles');
  });

  it('TC-15: LOGISTICS_MANAGER được xem nhưng không có thao tác ghi', () => {
    interceptVehicleList();
    visitAs('/vehicles', ['LOGISTICS_MANAGER'], 'logistics01');
    cy.wait('@getVehicles');

    cy.contains('h2', 'Quản lý đội xe').should('be.visible');
    cy.contains('button', 'Đăng ký xe').should('not.exist');
    cy.get('button[title="Chỉnh sửa"]').should('not.exist');
    cy.get('button[title="Vô hiệu hoá"]').should('not.exist');
    cy.get('button[title="Xem chi tiết"]').should('exist');
  });

  it('TC-16: capacity thập phân hợp lệ được gửi không mất độ chính xác', () => {
    interceptVehicleList();
    cy.intercept('POST', '**/api/vehicles', (req) => {
      expect(req.body.maxWeightKg).to.eq(3490.5);
      expect(req.body.maxVolumeM3).to.eq(16.25);
      req.reply(apiSuccess({ id: 9, ...req.body, isActive: true }));
    }).as('createDecimalVehicle');

    visitAs('/vehicles');
    cy.wait('@getVehicles');
    cy.contains('button', 'Đăng ký xe').click();
    cy.get('input[placeholder="VD: 51B-67890"]').type('51F-12345');
    cy.get('input[placeholder="VD: Xe tải nhỏ / Xe tải trung / Xe tải lớn"]').type('Xe tải trung');
    cy.get('input[placeholder="VD: 2500"]').type('3490.50');
    cy.get('input[placeholder="VD: 12.5"]').type('16.250');
    cy.get('.ant-modal').within(() => cy.contains('button', 'Đăng ký xe').click());

    cy.wait('@createDecimalVehicle');
  });
});
