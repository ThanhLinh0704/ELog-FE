# Report 5 Complete E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace surface-only Report 5 L4 checks with full browser journeys using isolated real API fixtures.

**Architecture:** A Cypress support module creates and exposes fixture identifiers. The browser spec consumes those identifiers, executes full UI actions, and validates each mutation with the actual backend. Mobile diagnostics use the local Flutter SDK and only execute when a target exists.

**Tech Stack:** Cypress 15, Vite frontend, Spring Boot API, MySQL, Flutter SDK.

## Global Constraints

- No Cypress response intercepts or stubs.
- Never modify production code solely for a test result.
- Keep test fixture IDs namespaced and evidence-backed.

---

### Task 1: Fixture lifecycle

**Files:**
- Modify: `src/Test/e2e/l4/support/l4Catalog.mjs`
- Create: `src/Test/e2e/l4/support/report5Fixture.mjs`

- [ ] Add fixture bootstrap helpers that authenticate, import namespaced orders, consolidate their draft, and return `{ batchId, tripDraftId, tripId }`.
- [ ] Verify every returned ID with a GET request before Cypress starts UI actions.
- [ ] Add cleanup/evidence output for the created IDs.

### Task 2: Full web journeys

**Files:**
- Modify: `src/Test/e2e/l4/report5-web.cy.ts`

- [ ] Replace hard-coded fixture IDs with the fixture helper result.
- [ ] For each L4 web ID, click/type/submit the catalog action and read back the resulting API state.
- [ ] Mark a case Not Run only when its required generated fixture cannot be produced; retain a product assertion failure as Fail.

### Task 3: Mobile target execution

**Files:**
- Modify: `test-execution/scripts/run-l4.ps1`

- [ ] Resolve `D:\Elog\AuditToolchains\flutter\bin\flutter.bat` explicitly.
- [ ] Run `flutter doctor -v` and `flutter devices`.
- [ ] Execute mobile integration tests when an eligible target is present; otherwise store command output as Not Run evidence.

### Task 4: Evidence and ledger

**Files:**
- Modify: `test-execution/results/l4.json`
- Modify: `D:\Elog\ELog-BE\test-execution/scripts/build-final-results.mjs`

- [ ] Rebuild the L4 result JSON from Cypress JUnit/screenshots and mobile diagnostics.
- [ ] Re-run the 425-ID ledger validator and update the Report 5 status document.
