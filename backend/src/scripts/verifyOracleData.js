require('dotenv').config();
const { initializeDatabase, executeQuery } = require('../config/db');

async function verifyData() {
  try {
    console.log('Starting data verification...');

    // 初始化數據庫連接，但不重新創建表
    process.env.DB_TYPE = 'oracle';
    await initializeDatabase(false);
    console.log('Database connection initialized');

    // 檢查總記錄數
    const countResult = await executeQuery('SELECT COUNT(*) as total FROM layout_tasks');
    console.log(`Total records in Oracle: ${countResult.rows[0].TOTAL}`);

    // 檢查每個項目的記錄數
    const projectCountResult = await executeQuery(`
      SELECT project_id, COUNT(*) as count 
      FROM layout_tasks 
      GROUP BY project_id 
      ORDER BY project_id
    `);
    console.log('\nRecords per project:');
    projectCountResult.rows.forEach(row => {
      console.log(`${row.PROJECT_ID}: ${row.COUNT} records`);
    });

    // 檢查日期字段的格式
    const dateCheckResult = await executeQuery(`
      SELECT 
        project_id,
        ip_name,
        schematic_freeze,
        lvs_clean,
        layout_leader_schematic_freeze,
        layout_leader_lvs_clean,
        last_modified
      FROM layout_tasks 
      WHERE ROWNUM <= 5
    `);
    console.log('\nSample date fields (first 5 records):');
    dateCheckResult.rows.forEach(row => {
      console.log(`\nProject: ${row.PROJECT_ID}`);
      console.log(`IP: ${row.IP_NAME}`);
      console.log(`Schematic Freeze: ${row.SCHEMATIC_FREEZE}`);
      console.log(`LVS Clean: ${row.LVS_CLEAN}`);
      console.log(`Leader Schematic Freeze: ${row.LAYOUT_LEADER_SCHEMATIC_FREEZE}`);
      console.log(`Leader LVS Clean: ${row.LAYOUT_LEADER_LVS_CLEAN}`);
      console.log(`Last Modified: ${row.LAST_MODIFIED}`);
    });

    // 檢查 JSON 字段
    const jsonCheckResult = await executeQuery(`
      SELECT 
        project_id,
        ip_name,
        weekly_weights,
        actual_hours
      FROM layout_tasks 
      WHERE ROWNUM <= 5
    `);
    console.log('\nSample JSON fields (first 5 records):');
    jsonCheckResult.rows.forEach(row => {
      console.log(`\nProject: ${row.PROJECT_ID}`);
      console.log(`IP: ${row.IP_NAME}`);
      console.log(`Weekly Weights: ${row.WEEKLY_WEIGHTS}`);
      console.log(`Actual Hours: ${row.ACTUAL_HOURS}`);
    });

    console.log('\nData verification completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error during verification:', err);
    process.exit(1);
  }
}

verifyData(); 