# Vehicle Recommendation Null-Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the Trip Draft detail page renderable when recommendations contain null or omitted array fields.

**Architecture:** Normalize the recommendation response at the frontend API boundary. The UI receives an invariant that both list fields are arrays and cannot throw while evaluating their lengths or mapping them.

**Tech Stack:** React 19, TypeScript, Axios, Vite.

## Global Constraints

- Preserve the existing `/api/trip-drafts/{id}/recommendations` endpoint and response types.
- Do not alter unrelated local changes in `TripDraftDetailPage.tsx`.
- Verify the null-array regression and the production build before reporting completion.

---

### Task 1: Normalize the recommendation payload

**Files:**
- Create: `src/api/recommendationNormalizer.ts`
- Modify: `src/api/tripDraftApi.ts:583-590`
- Modify: `src/pages/dispatcher/trip-drafts/TripDraftDetailPage.tsx:925`
- Test: `tests/api/recommendationNormalizer.test.mjs`

**Interfaces:**
- Consumes: `getRecommendations(draftId): Promise<RecommendationResult>`.
- Produces: `RecommendationResult` where `recommendations` and `violatedConstraints` are arrays.

- [ ] **Step 1: Write the failing test**

```ts
it('normalizes null recommendation arrays to empty arrays', async () => {
  const result = normalizeRecommendationResult({
    tripDraftId: 20,
    planType: 'INFEASIBLE',
    recommendations: null,
    violatedConstraints: null,
    message: 'No eligible vehicle',
  });

  expect(result.recommendations).toEqual([]);
  expect(result.violatedConstraints).toEqual([]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types --test tests/api/recommendationNormalizer.test.mjs`

Expected: FAIL because `normalizeRecommendationResult` does not exist.

- [ ] **Step 3: Write the minimal implementation**

```ts
export function normalizeRecommendationResult(raw: RecommendationResult): RecommendationResult {
  return {
    ...raw,
    recommendations: Array.isArray(raw.recommendations) ? raw.recommendations : [],
    violatedConstraints: Array.isArray(raw.violatedConstraints) ? raw.violatedConstraints : [],
  };
}
```

Return this normalizer's result from `getRecommendations`, and use a length guard in the JSX:

```tsx
{recResult.violatedConstraints.length > 0 && (
```

- [ ] **Step 4: Run the regression test and frontend build**

Run: `node --experimental-strip-types --test tests/api/recommendationNormalizer.test.mjs && npm run build`

Expected: test passes and Vite finishes with `built`.
