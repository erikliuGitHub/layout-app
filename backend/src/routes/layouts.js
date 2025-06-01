const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// 獲取所有專案的資料
router.get('/', (req, res) => {
  console.log('GET / - Fetching all layouts');
  const query = `
    SELECT * FROM layout_tasks 
    ORDER BY project_id, ip_name
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    if (!rows || !Array.isArray(rows)) {
      console.log('No data found');
      return res.json({
        success: true,
        updatedProjectData: {}
      });
    }

    // 將資料按專案分組
    const projectData = rows.reduce((acc, row) => {
      if (!acc[row.project_id]) {
        acc[row.project_id] = [];
      }
      acc[row.project_id].push({
        id: row.id,
        ipName: row.ip_name,
        designer: row.designer,
        layoutOwner: row.layout_owner,
        schematicFreeze: row.schematic_freeze,
        lvsClean: row.lvs_clean,
        layoutLeaderSchematicFreeze: row.layout_leader_schematic_freeze,
        layoutLeaderLvsClean: row.layout_leader_lvs_clean,
        actualHours: JSON.parse(row.actual_hours || '[]'),
        weeklyWeights: JSON.parse(row.weekly_weights || '[]'),
        version: row.version,
        reworkNote: row.rework_note,
        layoutClosed: Boolean(row.layout_closed),
        plannedMandays: row.planned_mandays,
        modifiedBy: row.modified_by,
        lastModified: row.last_modified
      });
      return acc;
    }, {});

    console.log('Sending response:', { 
      success: true, 
      projectCount: Object.keys(projectData).length,
      totalRecords: rows.length 
    });
    
    res.json({
      success: true,
      updatedProjectData: projectData
    });
  });
});

// 獲取特定專案的資料
router.get('/:projectId', (req, res) => {
  const { projectId } = req.params;
  console.log(`GET /${projectId} - Fetching layouts for project`);
  
  const query = `
    SELECT * FROM layout_tasks 
    WHERE project_id = ?
    ORDER BY ip_name
  `;
  
  db.all(query, [projectId], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    if (!rows || !Array.isArray(rows)) {
      console.log(`No data found for project: ${projectId}`);
      return res.json({
        success: true,
        updatedProjectData: []
      });
    }

    const formattedRows = rows.map(row => ({
      id: row.id,
      ipName: row.ip_name,
      designer: row.designer,
      layoutOwner: row.layout_owner,
      schematicFreeze: row.schematic_freeze,
      lvsClean: row.lvs_clean,
      layoutLeaderSchematicFreeze: row.layout_leader_schematic_freeze,
      layoutLeaderLvsClean: row.layout_leader_lvs_clean,
      actualHours: JSON.parse(row.actual_hours || '[]'),
      weeklyWeights: JSON.parse(row.weekly_weights || '[]'),
      version: row.version,
      reworkNote: row.rework_note,
      layoutClosed: Boolean(row.layout_closed),
      plannedMandays: row.planned_mandays,
      modifiedBy: row.modified_by,
      lastModified: row.last_modified
    }));

    console.log('Sending response:', { 
      success: true, 
      projectId,
      recordCount: formattedRows.length 
    });
    
    res.json({
      success: true,
      updatedProjectData: formattedRows
    });
  });
});

// 提交更新
router.post('/submit', (req, res) => {
  const { projectId, data, userId, role } = req.body;
  console.log('POST /submit - Updating layouts', { projectId, userId, role, dataLength: data?.length });

  if (!projectId || !Array.isArray(data)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request data'
    });
  }

  // 先查詢現有資料
  db.all('SELECT * FROM layout_tasks WHERE project_id = ?', [projectId], (err, existingRows) => {
    if (err) {
      console.error('Error fetching existing data:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error',
        error: err.message
      });
    }

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      try {
        // 準備更新語句
        const stmt = db.prepare(`
          INSERT OR REPLACE INTO layout_tasks (
            project_id,
            ip_name,
            designer,
            layout_owner,
            schematic_freeze,
            lvs_clean,
            layout_leader_schematic_freeze,
            layout_leader_lvs_clean,
            planned_mandays,
            actual_hours,
            weekly_weights,
            version,
            rework_note,
            layout_closed,
            modified_by,
            last_modified
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);

        // 執行更新（每個 item 都即時查詢現有 row）
        const updateOne = (item, done) => {
          db.get('SELECT * FROM layout_tasks WHERE project_id = ? AND ip_name = ?', [projectId, item.ipName], (err, existingRow) => {
            if (err) return done(err);

            console.log('Received item for update:', item);

            const merged = {
              project_id: projectId,
              ip_name: item.ipName,
              designer: (role === 'designer' && item.designer !== undefined) ? item.designer : (existingRow?.designer ?? ''),
              layout_owner: (item.layoutOwner !== undefined) ? item.layoutOwner : (existingRow?.layout_owner ?? ''),
              schematic_freeze: (role === 'designer' && item.schematicFreeze !== undefined) ? item.schematicFreeze : (existingRow?.schematic_freeze ?? ''),
              lvs_clean: (role === 'designer' && item.lvsClean !== undefined) ? item.lvsClean : (existingRow?.lvs_clean ?? ''),
              layout_leader_schematic_freeze: (role === 'layoutLeader' && item.layoutLeaderSchematicFreeze !== undefined) ? item.layoutLeaderSchematicFreeze : (existingRow?.layout_leader_schematic_freeze ?? ''),
              layout_leader_lvs_clean: (role === 'layoutLeader' && item.layoutLeaderLvsClean !== undefined) ? item.layoutLeaderLvsClean : (existingRow?.layout_leader_lvs_clean ?? ''),
              planned_mandays: (role === 'designer' && item.plannedMandays !== undefined) ? item.plannedMandays : (existingRow?.planned_mandays ?? ''),
              actual_hours: (role === 'designer' && item.actualHours !== undefined) ? JSON.stringify(item.actualHours) : (existingRow?.actual_hours ?? '[]'),
              weekly_weights: (role === 'designer' && item.weeklyWeights !== undefined) ? JSON.stringify(item.weeklyWeights) : (existingRow?.weekly_weights ?? '[]'),
              version: (item.version !== undefined) ? item.version : (existingRow?.version ?? 1),
              rework_note: (role === 'designer' && item.reworkNote !== undefined) ? item.reworkNote : (existingRow?.rework_note ?? ''),
              layout_closed: (item.layoutClosed !== undefined) ? (item.layoutClosed ? 1 : 0) : (existingRow?.layout_closed ?? 0),
              modified_by: userId,
              last_modified: new Date().toISOString()
            };

            console.log('Merged data for item:', item.ipName, merged);

            stmt.run(
              merged.project_id,
              merged.ip_name,
              merged.designer,
              merged.layout_owner,
              merged.schematic_freeze,
              merged.lvs_clean,
              merged.layout_leader_schematic_freeze,
              merged.layout_leader_lvs_clean,
              merged.planned_mandays,
              merged.actual_hours,
              merged.weekly_weights,
              merged.version,
              merged.rework_note,
              merged.layout_closed,
              merged.modified_by,
              done
            );
          });
        };

        // 順序執行所有更新
        let idx = 0;
        const next = (err) => {
          if (err) {
            stmt.finalize();
            db.run('ROLLBACK');
            return res.status(500).json({
              success: false,
              message: 'Database error',
              error: err.message
            });
          }
          if (idx >= data.length) {
            stmt.finalize();
            db.run('COMMIT');
            // 返回更新後的資料
            db.all(
              'SELECT * FROM layout_tasks WHERE project_id = ?',
              [projectId],
              (err, rows) => {
                if (err) {
                  console.error('Error fetching updated data:', err);
                  return res.status(500).json({
                    success: false,
                    message: 'Database error',
                    error: err.message
                  });
                }
                const formattedRows = rows.map(row => ({
                  id: row.id,
                  ipName: row.ip_name,
                  designer: row.designer,
                  layoutOwner: row.layout_owner,
                  schematicFreeze: row.schematic_freeze,
                  lvsClean: row.lvs_clean,
                  layoutLeaderSchematicFreeze: row.layout_leader_schematic_freeze,
                  layoutLeaderLvsClean: row.layout_leader_lvs_clean,
                  actualHours: JSON.parse(row.actual_hours || '[]'),
                  weeklyWeights: JSON.parse(row.weekly_weights || '[]'),
                  version: row.version,
                  reworkNote: row.rework_note,
                  layoutClosed: Boolean(row.layout_closed),
                  plannedMandays: row.planned_mandays,
                  modifiedBy: row.modified_by,
                  lastModified: row.last_modified
                }));
                console.log('Update successful:', {
                  projectId,
                  updatedRecords: formattedRows.length
                });
                res.json({
                  success: true,
                  updatedProjectData: formattedRows
                });
              }
            );
            return;
          }
          updateOne(data[idx++], next);
        };
        next();
      } catch (err) {
        db.run('ROLLBACK');
        res.status(500).json({
          success: false,
          message: 'Database error',
          error: err.message
        });
      }
    });
  });
});

