export interface ConfirmedByDto {
  userId: number;
  fullName: string;
}

export interface TripDraftStop {
  tripDraftStopId: number;
  sequenceNo: number;
  storeId: number;
  storeCode: string;
  storeName: string;
  isActive: boolean;
  orderCount: number;
  plannedEta?: string | null;
  overrideNote?: string | null;
}

export interface TripDraft {
  id: number;
  routeId: number;
  routeCode: string;
  deliveryDate: string;
  totalVolumeM3: number;
  totalWeightKg: number;
  activeStopCount: number;
  skippedStopCount: number;
  status: string; // DRAFT | PLANNED | VALIDATED | ...
  plannedDepartureTime?: string | null;
  confirmedAt?: string | null;
  confirmedBy?: ConfirmedByDto | null;
  stops?: TripDraftStop[] | null;
}

export interface ConsolidateResponse {
  deliveryDate: string;
  tripDraftsCreatedOrUpdated: number;
  tripDrafts: TripDraft[];
  skippedRoutes: {
    routeId: number;
    routeCode: string;
    reason: string;
  }[];
}
