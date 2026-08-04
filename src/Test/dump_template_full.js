const fs = require('fs');
const zlib = require('zlib');

const buffer = fs.readFileSync('D:/FULearning/semester 9/Elog/Report5/Report 5.0_TestPlan_Template.docx');

let pos = 0;
while (pos < buffer.length - 30) {
  if (buffer.readUInt32LE(pos) === 0x04034b50) {
    const filenameLen = buffer.readUInt16LE(pos + 26);
    const extraLen = buffer.readUInt16LE(pos + 28);
    const filename = buffer.toString('utf8', pos + 30, pos + 30 + filenameLen);
    const compMethod = buffer.readUInt16LE(pos + 8);
    const compSize = buffer.readUInt32LE(pos + 18);
    const dataStart = pos + 30 + filenameLen + extraLen;

    if (filename === 'word/document.xml') {
      const compressedData = buffer.slice(dataStart, dataStart + compSize);
      let xml = '';
      if (compMethod === 8) {
        xml = zlib.inflateRawSync(compressedData).toString('utf8');
      } else {
        xml = compressedData.toString('utf8');
      }
      
      // Clean XML tags into plain text with line breaks
      const textLines = xml
        .replace(/<\/w:p>/g, '\n')
        .replace(/<\/w:tr>/g, '\n--- ROW END ---\n')
        .replace(/<[^>]+>/g, '')
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);

      console.log('=== FULL TEMPLATE DUMP ===');
      console.log(textLines.join('\n'));
      break;
    }
    pos = dataStart + compSize;
  } else {
    pos++;
  }
}
