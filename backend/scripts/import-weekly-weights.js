const fs = require('fs');
const csv = require('csv-parse');
const oracledb = require('oracledb');
const path = require('path');

// 配置參數
const config = {
    csvPath: process.argv[2] || 'weekly_weights.csv', // 可自訂 CSV 路徑
    tableName: process.argv[3] || 'layout_weekly_weights', // 可自訂表名
    connection: {
        user: process.env.ORACLE_USER || 'system',
        password: process.env.ORACLE_PASSWORD || 'oracle',
        connectString: process.env.ORACLE_CONNECTION_STRING || 'localhost:1521/XEPDB1'
    }
};

// 統計數據
const stats = {
    total: 0,
    success: 0,
    skipped: 0,
    errors: 0
};

async function processCSV() {
    let connection;
    try {
        // 建立資料庫連接
        connection = await oracledb.getConnection(config.connection);
        console.log('成功連接到 Oracle 資料庫');

        // 讀取並解析 CSV 檔案
        const parser = fs
            .createReadStream(config.csvPath)
            .pipe(csv.parse({
                columns: true,
                skip_empty_lines: true
            }));

        // 準備 SQL 語句
        const sql = `INSERT INTO ${config.tableName} 
                    (layout_id, week, weight) 
                    VALUES (:layout_id, :week, :weight)`;

        // 處理每一行數據
        for await (const record of parser) {
            stats.total++;
            
            try {
                // 驗證必要欄位
                if (!record.layout_id || !record.week || !record.weight) {
                    console.log(`跳過無效數據: ${JSON.stringify(record)}`);
                    stats.skipped++;
                    continue;
                }

                // 轉換數據類型
                const params = {
                    layout_id: parseInt(record.layout_id),
                    week: parseInt(record.week),
                    weight: parseFloat(record.weight)
                };

                // 驗證數據有效性
                if (isNaN(params.layout_id) || isNaN(params.week) || isNaN(params.weight)) {
                    console.log(`數據格式錯誤: ${JSON.stringify(record)}`);
                    stats.errors++;
                    continue;
                }

                // 插入數據
                await connection.execute(sql, params);
                stats.success++;

            } catch (err) {
                console.error(`處理記錄時發生錯誤: ${err.message}`);
                stats.errors++;
            }
        }

        // 提交事務
        await connection.commit();
        console.log('\n處理完成！統計信息：');
        console.log(`總記錄數: ${stats.total}`);
        console.log(`成功導入: ${stats.success}`);
        console.log(`跳過記錄: ${stats.skipped}`);
        console.log(`錯誤記錄: ${stats.errors}`);

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
processCSV().catch(console.error); 