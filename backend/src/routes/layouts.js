import express from 'express';
import { executeQuery, executeUpdate } from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';

const router = express.Router();

// 獲取所有專案的資料
router.get('/', async (req, res) => {
  console.log('GET / - Fetching all layouts');
  try {
    // debug: 印出目前 user 與所有可見表名
    try {
      const userResult = await executeQuery('SELECT USER FROM DUAL');
      console.log('Current Oracle user:', userResult.rows[0].USER);
      const tablesResult = await executeQuery("SELECT table_name FROM user_tables");
      console.log('Current user tables:', tablesResult.rows.map(r => r.TABLE_NAME));
    } catch (debugErr) {
      console.error('Debug info error:', debugErr);
    }

    const result = await executeQuery(`
      SELECT 
        t.*,
        w.WEEK,
        w.WEIGHT as WEIGHT_VALUE,
        w.UPDATED_AT as WEIGHT_UPDATED_AT,
        w.UPDATED_BY as WEIGHT_UPDATED_BY,
        w.ROLE as WEIGHT_ROLE,
        w.VERSION as WEIGHT_VERSION
      FROM LAYOUT_TASKS t
      LEFT JOIN LAYOUT_WEEKLY_WEIGHTS w ON t.ID = w.LAYOUT_ID
      ORDER BY t.PROJECT_ID, t.IP_NAME, w.WEEK
    `);

    // 將資料按專案分組
    const projectData = result.rows.reduce((acc, row) => {
      if (!acc[row.PROJECT_ID]) {
        acc[row.PROJECT_ID] = [];
      }

      // 檢查是否已存在相同 IP 的記錄
      const existingRecord = acc[row.PROJECT_ID].find(r => r.ipName === row.IP_NAME);
      
      if (existingRecord) {
        // 如果已存在，添加新的週權重
        if (row.WEEK) {
          existingRecord.weeklyWeights.push({
            week: row.WEEK,
            value: row.WEIGHT_VALUE,
            updatedAt: row.WEIGHT_UPDATED_AT,
            updatedBy: row.WEIGHT_UPDATED_BY,
            role: row.WEIGHT_ROLE,
            version: row.WEIGHT_VERSION
          });
        }
      } else {
        // 如果不存在，創建新記錄
        acc[row.PROJECT_ID].push({
          id: row.ID,
          ipName: row.IP_NAME,
          designer: row.DESIGNER,
          layoutOwner: row.LAYOUT_OWNER,
          schematicFreeze: row.SCHEMATIC_FREEZE,
          lvsClean: row.LVS_CLEAN,
          layoutLeaderSchematicFreeze: row.LAYOUT_LEADER_SCHEMATIC_FREEZE,
          layoutLeaderLvsClean: row.LAYOUT_LEADER_LVS_CLEAN,
          layoutClosed: row.LAYOUT_CLOSED,
          weeklyWeights: row.WEEK ? [{
            week: row.WEEK,
            value: row.WEIGHT_VALUE,
            updatedAt: row.WEIGHT_UPDATED_AT,
            updatedBy: row.WEIGHT_UPDATED_BY,
            role: row.WEIGHT_ROLE,
            version: row.WEIGHT_VERSION
          }] : []
        });
      }

      return acc;
    }, {});

    // 只 log 純數字或字串，避免 circular structure
    console.log('Sending response: projectCount=%d, totalRecords=%d', 
      Object.keys(projectData).length, result.rows.length);

    res.json({
      success: true,
      data: projectData
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Database error: ' + error.message 
    });
  }
});

