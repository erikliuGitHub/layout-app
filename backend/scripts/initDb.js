const fs = require('fs');
const Papa = require('papaparse');
const db = require("../config/db");

console.log('Starting database initialization...');

db.serialize(() => {
  // Drop existing table if it exists
  db.run("DROP TABLE IF EXISTS layout_tasks", (err) => {
    if (err) {
      console.error("Failed to drop layout_tasks:", err);
      process.exit(1);
    }
    console.log("Dropped existing layout_tasks table.");

    // Create table with correct structure
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS layout_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id TEXT NOT NULL,
        ip_name TEXT NOT NULL,
        designer TEXT,
        layout_owner TEXT,
        schematic_freeze TEXT,
        lvs_clean TEXT,
        planned_mandays TEXT,
        actual_hours TEXT,
        version INTEGER DEFAULT 1,
        rework_note TEXT,
        layout_closed BOOLEAN DEFAULT 0,
        modified_by TEXT,
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    db.run(createTableSQL, (err) => {
      if (err) {
        console.error('Failed to create table:', err);
        process.exit(1);
      }
      console.log('Created layout_tasks table.');

      // Load sample data if CSV exists
      const csvFile = './scripts/sampleData.csv';
      if (fs.existsSync(csvFile)) {
        const csvContent = fs.readFileSync(csvFile, 'utf8');
        const results = Papa.parse(csvContent, { header: true, skipEmptyLines: true });

        console.log('Total records parsed from CSV:', results.data.length);

        // Prepare the insert statement
        const stmt = db.prepare(`
          INSERT INTO layout_tasks (
            project_id, ip_name, designer, layout_owner,
            schematic_freeze, lvs_clean, planned_mandays,
            actual_hours, version, rework_note,
            layout_closed, modified_by
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        results.data.forEach(item => {
          try {
            stmt.run(
              item.project_id || 'DEFAULT_PROJECT',
              item.ip_name || '',
              item.designer || '',
              item.layout_owner || '',
              item.schematic_freeze || null,
              item.lvs_clean || null,
              item.planned_mandays || null,
              '[]',  // empty array for actual_hours
              1,     // initial version
              '',    // empty rework_note
              0,     // not closed by default
              ''     // empty modified_by
            );
          } catch (err) {
            console.error('Insert failed for item:', item, err);
          }
        });

        stmt.finalize();
        console.log('Sample data inserted successfully.');
      } else {
        console.log('No sample data file found at:', csvFile);
      }

      // Create indexes for better performance
      db.run("CREATE INDEX IF NOT EXISTS idx_project_id ON layout_tasks(project_id)");
      db.run("CREATE INDEX IF NOT EXISTS idx_ip_name ON layout_tasks(ip_name)");
      
      console.log('Database initialization completed.');
    });
  });
});