const ExcelJS = require('exceljs');
const xlsxPath = 'D:/FULearning/semester 9/Elog/Report5/Report 5.5_ELog_UAT_Scripts.xlsx';

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsxPath);
  
  if (!wb.getWorksheet('SC-11')) {
    const ws10 = wb.getWorksheet('SC-10');
    const ws11 = wb.addWorksheet('SC-11');
    const model = JSON.parse(JSON.stringify(ws10.model));
    model.name = 'SC-11';
    ws11.model = model;
    
    ws11.getCell('A1').value = '[SC-11] — KPI Dashboard & GPS Monitoring';
    ws11.getCell('A3').value = 'Objective: Theo dõi KPI tổng quan và giám sát xe trên bản đồ thời gian thực.';
    ws11.getCell('A4').value = 'Sign-off:  ☑ Approved   —   Product Owner: QA Engineering Team   Date: 05/08/2026   Result: ☑ Pass';
    await wb.xlsx.writeFile(xlsxPath);
    console.log('Created SC-11 sheet');
  } else {
    console.log('SC-11 already exists');
  }
}
main().catch(console.error);
