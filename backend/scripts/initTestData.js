const { db, initializeDatabase } = require('../src/config/db');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

async function initTestData() {
  try {
    // 初始化資料庫
    await initializeDatabase();
    console.log('Database initialized');

    // 清空現有數據
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM layout_tasks', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('Cleared existing data');

    // 準備插入語句
    const stmt = db.prepare(`
      INSERT INTO layout_tasks (
        project_id,
        ip_name,
        designer,
        layout_owner,
        schematic_freeze,
        lvs_clean,
        planned_mandays,
        actual_hours,
        version,
        rework_note,
        layout_closed,
        modified_by,
        last_modified
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    // 從CSV文件讀取數據
    const csvPath = path.join(__dirname, 'sampleData.csv');
    console.log('Reading from CSV file:', csvPath);

    // 使用Promise處理CSV讀取
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          // 為每個記錄設置默認值
          stmt.run(
            row.project_id,
            row.ip_name,
            row.designer,
            row.layout_owner || null,
            row.schematic_freeze,
            row.lvs_clean,
            '20', // 默認planned_mandays
            '[]', // 默認actual_hours
            1,    // 默認version
            '',   // 默認rework_note
            0,    // 默認layout_closed
            'system' // 默認modified_by
          );
        })
        .on('end', () => {
          console.log('CSV file successfully processed');
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });

    stmt.finalize();
    console.log('Test data inserted successfully');

    // 驗證數據
    const rows = await new Promise((resolve, reject) => {
      db.all('SELECT * FROM layout_tasks', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log(`Inserted ${rows.length} records`);
    console.log('Database initialization completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initTestData(); 