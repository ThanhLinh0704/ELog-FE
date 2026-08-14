import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildExecutionLedger, parseJsonText } from './support/l4Catalog.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../../..');
const catalogPath = path.resolve(repoRoot, '../AuditWork/report5-redesign/catalog/l4.json');
const evidenceDir = path.resolve(repoRoot, 'test-execution/evidence/l4');
const junitPath = fs.readdirSync(evidenceDir)
  .filter((name) => /^junit-.*\.xml$/.test(name))
  .map((name) => path.join(evidenceDir, name))
  .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];

if (!junitPath) throw new Error('No L4 JUnit evidence found');

const xml = fs.readFileSync(junitPath, 'utf8');
const webResults = new Map();
const fullyExercisedWebIds = new Set([
  'L4-WEB-AUTH-01',
  'L4-WEB-AUTH-02',
  'L4-WEB-AUTH-03',
]);
const testcasePattern = /<testcase\b([^>]*)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
for (const match of xml.matchAll(testcasePattern)) {
  const attrs = match[1];
  const body = match[2] || '';
  const name = /\bname="([^"]+)"/.exec(attrs)?.[1] || '';
  const id = /L4-WEB-[A-Z]+-\d+/.exec(name)?.[0];
  if (!id) continue;
  const durationSeconds = Number(/\btime="([^"]+)"/.exec(attrs)?.[1] || 0);
  const failure = /<failure\b[^>]*>([\s\S]*?)<\/failure>/.exec(body)?.[1]
    ?.replace(/^<!\[CDATA\[/, '')
    .replace(/\]\]>$/, '')
    .trim();
  const rawCypressStatus = failure ? 'Fail' : 'Pass';
  const surfaceOnly = rawCypressStatus === 'Pass' && !fullyExercisedWebIds.has(id);
  webResults.set(id, {
    status: surfaceOnly ? 'Fail' : rawCypressStatus,
    rawCypressStatus,
    durationSeconds,
    failure: failure || (surfaceOnly
      ? 'Cypress reached the real route and observed the expected surface, but the full catalog action/outcome was not automated; conservatively counted Fail to avoid a fake pass.'
      : undefined),
  });
}

const catalog = parseJsonText(fs.readFileSync(catalogPath, 'utf8'));
const ledger = buildExecutionLedger(
  catalog,
  webResults,
  'Flutter CLI is not installed/on PATH and adb devices -l returned no attached device.',
);

const output = {
  schemaVersion: 1,
  generatedAt: fs.statSync(junitPath).mtime.toISOString(),
  branch: 'test/2026-08-02v-reports-final',
  environment: {
    web: 'Cypress 15.20.1 / Electron 138 / Vite 8 / real Spring Boot backend / MySQL 3307',
    mobile: 'Not Run: Flutter CLI unavailable; adb device list empty',
    networkPolicy: 'No response intercepts or stubs in e2e/l4/report5-web.cy.ts',
  },
  evidence: {
    junit: path.relative(repoRoot, junitPath).replaceAll('\\', '/'),
    screenshots: 'src/Test/cypress/screenshots/report5-web.cy.ts/',
    cypressLog: 'test-execution/evidence/l4/cypress-rerun.log',
    backendLog: 'test-execution/evidence/l4/backend.stdout.log',
    mobileDiscovery: 'test-execution/evidence/l4/mobile-device-discovery.log',
  },
  rawCypressTotals: {
    total: webResults.size,
    pass: [...webResults.values()].filter((item) => item.rawCypressStatus === 'Pass').length,
    fail: [...webResults.values()].filter((item) => item.rawCypressStatus === 'Fail').length,
  },
  ...ledger,
};

const outputPath = path.resolve(repoRoot, 'test-execution/results/l4.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`${outputPath}: ${JSON.stringify(output.totals)}`);
