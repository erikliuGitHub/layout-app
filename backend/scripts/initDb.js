const fs = require('fs');
const Papa = require('papaparse');
const db = require("../config/db");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS layout_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    ip_name TEXT NOT NULL,
    designer TEXT,
    layout_owner TEXT,
    schematic_freeze TEXT,
    lvs_clean TEXT,
    estimated_hours TEXT,
    actual_hours TEXT,
    version INTEGER DEFAULT 1,
    rework_note TEXT
  )`);

  const csvFile = './scripts/sampleData.csv';
  const csvContent = fs.readFileSync(csvFile, 'utf8');
  const results = Papa.parse(csvContent, { header: true, skipEmptyLines: true });

  console.log('Total records parsed from CSV:', results.data.length);

  let completed = 0;
  results.data.forEach(item => {
    db.run(`
      INSERT INTO layout_tasks (
        project_id, ip_name, designer, layout_owner,
        schematic_freeze, lvs_clean, estimated_hours, actual_hours,
        version, rework_note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.project_id, item.ip_name, item.designer, item.layout_owner,
        item.schematic_freeze, item.lvs_clean,
        JSON.stringify({}), JSON.stringify({}),
        1, ""
      ],
      (err) => {
        if (err) {
          console.error('Insert failed for', item, err.message);
        } else {
          completed++;
          if (completed === results.data.length) {
            console.log('All data inserted successfully.');
            db.close();
          }
        }
      }
    );
  });

  if (results.data.length === 0) {
    console.log('No data found in CSV, closing DB.');
    db.close();
  }
});