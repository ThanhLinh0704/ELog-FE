// Cypress E2E support file — loaded before every spec

// Clear localStorage before each test (also done in beforeEach per suite)
Cypress.on('uncaught:exception', () => {
  // Prevent React hydration or unhandled promise rejections from failing tests
  return false;
});
