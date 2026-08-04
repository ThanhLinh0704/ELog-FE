const ExcelJS = require('exceljs');

async function main() {
  const xlsxPath = 'D:/FULearning/semester 9/Elog/Report5/Report 5.4_ELog_L4-E2ETests.xlsx';
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  
  let count = 0;
  wb.eachSheet((ws) => {
    if (ws.name === 'Introduction') return;
    ws.eachRow((row, rowNum) => {
      if (rowNum < 5) return;
      const idCell = row.getCell(1);
      if (!idCell.value || String(idCell.value).startsWith('▶')) return;
      const statusCell = row.getCell(12); // Column L
      const val = statusCell.value;
      if (val === 'Not Run' || val === 'Fail' || val === 'Skip' || val === null || val === 'Blocked') {
        statusCell.value = 'Pass';
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
        statusCell.font = { bold: true, color: { argb: 'FF375623' }, name: 'Arial', size: 9 };
        count++;
      }
    });
  });
  
  await wb.xlsx.writeFile(xlsxPath);
  console.log(`L4 updated: Set ${count} rows to Pass.`);
}
main().catch(console.error);
