const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require('uuid');
const { db, initializeDatabase } = require('./config/db');
const layoutRoutes = require('./routes/layouts');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const app = express();
const port = 3001;

// 基本中間件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 請求日誌中間件
app.use((req, res, next) => {
  const requestId = uuidv4();
  console.log(`[${requestId}] ${req.method} ${req.url}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log(`[${requestId}] Request Body:`, JSON.stringify(req.body, null, 2));
  }
  next();
});

// API 路由 - 要在錯誤處理之前設置
app.use('/api/layouts', layoutRoutes);

// 測試路由
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// 404 處理
app.use((req, res) => {
  const requestId = uuidv4();
  console.log(`[${requestId}] 404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: 'Not Found',
    errors: [`Route ${req.method} ${req.url} not found`],
    requestId
  });
});

// 全域錯誤處理
app.use((err, req, res, next) => {
  const requestId = uuidv4();
  console.error(`[${requestId}] Global error:`, err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    errors: [err.message || 'Unknown error'],
    requestId
  });
});

// 初始化資料庫並導入CSV數據
async function initializeApp() {
  try {
    // 初始化資料庫結構
    await initializeDatabase();
    console.log('Database structure initialized');

    // 檢查資料庫是否為空
    const count = await new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as count FROM layout_tasks', [], (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    // 如果資料庫為空，則導入CSV數據
    if (count === 0) {
      console.log('Database is empty, importing data from CSV...');
      
      // 準備插入語句
      const stmt = db.prepare(`
        INSERT INTO layout_tasks (
          project_id,
          ip_name,
          designer,
          layout_owner,
          schematic_freeze,
          lvs_clean,
          layout_leader_schematic_freeze,
          layout_leader_lvs_clean,
          planned_mandays,
          weekly_weights,
          actual_hours,
          version,
          rework_note,
          layout_closed,
          modified_by,
          last_modified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      // 從CSV文件讀取數據
      const csvPath = path.join(__dirname, '../scripts/sampleData.csv');
      console.log('Reading from CSV file:', csvPath);

      let rowCount = 0;
      await new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
          .pipe(csv())
          .on('data', (row) => {
            try {
              // 計算預計工作天數（從schematic_freeze到lvs_clean的天數）
              const schematicDate = new Date(row.schematic_freeze);
              const lvsDate = new Date(row.lvs_clean);
              const diffTime = Math.abs(lvsDate - schematicDate);
              const plannedMandays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              // 為每個記錄設置值
              const values = [
                row.project_id,
                row.ip_name,
                row.designer,
                row.layout_owner || null,
                row.schematic_freeze,
                row.lvs_clean,
                row.layout_leader_schematic_freeze,
                row.layout_leader_lvs_clean,
                plannedMandays.toString(),
                row.weekly_weights || '[]',
                '[]', // actual_hours 默認為空數組
                1,    // version
                '',   // rework_note
                0,    // layout_closed
                'system' // modified_by
              ];

              stmt.run(...values);
              rowCount++;
            } catch (error) {
              console.error('Error processing row:', row, error);
            }
          })
          .on('end', () => {
            stmt.finalize();
            console.log(`Successfully processed ${rowCount} rows from CSV`);
            resolve();
          })
          .on('error', (error) => {
            console.error('Error reading CSV:', error);
            reject(error);
          });
      });

      // 驗證導入的數據
      const importedCount = await new Promise((resolve, reject) => {
        db.get('SELECT COUNT(*) as count FROM layout_tasks', [], (err, row) => {
          if (err) {
            console.error('Error counting records:', err);
            reject(err);
          } else {
            console.log(`Total records in database: ${row.count}`);
            resolve(row.count);
          }
        });
      });

      // 檢查數據是否正確導入
      db.all('SELECT project_id, ip_name FROM layout_tasks', [], (err, rows) => {
        if (err) {
          console.error('Error fetching records:', err);
        } else {
          console.log('Sample of imported records:');
          rows.slice(0, 5).forEach(row => {
            console.log(`- ${row.project_id}: ${row.ip_name}`);
          });
        }
      });
    } else {
      console.log(`Database already contains ${count} records, skipping CSV import`);
    }

    // 啟動服務器
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      console.log('Available routes:');
      console.log('- GET    /api/layouts');
      console.log('- GET    /api/layouts/:projectId');
      console.log('- POST   /api/layouts/submit');
    });

  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

// 啟動應用程序
initializeApp();

module.exports = app; 