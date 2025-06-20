const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');

const config = {
    user: process.env.ORACLE_USER || 'system',
    password: process.env.ORACLE_PASSWORD || '123456',
    connectString: process.env.ORACLE_CONNECTION_STRING || 'localhost:1521/XE'
};

async function createTable() {
    let connection;
    try {
        // 建立資料庫連接
        connection = await oracledb.getConnection(config);
        console.log('成功連接到 Oracle 資料庫');

        // 建立資料表
        const createTableSQL = `
            CREATE TABLE layout_tasks (
                id NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
                project_id VARCHAR2(50) NOT NULL,
                ip_name VARCHAR2(100) NOT NULL,
                designer VARCHAR2(100),
                layout_owner VARCHAR2(100),
                schematic_freeze DATE,
                lvs_clean DATE,
                layout_leader_schematic_freeze DATE,
                layout_leader_lvs_clean DATE,
                planned_mandays NUMBER,
                actual_hours CLOB DEFAULT '[]',
                weekly_weights CLOB DEFAULT '[]',
                version NUMBER DEFAULT 1,
                rework_note VARCHAR2(4000),
                layout_closed NUMBER(1) DEFAULT 0,
                modified_by VARCHAR2(100),
                last_modified TIMESTAMP DEFAULT SYSTIMESTAMP,
                CONSTRAINT unique_project_ip UNIQUE (project_id, ip_name)
            )
        `;

        // 建立索引
        const createIndex1SQL = `
            CREATE INDEX idx_layout_tasks_project_id ON layout_tasks(project_id)
        `;

        const createIndex2SQL = `
            CREATE INDEX idx_layout_tasks_ip_name ON layout_tasks(ip_name)
        `;

        // 執行 SQL 語句
        await connection.execute(createTableSQL);
        console.log('成功建立 layout_tasks 資料表');

        await connection.execute(createIndex1SQL);
        console.log('成功建立第一個索引');

        await connection.execute(createIndex2SQL);
        console.log('成功建立第二個索引');

        await connection.commit();
        console.log('所有操作已完成');

    } catch (err) {
        console.error('發生錯誤:', err);
        if (connection) {
            await connection.rollback();
        }
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('資料庫連接已關閉');
            } catch (err) {
                console.error('關閉連接時發生錯誤:', err);
            }
        }
    }
}

// 執行腳本
createTable().catch(console.error); 