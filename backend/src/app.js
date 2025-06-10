import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { executeQuery, executeUpdate, initializeDatabase } from './config/db.js';
import layoutRoutes from './routes/layouts.js';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';

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
    // 設置使用 Oracle 數據庫
    process.env.DB_TYPE = 'oracle';
    
    // 初始化資料庫結構
    await initializeDatabase(false);
    console.log('Database structure initialized');

    // 檢查資料庫是否為空
    const countResult = await executeQuery('SELECT COUNT(*) as total FROM layout_tasks');
    const count = countResult.rows[0].TOTAL;

    // 如果資料庫為空，則導入CSV數據
    if (count === 0) {
      console.log('Database is empty, importing data from CSV...');
      
      // 從CSV文件讀取數據
      const csvPath = path.join(__dirname, '../scripts/sampleData.csv');
      console.log('Reading from CSV file:', csvPath);

      let rowCount = 0;
      await new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
          .pipe(csv())
          .on('data', async (row) => {
            try {
              // 計算預計工作天數（從schematic_freeze到lvs_clean的天數）
              const schematicDate = new Date(row.schematic_freeze);
              const lvsDate = new Date(row.lvs_clean);
              const diffTime = Math.abs(lvsDate - schematicDate);
              const plannedMandays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              // 插入數據
              const insertSQL = `
                INSERT INTO layout_tasks (
                  id,
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
                ) VALUES (
                  :id,
                  :project_id,
                  :ip_name,
                  :designer,
                  :layout_owner,
                  TO_DATE(:schematic_freeze, 'YYYY-MM-DD'),
                  TO_DATE(:lvs_clean, 'YYYY-MM-DD'),
                  TO_DATE(:layout_leader_schematic_freeze, 'YYYY-MM-DD'),
                  TO_DATE(:layout_leader_lvs_clean, 'YYYY-MM-DD'),
                  :planned_mandays,
                  :weekly_weights,
                  :actual_hours,
                  :version,
                  :rework_note,
                  :layout_closed,
                  :modified_by,
                  CURRENT_TIMESTAMP
                )
              `;

              const params = {
                id: uuidv4(),
                project_id: row.project_id,
                ip_name: row.ip_name,
                designer: row.designer,
                layout_owner: row.layout_owner || null,
                schematic_freeze: row.schematic_freeze,
                lvs_clean: row.lvs_clean,
                layout_leader_schematic_freeze: row.layout_leader_schematic_freeze,
                layout_leader_lvs_clean: row.layout_leader_lvs_clean,
                planned_mandays: plannedMandays.toString(),
                weekly_weights: row.weekly_weights || '[]',
                actual_hours: '[]',
                version: 1,
                rework_note: '',
                layout_closed: 0,
                modified_by: 'system'
              };

              await executeQuery(insertSQL, params);
              rowCount++;
            } catch (error) {
              console.error('Error processing row:', row, error);
            }
          })
          .on('end', () => {
            console.log(`Successfully processed ${rowCount} rows from CSV`);
            resolve();
          })
          .on('error', (error) => {
            console.error('Error reading CSV:', error);
            reject(error);
          });
      });

      // 驗證導入的數據
      const importedCountResult = await executeQuery('SELECT COUNT(*) as total FROM layout_tasks');
      const importedCount = importedCountResult.rows[0].TOTAL;
      console.log(`Total records in database: ${importedCount}`);

      // 檢查數據是否正確導入
      const sampleResult = await executeQuery('SELECT project_id, ip_name FROM layout_tasks WHERE ROWNUM <= 5');
      console.log('Sample of imported records:');
      sampleResult.rows.forEach(row => {
        console.log(`- ${row.PROJECT_ID}: ${row.IP_NAME}`);
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

export default app; 