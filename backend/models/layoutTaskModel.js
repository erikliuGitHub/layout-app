// backend/models/layoutTaskModel.js
const db = require("../src/config/db"); // Use the correct path to db.js
const { v4: uuidv4 } = require('uuid');

// Helper to safely parse JSON from CLOB fields
const safeJsonParse = (jsonString) => {
  if (!jsonString) return null;
  try {
    // Oracle CLOBs can be streamed, but for this size, direct parsing is fine.
    if (typeof jsonString === 'string') {
      return JSON.parse(jsonString);
    }
    return jsonString; // Already an object if driver handles it
  } catch (e) {
    console.error("Failed to parse JSON:", e);
    return null;
  }
};

// Helper to convert Oracle's snake_case to frontend's camelCase
const toCamelCase = (row) => {
  const newRow = {};
  for (let key in row) {
    const camelKey = key.toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    // Handle date objects correctly, formatting to YYYY-MM-DD
    if (row[key] instanceof Date) {
        newRow[camelKey] = row[key].toISOString().split('T')[0];
    } else if (key === 'WEEKLY_WEIGHTS' || key === 'ACTUAL_HOURS') {
        newRow[camelKey] = safeJsonParse(row[key]);
    } else {
        newRow[camelKey] = row[key];
    }
  }
  return newRow;
};


exports.getGroupedByProjectId = async (callback) => {
    const requestId = uuidv4();
    const sql = `SELECT * FROM layout_tasks ORDER BY project_id, ip_name`;
    console.log(`[${requestId}] Executing SQL: ${sql}`);

    try {
        const result = await db.executeQuery(sql);
        const grouped = {};
        result.rows.forEach(row => {
            const transformedRow = toCamelCase(row);
            if (!grouped[transformedRow.projectId]) {
                grouped[transformedRow.projectId] = [];
            }
            grouped[transformedRow.projectId].push(transformedRow);
        });

        callback({
            success: true,
            data: grouped,
            message: "Layouts grouped successfully."
        });
    } catch (err) {
        console.error(`[${requestId}] Error in getGroupedByProjectId:`, err);
        callback({
            success: false,
            message: "Failed to fetch layouts.",
            errors: [err.message]
        });
    }
};

exports.getLayoutsByProject = async (projectId, callback) => {
    const requestId = uuidv4();
    const sql = `SELECT * FROM layout_tasks WHERE project_id = :projectId ORDER BY ip_name`;
    console.log(`[${requestId}] Executing SQL: ${sql} with projectId: ${projectId}`);

    try {
        const result = await db.executeQuery(sql, { projectId });
        const transformedRows = result.rows.map(toCamelCase);
        
        callback({
            success: true,
            data: transformedRows,
            message: "Layouts fetched successfully."
        });
    } catch (err) {
        console.error(`[${requestId}] Error in getLayoutsByProject:`, err);
        callback({
            success: false,
            message: `Failed to fetch layouts for project ${projectId}.`,
            errors: [err.message]
        });
    }
};

