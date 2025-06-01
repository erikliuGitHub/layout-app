const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

console.log('Starting CSV import process...');

// 連接到資料庫
const dbPath = path.join(__dirname, '../../database.sqlite');
console.log('Using database at:', dbPath);
const db = new sqlite3.Database(dbPath);

// 首先確保表格存在
db.run(`CREATE TABLE IF NOT EXISTS layout_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  ip_name TEXT NOT NULL,
  designer TEXT,
  layout_owner TEXT,
  schematic_freeze TEXT,
  lvs_clean TEXT,
  layout_leader_schematic_freeze TEXT,
  layout_leader_lvs_clean TEXT,
  planned_mandays TEXT,
  weekly_weights TEXT DEFAULT '[]',
  actual_hours TEXT DEFAULT '[]',
  version INTEGER DEFAULT 1,
  rework_note TEXT DEFAULT '',
  layout_closed INTEGER DEFAULT 0,
  modified_by TEXT,
  last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, ip_name)
)`, (err) => {
  if (err) {
    console.error('Error creating table:', err);
    process.exit(1);
  }

  // 清空現有資料
  db.run('DELETE FROM layout_tasks', (err) => {
    if (err) {
      console.error('Error clearing existing data:', err);
      process.exit(1);
    }
    console.log('Cleared existing data');

    // 準備 INSERT 語句
    const insertStmt = db.prepare(`
      INSERT INTO layout_tasks (
        project_id,
        ip_name,
        designer,
        layout_owner,
        schematic_freeze,
        lvs_clean,
        layout_leader_schematic_freeze,
        layout_leader_lvs_clean,
        weekly_weights,
        modified_by,
        last_modified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    // 讀取並解析 CSV 文件
    const csvPath = path.join(__dirname, './sampleData_fixed.csv');
    console.log('Reading CSV file from:', csvPath);

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (row) => {
        try {
          // 直接使用原始 weekly_weights 欄位內容，不做任何字串處理
          let weeklyWeights = row.weekly_weights || '[]';
          insertStmt.run(
            row.project_id,
            row.ip_name,
            row.designer,
            row.layout_owner,
            row.schematic_freeze,
            row.lvs_clean,
            row.layout_leader_schematic_freeze,
            row.layout_leader_lvs_clean,
            weeklyWeights,
            'system'
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
          }
          console.log('CSV import completed successfully!');
          process.exit(0);
        });
      })
      .on('error', (err) => {
        console.error('Error reading CSV:', err);
        process.exit(1);
      });
  });
}); 