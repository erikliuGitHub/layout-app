const { db } = require('../config/db');

const initDatabase = () => {
  db.serialize(() => {
    // 創建 layout_tasks 表格
    db.run(`
      CREATE TABLE IF NOT EXISTS layout_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        ip_name TEXT NOT NULL,
        designer TEXT,
        layout_owner TEXT,
        schematic_freeze TEXT,
        lvs_clean TEXT,
        layout_leader_schematic_freeze TEXT,
        layout_leader_lvs_clean TEXT,
        planned_mandays TEXT,
        actual_hours TEXT,
        weekly_weights TEXT,
        version INTEGER DEFAULT 1,
        rework_note TEXT,
        layout_closed INTEGER DEFAULT 0,
        modified_by TEXT,
        last_modified TEXT,
        UNIQUE(project_id, ip_name)
      )
    `);

    console.log('Database initialized successfully');
  });
};

// 執行初始化
initDatabase(); 