// 獲取特定專案的資料
router.get('/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const requestId = uuidv4();

  try {
    // 查詢 layout_tasks 和 weekly_weights
    const result = await executeQuery(`
      SELECT 
        t.*,
        w.WEEK,
        w.WEIGHT as WEIGHT_VALUE,
        w.UPDATED_AT as WEIGHT_UPDATED_AT,
        w.UPDATED_BY as WEIGHT_UPDATED_BY,
        w.ROLE as WEIGHT_ROLE,
        w.VERSION as WEIGHT_VERSION
      FROM LAYOUT_TASKS t
      LEFT JOIN LAYOUT_WEEKLY_WEIGHTS w ON t.ID = w.LAYOUT_ID
      WHERE t.PROJECT_ID = :projectId
      ORDER BY t.IP_NAME, w.WEEK
    `, { projectId });

    // 將結果轉換成需要的格式
    const layoutsMap = {};
    const currentWeek = new Date().toISOString().slice(0, 4) + '-W' + 
      String(Math.ceil((new Date() - new Date(new Date().getFullYear(), 0, 1)) / 604800000)).padStart(2, '0');

    for (const row of result.rows) {
      const key = `${row.PROJECT_ID}||${row.IP_NAME}`;
      if (!layoutsMap[key]) {
        layoutsMap[key] = {
          projectId: row.PROJECT_ID,
          ipName: row.IP_NAME,
          designer: row.DESIGNER,
          layoutOwner: row.LAYOUT_OWNER,
          schematicFreeze: row.SCHEMATIC_FREEZE,
          lvsClean: row.LVS_CLEAN,
          layoutLeaderSchematicFreeze: row.LAYOUT_LEADER_SCHEMATIC_FREEZE,
          layoutLeaderLvsClean: row.LAYOUT_LEADER_LVS_CLEAN,
          status: row.STATUS,
          plannedMandays: row.PLANNED_MANDAYS,
          layoutClosed: row.LAYOUT_CLOSED,
          weeklyWeights: []
        };
      }
      
      // 如果有 weekly weight 資料，加入陣列
      if (row.WEEK) {
        layoutsMap[key].weeklyWeights.push({
          week: row.WEEK,
          value: row.WEIGHT_VALUE,
          updatedAt: row.WEIGHT_UPDATED_AT,
          updatedBy: row.WEIGHT_UPDATED_BY,
          role: row.WEIGHT_ROLE,
          version: row.WEIGHT_VERSION
        });
      }
    }

    // 為每個項目初始化當前週的權重（如果不存在）
    for (const layout of Object.values(layoutsMap)) {
      if (!layout.weeklyWeights.some(w => w.week === currentWeek)) {
        // 插入新的權重記錄
        try {
          await executeQuery(`
            INSERT INTO LAYOUT_WEEKLY_WEIGHTS (
              LAYOUT_ID,
              WEEK,
              WEIGHT,
              UPDATED_AT,
              UPDATED_BY,
              ROLE,
              VERSION
            ) VALUES (
              (SELECT ID FROM LAYOUT_TASKS WHERE PROJECT_ID = :projectId AND IP_NAME = :ipName),
              :week,
              0,
              CURRENT_TIMESTAMP,
              :layoutOwner,
              'LAYOUT_OWNER',
              1
            )
          `, {
            projectId: layout.projectId,
            ipName: layout.ipName,
            week: currentWeek,
            layoutOwner: layout.layoutOwner
          });

          // 添加到返回的數據中
          layout.weeklyWeights.push({
            week: currentWeek,
            value: 0,
            updatedAt: new Date().toISOString(),
            updatedBy: layout.layoutOwner,
            role: 'LAYOUT_OWNER',
            version: 1
          });
        } catch (err) {
          console.error(`Error initializing weight for ${layout.ipName}:`, err);
        }
      }
    }

    // 轉換成陣列
    const layouts = Object.values(layoutsMap);

    res.json({
      success: true,
      data: layouts,
      requestId
    });
  } catch (err) {
    console.error(`[${requestId}] Error fetching layouts:`, err);
    res.status(500).json({
      success: false,
      message: 'Error fetching layouts',
      errors: [err.message],
      requestId
    });
  }
});

const layoutSchema = Joi.object({
  ip_name: Joi.string().trim().required(),
  designer: Joi.string().trim().required(),
  schematic_freeze: Joi.string().pattern(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/).required(),
  lvs_clean: Joi.string().pattern(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/).required(),
  layout_owner: Joi.string().allow('', null),
  layout_leader_schematic_freeze: Joi.string().allow('', null),
  layout_leader_lvs_clean: Joi.string().allow('', null),
  planned_mandays: Joi.number().allow(null),
  version: Joi.number().allow(null),
  layout_closed: Joi.number().valid(0, 1).allow(null),
  weekly_weights: Joi.any().optional(),
  // 其他欄位如有需要可補上
});

