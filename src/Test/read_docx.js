const fs = require('fs');
const zlib = require('zlib');

// Read docx (zip format)
const buffer = fs.readFileSync('D:/FULearning/semester 9/Elog/Report5/Report 5.0_TestPlan_Template.docx');

// Simple zip file parser for word/document.xml
let pos = 0;
while (pos < buffer.length - 30) {
  if (buffer.readUInt32LE(pos) === 0x04034b50) {
    const filenameLen = buffer.readUInt16LE(pos + 26);
    const extraLen = buffer.readUInt16LE(pos + 28);
    const filename = buffer.toString('utf8', pos + 30, pos + 30 + filenameLen);
    const compMethod = buffer.readUInt16LE(pos + 8);
    const compSize = buffer.readUInt32LE(pos + 18);
    const uncompSize = buffer.readUInt32LE(pos + 22);
    const dataStart = pos + 30 + filenameLen + extraLen;

    if (filename === 'word/document.xml') {
      const compressedData = buffer.slice(dataStart, dataStart + compSize);
      let xml = '';
      if (compMethod === 8) {
        xml = zlib.inflateRawSync(compressedData).toString('utf8');
      } else {
        xml = compressedData.toString('utf8');
      }
      const text = xml.replace(/<[^>]+>/g, '\n').split('\n').map(s => s.trim()).filter(Boolean);
      console.log(text.slice(80, 300).join('\n'));
      break;
    }
    pos = dataStart + compSize;
  } else {
    pos++;
  }
}
