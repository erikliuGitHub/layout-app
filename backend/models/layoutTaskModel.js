// 此文件僅保留資料庫操作，不包含任何 Express 或路由代碼。
const dbConfig = require("../config/db");
const { v4: uuidv4 } = require('uuid'); // 確保 UUID 導入在文件開頭

// 安全的 JSON 解析
const safeParse = (str) => {
  try {
    return str ? JSON.parse(str) : null;
  } catch (e) {
    console.error("JSON parse error:", e);
    return null;
  }
};

// 將駝峰命名轉換為下劃線命名
const camelToSnake = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

// 將下劃線命名轉換為駝峰命名
const snakeToCamel = (str) => str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

// 獲取資料庫實例
const getDb = () => {
  const db = dbConfig.db();
  if (!db) {
    throw new Error("Database connection not initialized");
  }
  return db;
};

exports.getGroupedByProjectId = (callback) => {
  const requestId = uuidv4();
  const sql = "SELECT * FROM layout_tasks";
  console.log(`[${requestId}] Executing SQL: ${sql}`);

  try {
    const db = getDb();
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.error(`[${requestId}] DB error retrieving all layouts:`, err);
        return callback({
          success: false,
          updatedProjectData: {},
          message: "Database error",
          errors: [err.message || "Unknown error"],
          requestId,
          debugInfo: { sql }
        });
      }

      if (!rows || !Array.isArray(rows)) {
        console.log(`[${requestId}] No layouts found`);
        return callback({
          success: true,
          updatedProjectData: {},
          message: "No layouts found",
          errors: [],
          requestId
        });
      }

      try {
        const grouped = {};
        rows.forEach(row => {
          const transformedRow = {
            id: row.id,
            projectId: row.project_id,
            ipName: row.ip_name,
            designer: row.designer,
            layoutOwner: row.layout_owner,
            schematicFreeze: row.schematic_freeze,
            lvsClean: row.lvs_clean,
            actualHours: safeParse(row.actual_hours),
            version: row.version,
            reworkNote: row.rework_note,
            layoutClosed: Boolean(row.layout_closed),
            plannedMandays: row.planned_mandays,
            modifiedBy: row.modified_by,
            lastModified: row.last_modified
          };

          if (!grouped[transformedRow.projectId]) {
            grouped[transformedRow.projectId] = [];
          }
          grouped[transformedRow.projectId].push(transformedRow);
        });

        console.log(`[${requestId}] Grouped layouts by ${Object.keys(grouped).length} projects`);
        return callback({
          success: true,
          updatedProjectData: grouped,
          message: "Layouts grouped successfully",
          errors: [],
          requestId
        });
      } catch (e) {
        console.error(`[${requestId}] Error transforming and grouping rows:`, e);
        return callback({
          success: false,
          updatedProjectData: {},
          message: "Error transforming database results",
          errors: [e.message || "Unknown error"],
          requestId,
          debugInfo: { rawRows: rows }
        });
      }
    });
  } catch (e) {
    console.error(`[${requestId}] Error getting database instance:`, e);
    return callback({
      success: false,
      updatedProjectData: {},
      message: "Database connection error",
      errors: [e.message || "Unknown error"],
      requestId
    });
  }
};

exports.getLayoutsByProject = (projectId, callback) => {
  const requestId = uuidv4();
  const sql = "SELECT * FROM layout_tasks WHERE project_id = ?";
  console.log(`[${requestId}] Executing SQL: ${sql} with projectId: ${projectId}`);
  
  try {
    const db = getDb();
    db.all(sql, [projectId], (err, rows) => {
      if (err) {
        console.error(`[${requestId}] DB error retrieving project layouts:`, err);
        return callback({
          success: false,
          updatedProjectData: [],
          message: "Database error",
          errors: [err.message || "Unknown error"],
          requestId,
          debugInfo: { sql, projectId }
        });
      }

      if (!rows || !Array.isArray(rows)) {
        console.log(`[${requestId}] No layouts found for projectId: ${projectId}`);
        return callback({
          success: true,
          updatedProjectData: [],
          message: "No layouts found",
          errors: [],
          requestId
        });
      }

      try {
        const transformedRows = rows.map(row => ({
          id: row.id,
          projectId: row.project_id,
          ipName: row.ip_name,
          designer: row.designer,
          layoutOwner: row.layout_owner,
          schematicFreeze: row.schematic_freeze,
          lvsClean: row.lvs_clean,
          actualHours: safeParse(row.actual_hours),
          version: row.version,
          reworkNote: row.rework_note,
          layoutClosed: Boolean(row.layout_closed),
          plannedMandays: row.planned_mandays,
          modifiedBy: row.modified_by,
          lastModified: row.last_modified
        }));

        console.log(`[${requestId}] Transformed ${transformedRows.length} rows`);
        return callback({
          success: true,
          updatedProjectData: transformedRows,
          message: "Layouts retrieved successfully",
          errors: [],
          requestId
        });
      } catch (e) {
        console.error(`[${requestId}] Error transforming rows:`, e);
        return callback({
          success: false,
          updatedProjectData: [],
          message: "Error transforming database results",
          errors: [e.message || "Unknown error"],
          requestId,
          debugInfo: { projectId, rawRows: rows }
        });
      }
    });
  } catch (e) {
    console.error(`[${requestId}] Error getting database instance:`, e);
    return callback({
      success: false,
      updatedProjectData: [],
      message: "Database connection error",
      errors: [e.message || "Unknown error"],
      requestId
    });
  }
};

