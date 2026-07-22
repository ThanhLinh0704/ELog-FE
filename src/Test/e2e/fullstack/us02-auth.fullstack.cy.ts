import { loginWithRealBackend, resetE2EState } from '../support/testHelpers';

describe('FULLSTACK US-02 — Authentication', () => {
  beforeEach(resetE2EState);
  afterEach(resetE2EState);

  it('FS-02-01: đăng nhập thật qua ELog-BE và mở dashboard', () => {
    loginWithRealBackend();
    cy.contains('Đăng xuất').should('be.visible');
  });
});
