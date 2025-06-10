require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });
const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');

// 直接用環境變數組出 dbConfig
const dbConfig = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECTION_STRING,
};

async function executeSQLFile() {
  let connection;
  
  try {
    // 建立資料庫連線
    connection = await oracledb.getConnection(dbConfig);
    
    // 讀取 SQL 檔案
    const sqlFile = path.join(__dirname, 'create_weekly_weights_table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // 分割 SQL 命令（以分號為分隔）
    const commands = sql.split(';').filter(cmd => cmd.trim());
    
    // 執行每個 SQL 命令
    for (const cmd of commands) {
      if (cmd.trim()) {
        try {
          await connection.execute(cmd);
          console.log('Successfully executed SQL command');
        } catch (err) {
          console.error('Error executing SQL command:', err);
          throw err;
        }
      }
    }
    
    // 提交交易
    await connection.commit();
    console.log('All SQL commands executed successfully');
    
  } catch (error) {
    console.error('Error:', error);
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

// 執行 SQL 命令
executeSQLFile(); 