require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const oracledb = require('oracledb');
const fs = require('fs');

const dbConfig = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECTION_STRING,
};

async function migrateWeeklyWeights() {
  let connection;
  
  try {
    // 建立資料庫連線
    connection = await oracledb.getConnection(dbConfig);
    
    // 1. 先取得所有現有的 layout_tasks 資料
    const result = await connection.execute(`
      SELECT project_id, ip_name, weekly_weights 
      FROM layout_tasks 
      WHERE weekly_weights IS NOT NULL
    `);

    // 2. 解析並插入新的資料表
    for (const row of result.rows) {
      const [projectId, ipName, weeklyWeightsStr] = row;
      
      try {
        let weeklyWeights;
        if (typeof weeklyWeightsStr === 'string') {
          weeklyWeights = JSON.parse(weeklyWeightsStr);
        } else if (Array.isArray(weeklyWeightsStr)) {
          weeklyWeights = weeklyWeightsStr;
        } else if (typeof weeklyWeightsStr === 'object' && weeklyWeightsStr !== null) {
          weeklyWeights = [weeklyWeightsStr];
        } else {
          weeklyWeights = [];
        }
        
        // 插入每一筆週權重資料
        for (const weight of weeklyWeights) {
          if (!weight.week) {
            console.warn(`Skip: ${projectId} - ${ipName} has weight with empty week`);
            continue;
          }
          await connection.execute(`
            INSERT INTO layout_weekly_weights 
            (project_id, ip_name, week, value, updated_at, updated_by, role, version)
            VALUES (:1, :2, :3, :4, :5, :6, :7, :8)
          `, [
            projectId,
            ipName,
            weight.week,
            weight.value,
            weight.updatedAt,
            weight.updatedBy,
            weight.role,
            weight.version || 1
          ]);
        }
        
        console.log(`Migrated weights for ${projectId} - ${ipName}`);
      } catch (parseError) {
        console.error(`Error parsing weekly_weights for ${projectId} - ${ipName}:`, parseError);
      }
    }

    // 3. 提交交易
    await connection.commit();
    console.log('Migration completed successfully');

  } catch (error) {
    console.error('Migration error:', error);
    if (connection) {
      await connection.rollback();
    }
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (error) {
        console.error('Error closing connection:', error);
      }
    }
  }
}

// 執行遷移
migrateWeeklyWeights(); 