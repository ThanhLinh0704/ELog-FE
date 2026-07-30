export interface RecommendationResultArrays<TRecommendation = unknown> {
  recommendations: TRecommendation[] | null | undefined;
  violatedConstraints: string[] | null | undefined;
}

export function normalizeRecommendationResult<
  TRecommendation,
  T extends RecommendationResultArrays<TRecommendation>,
>(
  result: T,
): Omit<T, 'recommendations' | 'violatedConstraints'> & {
  recommendations: TRecommendation[];
  violatedConstraints: string[];
} {
  return {
    ...result,
    recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
    violatedConstraints: Array.isArray(result.violatedConstraints) ? result.violatedConstraints : [],
  };
}

export function isFeasibleRecommendationPlan(planType: string | null | undefined): boolean {
  return planType === 'SINGLE_VEHICLE' || planType === 'TWO_VEHICLE';
}
