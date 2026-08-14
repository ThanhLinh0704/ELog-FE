export interface L4CatalogItem {
  id: string;
  entryPoint?: { channel?: string };
}

export function buildL4Cases<T extends L4CatalogItem>(catalog: T[], channel: string): T[];
export function parseJsonText(text: string): unknown;
export function resolveRoute(route: string, fixtureIds: Record<string, string | number>): string;
export function buildExecutionLedger(
  catalog: Array<L4CatalogItem & { title?: string }>,
  webResults: Map<string, { status: 'Pass' | 'Fail'; rawCypressStatus?: 'Pass' | 'Fail'; durationSeconds: number; failure?: string }>,
  mobileReason: string,
): {
  totals: { total: number; pass: number; fail: number; notRun: number };
  results: Array<Record<string, unknown>>;
};
