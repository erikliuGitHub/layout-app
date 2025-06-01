const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const { db } = require('../config/db');

console.log('Starting CSV import process...');

// 首先確保表格存在
db.run(`CREATE TABLE IF NOT EXISTS layouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  ip_name TEXT NOT NULL,
  designer TEXT,
  layout_owner TEXT,
  schematic_freeze DATE,
  lvs_clean DATE,
  layout_leader_schematic_freeze DATE,
  layout_leader_lvs_clean DATE,
  layout_closed BOOLEAN DEFAULT FALSE,
  last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  modified_by TEXT,
  version TEXT DEFAULT '1',
  UNIQUE(project_id, ip_name)
)`, (err) => {
  if (err) {
    console.error('Error creating table:', err);
    process.exit(1);
  }

  // 準備 INSERT 語句
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO layouts (
      project_id,
      ip_name,
      designer,
      layout_owner,
      schematic_freeze,
      lvs_clean,
      layout_leader_schematic_freeze,
      layout_leader_lvs_clean,
      last_modified,
      modified_by,
      version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'system', '1')
  `);

  // 讀取並解析 CSV 文件
  const csvPath = path.join(__dirname, '../../scripts/sampleData.csv');
  console.log('Reading CSV file from:', csvPath);

  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (row) => {
      try {
        console.log('Processing row:', row);
        insertStmt.run(
          row.project_id,
          row.ip_name,
          row.designer,
          row.layout_owner,
          row.schematic_freeze,
          row.lvs_clean,
          row.layout_leader_schematic_freeze,
          row.layout_leader_lvs_clean
        );
      } catch (err) {
        console.error('Error inserting row:', row);
        console.error(err);
      }
    })
    .on('end', () => {
      console.log('CSV processing completed');
      insertStmt.finalize();
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
          process.exit(1);
        } else {
          console.log('CSV import completed successfully!');
          process.exit(0);
        }
      });
    })
    .on('error', (err) => {
      console.error('Error reading CSV:', err);
      process.exit(1);
    });
}); 