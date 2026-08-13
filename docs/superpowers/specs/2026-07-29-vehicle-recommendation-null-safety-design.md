# Vehicle Recommendation Null-Safety Design

## Goal

Prevent the Trip Draft detail screen from crashing when the recommendations API omits `violatedConstraints` or returns it as `null`.

## Scope

The frontend will normalize the recommendations API payload at its boundary so that `violatedConstraints` and `recommendations` are always arrays. The Trip Draft detail page will consume those normalized fields without assuming the backend always provides a non-null array.

## Alternatives considered

1. Add an optional-chain only in the JSX. This prevents the reported crash but leaves other callers exposed to the same malformed API shape.
2. Change only the backend DTO to always serialize empty arrays. This improves the contract but does not protect the deployed frontend against older or partial responses.
3. Normalize in the frontend API layer and keep rendering defensive. This is the selected approach because it creates one stable frontend contract and prevents a blank page even if the backend response is incomplete.

## Data flow

`GET /api/trip-drafts/{id}/recommendations` returns a possibly partial payload. `getRecommendations` converts absent or null array fields to `[]`. `TripDraftDetailPage` renders the normalized result, including an empty constraints list. `SINGLE_VEHICLE` and `TWO_VEHICLE` are feasible plans; `NO_PLAN` is the only unavailable-plan result.

## Error handling

The page must continue to render the recommendation status and message when there are no violated constraints. Network and HTTP errors remain handled by the existing request error path.

## Verification

Add a regression test for a recommendation payload containing `violatedConstraints: null`; it must be normalized to an empty array. Run that test and the frontend production build.