// This is the core fix for the user's problem.
// It uses Oracle's MERGE statement for a clean UPSERT operation.
exports.submitBatchUpdate = async (projectId, updates, callback) => {
    const requestId = uuidv4();
    console.log(`[${requestId}] DEBUG: Starting batch update for projectId: ${projectId}`);
    console.log(`[${requestId}] DEBUG: Received ${updates.length} updates:`, JSON.stringify(updates, null, 2));

    if (!Array.isArray(updates)) {
        return callback({ success: false, message: "Invalid data format." });
    }

    const connection = await db.getConnection();
    try {
        console.log(`[${requestId}] DEBUG: Database connection obtained. Starting transaction loop.`);
        for (const [index, item] of updates.entries()) {
            const id = item.id || uuidv4();
            console.log(`[${requestId}] DEBUG: Processing item ${index + 1}/${updates.length}. ID: ${id}. IP Name: ${item.ipName}`);

            for (const item of updates) {
            // Use snake_case consistently as sent from the frontend
            const id = item.id || uuidv4();
            
            const params = {
                p_id: id,
                p_project_id: projectId,
                p_ip_name: item.ip_name, // FIX: from ipName to ip_name
                p_designer: item.designer || null,
                p_layout_owner: item.layout_owner || null, // FIX: from layoutOwner to layout_owner
                p_schematic_freeze: item.schematic_freeze ? new Date(item.schematic_freeze) : null, // FIX
                p_lvs_clean: item.lvs_clean ? new Date(item.lvs_clean) : null, // FIX
                p_layout_leader_schematic_freeze: item.layout_leader_schematic_freeze ? new Date(item.layout_leader_schematic_freeze) : null, // FIX
                p_layout_leader_lvs_clean: item.layout_leader_lvs_clean ? new Date(item.layout_leader_lvs_clean) : null, // FIX
                p_planned_mandays: item.planned_mandays || null, // FIX
                p_weekly_weights: item.weekly_weights ? JSON.stringify(item.weekly_weights) : null, // FIX
                p_actual_hours: item.actual_hours ? JSON.stringify(item.actual_hours) : null, // FIX
                p_rework_note: item.rework_note || null, // FIX
                p_layout_closed: item.layout_closed ? 1 : 0, // FIX
                p_modified_by: item.modified_by || 'system',
            };

            const mergeSql = `
                MERGE INTO layout_tasks t
                USING (SELECT :p_project_id AS project_id, :p_ip_name AS ip_name FROM dual) s
                ON (t.project_id = s.project_id AND t.ip_name = s.ip_name)
                WHEN MATCHED THEN
                    UPDATE SET
                        designer = :p_designer,
                        layout_owner = :p_layout_owner,
                        schematic_freeze = :p_schematic_freeze,
                        lvs_clean = :p_lvs_clean,
                        layout_leader_schematic_freeze = :p_layout_leader_schematic_freeze,
                        layout_leader_lvs_clean = :p_layout_leader_lvs_clean,
                        planned_mandays = :p_planned_mandays,
                        weekly_weights = :p_weekly_weights,
                        actual_hours = :p_actual_hours,
                        version = t.version + 1,
                        rework_note = :p_rework_note,
                        layout_closed = :p_layout_closed,
                        modified_by = :p_modified_by,
                        last_modified = CURRENT_TIMESTAMP
                WHEN NOT MATCHED THEN
                    INSERT (
                        id, project_id, ip_name, designer, layout_owner,
                        schematic_freeze, lvs_clean, layout_leader_schematic_freeze,
                        layout_leader_lvs_clean, planned_mandays, weekly_weights,
                        actual_hours, version, rework_note, layout_closed,
                        modified_by, last_modified
                    ) VALUES (
                        :p_id, :p_project_id, :p_ip_name, :p_designer, :p_layout_owner,
                        :p_schematic_freeze, :p_lvs_clean, :p_layout_leader_schematic_freeze,
                        :p_layout_leader_lvs_clean, :p_planned_mandays, :p_weekly_weights,
                        :p_actual_hours, 1, :p_rework_note, :p_layout_closed,
                        :p_modified_by, CURRENT_TIMESTAMP
                    )
            `;
            console.log(`[${requestId}] DEBUG: Executing MERGE for ${item.ipName}.`);
            await connection.execute(mergeSql, params);
            console.log(`[${requestId}] DEBUG: MERGE execution completed for ${item.ipName}.`);
        }

        console.log(`[${requestId}] DEBUG: All items processed. Attempting to commit...`);
        await connection.commit();
        console.log(`[${requestId}] DEBUG: Commit successful.`);
        
        // Fetch updated data and return it
        console.log(`[${requestId}] DEBUG: Fetching updated data after commit.`);
        exports.getLayoutsByProject(projectId, callback);

    } catch (err) {
        console.error(`[${requestId}] DEBUG: An error occurred in the transaction:`, err);
        console.log(`[${requestId}] DEBUG: Attempting to rollback...`);
        await connection.rollback();
        console.log(`[${requestId}] DEBUG: Rollback successful.`);
        callback({ success: false, message: "Database transaction failed.", errors: [err.message] });
    } finally {
        if (connection) {
            try {
                console.log(`[${requestId}] DEBUG: Closing database connection.`);
                await connection.close();
                console.log(`[${requestId}] DEBUG: Connection closed.`);
            } catch (err) {
                console.error("[${requestId}] DEBUG: Failed to close connection:", err);
            }
        }
    }
};

exports.updateTask = async (id, version, updatedFields, callback) => {
    const requestId = uuidv4();
    console.log(`[${requestId}] Updating task id: ${id}`);

    const setClauses = [];
    const params = {};
    for(const key in updatedFields) {
        const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        setClauses.push(`${dbKey} = :${dbKey}`);
        params[dbKey] = updatedFields[key];
    }
    
    params.id = id;
    params.version = version;

    const sql = `
        UPDATE layout_tasks 
        SET ${setClauses.join(', ')}, version = version + 1 
        WHERE id = :id AND version = :version
    `;

    try {
        const result = await db.executeUpdate(sql, params);
        if (result.rowsAffected === 0) {
            throw new Error("Version conflict or record not found.");
        }
        callback({ success: true, message: "Task updated successfully." });
    } catch (err) {
        console.error(`[${requestId}] Error in updateTask:`, err);
        callback({ success: false, message: "Failed to update task.", errors: [err.message] });
    }
};
