const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to database at', dbPath);
});

const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    console.log('Starting database initialization...');
    
    const createTableSQL = `CREATE TABLE IF NOT EXISTS layout_tasks (
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
      weekly_weights TEXT DEFAULT '[]',
      actual_hours TEXT DEFAULT '[]',
      version INTEGER DEFAULT 1,
      rework_note TEXT DEFAULT '',
      layout_closed INTEGER DEFAULT 0,
      modified_by TEXT,
      last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, ip_name)
    )`;

    db.run(createTableSQL, (err) => {
      if (err) {
        console.error('Error creating table:', err);
        reject(err);
        return;
      }

      // Verify table was created
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='layout_tasks'", [], (err, row) => {
        if (err) {
          console.error('Error verifying table creation:', err);
          reject(err);
          return;
        }
        
        if (!row) {
          const error = new Error('Table was not created successfully');
          console.error(error.message);
          reject(error);
          return;
        }

        console.log('Database initialized successfully');
        resolve();
      });
    });
  });
};

module.exports = {
  db,
  initializeDatabase
}; 