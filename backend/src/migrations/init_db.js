const { executeQuery } = require('../config/db');

async function initializeDatabase() {
  try {
    // 檢查表是否存在
    const checkTableSQL = `
      SELECT COUNT(*) as count 
      FROM user_tables 
      WHERE table_name = 'LAYOUT_TASKS'
    `;
    
    const result = await executeQuery(checkTableSQL);
    const tableExists = result.rows[0].COUNT > 0;

    if (!tableExists) {
      // 創建表
      const createTableSQL = `
        CREATE TABLE layout_tasks (
          id VARCHAR2(36) PRIMARY KEY,
          project_id VARCHAR2(50) NOT NULL,
          ip_name VARCHAR2(100) NOT NULL,
          designer VARCHAR2(100),
          layout_owner VARCHAR2(100),
          schematic_freeze DATE,
          lvs_clean DATE,
          layout_leader_schematic_freeze DATE,
          layout_leader_lvs_clean DATE,
          planned_mandays VARCHAR2(20),
          actual_hours CLOB,
          weekly_weights CLOB,
          version NUMBER DEFAULT 1,
          rework_note VARCHAR2(4000),
          layout_closed NUMBER(1) DEFAULT 0,
          modified_by VARCHAR2(100),
          last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT unique_project_ip UNIQUE (project_id, ip_name)
        )
      `;

      await executeQuery(createTableSQL);
      console.log('Table layout_tasks created successfully');

      // 創建索引
      const createIndexSQL = `
        CREATE INDEX idx_layout_tasks_project 
        ON layout_tasks(project_id)
      `;

      await executeQuery(createIndexSQL);
      console.log('Index created successfully');
    } else {
      console.log('Table layout_tasks already exists');
    }

    return true;
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
}

module.exports = {
  initializeDatabase
}; 