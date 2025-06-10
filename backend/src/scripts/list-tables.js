const oracledb = require('oracledb');

const config = {
    user: process.env.ORACLE_USER || 'system',
    password: process.env.ORACLE_PASSWORD || '123456',
    connectString: process.env.ORACLE_CONNECTION_STRING || 'localhost:1521/XE'
};

async function listTables() {
    let connection;
    try {
        // 建立資料庫連接
        connection = await oracledb.getConnection(config);
        console.log('成功連接到 Oracle 資料庫');

        // 查詢所有表
        const result = await connection.execute(`
            SELECT table_name, owner 
            FROM all_tables 
            WHERE owner IN (USER, 'SYSTEM')
            ORDER BY owner, table_name
        `);

        console.log('\n資料庫中的表：');
        console.log('-------------------');
        for (const row of result.rows) {
            console.log(`Schema: ${row[1]}, Table: ${row[0]}`);
        }
        console.log('-------------------');

    } catch (err) {
        console.error('發生錯誤:', err);
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('\n資料庫連接已關閉');
            } catch (err) {
                console.error('關閉連接時發生錯誤:', err);
            }
        }
    }
}

// 執行腳本
listTables().catch(console.error); 