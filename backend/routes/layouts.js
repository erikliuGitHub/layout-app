const express = require('express');
const router = express.Router();
const db = require('../db');

// ... existing code ...

// 更新 weekly weight
router.post('/update-weight', async (req, res) => {
  const { projectId, ipName, week, value, userId, role } = req.body;
  
  try {
    console.log('收到的 req.body.data:', req.body.data);
    await db.transaction(async (trx) => {
      // 1. 獲取 layout task ID
      const task = await trx('layout_tasks')
        .where({ project_id: projectId, ip_name: ipName })
        .first();
      
      if (!task) {
        throw new Error('Layout task not found');
      }

      // 2. 獲取當前版本號
      const currentVersion = await trx('weekly_weight_history')
        .where({ layout_task_id: task.id, week })
        .max('version')
        .first();
      
      const newVersion = (currentVersion?.max || 0) + 1;
      
      // 3. 插入新版本記錄
      await trx('weekly_weight_history').insert({
        layout_task_id: task.id,
        week,
        value,
        updated_by: userId,
        role,
        version: newVersion
      });
      
      // 4. 更新當前值
      await trx('layout_tasks')
        .where({ id: task.id })
        .update({
          weekly_weights: db.raw(`
            jsonb_set(
              COALESCE(weekly_weights, '[]'::jsonb),
              '{0}',
              jsonb_build_object(
                'week', ?,
                'value', ?,
                'updatedAt', ?,
                'updatedBy', ?,
                'role', ?,
                'version', ?
              )
            )
          `, [week, value, new Date().toISOString(), userId, role, newVersion])
        });
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating weight:', error);
    res.status(500).json({ error: error.message });
  }
});

// 獲取 weekly weight 歷史記錄
router.get('/weight-history', async (req, res) => {
  const { projectId, ipName, week } = req.query;
  
  try {
    const history = await db('weekly_weight_history')
      .join('layout_tasks', 'layout_tasks.id', 'weekly_weight_history.layout_task_id')
      .where({
        'layout_tasks.project_id': projectId,
        'layout_tasks.ip_name': ipName,
        'weekly_weight_history.week': week
      })
      .orderBy('version', 'desc')
      .select([
        'weekly_weight_history.value',
        'weekly_weight_history.updated_at',
        'weekly_weight_history.updated_by',
        'weekly_weight_history.role',
        'weekly_weight_history.version'
      ]);
      
    if (history.length > 0) {
      history.forEach(row => {
        console.warn(
          '異常 row ipName:', row?.ipName,
          '型別:', typeof row?.ipName,
          'plannedMandays:', row?.plannedMandays,
          'layoutClosed:', row?.layoutClosed,
          '原始值:', row
        );
      });
    }
    
    res.json({ history });
  } catch (error) {
    console.error('Error fetching weight history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ... existing code ...

module.exports = router; 