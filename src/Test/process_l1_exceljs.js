const ExcelJS = require('exceljs');
const fs = require('fs');

const reportDir = 'D:/FULearning/semester 9/Elog/Report5/';
const srcPath = reportDir + 'Report5.2_ELog_L1-UnitTests.xlsx';
const targetPath1 = reportDir + 'Report 5.1_ELog_L1-UnitTests.xlsx';
const targetPath2 = reportDir + 'Report 5.2_ELog_L1-UnitTests.xlsx';

async function main() {
  console.log('Processing L1 Unit Tests with ExcelJS...');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(srcPath);

  // Apply clean styling to all worksheets
  workbook.eachSheet((ws) => {
    ws.views = [{ showGridLines: true }];
    const headerRow = ws.getRow(3);
    if (headerRow && headerRow.cellCount > 0) {
      headerRow.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E79' },
      };
    }
  });

  await workbook.xlsx.writeFile(targetPath1);
  await workbook.xlsx.writeFile(targetPath2);
  console.log('Successfully saved formatted L1 Excel files:');
  console.log(' -', targetPath1);
  console.log(' -', targetPath2);
}

main().catch(console.error);
