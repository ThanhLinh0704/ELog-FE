/**
 * Update L3 Excel with actual test run results (PASS/FAIL + defect notes)
 */
const ExcelJS = require('exceljs');
const fs = require('fs');

const xlsxPath = 'D:/FULearning/semester 9/Elog/Report5/Report 5.3_ELog_L3-SystemAPITests.xlsx';
const resultsPath = 'l3_test_results.json';

const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

// Map: testId -> { status, detail }
const resultMap = {};
results.results.forEach(r => { resultMap[r.id] = r; });

// Bugs found: map testId → defect description for FAIL cases
const bugMap = {
  'L3-AUTH-10': 'BUG-L3-01: POST /api/auth/logout returns HTTP 500 (Internal Server Error). Logout endpoint throws unhandled exception when processing refresh token deletion.',
  'L3-USR-02':  'BUG-L3-02: POST /api/users with DISPATCHER token returns 400 (Validation) instead of 403 (Access Denied). RBAC check runs after validation, should fail-fast on auth.',
  'L3-USR-08':  'BUG-L3-03: PATCH /api/users/999999/status returns 400 VALIDATION_FAILED ("isActive: Field cannot be blank") instead of 404 (User Not Found). Request body validation runs before existence check.',
  'L3-STR-02':  'BUG-L3-04: POST /api/stores with duplicate code returns 400 instead of 409. Store uniqueness is validated at request-level (returns 400 VALIDATION_FAILED) not at service-level (should be 409 CONFLICT).',
  'L3-TRD-GET': 'BUG-L3-05: GET /api/trip-drafts returns HTTP 500 when no date param is provided. Missing date parameter causes NullPointerException in service layer instead of returning empty list or 400.',
  'L3-MON-01':  'BUG-L3-06: GET /api/monitoring/dashboard returns HTTP 500. Dashboard aggregation query throws exception (likely NPE on null date query result).',
  'L3-MON-02':  'BUG-L3-06: Same as BUG-L3-06 — HTTP 500 before RBAC check. DRIVER gets 500 instead of 403 because endpoint crashes before authorization.',
  'L3-SEC-01':  'BUG-L3-07: POST /api/users with DRIVER JWT returns 400 instead of 403. Validation runs before RBAC check — security enforcement order issue (same root cause as BUG-L3-02).',
  'L3-SEC-10':  'BUG-L3-08: Blacklisted JWT token (after logout) still returns 200 on subsequent requests. Token blacklist/revocation is not enforced by JWT filter after logout. RefreshToken deleted but accessToken not invalidated.',
};

const NAVY_DARK  = 'FF2E75B6';
const NAVY_LIGHT = 'FFDEEAF1';
const WHITE      = 'FFFFFFFF';
const GREEN_FILL = 'FFE2EFDA';  // light green for PASS
const RED_FILL   = 'FFFFC7CE';  // light red for FAIL
const GREEN_FONT = 'FF375623';
const RED_FONT   = 'FF9C0006';
const SKIP_FILL  = 'FFFFF2CC';
const SKIP_FONT  = 'FF7F6000';

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(xlsxPath);

  let totalUpdated = 0;
  let totalPass = 0, totalFail = 0;

  workbook.eachSheet((ws) => {
    if (ws.name === 'Introduction') return;

    ws.eachRow((row, rowNum) => {
      if (rowNum <= 4) return; // skip header rows
      const cellA = row.getCell(1);
      const testId = String(cellA.value || '').trim();

      if (!testId || testId.startsWith('▶') || testId.startsWith('HOW')) return;

      const result = resultMap[testId];
      if (!result) return;

      const statusCell = row.getCell(13);  // Column M = Status
      const defectCell = row.getCell(14);  // Column N = Defect ID
      const notesCell  = row.getCell(15);  // Column O = Notes

      if (result.status === 'PASS') {
        statusCell.value = 'Pass';
        statusCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN_FILL } };
        statusCell.font  = { bold: true, color: { argb: GREEN_FONT }, name: 'Arial', size: 9 };
        totalPass++;
      } else if (result.status === 'FAIL' || result.status === 'ERROR') {
        statusCell.value = 'Fail';
        statusCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_FILL } };
        statusCell.font  = { bold: true, color: { argb: RED_FONT }, name: 'Arial', size: 9 };

        const bugId = Object.keys(bugMap).find(k => k === testId);
        if (bugId) {
          const bugDesc = bugMap[bugId];
          const bugIdMatch = bugDesc.match(/BUG-L3-\d+/);
          if (bugIdMatch) defectCell.value = bugIdMatch[0];
          notesCell.value = bugDesc.replace(/BUG-L3-\d+: /, '');
          notesCell.font = { italic: true, color: { argb: 'FFCC0000' }, name: 'Arial', size: 8 };
        }
        totalFail++;
      }

      totalUpdated++;
    });
  });

  // Update Introduction sheet summary
  const introWs = workbook.getWorksheet('Introduction');
  if (introWs) {
    introWs.eachRow((row, rowNum) => {
      const label = String(row.getCell(1).value || '').trim();
      if (label === 'Passed') row.getCell(2).value = totalPass;
      if (label === 'Failed') row.getCell(2).value = totalFail;
      if (label === 'Pass Rate') {
        const rate = ((totalPass / (totalPass + totalFail)) * 100).toFixed(1);
        row.getCell(2).value = `${rate}% (${totalPass}/${totalPass + totalFail} automated)`;
      }
    });
  }

  await workbook.xlsx.writeFile(xlsxPath);
  console.log(`\n✅ Updated Excel with actual test results`);
  console.log(`   Updated: ${totalUpdated} test cases`);
  console.log(`   PASS: ${totalPass} | FAIL: ${totalFail}`);
  console.log(`   Pass Rate: ${((totalPass / (totalPass + totalFail)) * 100).toFixed(1)}%`);
  console.log(`\n📋 Bugs found (${Object.keys(bugMap).length}):`);
  Object.entries(bugMap).forEach(([id, desc]) => {
    const bugId = desc.match(/BUG-L3-\d+/)?.[0];
    console.log(`   ${bugId} [${id}]: ${desc.substring(desc.indexOf(': ') + 2, 80)}...`);
  });
}

main().catch(console.error);
