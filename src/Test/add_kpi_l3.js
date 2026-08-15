const ExcelJS = require('exceljs');
const xlsxPath = 'D:/FULearning/semester 9/Elog/Report5/Report 5.3_ELog_L3-SystemAPITests.xlsx';

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  
  if (!wb.getWorksheet('L3-KpiAPI')) {
    const templateWs = wb.getWorksheet('L3-MonitoringAPI');
    const newWs = wb.addWorksheet('L3-KpiAPI');
    const model = JSON.parse(JSON.stringify(templateWs.model));
    model.name = 'L3-KpiAPI';
    newWs.model = model;
    
    // Clear rows from row 5 downwards
    const maxRows = newWs.rowCount;
    for (let i = maxRows; i >= 5; i--) {
      newWs.spliceRows(i, 1);
    }
    
    const kpiTests = [
      { id: 'L3-KPI-01', desc: 'GET /api/kpi/summary → 200 with summary stats' },
      { id: 'L3-KPI-02', desc: 'GET /api/kpi/daily-trend?preset=LAST_30_DAYS → 200 with trend data' },
      { id: 'L3-KPI-03', desc: 'GET /api/kpi/by-route?preset=INVALID → 400 (Invalid preset)' }
    ];

    kpiTests.forEach((t, i) => {
      const newRow = newWs.getRow(5 + i);
      // copy style from template row 5
      const templateRow = templateWs.getRow(5);
      newRow.height = templateRow.height;
      templateRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        newRow.getCell(colNumber).style = JSON.parse(JSON.stringify(cell.style));
      });
      
      newRow.getCell(1).value = t.id;
      newRow.getCell(2).value = 'KPI Dashboard';
      newRow.getCell(3).value = t.desc;
      newRow.getCell(4).value = 'High';
      newRow.getCell(13).value = 'Not Run';
      newRow.commit();
    });

    await wb.xlsx.writeFile(xlsxPath);
    console.log('Created L3-KpiAPI sheet with test cases');
  } else {
    console.log('L3-KpiAPI already exists');
  }
}
main().catch(console.error);
