#!/usr/bin/env node

import oracledb from 'oracledb';
import { getConnection } from '../config/db.js';

/**
 * 更名對應腳本
 * 將資料庫中的測試人名更新為Oracle人員表中的真實姓名
 */

// 設定映射規則
const NAME_MAPPING = {
  // Designer 映射 (來自Oracle的DESIGNER角色人員)
  'Alice Chen': 'Yi-Chun Wu',
  'Bob Wilson': 'Chih-Min Liu', 
  'Carol Davis': 'Jia-Wei Chen',
  'David Miller': 'Yu-Ting Wang',
  'Eve Johnson': 'Hsiao-Ming Lin',
  'Frank Brown': 'Chia-Hsuan Yang',
  'Grace Lee': 'Wei-Jun Chang',
  'Henry Taylor': 'Ming-Hsuan Li',
  'Iris Wang': 'Cheng-Wei Huang',
  'Jack Kim': 'Pei-Yu Wu',
  'Karen Sun': 'Ting-Yu Chen',
  'Leo Zhang': 'Chun-Kai Wang',
  'Mia Liu': 'Yi-Fen Liu',
  'Nick Green': 'Hao-Cheng Li',
  'Oscar White': 'Shu-Ting Yang',
  
  // Layout Owner 映射 (來自Oracle的LAYOUT角色人員)
  'Charlie Anderson': 'Jun-Wei Chang',
  'Diana Martinez': 'Li-Hua Wu',
  'Edward Thompson': 'Chih-Hsiang Chen',
  'Fiona Garcia': 'Yu-Chen Wang',
  'George Rodriguez': 'Ming-Chuan Lin',
  'Helen Martinez': 'Chia-Jung Yang',
  'Ivan Lopez': 'Wei-Cheng Chang',
  'Julia Gonzalez': 'Hsiao-Yu Li',
  'Kevin Wilson': 'Cheng-Hao Huang',
  'Linda Moore': 'Pei-Ling Wu',
  'Michael Taylor': 'Ting-Wei Chen',
  'Nancy Jackson': 'Chun-Ming Wang',
  'Oliver Brown': 'Yi-Hsuan Liu',
  'Paula Davis': 'Hao-Ting Li',
  'Quincy Miller': 'Shu-Wei Yang',
  'Rachel Johnson': 'Jun-Hsiang Chang',
  'Samuel Anderson': 'Li-Chen Wu',
  'Tina Rodriguez': 'Chih-Wei Chen'
};

/**
 * 檢查當前資料庫中的人名分布
 */