// 更新權重
router.post('/update-weight', (req, res) => {
  const { projectId, ipName, week, value, userId, role, version } = req.body;
  const requestId = uuidv4();

  if (!projectId || !ipName || !week || value === undefined || !userId || !role) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields',
      errors: ['All fields are required'],
      requestId
    });
  }

  db.get('SELECT weekly_weights FROM layout_tasks WHERE project_id = ? AND ip_name = ?', 
    [projectId, ipName], 
    (err, row) => {
      if (err) {
        console.error(`[${requestId}] Database error:`, err);
        return res.status(500).json({
          success: false,
          message: 'Database error',
          errors: [err.message],
          requestId
        });
      }

      if (!row) {
        return res.status(404).json({
          success: false,
          message: 'Layout task not found',
          errors: ['No matching record found'],
          requestId
        });
      }

      try {
        const weeklyWeights = JSON.parse(row.weekly_weights || '[]');
        const existingWeightIndex = weeklyWeights.findIndex(w => w.week === week);

        const newWeight = {
          week,
          value,
          updatedAt: new Date().toISOString(),
          updatedBy: userId,
          role,
          version: version || 1
        };

        if (existingWeightIndex >= 0) {
          weeklyWeights[existingWeightIndex] = newWeight;
        } else {
          weeklyWeights.push(newWeight);
        }

        db.run(
          'UPDATE layout_tasks SET weekly_weights = ?, modified_by = ?, last_modified = CURRENT_TIMESTAMP WHERE project_id = ? AND ip_name = ?',
          [JSON.stringify(weeklyWeights), userId, projectId, ipName],
          (err) => {
            if (err) {
              console.error(`[${requestId}] Error updating weight:`, err);
              return res.status(500).json({
                success: false,
                message: 'Failed to update weight',
                errors: [err.message],
                requestId
              });
            }

            res.json({
              success: true,
              message: 'Weight updated successfully',
              data: newWeight,
              requestId
            });
          }
        );
      } catch (err) {
        console.error(`[${requestId}] Error processing weight update:`, err);
        return res.status(500).json({
          success: false,
          message: 'Error processing weight update',
          errors: [err.message],
          requestId
        });
      }
    }
  );
});

// 獲取權重歷史
router.get('/weight-history', (req, res) => {
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

  db.get('SELECT weekly_weights FROM layout_tasks WHERE project_id = ? AND ip_name = ?',
    [projectId, ipName],
    (err, row) => {
      if (err) {
        console.error(`[${requestId}] Database error:`, err);
        return res.status(500).json({
          success: false,
          message: 'Database error',
          errors: [err.message],
          requestId
        });
      }

      if (!row) {
        return res.status(404).json({
          success: false,
          message: 'Layout task not found',
          errors: ['No matching record found'],
          requestId
        });
      }

      try {
        const weeklyWeights = JSON.parse(row.weekly_weights || '[]');
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
    }
  );
});

module.exports = router; 