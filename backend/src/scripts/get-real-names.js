#!/usr/bin/env node

import { getDesignersAndLayoutOwners } from '../../models/userModel.js';

/**
 * 獲取系統中目前的真實 Designer 和 Layout Owner 名單
 */
async function getRealNames() {
  try {
    console.log('🔍 查詢系統中的真實人員名單...\n');

    const result = await getDesignersAndLayoutOwners();
    
    console.log('📋 系統中的 Designer 名單:');
    result.designers.forEach((name, index) => {
      console.log(`  ${index + 1}. ${name}`);
    });
    
    console.log('\n📋 系統中的 Layout Owner 名單:');
    result.layoutOwners.forEach((name, index) => {
      console.log(`  ${index + 1}. ${name}`);
    });
    
    console.log('\n📊 統計:');
    console.log(`  - Designer: ${result.designers.length} 人`);
    console.log(`  - Layout Owner: ${result.layoutOwners.length} 人`);
    console.log(`  - 總計: ${result.allUsers.length} 人`);
    
    console.log('\n✅ 查詢完成');
    
    return {
      designers: result.designers,
      layoutOwners: result.layoutOwners,
      allUsers: result.allUsers
    };
    
  } catch (err) {
    console.error('❌ 查詢人員名單時發生錯誤:', err);
    throw err;
  }
}

// 執行查詢
if (process.argv[1] && process.argv[1].endsWith('get-real-names.js')) {
  getRealNames()
    .then(() => {
      console.log('\n🎉 腳本執行完成！');
    })
    .catch((err) => {
      console.error('💥 腳本執行失敗:', err);
      process.exit(1);
    });
}

export { getRealNames };