exports.submitBatchUpdate = (projectId, updates, callback) => {
  const requestId = uuidv4();
  console.log(`[${requestId}] Starting batch update for projectId: ${projectId}`);

  try {
    const db = getDb();
    let completed = 0;
    const errors = [];
    const results = [];

    if (!Array.isArray(updates) || updates.length === 0) {
      return callback({
        success: false,
        updatedProjectData: [],
        message: "No updates provided",
        errors: ["Updates array is empty or invalid"],
        requestId
      });
    }

    updates.forEach(update => {
      const { ipName, version, ...fields } = update;
      
      // 將欄位名稱轉換為資料庫格式
      const dbFields = {};
      for (const [key, value] of Object.entries(fields)) {
        const dbKey = camelToSnake(key);
        // 特殊處理 plannedMandays，確保它是數字
        if (key === 'plannedMandays') {
          dbFields[dbKey] = value === '' ? null : parseFloat(value);
        } else {
          dbFields[dbKey] = value;
        }
      }

      // 構建 SQL 更新語句
      const setClause = Object.keys(dbFields)
        .map(key => `${key} = ?`)
        .join(', ');
      const params = [...Object.values(dbFields), projectId, ipName, version];
      const sql = `
        UPDATE layout_tasks 
        SET ${setClause}
        WHERE project_id = ? AND ip_name = ? AND version = ?
      `;

      db.run(sql, params, function(err) {
        completed++;

        if (err) {
          console.error(`[${requestId}] Error updating ${ipName}:`, err);
          errors.push(`Error updating ${ipName}: ${err.message}`);
        } else if (this.changes === 0) {
          console.warn(`[${requestId}] No rows updated for ${ipName}`);
          errors.push(`No rows updated for ${ipName} (version mismatch or record not found)`);
        } else {
          console.log(`[${requestId}] Successfully updated ${ipName}`);
          results.push(ipName);
        }

        // 當所有更新完成時
        if (completed === updates.length) {
          if (errors.length > 0) {
            console.error(`[${requestId}] Batch update completed with errors:`, errors);
            return callback({
              success: false,
              updatedProjectData: [],
              message: "Some updates failed",
              errors,
              requestId,
              debugInfo: { projectId, results }
            });
          }

          // 獲取更新後的資料
          exports.getLayoutsByProject(projectId, (result) => {
            if (!result.success) {
              console.error(`[${requestId}] Error fetching updated data:`, result.errors);
              return callback({
                success: false,
                updatedProjectData: [],
                message: "Failed to fetch updated data",
                errors: result.errors,
                requestId,
                debugInfo: { projectId, results }
              });
            }

            console.log(`[${requestId}] Batch update completed successfully`);
            return callback({
              success: true,
              updatedProjectData: result.updatedProjectData,
              message: "Batch update completed successfully",
              errors: [],
              requestId
            });
          });
        }
      });
    });
  } catch (e) {
    console.error(`[${requestId}] Error getting database instance:`, e);
    return callback({
      success: false,
      updatedProjectData: [],
      message: "Database connection error",
      errors: [e.message || "Unknown error"],
      requestId
    });
  }
};

exports.updateTask = (id, version, updatedFields, callback) => {
  const requestId = uuidv4();
  console.log(`[${requestId}] Updating task id: ${id}, version: ${version}, fields:`, updatedFields);

  // 構建 SET 子句和參數
  const setFields = [];
  const params = [];
  for (const [key, value] of Object.entries(updatedFields)) {
    // 將駝峰命名轉換為下劃線命名
    const dbField = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    setFields.push(`${dbField} = ?`);
    params.push(value);
  }
  
  // 添加版本更新
  setFields.push('version = version + 1');
  
  // 添加 WHERE 條件的參數
  params.push(id, version);

  const sql = `UPDATE layout_tasks SET ${setFields.join(', ')} WHERE id = ? AND version = ?`;
  console.log(`[${requestId}] Executing SQL:`, sql, 'with params:', params);

  const db = dbConfig.db();
  if (!db) {
    console.error(`[${requestId}] Database connection not initialized`);
    return callback({
      success: false,
      error: "Database connection not initialized",
      requestId,
      debugInfo: { id, version, updatedFields, sql, params }
    });
  }

  db.run(sql, params, function(err) {
    if (err) {
      console.error(`[${requestId}] Error updating task:`, err);
      return callback({
        success: false,
        error: err.message || "Database error during update",
        requestId,
        debugInfo: { id, version, updatedFields, sql, params }
      });
    }

    if (this.changes === 0) {
      console.warn(`[${requestId}] No rows updated for id: ${id}, version: ${version}`);
      return callback({
        success: false,
        error: "Version conflict or record not found",
        requestId,
        debugInfo: { id, version, updatedFields }
      });
    }

    console.log(`[${requestId}] Successfully updated task id: ${id}`);
    callback({
      success: true,
      message: "Task updated successfully",
      requestId
    });
  });
};