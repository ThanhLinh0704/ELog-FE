import assert from 'node:assert/strict';
import test from 'node:test';
import { extractFixtureIds, requireFixtureIds } from './report5Fixture.mjs';

test('requireFixtureIds returns only a complete browser fixture', () => {
  const fixture = requireFixtureIds({ batchId: 11, tripDraftId: 22, tripId: 33, routeId: 44 });
  assert.deepEqual(fixture, { batchId: 11, tripDraftId: 22, tripId: 33, routeId: 44 });
});

test('requireFixtureIds rejects missing fixture identifiers', () => {
  assert.throws(() => requireFixtureIds({ batchId: 11, tripDraftId: 22 }), /missing fixture id: tripId/);
});

test('extractFixtureIds maps real L3 evidence references for browser routes', () => {
  const fixture = extractFixtureIds({
    bootstrap: {
      referenceIds: { importBatch: 50, tripDraft: 139, splitDraft: 140, revertDraft: 138, trip: 81, routeDetail: 1 },
    },
  });
  assert.deepEqual(fixture, {
    batchId: 50,
    id: 139,
    draftId: 139,
    tripDraftId: 139,
    planningDraftId: 138,
    splitDraftId: 140,
    tripId: 81,
    routeId: 1,
  });
});
