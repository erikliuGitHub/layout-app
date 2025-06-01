const { db } = require('../config/db');

const insertBaseline = () => {
  const baselineData = {
    project_id: 'TEST_PROJECT',
    ip_name: 'ADC_Core_1',
    designer: 'Designer1',
    layout_owner: 'LayoutOwner1',
    schematic_freeze: '2025-06-01',
    lvs_clean: '2025-07-15',
    layout_leader_schematic_freeze: '2025-06-15',
    layout_leader_lvs_clean: '2025-08-01',
    planned_mandays: '30',
    actual_hours: '[]',
    weekly_weights: '[]',
    version: 1,
    rework_note: '',
    layout_closed: 0,
    modified_by: 'system',
    last_modified: new Date().toISOString()
  };

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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    baselineData.project_id,
    baselineData.ip_name,
    baselineData.designer,
    baselineData.layout_owner,
    baselineData.schematic_freeze,
    baselineData.lvs_clean,
    baselineData.layout_leader_schematic_freeze,
    baselineData.layout_leader_lvs_clean,
    baselineData.planned_mandays,
    baselineData.actual_hours,
    baselineData.weekly_weights,
    baselineData.version,
    baselineData.rework_note,
    baselineData.layout_closed,
    baselineData.modified_by,
    baselineData.last_modified
  );

  stmt.finalize();
  console.log('Baseline data inserted successfully');
};

// 執行插入
insertBaseline(); 