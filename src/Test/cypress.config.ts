import { defineConfig } from 'cypress';

declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    env: {
      apiBaseUrl: process.env.CYPRESS_apiBaseUrl || process.env.VITE_API_BASE_URL || 'http://localhost:8080',
    },
    specPattern: 'e2e/**/*.cy.{ts,tsx,js,jsx}',
    supportFile: 'e2e/support/e2e.ts',
    viewportWidth: 1280,
    viewportHeight: 800,
    defaultCommandTimeout: 8000,
    video: false,
    screenshotOnRunFailure: true,
  },
});
