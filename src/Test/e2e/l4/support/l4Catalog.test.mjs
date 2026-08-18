import assert from 'node:assert/strict';
import test from 'node:test';

import { buildExecutionLedger, buildL4Cases, parseJsonText, resolveRoute } from './l4Catalog.mjs';

test('buildL4Cases rejects duplicate Test IDs', () => {
  assert.throws(
    () => buildL4Cases([{ id: 'L4-X', entryPoint: { channel: 'Web' } }, { id: 'L4-X', entryPoint: { channel: 'Web' } }], 'Web'),
    /duplicate L4 Test ID: L4-X/,
  );
});

test('buildL4Cases returns exactly the requested channel and preserves source order', () => {
  const catalog = [
    { id: 'L4-WEB-01', entryPoint: { channel: 'Web' } },
    { id: 'L4-MOB-01', entryPoint: { channel: 'Mobile' } },
    { id: 'L4-WEB-02', entryPoint: { channel: 'Web' } },
  ];

  assert.deepEqual(buildL4Cases(catalog, 'Web').map((item) => item.id), ['L4-WEB-01', 'L4-WEB-02']);
});

test('resolveRoute replaces every named placeholder with an explicit fixture id', () => {
  assert.equal(
    resolveRoute('/dispatcher/import/history/:batchId', { batchId: 17 }),
    '/dispatcher/import/history/17',
  );
  assert.throws(() => resolveRoute('/trips/:tripId', {}), /missing fixture id for :tripId/);
});

test('buildExecutionLedger maps every catalog id to one executable invocation and exact totals', () => {
  const catalog = [
    { id: 'L4-WEB-01', title: 'web', entryPoint: { channel: 'Web' } },
    { id: 'L4-MOB-01', title: 'mobile', entryPoint: { channel: 'Mobile' } },
  ];
  const ledger = buildExecutionLedger(catalog, new Map([
    ['L4-WEB-01', { status: 'Fail', rawCypressStatus: 'Pass', durationSeconds: 1.25, failure: 'surface-only' }],
  ]), 'Flutter CLI unavailable');

  assert.deepEqual(ledger.totals, { total: 2, pass: 0, fail: 1, notRun: 1 });
  assert.equal(ledger.results[0].rawCypressStatus, 'Pass');
  assert.match(ledger.results[0].invocation, /report5-web\.cy\.ts/);
  assert.match(ledger.results[1].invocation, /flutter test integration_test\/report5_l4_mobile_test\.dart --plain-name "L4-MOB-01/);
});

test('buildExecutionLedger rejects missing web execution results', () => {
  assert.throws(
    () => buildExecutionLedger([{ id: 'L4-WEB-01', entryPoint: { channel: 'Web' } }], new Map(), 'no device'),
    /missing Cypress result for L4-WEB-01/,
  );
});

test('parseJsonText accepts the UTF-8 BOM used by the catalog', () => {
  assert.deepEqual(parseJsonText('\uFEFF[{"id":"L4-WEB-01"}]'), [{ id: 'L4-WEB-01' }]);
});
