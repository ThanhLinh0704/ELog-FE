/**
 * US-03 — User Management E2E Tests
 *
 * Run note:
 * - User API has a VITE_USE_MOCK switch in the FE source.
 * - For deterministic cy.intercept() tests, start the FE with VITE_USE_MOCK=false.
 */

import {
  apiError,
  apiSuccess,
  confirmPopconfirm,
  resetE2EState,
  selectAntOption,
  visitAs,
} from './support/testHelpers';

const USERS = [
  {
    id: 1,
    username: 'admin',
    fullName: 'System Admin',
    email: 'admin@elog.vn',
    roles: ['SYSTEM_ADMIN'],
    isActive: true,
    createdAt: '2026-06-01T08:00:00',
  },
  {
    id: 2,
    username: 'dispatcher01',
    fullName: 'Điều phối Lan',
    email: 'dispatcher01@elog.vn',
    roles: ['DISPATCHER'],
    isActive: true,
    createdAt: '2026-06-02T08:00:00',
  },
  {
    id: 3,
    username: 'driver01',
    fullName: 'Tài xế Minh',
    email: 'driver01@elog.vn',
    roles: ['DRIVER'],
    isActive: false,
    createdAt: '2026-06-03T08:00:00',
  },
];

function userPage(data = USERS) {
  return apiSuccess(data, {
    page: 0,
    size: 5,
    totalElements: data.length,
    totalPages: 1,
  });
}

function interceptUserList(data = USERS) {
  cy.intercept('GET', '**/api/users*', userPage(data)).as('getUsers');
}

