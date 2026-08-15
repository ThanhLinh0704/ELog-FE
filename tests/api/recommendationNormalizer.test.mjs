import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isFeasibleRecommendationPlan,
  normalizeRecommendationResult,
} from '../../src/api/recommendationNormalizer.ts';

test('normalizes null recommendation arrays to empty arrays', () => {
  const result = normalizeRecommendationResult({
    tripDraftId: 20,
    planType: 'INFEASIBLE',
    recommendations: null,
    violatedConstraints: null,
    message: 'No eligible vehicle',
  });

  assert.deepEqual(result.recommendations, []);
  assert.deepEqual(result.violatedConstraints, []);
});

test('recognizes single- and two-vehicle plans as feasible', () => {
  assert.equal(isFeasibleRecommendationPlan('SINGLE_VEHICLE'), true);
  assert.equal(isFeasibleRecommendationPlan('TWO_VEHICLE'), true);
  assert.equal(isFeasibleRecommendationPlan('NO_PLAN'), false);
});
