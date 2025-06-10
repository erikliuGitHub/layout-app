const fs = require('fs');
const csv = require('csv-parse');
const oracledb = require('oracledb');
const path = require('path');

// 配置參數
const config = {
    csvPath: process.argv[2] || path.join(__dirname, '../../data/sampleData_fixed.csv'), // 可自訂 CSV 路徑
    tableName: process.argv[3] || 'layout_weekly_weights', // 可自訂表名
    connection: {
        user: process.env.ORACLE_USER || 'system',
        password: process.env.ORACLE_PASSWORD || '123456',
        connectString: process.env.ORACLE_CONNECTION_STRING || 'localhost:1521/XE'
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
        const getLayoutIdSQL = `
            SELECT id 
            FROM layout_tasks 
            WHERE project_id = :1 AND ip_name = :2
        `;

        const insertWeightSQL = `
            INSERT INTO ${config.tableName} 
            (layout_id, week, weight, updated_at, updated_by, role, version) 
            VALUES (:1, :2, :3, TO_TIMESTAMP(:4, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), :5, :6, :7)
        `;

        // 處理每一行數據
        for await (const record of parser) {
            stats.total++;
            
            try {
                // 驗證必要欄位
                if (!record.project_id || !record.ip_name || !record.weekly_weights) {
                    console.log(`跳過無效數據: project_id=${record.project_id}, ip_name=${record.ip_name}`);
                    stats.skipped++;
                    continue;
                }

                // 解析 weekly_weights JSON
                let weights;
                try {
                    weights = JSON.parse(record.weekly_weights);
                } catch (err) {
                    console.log(`JSON 解析錯誤: ${record.weekly_weights}`);
                    stats.errors++;
                    continue;
                }

                if (!Array.isArray(weights) || weights.length === 0) {
                    console.log(`無權重數據: project_id=${record.project_id}, ip_name=${record.ip_name}`);
                    stats.skipped++;
                    continue;
                }

                // 獲取 layout_id
                const layoutResult = await connection.execute(getLayoutIdSQL, [
                    record.project_id,
                    record.ip_name
                ]);

                if (!layoutResult.rows || layoutResult.rows.length === 0) {
                    console.log(`找不到對應的 layout_tasks 記錄: project_id=${record.project_id}, ip_name=${record.ip_name}`);
                    stats.errors++;
                    continue;
                }

                const layoutId = layoutResult.rows[0][0];

                // 插入每個權重數據
                for (const weight of weights) {
                    try {
                        const params = [
                            layoutId,
                            weight.week,
                            weight.value,
                            weight.updatedAt,
                            weight.updatedBy,
                            weight.role,
                            weight.version
                        ];

                        // 驗證數據有效性
                        if (params.some(param => param === undefined || param === null)) {
                            console.log(`權重數據不完整: ${JSON.stringify(weight)}`);
                            stats.errors++;
                            continue;
                        }

                        // 插入數據
                        await connection.execute(insertWeightSQL, params);
                        stats.success++;

                    } catch (err) {
                        console.error(`處理權重記錄時發生錯誤: ${err.message}`);
                        stats.errors++;
                    }
                }

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