describe('US-03 — User Management', () => {
  beforeEach(() => {
    resetE2EState();
  });

  afterEach(() => {
    resetE2EState();
  });

  it('TC-01: SYSTEM_ADMIN mở danh sách user và thấy user, role, trạng thái', () => {
    interceptUserList();

    visitAs('/users');
    cy.wait('@getUsers');

    cy.contains('h2', 'Quản lý người dùng').should('be.visible');
    cy.contains('System Admin').should('be.visible');
    cy.contains('dispatcher01').should('be.visible');
    cy.contains('Điều phối viên').should('be.visible');
    cy.contains('Đã khoá').should('be.visible');
  });

  it('TC-02: tạo user nội bộ thành công và gửi đúng payload', () => {
    interceptUserList();
    cy.intercept('POST', '**/api/users', (req) => {
      expect(req.body).to.deep.include({
        username: 'dispatcher02',
        fullName: 'Điều phối Bình',
        email: 'dispatcher02@elog.vn',
      });
      expect(req.body.roles).to.deep.eq(['DISPATCHER']);
      req.reply(
        apiSuccess({
          id: 4,
          username: 'dispatcher02',
          fullName: 'Điều phối Bình',
          email: 'dispatcher02@elog.vn',
          roles: ['DISPATCHER'],
          isActive: true,
          createdAt: '2026-06-04T08:00:00',
        })
      );
    }).as('createUser');

    visitAs('/users');
    cy.wait('@getUsers');

    cy.contains('button', 'Tạo người dùng').click();
    cy.contains('.ant-modal', 'Thêm tài khoản nội bộ').should('be.visible');

    cy.get('input[placeholder="Nguyễn Văn A"]').type('Điều phối Bình');
    cy.get('input[placeholder="dispatcher01"]').type('dispatcher02');
    cy.get('input[placeholder="user@elog.vn"]').type('dispatcher02@elog.vn');
    cy.get('input[placeholder="Tối thiểu 8 ký tự"]').type('Dispatcher@2026');
    cy.get('input[placeholder="Xác nhận mật khẩu"]').type('Dispatcher@2026');
    cy.contains('.ant-form-item', 'Vai trò').find('[role="combobox"]').click({ force: true });
    selectAntOption('Điều phối viên');

    cy.get('.ant-modal').within(() => {
      cy.contains('button', 'Tạo người dùng').click();
    });

    cy.wait('@createUser');
  });

  it('TC-03: tạo user bị trùng username thì hiển thị lỗi tại field username', () => {
    interceptUserList();
    cy.intercept(
      'POST',
      '**/api/users',
      apiError(409, 'USERNAME_DUPLICATE', 'Username đã tồn tại', 'username')
    ).as('createDuplicateUser');

    visitAs('/users');
    cy.wait('@getUsers');

    cy.contains('button', 'Tạo người dùng').click();
    cy.get('input[placeholder="Nguyễn Văn A"]').type('Điều phối Trùng');
    cy.get('input[placeholder="dispatcher01"]').type('dispatcher01');
    cy.get('input[placeholder="user@elog.vn"]').type('duplicate@elog.vn');
    cy.get('input[placeholder="Tối thiểu 8 ký tự"]').type('Dispatcher@2026');
    cy.get('input[placeholder="Xác nhận mật khẩu"]').type('Dispatcher@2026');
    cy.contains('.ant-form-item', 'Vai trò').find('[role="combobox"]').click({ force: true });
    selectAntOption('Điều phối viên');

    cy.get('.ant-modal').within(() => {
      cy.contains('button', 'Tạo người dùng').click();
    });

    cy.wait('@createDuplicateUser');
    cy.contains('.ant-form-item-explain-error', 'Username đã tồn tại').should('be.visible');
  });

  it('TC-04: cập nhật profile và role user qua PUT + PATCH roles', () => {
    interceptUserList();
    cy.intercept('PUT', '**/api/users/2', (req) => {
      expect(req.body).to.deep.eq({
        fullName: 'Điều phối Lan Updated',
        email: 'dispatcher01.updated@elog.vn',
      });
      req.reply(
        apiSuccess({
          ...USERS[1],
          fullName: 'Điều phối Lan Updated',
          email: 'dispatcher01.updated@elog.vn',
        })
      );
    }).as('updateUser');
    cy.intercept('PATCH', '**/api/users/2/roles', (req) => {
      expect(req.body.roles).to.deep.eq(['DISPATCHER']);
      req.reply(apiSuccess(USERS[1]));
    }).as('updateRoles');

    visitAs('/users');
    cy.wait('@getUsers');

    cy.contains('tr', 'dispatcher01').within(() => {
      cy.get('button[title="Chỉnh sửa"]').click();
    });
    cy.contains('.ant-modal', 'Chỉnh sửa người dùng').should('be.visible');
    cy.get('input[placeholder="dispatcher01"]').should('be.disabled');
    cy.get('input[placeholder="Nguyễn Văn A"]').clear().type('Điều phối Lan Updated');
    cy.get('input[placeholder="user@elog.vn"]').clear().type('dispatcher01.updated@elog.vn');

    cy.get('.ant-modal').within(() => {
      cy.contains('button', 'Lưu thay đổi').click();
    });

    cy.wait('@updateUser');
    cy.wait('@updateRoles');
  });

  it('TC-05: khoá user khác chính mình qua PATCH status', () => {
    interceptUserList();
    cy.intercept('PATCH', '**/api/users/2/status', (req) => {
      expect(req.body).to.deep.eq({ isActive: false });
      req.reply(apiSuccess({ ...USERS[1], isActive: false }));
    }).as('lockUser');

    visitAs('/users');
    cy.wait('@getUsers');

    cy.get('button[title="Khoá"]').first().click();
    confirmPopconfirm();

    cy.wait('@lockUser');
  });

  it('TC-06: role không đủ quyền đọc API thì bị đưa về dashboard', () => {
    cy.intercept(
      'GET',
      '**/api/users*',
      apiError(403, 'ACCESS_DENIED', 'You do not have permission to access this resource.')
    ).as('getUsersDenied');

    visitAs('/users', ['DRIVER'], 'driver01');
    cy.wait('@getUsersDenied');

    cy.url().should('include', '/dashboard');
  });

  it('TC-07: tạo user thiếu các field bắt buộc thì hiển thị validation errors', () => {
    interceptUserList();

    visitAs('/users');
    cy.wait('@getUsers');

    cy.contains('button', 'Tạo người dùng').click();
    cy.get('.ant-modal').within(() => {
      cy.contains('button', 'Tạo người dùng').click();
    });

    cy.contains('.ant-form-item-explain-error', 'Họ và tên là bắt buộc.').should('be.visible');
    cy.contains('.ant-form-item-explain-error', 'Username là bắt buộc.').should('be.visible');
    cy.contains('.ant-form-item-explain-error', 'Email là bắt buộc.').should('be.visible');
    cy.contains('.ant-form-item-explain-error', 'Mật khẩu là bắt buộc.').should('be.visible');
    cy.contains('.ant-form-item-explain-error', 'Cần xác nhận mật khẩu.').should('be.visible');
    cy.contains('.ant-form-item-explain-error', 'Cần chọn ít nhất một vai trò.').should('be.visible');
  });

  it('TC-08: tạo user với email sai format và confirm password không khớp thì bị chặn', () => {
    interceptUserList();
    cy.intercept('POST', '**/api/users').as('createUserShouldNotRun');

    visitAs('/users');
    cy.wait('@getUsers');

    cy.contains('button', 'Tạo người dùng').click();
    cy.get('input[placeholder="Nguyễn Văn A"]').type('User Sai Validation');
    cy.get('input[placeholder="dispatcher01"]').type('invalid_user');
    cy.get('input[placeholder="user@elog.vn"]').type('not-an-email');
    cy.get('input[placeholder="Tối thiểu 8 ký tự"]').type('Password@2026');
    cy.get('input[placeholder="Xác nhận mật khẩu"]').type('Different@2026');
    cy.contains('.ant-form-item', 'Vai trò').find('[role="combobox"]').click({ force: true });
    selectAntOption('Điều phối viên');

    cy.get('.ant-modal').within(() => {
      cy.contains('button', 'Tạo người dùng').click();
    });

    cy.contains('.ant-form-item-explain-error', 'Email không đúng định dạng.').should('be.visible');
    cy.contains('.ant-form-item-explain-error', 'Mật khẩu xác nhận không khớp.').should('be.visible');
    cy.get('@createUserShouldNotRun.all').should('have.length', 0);
  });

  it('TC-09: tìm kiếm theo username gửi đúng keyword và chỉ hiển thị user phù hợp', () => {
    interceptUserList();
    visitAs('/users');
    cy.wait('@getUsers');
    cy.intercept('GET', '**/api/users*', (req) => {
      expect(String(req.query.keyword ?? '')).to.eq('dispatcher01');
      req.reply(userPage([USERS[1]]));
    }).as('searchUsers');
    cy.get('input[placeholder="Tìm theo họ tên hoặc username..."]').type('dispatcher01');
    cy.wait('@searchUsers');

    cy.contains('dispatcher01').should('be.visible');
    cy.contains('driver01').should('not.exist');
  });

  it('TC-10: tìm kiếm không có kết quả hiển thị empty state', () => {
    cy.intercept('GET', '**/api/users*', (req) => {
      const keyword = String(req.query.keyword ?? '');
      req.reply(userPage(keyword ? [] : USERS));
    }).as('searchUsersEmpty');

    visitAs('/users');
    cy.wait('@searchUsersEmpty');
    cy.get('input[placeholder="Tìm theo họ tên hoặc username..."]').type('khong-ton-tai');
    cy.wait('@searchUsersEmpty');

    cy.get('.ant-empty').should('be.visible');
  });

  it('TC-11: filter vai trò và trạng thái gửi đúng query parameters', () => {
    interceptUserList();
    visitAs('/users');
    cy.wait('@getUsers');
    cy.intercept('GET', '**/api/users*', (req) => {
      expect(String(req.query.role ?? '')).to.eq('DISPATCHER');
      req.reply(userPage([USERS[1]]));
    }).as('filterByRole');
    cy.get('.ant-select').eq(0).click({ force: true });
    selectAntOption('Điều phối viên');
    cy.wait('@filterByRole');

    cy.intercept('GET', '**/api/users*', (req) => {
      expect(String(req.query.role ?? '')).to.eq('DISPATCHER');
      expect(String(req.query.isActive ?? '')).to.eq('false');
      req.reply(userPage([]));
    }).as('filterByRoleAndStatus');
    cy.get('.ant-select').eq(1).click({ force: true });
    selectAntOption('Đã khoá');
    cy.wait('@filterByRoleAndStatus');
  });

  it('TC-12: email trùng từ backend được map về field Email', () => {
    interceptUserList();
    cy.intercept(
      'POST',
      '**/api/users',
      apiError(409, 'EMAIL_DUPLICATE', 'Email đã tồn tại', 'email')
    ).as('createDuplicateEmail');

    visitAs('/users');
    cy.wait('@getUsers');
    cy.contains('button', 'Tạo người dùng').click();
    cy.get('input[placeholder="Nguyễn Văn A"]').type('User Trùng Email');
    cy.get('input[placeholder="dispatcher01"]').type('dispatcher_unique');
    cy.get('input[placeholder="user@elog.vn"]').type('admin@elog.vn');
    cy.get('input[placeholder="Tối thiểu 8 ký tự"]').type('Dispatcher@2026');
    cy.get('input[placeholder="Xác nhận mật khẩu"]').type('Dispatcher@2026');
    cy.contains('.ant-form-item', 'Vai trò').find('[role="combobox"]').click({ force: true });
    selectAntOption('Điều phối viên');
    cy.get('.ant-modal').within(() => cy.contains('button', 'Tạo người dùng').click());

    cy.wait('@createDuplicateEmail');
    cy.contains('.ant-form-item-explain-error', 'Email đã tồn tại').should('be.visible');
  });

  it('TC-13: mật khẩu dưới 8 ký tự bị chặn và không gọi API', () => {
    interceptUserList();
    cy.intercept('POST', '**/api/users').as('weakPasswordShouldNotRun');

    visitAs('/users');
    cy.wait('@getUsers');
    cy.contains('button', 'Tạo người dùng').click();
    cy.get('input[placeholder="Nguyễn Văn A"]').type('User Weak Password');
    cy.get('input[placeholder="dispatcher01"]').type('weak_password_user');
    cy.get('input[placeholder="user@elog.vn"]').type('weak@elog.vn');
    cy.get('input[placeholder="Tối thiểu 8 ký tự"]').type('A@1');
    cy.get('input[placeholder="Xác nhận mật khẩu"]').type('A@1');
    cy.contains('.ant-form-item', 'Vai trò').find('[role="combobox"]').click({ force: true });
    selectAntOption('Điều phối viên');
    cy.get('.ant-modal').within(() => cy.contains('button', 'Tạo người dùng').click());

    cy.contains('.ant-form-item-explain-error', 'Mật khẩu phải dài ít nhất 8 ký tự.').should('be.visible');
    cy.get('@weakPasswordShouldNotRun.all').should('have.length', 0);
  });

  it('TC-14: khoá user thành công cập nhật chip trạng thái không cần refresh trình duyệt', () => {
    interceptUserList();
    cy.intercept('PATCH', '**/api/users/2/status', apiSuccess({ ...USERS[1], isActive: false })).as(
      'lockUserAndRefresh'
    );

    visitAs('/users');
    cy.wait('@getUsers');
    cy.contains('tr', 'dispatcher01').within(() => cy.get('button[title="Khoá"]').click());
    confirmPopconfirm();
    cy.wait('@lockUserAndRefresh');

    cy.contains('tr', 'dispatcher01').should('contain.text', 'Đã khoá');
  });

  it('TC-15: admin không thấy nút Khoá trên dòng tài khoản của chính mình', () => {
    interceptUserList();
    visitAs('/users');
    cy.wait('@getUsers');

    cy.contains('tr', 'admin').within(() => {
      cy.get('button[title="Chỉnh sửa"]').should('exist');
      cy.get('button[title="Khoá"]').should('not.exist');
    });
  });
});
