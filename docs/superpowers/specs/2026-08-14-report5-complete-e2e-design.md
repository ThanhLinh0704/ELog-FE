# Report 5 complete E2E design

## Goal

Execute every Report 5 L4 journey against the real frontend, backend, and MySQL state without stubs, and classify each result from the final assertion rather than route reachability.

## Design

The Cypress suite creates a unique, API-backed test namespace before its browser journeys. The fixture lifecycle is import orders, consolidate drafts, validate capacity, assign vehicles/drivers, create manifests, dispatch, and expose monitoring/outcome data. Each web case then uses the created IDs, performs the documented UI action, and verifies the resulting UI plus a real API read-back.

The fixture helper owns only records labelled with its generated namespace. Its cleanup uses the application's API when supported and otherwise records the remaining IDs in execution evidence; it never deletes shared seed data.

Mobile execution uses `D:\Elog\AuditToolchains\flutter\bin\flutter.bat`. The runner first calls `flutter doctor -v` and `flutter devices`; it runs the actual mobile suite when an Android/Windows target is available. If no device image is installed, it records that environmental prerequisite as Not Run rather than a product defect.

## Result rules

- Pass: full UI action and persistent API read-back are both verified.
- Fail: product behavior contradicts the catalog assertion after a complete fixture has been prepared.
- Not Run: the complete action could not be executed because required environment/device or an explicit unsupported prerequisite is unavailable.

No production code changes are made to turn a test green.
