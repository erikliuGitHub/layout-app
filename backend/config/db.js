const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 使用絕對路徑
const dbPath = path.resolve(__dirname, '../../layout.db');

// 創建數據庫連接
let dbInstance = null;

// 初始化數據庫表
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    const requestId = uuidv4();
    
    // 創建新的數據庫連接
    dbInstance = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        console.error(`[${requestId}] Error connecting to database:`, err);
        return reject(err);
      }
      console.log(`[${requestId}] Connected to SQLite database at ${dbPath}`);
    });

    dbInstance.serialize(() => {
      // Create table
      dbInstance.run(`CREATE TABLE IF NOT EXISTS layout_tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        ip_name TEXT NOT NULL,
        designer TEXT,
        layout_owner TEXT,
        schematic_freeze TEXT,
        lvs_clean TEXT,
        actual_hours TEXT,
        version TEXT,
        rework_note TEXT,
        layout_closed INTEGER DEFAULT 0,
        planned_mandays REAL,
        modified_by TEXT,
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, ip_name, version)
      )`, (err) => {
        if (err) {
          console.error(`[${requestId}] Error creating table:`, err);
          return reject(err);
        }
        console.log(`[${requestId}] Database table 'layout_tasks' initialized`);

        // Clear existing data
        dbInstance.run("DELETE FROM layout_tasks", (err) => {
          if (err) {
            console.error(`[${requestId}] Error clearing table:`, err);
            return reject(err);
          }
          console.log(`[${requestId}] Cleared existing data`);

          // Insert test data
          console.log(`[${requestId}] Initializing test data`);
          
          const testData = [
            {
              id: uuidv4(),
              project_id: 'PJT-2025-Alpha',
              ip_name: 'CPU Core',
              designer: 'John Doe',
              layout_owner: null,
              schematic_freeze: '2025-06-01',
              lvs_clean: '2025-07-01',
              actual_hours: JSON.stringify({}),
              version: '1.0',
              rework_note: '',
              layout_closed: 0,
              planned_mandays: null,
              modified_by: 'system',
              last_modified: new Date().toISOString()
            },
            {
              id: uuidv4(),
              project_id: 'PJT-2025-Alpha',
              ip_name: 'Memory Controller',
              designer: 'Alice Johnson',
              layout_owner: null,
              schematic_freeze: '2025-06-15',
              lvs_clean: '2025-07-15',
              actual_hours: JSON.stringify({}),
              version: '1.0',
              rework_note: '',
              layout_closed: 0,
              planned_mandays: null,
              modified_by: 'system',
              last_modified: new Date().toISOString()
            },
            {
              id: uuidv4(),
              project_id: 'PJT-2025-Beta',
              ip_name: 'GPU Core',
              designer: 'Bob Wilson',
              layout_owner: 'Layout_Team_1',
              schematic_freeze: '2025-07-01',
              lvs_clean: '2025-08-15',
              actual_hours: JSON.stringify({}),
              version: '1.0',
              rework_note: '',
              layout_closed: 0,
              planned_mandays: 30,
              modified_by: 'system',
              last_modified: new Date().toISOString()
            },
            {
              id: uuidv4(),
              project_id: 'PJT-2025-Beta',
              ip_name: 'Display Controller',
              designer: 'Carol Smith',
              layout_owner: 'Layout_Team_2',
              schematic_freeze: '2025-07-15',
              lvs_clean: '2025-08-30',
              actual_hours: JSON.stringify({}),
              version: '1.0',
              rework_note: '',
              layout_closed: 0,
              planned_mandays: 25,
              modified_by: 'system',
              last_modified: new Date().toISOString()
            },
            {
              id: uuidv4(),
              project_id: 'PJT-2024-Legacy',
              ip_name: 'USB Controller',
              designer: 'David Brown',
              layout_owner: 'Layout_Team_1',
              schematic_freeze: '2024-12-01',
              lvs_clean: '2024-12-31',
              actual_hours: JSON.stringify({ "2025-W48": 20, "2025-W49": 25 }),
              version: '2.0',
              rework_note: 'Performance optimization needed',
              layout_closed: 1,
              planned_mandays: 45,
              modified_by: 'system',
              last_modified: new Date().toISOString()
            }
          ];

          const insertPromises = testData.map(data => {
            return new Promise((resolve, reject) => {
              dbInstance.run(`INSERT INTO layout_tasks (
                id, project_id, ip_name, designer, layout_owner, 
                schematic_freeze, lvs_clean, actual_hours, version, 
                rework_note, layout_closed, planned_mandays, modified_by, last_modified
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                data.id, data.project_id, data.ip_name, data.designer, data.layout_owner,
                data.schematic_freeze, data.lvs_clean, data.actual_hours, data.version,
                data.rework_note, data.layout_closed, data.planned_mandays, data.modified_by, data.last_modified
              ],
              function(err) {
                if (err) {
                  console.error(`[${requestId}] Error inserting test data:`, err);
                  reject(err);
                } else {
                  resolve();
                }
              });
            });
          });

          Promise.all(insertPromises)
            .then(() => {
              console.log(`[${requestId}] All test data initialized successfully`);
              resolve();
            })
            .catch(err => {
              console.error(`[${requestId}] Error during batch insert:`, err);
              reject(err);
            });
        });
      });
    });
  });
};

// Export both the database instance and initialization function
module.exports = {
  db: () => dbInstance,  // 返回資料庫實例
  initializeDatabase
};