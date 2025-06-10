const oracledb = require('oracledb');

const config = {
  user: process.env.ORACLE_USER || 'system',
  password: process.env.ORACLE_PASSWORD || '123456',
  connectString: process.env.ORACLE_CONNECTION_STRING || 'localhost:1521/XE'
};

async function main() {
  let connection;
  try {
    connection = await oracledb.getConnection(config);
    const userResult = await connection.execute('SELECT USER FROM DUAL');
    console.log('Current Oracle user:', userResult.rows[0][0]);
    const tablesResult = await connection.execute('SELECT table_name FROM user_tables');
    console.log('Current user tables:', tablesResult.rows.map(r => r[0]));
  } catch (err) {
    console.error('Oracle debug error:', err);
  } finally {
    if (connection) await connection.close();
  }
}

main();