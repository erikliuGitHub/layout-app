const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:3001/api';

// 測試數據
const testData = {
  projectId: 'TEST_PROJECT',
  data: [
    {
      ipName: 'ADC_Core_1',
      designer: 'Designer1',
      layoutOwner: 'LayoutOwner1',
      schematicFreeze: '2025-06-01',  // Designer 更新
      lvsClean: '2025-07-15',         // Designer 更新
      version: 1,
      plannedMandays: '30',
      actualHours: [],
      weeklyWeights: []
    }
  ]
};

// 測試 Layout Leader 更新
const testLayoutLeaderData = {
  projectId: 'TEST_PROJECT',
  data: [
    {
      ipName: 'ADC_Core_1',
      layoutOwner: 'LayoutOwner1',
      layoutLeaderSchematicFreeze: '2025-06-15',  // Layout Leader 更新
      layoutLeaderLvsClean: '2025-08-01',         // Layout Leader 更新
      version: 1,
      layoutClosed: false
    }
  ]
};

async function testUpdates() {
  try {
    console.log('開始測試更新功能...\n');

    // 1. 先測試 Designer 更新
    console.log('1. 測試 Designer 更新...');
    const designerResponse = await fetch(`${API_BASE_URL}/layouts/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...testData,
        userId: 'test_designer',
        role: 'designer'
      })
    });

    const designerResult = await designerResponse.json();
    console.log('Designer 更新結果:', JSON.stringify(designerResult, null, 2));

    // 等待一秒確保數據已更新
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 取得最新資料，準備給 Layout Leader 更新時帶上
    const getLatest = await fetch(`${API_BASE_URL}/layouts/${testData.projectId}`);
    const latestResult = await getLatest.json();
    const latestItem = latestResult.updatedProjectData.find(item => item.ipName === 'ADC_Core_1');

    // 2. 再測試 Layout Leader 更新（帶上現有 designer 欄位資料）
    console.log('\n2. 測試 Layout Leader 更新...');
    const layoutLeaderData = {
      projectId: testLayoutLeaderData.projectId,
      data: [
        {
          ipName: 'ADC_Core_1',
          layoutOwner: 'LayoutOwner1',
          layoutLeaderSchematicFreeze: '2025-06-15',
          layoutLeaderLvsClean: '2025-08-01',
          version: 1,
          layoutClosed: false,
          // 帶上現有 designer 欄位資料
          designer: latestItem.designer,
          schematicFreeze: latestItem.schematicFreeze,
          lvsClean: latestItem.lvsClean,
          plannedMandays: latestItem.plannedMandays,
          actualHours: latestItem.actualHours,
          weeklyWeights: latestItem.weeklyWeights
        }
      ],
      userId: 'test_layout_leader',
      role: 'layoutLeader'
    };

    console.log('Layout Leader 更新資料:', JSON.stringify(layoutLeaderData, null, 2));

    const layoutLeaderResponse = await fetch(`${API_BASE_URL}/layouts/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(layoutLeaderData)
    });

    const layoutLeaderResult = await layoutLeaderResponse.json();
    console.log('Layout Leader 更新結果:', JSON.stringify(layoutLeaderResult, null, 2));

    // 等待一秒確保數據已更新
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. 驗證最終結果
    console.log('\n3. 驗證最終結果...');
    const verifyResponse = await fetch(`${API_BASE_URL}/layouts/${testData.projectId}`);
    const verifyResult = await verifyResponse.json();
    
    const updatedItem = verifyResult.updatedProjectData.find(item => item.ipName === 'ADC_Core_1');
    console.log('最終數據:', JSON.stringify(updatedItem, null, 2));

    // 4. 檢查是否獨立
    console.log('\n4. 檢查數據獨立性...');
    const isIndependent = 
      updatedItem.schematicFreeze === '2025-06-01' &&  // Designer 的時間
      updatedItem.lvsClean === '2025-07-15' &&        // Designer 的時間
      updatedItem.layoutLeaderSchematicFreeze === '2025-06-15' &&  // Layout Leader 的時間
      updatedItem.layoutLeaderLvsClean === '2025-08-01';           // Layout Leader 的時間

    console.log('數據獨立性檢查:', isIndependent ? '通過' : '失敗');
    if (!isIndependent) {
      console.log('期望值:');
      console.log('- Designer schematicFreeze: 2025-06-01');
      console.log('- Designer lvsClean: 2025-07-15');
      console.log('- Layout Leader schematicFreeze: 2025-06-15');
      console.log('- Layout Leader lvsClean: 2025-08-01');
      console.log('\n實際值:', updatedItem);
    }

  } catch (err) {
    console.error('測試過程中發生錯誤:', err);
  }
}

// 執行測試
testUpdates(); 