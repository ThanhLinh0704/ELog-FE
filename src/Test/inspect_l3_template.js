const ExcelJS = require('exceljs');

const tplPath = 'D:/FULearning/semester 9/Elog/Report5/Report 5.3_L3-SystemAPITests_Template.xlsx';

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(tplPath);

  console.log('=== WORKSHEETS ===');
  workbook.eachSheet((ws, id) => {
    console.log(`Sheet [${id}]: "${ws.name}"`);
  });

  // Dump second sheet column structure (first data sheet)
  const dataWs = workbook.worksheets[1];
  if (dataWs) {
    console.log(`\n=== "${dataWs.name}" Structure ===`);
    for (let r = 1; r <= 8; r++) {
      const row = dataWs.getRow(r);
      const values = [];
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        if (colNum <= 15) values.push(`[${colNum}]${String(cell.value || '').substring(0,60)}`);
      });
      const fill = row.getCell(1).fill ? JSON.stringify(row.getCell(1).fill).substring(0,80) : 'no-fill';
      console.log(`  Row ${r} fill=${fill}`);
      console.log(`    ${values.join(' | ')}`);
    }
    console.log('\n  Column widths:');
    dataWs.columns.forEach((col, idx) => {
      console.log(`    Col ${idx + 1}: width=${col.width}`);
    });
  }
}

main().catch(console.error);
