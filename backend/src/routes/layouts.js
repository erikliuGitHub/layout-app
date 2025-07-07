import express from 'express';
import { executeQuery, executeUpdate } from '../config/db.js';
import * as db from '../config/db.js'; // Re-adding the missing import for db
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

// 提交更新 (已重構為使用 MERGE)
router.post('/submit', async (req, res) => {
  const { projectId, data, userId, role, itemsToDelete } = req.body;
  console.log('POST /submit - Updating layouts', { projectId, userId, role, dataLength: data?.length, itemsToDeleteLength: itemsToDelete?.length });

  if (!projectId || (!Array.isArray(data) && !Array.isArray(itemsToDelete))) {
    return res.status(400).json({ success: false, message: 'Invalid request data' });
  }

  const connection = await db.getConnection();
  try {
    console.log("Transaction started.");

    // Handle deletions first
    if (Array.isArray(itemsToDelete) && itemsToDelete.length > 0) {
      console.log('Processing deletions for project:', projectId, 'items:', itemsToDelete);
      for (const ipName of itemsToDelete) {
        try {
          // Delete from LAYOUT_WEEKLY_WEIGHTS first (child table)
          await connection.execute(`
            DELETE FROM LAYOUT_WEEKLY_WEIGHTS
            WHERE LAYOUT_ID = (SELECT ID FROM LAYOUT_TASKS WHERE PROJECT_ID = :projectId AND IP_NAME = :ipName)
          `, { projectId, ipName });
          console.log(`Deleted weekly weights for ${ipName}`);

          // Then delete from LAYOUT_TASKS (parent table)
          await connection.execute(`
            DELETE FROM LAYOUT_TASKS
            WHERE PROJECT_ID = :projectId AND IP_NAME = :ipName
          `, { projectId, ipName });
          console.log(`Deleted layout task ${ipName}`);
        } catch (deleteErr) {
          console.error(`Error deleting item ${ipName}:`, deleteErr);
          // Depending on requirements, you might want to continue or throw here
          // For now, re-throw to ensure transaction rollback on any deletion error
          throw deleteErr;
        }
      }
    }

    const mergeSql = `
      MERGE INTO layout_tasks t
      USING (SELECT :p_project_id AS project_id, :p_ip_name AS ip_name FROM dual) s
      ON (t.project_id = s.project_id AND t.ip_name = s.ip_name)
      WHEN MATCHED THEN
        UPDATE SET
          designer = :p_designer,
          layout_owner = :p_layout_owner,
          schematic_freeze = CASE WHEN :p_schematic_freeze IS NULL THEN NULL ELSE TO_DATE(:p_schematic_freeze, 'YYYY-MM-DD') END,
          lvs_clean = CASE WHEN :p_lvs_clean IS NULL THEN NULL ELSE TO_DATE(:p_lvs_clean, 'YYYY-MM-DD') END,
          layout_leader_schematic_freeze = CASE WHEN :p_layout_leader_schematic_freeze IS NULL THEN NULL ELSE TO_DATE(:p_layout_leader_schematic_freeze, 'YYYY-MM-DD') END,
          layout_leader_lvs_clean = CASE WHEN :p_layout_leader_lvs_clean IS NULL THEN NULL ELSE TO_DATE(:p_layout_leader_lvs_clean, 'YYYY-MM-DD') END,
          planned_mandays = :p_planned_mandays,
          version = t.version + 1,
          layout_closed = :p_layout_closed,
          modified_by = :p_modified_by,
          last_modified = CURRENT_TIMESTAMP
      WHEN NOT MATCHED THEN
        INSERT (
          project_id, ip_name, designer, layout_owner,
          schematic_freeze, lvs_clean, layout_leader_schematic_freeze,
          layout_leader_lvs_clean, planned_mandays, version, layout_closed,
          modified_by, last_modified
        ) VALUES (
          :p_project_id, :p_ip_name, :p_designer, :p_layout_owner,
          CASE WHEN :p_schematic_freeze IS NULL THEN NULL ELSE TO_DATE(:p_schematic_freeze, 'YYYY-MM-DD') END,
          CASE WHEN :p_lvs_clean IS NULL THEN NULL ELSE TO_DATE(:p_lvs_clean, 'YYYY-MM-DD') END,
          CASE WHEN :p_layout_leader_schematic_freeze IS NULL THEN NULL ELSE TO_DATE(:p_layout_leader_schematic_freeze, 'YYYY-MM-DD') END,
          CASE WHEN :p_layout_leader_lvs_clean IS NULL THEN NULL ELSE TO_DATE(:p_layout_leader_lvs_clean, 'YYYY-MM-DD') END,
          :p_planned_mandays, 1, :p_layout_closed, :p_modified_by, CURRENT_TIMESTAMP
        )
    `;

    if (Array.isArray(data)) {
      for (const item of data) {
        // Helper function for robust date handling
        const getValidDateString = (date) => {
          if (date && typeof date === 'string' && date.length >= 10) {
            return date.substring(0, 10);
          }
          return null;
        };

        const params = {
          p_project_id: projectId,
          p_ip_name: item.ip_name,
          p_designer: item.designer?.trim() || '',
          p_layout_owner: item.layout_owner || null,
          p_schematic_freeze: getValidDateString(item.schematic_freeze),
          p_lvs_clean: getValidDateString(item.lvs_clean),
          p_layout_leader_schematic_freeze: getValidDateString(item.layout_leader_schematic_freeze),
          p_layout_leader_lvs_clean: getValidDateString(item.layout_leader_lvs_clean),
          p_planned_mandays: (item.planned_mandays || 0),
          p_layout_closed: isNaN(Number(item.layout_closed)) ? 0 : Number(item.layout_closed),
          p_modified_by: userId || 'system'
        };

        try {
          await connection.execute(mergeSql, params);
        } catch (loopErr) {
          console.error(`Error merging item ${item.ip_name}:`, loopErr); // Changed item.ipName to item.ip_name
          throw loopErr; // Re-throw to be caught by the outer catch
        }
      }
    }

    await connection.commit();
    console.log("Transaction committed successfully.");
    res.json({ success: true, message: 'Data updated successfully' });

  } catch (err) {
    console.error('Database error:', err);
    // Rollback transaction on error
    if (connection) {
      try {
        await connection.rollback();
        console.log("Transaction rolled back.");
      } catch (rollbackErr) {
        console.error("Error rolling back transaction:", rollbackErr);
      }
    }
    res.status(500).json({ success: false, message: 'Database error: ' + err.message });
  } finally {
    if (connection) {
      try {
        await connection.close();
        console.log("Connection closed.");
      } catch (closeErr) {
        console.error("Error closing connection:", closeErr);
      }
    }
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
          updatedBy: row.UPDATED_BY,
          role: row.ROLE,
          version: row.VERSION
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