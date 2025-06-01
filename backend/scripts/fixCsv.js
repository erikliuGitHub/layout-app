const fs = require('fs');
const input = fs.readFileSync('sampleData.csv', 'utf8');
const lines = input.split('\n');
const header = lines[0];
const out = [header];

for (let i = 1; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  // 只針對有 weekly_weights 欄位的行做處理
  const parts = lines[i].split(',');
  if (parts.length > 8) {
    let json = parts.slice(8).join(',');
    json = json.trim();
    if (json && json !== '[]') {
      json = json.replace(/"/g, '""');
      json = `"${json}"`;
    }
    const newLine = [...parts.slice(0, 8), json].join(',');
    out.push(newLine);
  } else {
    out.push(lines[i]);
  }
}
fs.writeFileSync('sampleData_fixed.csv', out.join('\n'));
console.log('已產生 fixed 檔案，請用這個檔案重新 import');