// 強化 validateDate：只允許 YYYY-MM-DD，否則一律 null
const validateDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const ymd = dateStr.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(ymd) ? ymd : null;
};

// 提交更新
router.post('/submit', async (req, res) => {
  const { projectId, data, userId, role } = req.body;
  // 只保留主要 log
  console.log('POST /submit - Updating layouts', { projectId, userId, role, dataLength: data?.length });

  if (!projectId || !Array.isArray(data)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request data'
    });
  }

  // schema 驗證
  for (const [i, item] of data.entries()) {
    const { error } = layoutSchema.validate(item);
    if (error) {
      return res.status(400).json({
        success: false,
        message: `Row ${i + 1} 資料格式錯誤: ${error.message}`,
        row: i + 1,
        item
      });
    }
  }

  try {
    // 先查詢現有資料
    const existingResult = await executeQuery(
      'SELECT * FROM layout_tasks WHERE project_id = :projectId',
      { projectId }
    );
    const existingRows = existingResult.rows;

    // 工具函數：安全 stringify，遇到 circular structure 會 fallback 並 log
    function safeStringify(val, fallback = '[]', context = '') {
      try {
        return JSON.stringify(val);
      } catch (e) {
        console.error(`safeStringify error at ${context}:`, e, val);
        return fallback;
      }
    }

    // 工具函數：將 Oracle LOB 轉為字串
    function lobToString(lob) {
      if (!lob) return '';
      if (typeof lob === 'string') return lob;
      if (Buffer.isBuffer(lob)) return lob.toString();
      if (typeof lob === 'object' && typeof lob.getData === 'function') {
        return lob.getData();
      }
      if (typeof lob === 'object' && lob.toString) {
        return lob.toString();
      }
      return '';
    }

    // 準備更新語句（移除 weekly_weights 欄位）
    const updateSQL = `
      UPDATE layout_tasks SET
        designer = :designer,
        layout_owner = :layout_owner,
        schematic_freeze = CASE 
          WHEN :schematic_freeze IS NULL THEN NULL 
          ELSE TO_DATE(:schematic_freeze, 'YYYY-MM-DD')
        END,
        lvs_clean = CASE 
          WHEN :lvs_clean IS NULL THEN NULL 
          ELSE TO_DATE(:lvs_clean, 'YYYY-MM-DD')
        END,
        layout_leader_schematic_freeze = CASE 
          WHEN :layout_leader_schematic_freeze IS NULL THEN NULL 
          ELSE TO_DATE(:layout_leader_schematic_freeze, 'YYYY-MM-DD')
        END,
        layout_leader_lvs_clean = CASE 
          WHEN :layout_leader_lvs_clean IS NULL THEN NULL 
          ELSE TO_DATE(:layout_leader_lvs_clean, 'YYYY-MM-DD')
        END,
        planned_mandays = :planned_mandays,
        actual_hours = :actual_hours,
        version = :version,
        rework_note = :rework_note,
        layout_closed = :layout_closed,
        modified_by = :modified_by,
        last_modified = CURRENT_TIMESTAMP
      WHERE project_id = :project_id AND ip_name = :ip_name
    `;

    // 順序執行所有更新
    for (const [idx, item] of data.entries()) {
      if (!item || !item.ip_name) {
        console.warn(`跳過第 ${idx} 筆: item 為 undefined 或 ip_name 缺失`, item);
        continue;
      }
      // 僅用 DB 查到的 id，不用 uuidv4() 或前端傳來的 id
      const existingRow = existingRows.find(row => row.IP_NAME === item.ip_name);
      let rowId = existingRow?.ID;
      if (!rowId) {
        console.error(`找不到對應的 id: project_id=${projectId}, ip_name=${item.ip_name}`);
        continue; // 找不到 id 就不做 MERGE
      }
      // 查詢 MERGE 前 lvs_clean
      try {
        const beforeResult = await executeQuery(
          'SELECT lvs_clean FROM layout_tasks WHERE project_id = :projectId AND ip_name = :ipName',
          { projectId, ipName: item.ip_name }
        );
        console.log(`[BEFORE MERGE] ip_name=${item.ip_name}, lvs_clean=`, beforeResult.rows?.[0]?.LVS_CLEAN || null);
      } catch (e) {
        console.error(`[BEFORE MERGE] 查詢失敗 ip_name=${item.ip_name}:`, e);
      }
      
      // 驗證所有日期
      try {
        console.log('=== BEFORE MERGE ===', { idx, ip_name: item.ip_name });
        const schematicFreezeDate = validateDate(item.schematic_freeze);
        const lvsCleanDate = validateDate(item.lvs_clean);
        const layoutLeaderSchematicFreezeDate = validateDate(item.layout_leader_schematic_freeze);
        const layoutLeaderLvsCleanDate = validateDate(item.layout_leader_lvs_clean);
        console.log('updateParams 日期欄位:', {
          schematicFreezeDate,
          lvsCleanDate,
          layoutLeaderSchematicFreezeDate,
          layoutLeaderLvsCleanDate
        });
        // 檢查 actual_hours/weekly_weights 型別
        if (role === 'designer' && item.actual_hours !== undefined && !isPlainObjectOrArray(item.actual_hours)) {
          console.error('actual_hours 不是純物件或陣列:', item.actual_hours);
        }
        if (role === 'designer' && item.weekly_weights !== undefined && !isPlainObjectOrArray(item.weekly_weights)) {
          console.error('weekly_weights 不是純物件或陣列:', item.weekly_weights);
        }
        // 只傳 UPDATE 會用到的欄位
        const updateParams = {
          project_id: projectId,
          ip_name: item.ip_name,
          designer: item.designer,
          layout_owner: item.layout_owner,
          schematic_freeze: schematicFreezeDate,
          lvs_clean: lvsCleanDate,
          layout_leader_schematic_freeze: layoutLeaderSchematicFreezeDate,
          layout_leader_lvs_clean: layoutLeaderLvsCleanDate,
          planned_mandays: isNaN(Number(item.planned_mandays)) ? 0 : Number(item.planned_mandays),
          actual_hours: (role === 'designer' && item.actual_hours !== undefined)
            ? safeStringify(item.actual_hours, '[]', `actual_hours for ${item.ip_name}`)
            : (typeof existingRow?.ACTUAL_HOURS === 'string' ? existingRow.ACTUAL_HOURS : '[]'),
          version: isNaN(Number(item.version)) ? 1 : Number(item.version),
          rework_note: item.rework_note || '',
          layout_closed: isNaN(Number(item.layout_closed)) ? 0 : Number(item.layout_closed),
          modified_by: userId
        };
        // 只保留簡化 merge log
        const updateResult = await executeUpdate(updateSQL, updateParams);
        console.log(`[MERGE] ip_name=${item.ip_name}, lvs_clean=${updateParams.lvs_clean}, rowsAffected=${updateResult?.rowsAffected}`);
        // 查詢 MERGE 後 lvs_clean
        try {
          const afterResult = await executeQuery(
            'SELECT lvs_clean FROM layout_tasks WHERE project_id = :projectId AND ip_name = :ipName',
            { projectId, ipName: item.ip_name }
          );
          console.log(`[AFTER MERGE] ip_name=${item.ip_name}, lvs_clean=`, afterResult.rows?.[0]?.LVS_CLEAN || null);
        } catch (e) {
          console.error(`[AFTER MERGE] 查詢失敗 ip_name=${item.ip_name}:`, e);
        }
        console.log('=== AFTER MERGE ===', { idx, ip_name: item.ip_name, rowsAffected: updateResult?.rowsAffected, updateResult });
      } catch (err) {
        console.error('ERROR in MERGE for', item?.ip_name, ':', err);
        throw err;
      }
      // === 新增：同步 upsert 到 LAYOUT_WEEKLY_WEIGHTS ===
      let weeklyWeightsArr = [];
      try {
        weeklyWeightsArr = typeof item.weekly_weights === 'string'
          ? JSON.parse(item.weekly_weights)
          : Array.isArray(item.weekly_weights) ? item.weekly_weights : [];
      } catch (e) {
        console.error('weekly_weights parse error:', e, item.weekly_weights);
        weeklyWeightsArr = [];
      }
      if (rowId && weeklyWeightsArr.length > 0) {
        for (const w of weeklyWeightsArr) {
          try {
            // log 欄位內容與型別
            console.log('即將 upsert:', {
              layoutId: rowId,
              week: w.week,
              weight: w.value,
              weightType: typeof w.value,
              weightParsed: parseFloat(w.value),
              weightParsedType: typeof parseFloat(w.value)
            });
            // log SQL 與參數
            const updateSQL = `UPDATE LAYOUT_WEEKLY_WEIGHTS SET
              WEIGHT = :weight,
              UPDATED_AT = CURRENT_TIMESTAMP,
              UPDATED_BY = :updatedBy,
              ROLE = :role,
              VERSION = NVL(VERSION,0) + 1
            WHERE LAYOUT_ID = :layoutId AND WEEK = :week`;
            const insertSQL = `INSERT INTO LAYOUT_WEEKLY_WEIGHTS
              (LAYOUT_ID, WEEK, WEIGHT, UPDATED_AT, UPDATED_BY, ROLE, VERSION)
             VALUES
              (:layoutId, :week, :weight, CURRENT_TIMESTAMP, :updatedBy, :role, 1)`;
            // 先查有沒有該週
            const exist = await executeQuery(
              'SELECT * FROM LAYOUT_WEEKLY_WEIGHTS WHERE LAYOUT_ID = :layoutId AND WEEK = :week',
              { layoutId: rowId, week: w.week }
            );
            if (exist.rows && exist.rows.length > 0) {
              console.log('[WEEKLY_WEIGHT][UPDATE]', updateSQL, {
                layoutId: rowId,
                week: w.week,
                weight: parseFloat(w.value),
                updatedBy: w.updatedBy,
                role: w.role
              });
              const updateResult = await executeUpdate(
                updateSQL,
                {
                  layoutId: rowId,
                  week: w.week,
                  weight: parseFloat(w.value),
                  updatedBy: w.updatedBy,
                  role: w.role
                }
              );
              console.log('[WEEKLY_WEIGHT][UPDATE][rowsAffected]', updateResult?.rowsAffected);
            } else {
              console.log('[WEEKLY_WEIGHT][INSERT]', insertSQL, {
                layoutId: rowId,
                week: w.week,
                weight: parseFloat(w.value),
                updatedBy: w.updatedBy,
                role: w.role
              });
              const insertResult = await executeUpdate(
                insertSQL,
                {
                  layoutId: rowId,
                  week: w.week,
                  weight: parseFloat(w.value),
                  updatedBy: w.updatedBy,
                  role: w.role
                }
              );
              console.log('[WEEKLY_WEIGHT][INSERT][rowsAffected]', insertResult?.rowsAffected);
            }
          } catch (err) {
            console.error('Upsert weekly_weight error:', err, w);
            if (err && err.stack) console.error(err.stack);
            continue;
          }
        }
      }
      // === END upsert weekly_weights ===
    }

    res.json({
      success: true,
      message: 'Data updated successfully'
    });
  } catch (err) {
    console.error('Error updating data:', err);
    res.status(500).json({
      success: false,
      message: 'Database error',
      error: err.message
    });
  }
});

