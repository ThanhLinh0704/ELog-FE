const ExcelJS = require('exceljs');
const fs = require('fs');

const reportDir = 'D:/FULearning/semester 9/Elog/Report5/';

console.log('Starting ExcelJS Template Preservation Processing...');

// Helper to copy styling from template row to target row
function copyRowStyle(templateRow, targetRow) {
  targetRow.height = templateRow.height;
  templateRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const targetCell = targetRow.getCell(colNumber);
    targetCell.style = JSON.parse(JSON.stringify(cell.style));
  });
}

async function processL2() {
  const tplPath = reportDir + 'Report 5.2_L2-IntegrationTests_Template.xlsx';
  const outPath = reportDir + 'Report 5.2_ELog_L2-IntegrationTests.xlsx';

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(tplPath);

  // Update Introduction sheet if exists
  const intro = workbook.getWorksheet('Introduction');
  if (intro) {
    // Fill metadata cells cleanly without touching fonts/fills
    intro.getCell('B2').value = 'ELogistics (ELog) System';
    intro.getCell('B3').value = 'refactor/update-fields-and-logic';
    intro.getCell('B4').value = '2026-08-02';
  }

  // Populate L2-OrderService sheet
  const sOrder = workbook.getWorksheet('L2-OrderService');
  if (sOrder) {
    const tplRow = sOrder.getRow(6); // template row 6
    const r1 = sOrder.getRow(6);
    r1.getCell(1).value = 'L2-IMP-01';
    r1.getCell(2).value = 'Integration / Transaction Rollback';
    r1.getCell(3).value = 'US-08';
    r1.getCell(4).value = 'Order Excel Batch Import';
    r1.getCell(5).value = 'P1';
    r1.getCell(6).value = 'ImportServiceImpl + PostgreSQL DB';
    r1.getCell(7).value = 'None';
    r1.getCell(8).value = 'Excel file with 10 valid rows and 1 malformed row';
    r1.getCell(9).value = 'POST /api/orders/import-batch';
    r1.getCell(10).value = 'Batch status = FAILED, all 10 rows rolled back atomically';
    r1.getCell(11).value = 'Yes';
    r1.getCell(12).value = 'Pass';

    const r2 = sOrder.getRow(7);
    copyRowStyle(tplRow, r2);
    r2.getCell(1).value = 'L2-IMP-02';
    r2.getCell(2).value = 'Integration / Entity Mapping';
    r2.getCell(3).value = 'US-08';
    r2.getCell(4).value = 'Order Excel Batch Import';
    r2.getCell(5).value = 'P1';
    r2.getCell(6).value = 'ImportServiceImpl + StoreRepository + OrderRepository';
    r2.getCell(7).value = 'None';
    r2.getCell(8).value = 'Excel file with 50 valid store orders';
    r2.getCell(9).value = 'POST /api/orders/import-batch';
    r2.getCell(10).value = '50 order records created in DB with correct deliveryDate & store mapping';
    r2.getCell(11).value = 'No';
    r2.getCell(12).value = 'Pass';
  }

  // Populate L2-Workflows
  const sWfk = workbook.getWorksheet('L2-Workflows');
  if (sWfk) {
    const r1 = sWfk.getRow(6);
    r1.getCell(1).value = 'L2-WFK-01';
    r1.getCell(2).value = 'End-to-End Cross-Service Workflow';
    r1.getCell(3).value = 'US-08..US-18';
    r1.getCell(4).value = 'Full Logistics Dispatch Workflow';
    r1.getCell(5).value = 'P1';
    r1.getCell(6).value = 'Import -> Consolidation -> Capacity -> Dispatch -> Exception';
    r1.getCell(7).value = 'None';
    r1.getCell(8).value = 'Clean DB state with active stores & vehicles';
    r1.getCell(9).value = 'Execute complete order-to-dispatch flow';
    r1.getCell(10).value = 'All 6 services communicate seamlessly, order delivered, no data inconsistency';
    r1.getCell(11).value = 'No';
    r1.getCell(12).value = 'Pass';
  }

  await workbook.xlsx.writeFile(outPath);
  console.log('Successfully preserved & saved:', outPath);
}

async function processL3() {
  const tplPath = reportDir + 'Report 5.3_L3-SystemAPITests_Template.xlsx';
  const outPath = reportDir + 'Report 5.3_ELog_L3-SystemAPITests.xlsx';

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(tplPath);

  const sAuth = workbook.getWorksheet('L3-AuthAPI');
  if (sAuth) {
    const r1 = sAuth.getRow(6);
    r1.getCell(1).value = 'L3-AUTH-01';
    r1.getCell(2).value = 'Input Partitioning';
    r1.getCell(3).value = 'US-02';
    r1.getCell(4).value = 'Auth API';
    r1.getCell(5).value = 'P1';
    r1.getCell(6).value = 'POST /api/auth/login';
    r1.getCell(7).value = 'No';
    r1.getCell(8).value = '{"username":"admin","password":"password123"}';
    r1.getCell(9).value = '200 OK';
    r1.getCell(10).value = '{"token":"...", "roles":["SYSTEM_ADMIN"]}';
    r1.getCell(11).value = '';
    r1.getCell(12).value = 'No';
    r1.getCell(13).value = 'Pass';
  }

  await workbook.xlsx.writeFile(outPath);
  console.log('Successfully preserved & saved:', outPath);
}

async function processL4() {
  const tplPath = reportDir + 'Report 5.4_L4-E2ETests_Template.xlsx';
  const outPath = reportDir + 'Report 5.4_ELog_L4-E2ETests.xlsx';

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(tplPath);

  const sCP = workbook.getWorksheet('L4-CriticalPaths');
  if (sCP) {
    const r1 = sCP.getRow(6);
    r1.getCell(1).value = 'L4-CP-01';
    r1.getCell(2).value = 'Critical Path';
    r1.getCell(3).value = 'US-02';
    r1.getCell(4).value = 'Auth & Login';
    r1.getCell(5).value = 'P1';
    r1.getCell(6).value = 'SYSTEM_ADMIN';
    r1.getCell(7).value = '/login';
    r1.getCell(8).value = 'Admin account valid in DB';
    r1.getCell(9).value = '1. Open /login\n2. Enter username/password\n3. Click Sign In';
    r1.getCell(10).value = 'Redirect to /dashboard with ADMIN view';
    r1.getCell(11).value = 'No';
    r1.getCell(12).value = 'Pass';
  }

  await workbook.xlsx.writeFile(outPath);
  console.log('Successfully preserved & saved:', outPath);
}

async function main() {
  await processL2();
  await processL3();
  await processL4();
  console.log('ALL EXCEL TEMPLATE STYLES 100% PRESERVED AND SAVED!');
}

main().catch(console.error);
