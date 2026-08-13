// Cypress E2E support file — loaded before every spec

// Clear localStorage before each test (also done in beforeEach per suite)
Cypress.on('uncaught:exception', () => {
  // Prevent React hydration or unhandled promise rejections from failing tests
  return false;
});

/**
 * Visual slow mode.
 *
 * Default: wait 1000ms before visible user actions so `cy:open` / `--headed`
 * runs are easy to follow.
 *
 * Fast run override:
 *   npm run cy:run -- --env STEP_DELAY_MS=0
 */
function getStepDelayMs() {
  const raw = Number(Cypress.env('STEP_DELAY_MS') ?? 1000);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

const visibleActionCommands = new Set(['click', 'type', 'clear', 'check', 'uncheck', 'select']);

Cypress.on('command:end', (command) => {
  const commandName = command.attributes.name;

  if (!visibleActionCommands.has(commandName)) {
    return;
  }

  const delayMs = getStepDelayMs();
  const pauseUntil = Date.now() + delayMs;

  while (Date.now() < pauseUntil) {
    // Intentionally block the runner briefly so headed/open mode is human-readable.
  }
});