// 更新權重
router.post('/update-weight', async (req, res) => {
  const { projectId, ipName, weeklyWeight } = req.body;
  const requestId = uuidv4();

  if (!projectId || !ipName || !weeklyWeight || !weeklyWeight.week || weeklyWeight.value === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
      errors: ['All fields are required'],
      requestId
    });
  }

  try {
    console.log('Updating weight with data:', { projectId, ipName, weeklyWeight });

    // 1. 獲取 layout task ID
    const taskResult = await executeQuery(
      'SELECT ID FROM LAYOUT_TASKS WHERE PROJECT_ID = :projectId AND IP_NAME = :ipName',
      { projectId, ipName }
    );

    if (!taskResult.rows || taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Layout task not found',
        errors: ['No matching record found'],
        requestId
      });
    }

    const layoutId = taskResult.rows[0].ID;

    // 2. 檢查是否已存在該週的權重
    const existingResult = await executeQuery(
      'SELECT * FROM LAYOUT_WEEKLY_WEIGHTS WHERE LAYOUT_ID = :layoutId AND WEEK = :week',
      { layoutId, week: weeklyWeight.week }
    );

    if (existingResult.rows && existingResult.rows.length > 0) {
      // 更新現有權重
      await executeQuery(`
        UPDATE LAYOUT_WEEKLY_WEIGHTS 
        SET 
          WEIGHT = :weight,
          UPDATED_AT = CURRENT_TIMESTAMP,
          UPDATED_BY = :updatedBy,
          ROLE = :role,
          VERSION = VERSION + 1
        WHERE LAYOUT_ID = :layoutId AND WEEK = :week
      `, {
        layoutId,
        week: weeklyWeight.week,
        weight: weeklyWeight.value,
        updatedBy: weeklyWeight.updatedBy,
        role: weeklyWeight.role
      });

      console.log('Updated existing weight record');
    } else {
      // 插入新權重
      await executeQuery(`
        INSERT INTO LAYOUT_WEEKLY_WEIGHTS (
          LAYOUT_ID,
          WEEK,
          WEIGHT,
          UPDATED_AT,
          UPDATED_BY,
          ROLE,
          VERSION
        ) VALUES (
          :layoutId,
          :week,
          :weight,
          CURRENT_TIMESTAMP,
          :updatedBy,
          :role,
          1
        )
      `, {
        layoutId,
        week: weeklyWeight.week,
        weight: weeklyWeight.value,
        updatedBy: weeklyWeight.updatedBy,
        role: weeklyWeight.role
      });

      console.log('Inserted new weight record');
    }

    // 3. 獲取更新後的所有權重數據
    const updatedResult = await executeQuery(`
      SELECT 
        t.*,
        w.WEEK,
        w.WEIGHT as WEIGHT_VALUE,
        w.UPDATED_AT as WEIGHT_UPDATED_AT,
        w.UPDATED_BY as WEIGHT_UPDATED_BY,
        w.ROLE as WEIGHT_ROLE,
        w.VERSION as WEIGHT_VERSION
      FROM LAYOUT_TASKS t
      LEFT JOIN LAYOUT_WEEKLY_WEIGHTS w ON t.ID = w.LAYOUT_ID
      WHERE t.PROJECT_ID = :projectId AND t.IP_NAME = :ipName
      ORDER BY w.WEEK
    `, { projectId, ipName });

    // 重構返回的數據格式
    const updatedData = {
      projectId,
      ipName,
      weeklyWeights: []
    };

    // 將所有權重數據添加到數組中
    updatedResult.rows.forEach(row => {
      if (row.WEEK) {
        updatedData.weeklyWeights.push({
          week: row.WEEK,
          value: parseFloat(row.WEIGHT_VALUE),
          updatedAt: row.WEIGHT_UPDATED_AT,
          updatedBy: row.WEIGHT_UPDATED_BY,
          role: row.WEIGHT_ROLE,
          version: row.WEIGHT_VERSION
        });
      }
    });

    console.log('Sending updated data:', updatedData);

    res.json({
      success: true,
      message: 'Weight updated successfully',
      data: updatedData,
      requestId
    });
  } catch (err) {
    console.error(`[${requestId}] Error updating weight:`, err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update weight',
      errors: [err.message],
      requestId
    });
  }
});

// 獲取權重歷史
router.get('/weight-history', async (req, res) => {
  const { projectId, ipName, week } = req.query;
  const requestId = uuidv4();

  if (!projectId || !ipName || !week) {
    return res.status(400).json({
      success: false,
      message: 'Missing required parameters',
      errors: ['All parameters are required'],
      requestId
    });
  }

  try {
    const result = await executeQuery(
      'SELECT weekly_weights FROM layout_tasks WHERE project_id = :projectId AND ip_name = :ipName',
      { projectId, ipName }
    );
    const row = result.rows && result.rows[0];
    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Layout task not found',
        errors: ['No matching record found'],
        requestId
      });
    }
    const weeklyWeights = typeof row.WEEKLY_WEIGHTS === 'string' ? JSON.parse(row.WEEKLY_WEIGHTS) : row.WEEKLY_WEIGHTS || [];
    const weekHistory = weeklyWeights.filter(w => w.week === week);
    res.json({
      success: true,
      history: weekHistory,
      requestId
    });
  } catch (err) {
    console.error(`[${requestId}] Error processing weight history:`, err);
    return res.status(500).json({
      success: false,
      message: 'Error processing weight history',
      errors: [err.message],
      requestId
    });
  }
});

export default router; 