const fs = require('fs');

const xml = fs.readFileSync('D:/FULearning/semester 9/Elog/ELog-FE/src/Test/raw_document.xml', 'utf8');

// Regex to find text nodes containing brackets []
const matches = xml.match(/\[[^\]]+\]/g);
console.log('Unique Bracket Placeholders in Template XML:');
const unique = [...new Set(matches)];
console.log(unique);
