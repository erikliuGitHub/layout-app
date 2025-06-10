import oracledb from 'oracledb';

// Oracle 資料庫配置
const dbConfig = {
  user: process.env.ORACLE_USER || 'system',
  password: process.env.ORACLE_PASSWORD || '123456',
  connectString: process.env.ORACLE_CONNECTION_STRING || 'localhost:1521/XE',
  poolMin: 10,
  poolMax: 10,
  poolIncrement: 0
};

let oraclePool = null;

// 初始化 Oracle 連接池
export const initOraclePool = async () => {
  if (!oraclePool) {
    try {
      oraclePool = await oracledb.createPool(dbConfig);
      console.log('Oracle connection pool created');
    } catch (err) {
      console.error('Error creating Oracle connection pool:', err);
      throw err;
    }
  }
};

// 刪除 Oracle 表
export const dropOracleTable = async () => {
  const connection = await oraclePool.getConnection();
  try {
    await connection.execute('DROP TABLE layout_tasks');
    await connection.commit();
    console.log('Oracle table dropped successfully');
  } catch (err) {
    if (err.errorNum === 942) { // 表不存在的錯誤
      console.log('Table does not exist, skipping drop');
    } else {
      throw err;
    }
  } finally {
    await connection.close();
  }
};

// 初始化資料庫
export const initializeDatabase = async (force = false) => {
  try {
    await initOraclePool();
    if (force) {
      await dropOracleTable();
      // 創建表結構
      const createTableSQL = `
        CREATE TABLE layout_tasks (
          id VARCHAR2(36) PRIMARY KEY,
          project_id VARCHAR2(50) NOT NULL,
          ip_name VARCHAR2(100) NOT NULL,
          designer VARCHAR2(100),
          layout_owner VARCHAR2(100),
          schematic_freeze DATE,
          lvs_clean DATE,
          layout_leader_schematic_freeze DATE,
          layout_leader_lvs_clean DATE,
          planned_mandays VARCHAR2(10),
          weekly_weights CLOB,
          actual_hours CLOB,
          version NUMBER DEFAULT 1,
          rework_note CLOB,
          layout_closed NUMBER(1) DEFAULT 0,
          modified_by VARCHAR2(100),
          last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_project_ip UNIQUE (project_id, ip_name)
        )
      `;
      const connection = await oraclePool.getConnection();
      try {
        await connection.execute(createTableSQL);
        await connection.commit();
        console.log('Oracle table created successfully');
      } finally {
        await connection.close();
      }
    }
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
};

// 獲取 Oracle 連接
export const getConnection = async () => {
  if (!oraclePool) {
    await initOraclePool();
  }
  return await oraclePool.getConnection();
};

// 執行查詢
export const executeQuery = async (sql, params = {}) => {
  const connection = await getConnection();
  try {
    const result = await connection.execute(sql, params, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    if (typeof result.rowsAffected !== 'undefined') {
      return { rowsAffected: result.rowsAffected, rows: result.rows };
    }
    return { rows: result.rows };
  } finally {
    await connection.close();
  }
};

// 執行更新
export const executeUpdate = async (sql, params = {}) => {
  const connection = await getConnection();
  try {
    const result = await connection.execute(sql, params);
    await connection.commit();
    return result;
  } finally {
    await connection.close();
  }
};

const userResult = await executeQuery('SELECT USER FROM DUAL');
const dbResult = await executeQuery("SELECT SYS_CONTEXT('USERENV', 'DB_NAME') AS DB_NAME FROM DUAL");
console.log('API connected as user:', userResult.rows[0]?.USER, 'on DB:', dbResult.rows[0]?.DB_NAME); 