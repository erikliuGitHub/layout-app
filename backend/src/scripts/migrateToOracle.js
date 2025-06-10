require('dotenv').config();
const { initializeDatabase, executeQuery, executeUpdate } = require('../config/db');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 日期格式轉換函數
function formatDateForOracle(dateStr) {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (err) {
    console.error('Error formatting date:', dateStr, err);
    return null;
  }
}

// 時間戳格式轉換函數
function formatTimestampForOracle(dateStr) {
  if (!dateStr) return null;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (err) {
    console.error('Error formatting timestamp:', dateStr, err);
    return null;
  }
}

async function migrateData() {
  try {
    console.log('Starting data migration from SQLite to Oracle...');

    // 初始化 Oracle 資料庫，強制重新創建表
    process.env.DB_TYPE = 'oracle';
    await initializeDatabase(true);
    console.log('Oracle database initialized');

    // 連接 SQLite 資料庫
    const sqliteDb = new sqlite3.Database(path.join(__dirname, '../../../database.sqlite'));
    console.log('Connected to SQLite database');

    // 從 SQLite 讀取數據
    const rows = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM layout_tasks', [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      });
    });

    console.log(`Found ${rows.length} records to migrate`);

    // 將數據插入 Oracle
    for (const row of rows) {
      const insertSQL = `
        INSERT INTO layout_tasks (
          id, project_id, ip_name, designer, layout_owner,
          schematic_freeze, lvs_clean, layout_leader_schematic_freeze,
          layout_leader_lvs_clean, planned_mandays, weekly_weights,
          actual_hours, version, rework_note, layout_closed,
          modified_by, last_modified
        ) VALUES (
          :id, :project_id, :ip_name, :designer, :layout_owner,
          TO_DATE(:schematic_freeze, 'YYYY-MM-DD'),
          TO_DATE(:lvs_clean, 'YYYY-MM-DD'),
          TO_DATE(:layout_leader_schematic_freeze, 'YYYY-MM-DD'),
          TO_DATE(:layout_leader_lvs_clean, 'YYYY-MM-DD'),
          :planned_mandays, :weekly_weights,
          :actual_hours, :version, :rework_note, :layout_closed,
          :modified_by, TO_TIMESTAMP(:last_modified, 'YYYY-MM-DD HH24:MI:SS')
        )
      `;

      const params = {
        id: row.id || uuidv4(),
        project_id: row.project_id,
        ip_name: row.ip_name,
        designer: row.designer,
        layout_owner: row.layout_owner,
        schematic_freeze: formatDateForOracle(row.schematic_freeze),
        lvs_clean: formatDateForOracle(row.lvs_clean),
        layout_leader_schematic_freeze: formatDateForOracle(row.layout_leader_schematic_freeze),
        layout_leader_lvs_clean: formatDateForOracle(row.layout_leader_lvs_clean),
        planned_mandays: row.planned_mandays,
        weekly_weights: row.weekly_weights || '[]',
        actual_hours: row.actual_hours || '[]',
        version: row.version || 1,
        rework_note: row.rework_note || '',
        layout_closed: row.layout_closed || 0,
        modified_by: row.modified_by,
        last_modified: formatTimestampForOracle(row.last_modified) || formatTimestampForOracle(new Date())
      };

      try {
        await executeUpdate(insertSQL, params);
        console.log(`Migrated record: ${params.project_id} - ${params.ip_name}`);
      } catch (err) {
        console.error(`Error migrating record ${params.project_id} - ${params.ip_name}:`, err);
        // 打印出問題數據的詳細信息
        console.error('Problematic data:', {
          schematic_freeze: row.schematic_freeze,
          lvs_clean: row.lvs_clean,
          layout_leader_schematic_freeze: row.layout_leader_schematic_freeze,
          layout_leader_lvs_clean: row.layout_leader_lvs_clean,
          last_modified: row.last_modified
        });
      }
    }

    console.log('Data migration completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error during migration:', err);
    process.exit(1);
  }
}

migrateData(); 