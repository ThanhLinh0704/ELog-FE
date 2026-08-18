const REQUIRED_IDS = ['batchId', 'tripDraftId', 'tripId', 'routeId'];

export function requireFixtureIds(candidate) {
  for (const key of REQUIRED_IDS) {
    if (candidate?.[key] === undefined || candidate[key] === null || candidate[key] === '') {
      throw new Error(`missing fixture id: ${key}`);
    }
  }
  return Object.fromEntries(REQUIRED_IDS.map((key) => [key, candidate[key]]));
}

export function extractFixtureIds(evidence) {
  const referenceIds = evidence?.bootstrap?.referenceIds;
  const required = requireFixtureIds({
    batchId: referenceIds?.importBatch,
    tripDraftId: referenceIds?.tripDraft,
    tripId: referenceIds?.trip,
    routeId: referenceIds?.routeDetail,
  });

  return {
    ...required,
    id: required.tripDraftId,
    draftId: required.tripDraftId,
    planningDraftId: referenceIds?.revertDraft,
    splitDraftId: referenceIds?.splitDraft,
  };
}
