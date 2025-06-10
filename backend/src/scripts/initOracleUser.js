const oracledb = require('oracledb');
require('dotenv').config();

async function initOracleUser() {
  let connection;
  try {
    // 連接到 Oracle 資料庫
    connection = await oracledb.getConnection({
      user: 'system',
      password: process.env.ORACLE_PASSWORD || 'your_password',
      connectString: 'localhost:1521/XEPDB1'
    });

    console.log('Connected to Oracle database');

    // 創建新用戶
    const username = process.env.ORACLE_USER || 'erik';
    const password = process.env.ORACLE_PASSWORD || '123456';

    // 創建用戶
    await connection.execute(
      `CREATE USER ${username} IDENTIFIED BY ${password}`
    );

    // 授予權限
    await connection.execute(
      `GRANT CONNECT, RESOURCE, CREATE SESSION, CREATE TABLE, CREATE VIEW, CREATE SEQUENCE TO ${username}`
    );

    // 授予無限表空間
    await connection.execute(
      `GRANT UNLIMITED TABLESPACE TO ${username}`
    );

    console.log(`User ${username} created successfully with necessary privileges`);

    // 提交更改
    await connection.commit();

  } catch (err) {
    console.error('Error initializing Oracle user:', err);
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error('Error rolling back:', rollbackErr);
      }
    }
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (closeErr) {
        console.error('Error closing connection:', closeErr);
      }
    }
  }
}

// 執行初始化
initOracleUser()
  .then(() => {
    console.log('Oracle user initialization completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Oracle user initialization failed:', err);
    process.exit(1);
  }); 