async function checkCurrentNames() {
  let connection;
  try {
    connection = await getConnection();
    console.log('🔍 檢查當前資料庫中的人名...\n');

    // 檢查 layout_tasks 表中的 designer
    const designerResult = await connection.execute(
      `SELECT DISTINCT designer, COUNT(*) as count 
       FROM layout_tasks 
       WHERE designer IS NOT NULL AND designer != ''
       GROUP BY designer 
       ORDER BY designer`,
      {},
      { outFormat: oracledb.OBJECT }
    );

    console.log('📋 當前 Designer 名單:');
    designerResult.rows.forEach(row => {
      const mapped = NAME_MAPPING[row.DESIGNER] || '❌ 未映射';
      console.log(`  ${row.DESIGNER} (${row.COUNT} 筆) → ${mapped}`);
    });

    // 檢查 layout_tasks 表中的 layout_owner
    const layoutOwnerResult = await connection.execute(
      `SELECT DISTINCT layout_owner, COUNT(*) as count 
       FROM layout_tasks 
       WHERE layout_owner IS NOT NULL AND layout_owner != ''
       GROUP BY layout_owner 
       ORDER BY layout_owner`,
      {},
      { outFormat: oracledb.OBJECT }
    );

    console.log('\n📋 當前 Layout Owner 名單:');
    layoutOwnerResult.rows.forEach(row => {
      const mapped = NAME_MAPPING[row.LAYOUT_OWNER] || '❌ 未映射';
      console.log(`  ${row.LAYOUT_OWNER} (${row.COUNT} 筆) → ${mapped}`);
    });

    // 檢查 weekly_weights 表中的 updatedBy
    const updatedByResult = await connection.execute(
      `SELECT DISTINCT updatedBy, COUNT(*) as count 
       FROM weekly_weights 
       WHERE updatedBy IS NOT NULL AND updatedBy != ''
       GROUP BY updatedBy 
       ORDER BY updatedBy`,
      {},
      { outFormat: oracledb.OBJECT }
    );

    console.log('\n📋 當前 UpdatedBy 名單:');
    updatedByResult.rows.forEach(row => {
      const mapped = NAME_MAPPING[row.UPDATEDBY] || '❌ 未映射';
      console.log(`  ${row.UPDATEDBY} (${row.COUNT} 筆) → ${mapped}`);
    });

    console.log('\n✅ 人名檢查完成');
    return {
      designers: designerResult.rows,
      layoutOwners: layoutOwnerResult.rows,
      updatedBy: updatedByResult.rows
    };

  } catch (err) {
    console.error('❌ 檢查人名時發生錯誤:', err);
    throw err;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

/**
 * 執行人名更新
 */
async function updateNames() {
  let connection;
  try {
    connection = await getConnection();
    console.log('🔄 開始更新人名...\n');

    let totalUpdated = 0;

    // 更新 layout_tasks 表中的 designer
    console.log('📝 更新 Designer 姓名...');
    for (const [oldName, newName] of Object.entries(NAME_MAPPING)) {
      const result = await connection.execute(
        `UPDATE layout_tasks 
         SET designer = :newName, 
             last_modified = CURRENT_TIMESTAMP,
             modified_by = 'System_NameUpdate'
         WHERE designer = :oldName`,
        { oldName, newName },
        { autoCommit: false }
      );

      if (result.rowsAffected > 0) {
        console.log(`  ✅ ${oldName} → ${newName} (${result.rowsAffected} 筆)`);
        totalUpdated += result.rowsAffected;
      }
    }

    // 更新 layout_tasks 表中的 layout_owner
    console.log('\n📝 更新 Layout Owner 姓名...');
    for (const [oldName, newName] of Object.entries(NAME_MAPPING)) {
      const result = await connection.execute(
        `UPDATE layout_tasks 
         SET layout_owner = :newName,
             last_modified = CURRENT_TIMESTAMP,
             modified_by = 'System_NameUpdate'
         WHERE layout_owner = :oldName`,
        { oldName, newName },
        { autoCommit: false }
      );

      if (result.rowsAffected > 0) {
        console.log(`  ✅ ${oldName} → ${newName} (${result.rowsAffected} 筆)`);
        totalUpdated += result.rowsAffected;
      }
    }

    // 更新 weekly_weights 表中的 updatedBy
    console.log('\n📝 更新 UpdatedBy 姓名...');
    for (const [oldName, newName] of Object.entries(NAME_MAPPING)) {
      const result = await connection.execute(
        `UPDATE weekly_weights 
         SET updatedBy = :newName
         WHERE updatedBy = :oldName`,
        { oldName, newName },
        { autoCommit: false }
      );

      if (result.rowsAffected > 0) {
        console.log(`  ✅ ${oldName} → ${newName} (${result.rowsAffected} 筆)`);
        totalUpdated += result.rowsAffected;        
      }
    }

    // 提交所有更改
    await connection.commit();
    console.log(`\n🎉 人名更新完成！總共更新了 ${totalUpdated} 筆記錄`);

  } catch (err) {
    console.error('❌ 更新人名時發生錯誤:', err);
    if (connection) {
      await connection.rollback();
      console.log('🔄 已回滾所有更改');
    }
    throw err;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

/**
 * 驗證更新結果
 */
async function verifyUpdate() {
  let connection;
  try {
    connection = await getConnection();
    console.log('✅ 驗證更新結果...\n');

    // 檢查是否還有舊名字
    const remainingOldNames = await connection.execute(
      `SELECT 'designer' as field, designer as name, COUNT(*) as count
       FROM layout_tasks 
       WHERE designer IN (${Object.keys(NAME_MAPPING).map(() => '?').join(',')})
       GROUP BY designer
       UNION ALL
       SELECT 'layout_owner' as field, layout_owner as name, COUNT(*) as count
       FROM layout_tasks 
       WHERE layout_owner IN (${Object.keys(NAME_MAPPING).map(() => '?').join(',')})
       GROUP BY layout_owner
       UNION ALL
       SELECT 'updatedBy' as field, updatedBy as name, COUNT(*) as count
       FROM weekly_weights 
       WHERE updatedBy IN (${Object.keys(NAME_MAPPING).map(() => '?').join(',')})
       GROUP BY updatedBy`,
      [...Object.keys(NAME_MAPPING), ...Object.keys(NAME_MAPPING), ...Object.keys(NAME_MAPPING)],
      { outFormat: oracledb.OBJECT }
    );

    if (remainingOldNames.rows.length > 0) {
      console.log('⚠️  發現未更新的舊名字:');
      remainingOldNames.rows.forEach(row => {
        console.log(`  ${row.FIELD}: ${row.NAME} (${row.COUNT} 筆)`);
      });
    } else {
      console.log('✅ 所有舊名字已成功更新！');
    }

    // 檢查新名字的分布
    const newNamesCount = await connection.execute(
      `SELECT 'designer' as field, designer as name, COUNT(*) as count
       FROM layout_tasks 
       WHERE designer IN (${Object.values(NAME_MAPPING).map(() => '?').join(',')})
       GROUP BY designer
       UNION ALL
       SELECT 'layout_owner' as field, layout_owner as name, COUNT(*) as count
       FROM layout_tasks 
       WHERE layout_owner IN (${Object.values(NAME_MAPPING).map(() => '?').join(',')})
       GROUP BY layout_owner`,
      [...Object.values(NAME_MAPPING), ...Object.values(NAME_MAPPING)],
      { outFormat: oracledb.OBJECT }
    );

    console.log('\n📊 新名字統計:');
    newNamesCount.rows.forEach(row => {
      console.log(`  ${row.FIELD}: ${row.NAME} (${row.COUNT} 筆)`);
    });

  } catch (err) {
    console.error('❌ 驗證時發生錯誤:', err);
    throw err;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

/**
 * 主執行函數
 */
async function main() {
  try {
    console.log('🚀 LRPS 人名更新腳本');
    console.log('====================\n');

    const args = process.argv.slice(2);
    
    if (args.includes('--check-only')) {
      await checkCurrentNames();
    } else if (args.includes('--verify-only')) {
      await verifyUpdate();
    } else {
      // 完整執行流程
      await checkCurrentNames();
      
      console.log('\n⚠️  準備執行人名更新...');
      console.log('此操作將修改資料庫中的人名記錄');
      
      // 簡單的確認提示（生產環境建議使用更安全的確認方式）
      if (process.env.NODE_ENV !== 'development') {
        console.log('請設定 NODE_ENV=development 以執行更新');
        process.exit(1);
      }

      await updateNames();
      await verifyUpdate();
    }

    console.log('\n🎉 腳本執行完成！');

  } catch (err) {
    console.error('💥 腳本執行失敗:', err);
    process.exit(1);
  }
}

// 執行腳本
if (process.argv[1] && process.argv[1].endsWith('update-names.js')) {
  main();
}

export { checkCurrentNames, updateNames, verifyUpdate };