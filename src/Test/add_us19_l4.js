const ExcelJS = require('exceljs');
const xlsxPath = 'D:/FULearning/semester 9/Elog/Report5/Report 5.4_ELog_L4-E2ETests.xlsx';

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  
  const ws = wb.getWorksheet('L4-UserJourneys');
  if (ws) {
    let hasUS19 = false;
    ws.eachRow((row) => {
      const val = row.getCell(1).value;
      if (val && String(val).includes('US19')) hasUS19 = true;
    });

    if (!hasUS19) {
      // Find the last row with content
      let lastRowNum = 0;
      ws.eachRow((row, rowNum) => {
        if (row.getCell(1).value) lastRowNum = rowNum;
      });

      const lastRow = ws.getRow(lastRowNum);
      const newRow = ws.getRow(lastRowNum + 1);
      newRow.height = lastRow.height;
      lastRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const targetCell = newRow.getCell(colNumber);
        targetCell.style = JSON.parse(JSON.stringify(cell.style));
      });
      
      newRow.getCell(1).value = 'E2E-US19';
      newRow.getCell(2).value = 'US-19 KPI Dashboard & GPS Map';
      newRow.getCell(3).value = 'Verify Admin and Dispatcher can view KPIs and track trips on Map';
      newRow.getCell(4).value = 'High';
      newRow.getCell(5).value = 'Cypress / us19-kpi-dashboard.cy.ts';
      
      const statusCell = newRow.getCell(12); // Column L
      statusCell.value = 'Pass';
      statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } };
      statusCell.font = { bold: true, color: { argb: 'FF375623' }, name: 'Arial', size: 9 };
      
      newRow.commit();
      await wb.xlsx.writeFile(xlsxPath);
      console.log('Added US-19 to L4 Excel');
    } else {
      console.log('US-19 already in L4 Excel');
    }
  } else {
    console.log('Sheet not found');
  }
}
main().catch(console.error);
