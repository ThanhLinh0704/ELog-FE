const ExcelJS = require('exceljs');

const tplPath = 'D:/FULearning/semester 9/Elog/Report5/Report 5.2_L2-IntegrationTests_Template.xlsx';

async function main() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(tplPath);

  console.log('=== WORKSHEETS ===');
  workbook.eachSheet((ws, id) => {
    console.log(`Sheet [${id}]: "${ws.name}" - rows: ${ws.rowCount}, cols: ${ws.columnCount}`);
  });

  // Dump first sheet column structure
  const firstWs = workbook.worksheets[0];
  console.log('\n=== INTRO Sheet columns ===');
  firstWs.columns.forEach((col, idx) => {
    console.log(`  Col ${idx + 1}: key=${col.key}, width=${col.width}, header=${col.header}`);
  });

  // Dump second sheet (L2-OrderService) structure
  const orderWs = workbook.worksheets[1];
  if (orderWs) {
    console.log(`\n=== "${orderWs.name}" Sheet ===`);
    for (let r = 1; r <= Math.min(10, orderWs.rowCount); r++) {
      const row = orderWs.getRow(r);
      const values = [];
      row.eachCell({ includeEmpty: true }, (cell, colNum) => {
        if (colNum <= 12) values.push(`[${colNum}]${cell.value || ''}`);
      });
      const style = row.getCell(1).fill ? JSON.stringify(row.getCell(1).fill) : 'no-fill';
      console.log(`  Row ${r} fill=${style}: ${values.join(' | ')}`);
    }

    console.log('\n  Columns widths:');
    orderWs.columns.forEach((col, idx) => {
      console.log(`    Col ${idx + 1}: width=${col.width}`);
    });
  }
}

main().catch(console.error);
