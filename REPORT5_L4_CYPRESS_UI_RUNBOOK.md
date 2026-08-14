# Report 5 L4 Cypress UI runbook

Use this after pulling the branch to run the Report 5 L4 web E2E suite in Cypress UI.

## One command

From `D:\Elog\ELog-FE\src\Test`:

```powershell
npm run cy:open:l4
```

What this command prepares:

- checks/starts Spring Boot backend at `http://localhost:8080`;
- checks/starts Vite frontend at `http://localhost:5173`;
- generates fresh L3 fixture evidence at `D:\Elog\ELog-BE\test-execution\evidence\l3-rerun-results.json`;
- unsets `ELECTRON_RUN_AS_NODE`, which breaks Cypress smoke-test on Windows;
- opens Cypress UI filtered to `e2e/l4/report5-web.cy.ts`.

In Cypress UI, choose E2E Testing and run `report5-web.cy.ts`.

## Faster rerun when backend/frontend and fixture are already ready

```powershell
npm run cy:open:l4:no-bootstrap
```

## Raw run without UI

Use only when you want CI-style evidence:

```powershell
$env:REPORT5_FIXTURE_EVIDENCE="D:/Elog/ELog-BE/test-execution/evidence/l3-rerun-results.json"
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
npx cypress run --spec e2e/l4/report5-web.cy.ts --browser electron --headless
```

## Notes

- The L4 Cypress suite uses the real frontend, real backend, and real MySQL data. It does not stub API responses.
- Always bootstrap fresh L3 evidence before a serious L4 run; repeated L4 runs mutate draft/trip state.
- Mobile L4 is separate and runs through Flutter/Android Studio.
