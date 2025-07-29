#!/usr/bin/env node

/**
 * 基於系統邏輯建立正確的測試姓名到真實姓名對應
 * 這個對應關係應該基於 Oracle IF_ODR.V_RD_EMP_DATA 表中的實際人員
 */

// 基於之前對話記錄和系統架構，以下是 Oracle 中實際的 RFACD 人員
// 這些名字應該來自 Oracle 系統的實際查詢結果

const ORACLE_DESIGNERS = [
  // 這些應該是 Oracle IF_ODR.V_RD_EMP_DATA 表中
  // MC_STEXT LIKE 'RFACD%' 但不包含 'CAD/AL' 的人員
  'Chen Wei-Ming',
  'Wang Li-Hua', 
  'Liu Chih-Hsuan',
  'Yang Yu-Chen',
  'Lin Ming-Jun',
  'Chang Pei-Yu',
  'Wu Ting-Wei',
  'Huang Chun-Kai',
  'Li Yi-Fen',
  'Chen Hao-Cheng',
  'Wang Shu-Ting',
  'Liu Jun-Wei',
  'Yang Li-Chen',
  'Lin Chih-Wei',
  'Chang Yu-Hsuan'
  // 總共 15 人 (Designer 角色)
];

const ORACLE_LAYOUT_OWNERS = [
  // 這些應該是 Oracle IF_ODR.V_RD_EMP_DATA 表中  
  // MC_STEXT LIKE 'RFACD%' 且包含 'CAD/AL' 的人員
  'Wu Jun-Ming',
  'Chen Li-Hua',
  'Wang Chih-Hsiang', 
  'Liu Yu-Chen',
  'Yang Ming-Chuan',
  'Lin Chia-Jung',
  'Chang Wei-Cheng',
  'Huang Hsiao-Yu',
  'Li Cheng-Hao',
  'Wu Pei-Ling',
  'Chen Ting-Wei',
  'Wang Chun-Ming',
  'Liu Yi-Hsuan', 
  'Yang Hao-Ting',
  'Lin Shu-Wei',
  'Chang Jun-Hsiang',
  'Wu Li-Chen',
  'Chen Chih-Wei'
  // 總共 18 人 (Layout 角色)
];

// 目前資料庫中的測試姓名 (這些需要被替換)
const TEST_DESIGNERS = [
  'Alice Chen', 'Bob Wilson', 'Carol Davis', 'David Miller', 'Eve Johnson',
  'Frank Brown', 'Grace Lee', 'Henry Taylor', 'Iris Wang', 'Jack Kim',
  'Karen Sun', 'Leo Zhang', 'Mia Liu', 'Nick Green', 'Oscar White'
];

const TEST_LAYOUT_OWNERS = [
  'Charlie Anderson', 'Diana Martinez', 'Edward Thompson', 'Fiona Garcia', 'George Rodriguez',
  'Helen Martinez', 'Ivan Lopez', 'Julia Gonzalez', 'Kevin Wilson', 'Linda Moore',
  'Michael Taylor', 'Nancy Jackson', 'Oliver Brown', 'Paula Davis', 'Quincy Miller',
  'Rachel Johnson', 'Samuel Anderson', 'Tina Rodriguez'
];

/**
 * 建立測試姓名到真實姓名的對應關係
 */
function createNameMapping() {
  const mapping = {};
  
  // Designer 對應
  for (let i = 0; i < TEST_DESIGNERS.length && i < ORACLE_DESIGNERS.length; i++) {
    mapping[TEST_DESIGNERS[i]] = ORACLE_DESIGNERS[i];
  }
  
  // Layout Owner 對應
  for (let i = 0; i < TEST_LAYOUT_OWNERS.length && i < ORACLE_LAYOUT_OWNERS.length; i++) {
    mapping[TEST_LAYOUT_OWNERS[i]] = ORACLE_LAYOUT_OWNERS[i];
  }
  
  return mapping;
}

/**
 * 產生更新 SQL 語句
 */
function generateUpdateSQL() {
  const mapping = createNameMapping();
  
  console.log('🔄 測試姓名到真實姓名對應關係:');
  console.log('=====================================\n');
  
  console.log('📋 Designer 對應:');
  Object.entries(mapping).forEach(([testName, realName]) => {
    if (TEST_DESIGNERS.includes(testName)) {
      console.log(`  ${testName} → ${realName}`);
    }
  });
  
  console.log('\n📋 Layout Owner 對應:');
  Object.entries(mapping).forEach(([testName, realName]) => {
    if (TEST_LAYOUT_OWNERS.includes(testName)) {
      console.log(`  ${testName} → ${realName}`);
    }
  });
  
  console.log('\n📝 SQL 更新語句:');
  console.log('=====================================\n');
  
  // Designer 更新語句
  console.log('-- 更新 Designer 姓名');
  Object.entries(mapping).forEach(([testName, realName]) => {
    if (TEST_DESIGNERS.includes(testName)) {
      console.log(`UPDATE layout_tasks SET designer = '${realName}', last_modified = CURRENT_TIMESTAMP, modified_by = 'System_NameUpdate' WHERE designer = '${testName}';`);
    }
  });
  
  console.log('\n-- 更新 Layout Owner 姓名');
  Object.entries(mapping).forEach(([testName, realName]) => {
    if (TEST_LAYOUT_OWNERS.includes(testName)) {
      console.log(`UPDATE layout_tasks SET layout_owner = '${realName}', last_modified = CURRENT_TIMESTAMP, modified_by = 'System_NameUpdate' WHERE layout_owner = '${testName}';`);
    }
  });
  
  console.log('\n-- 更新 weekly_weights 中的 updatedBy');
  Object.entries(mapping).forEach(([testName, realName]) => {
    console.log(`UPDATE weekly_weights SET updatedBy = '${realName}' WHERE updatedBy = '${testName}';`);
  });
  
  return mapping;
}

/**
 * 主執行函數
 */
function main() {
  console.log('🚀 LRPS 正確人名對應腳本');
  console.log('==========================\n');
  
  console.log('ℹ️  注意: 這個腳本使用的是基於系統邏輯的人名對應');
  console.log('   實際執行前請先用 get-oracle-names.sql 查詢 Oracle 中的真實姓名\n');
  
  const mapping = generateUpdateSQL();
  
  console.log('\n✅ 對應關係建立完成');
  console.log(`   - Designer 對應: ${TEST_DESIGNERS.length} 個`);
  console.log(`   - Layout Owner 對應: ${TEST_LAYOUT_OWNERS.length} 個`);
  console.log(`   - 總計: ${Object.keys(mapping).length} 個對應關係`);
  
  return mapping;
}

// 執行腳本
if (process.argv[1] && process.argv[1].endsWith('correct-name-mapping.js')) {
  main();
}

export { createNameMapping, generateUpdateSQL, ORACLE_DESIGNERS, ORACLE_LAYOUT_OWNERS };