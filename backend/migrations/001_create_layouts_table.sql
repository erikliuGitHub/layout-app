-- Create layouts table
CREATE TABLE IF NOT EXISTS layouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    ip_name TEXT NOT NULL,
    designer TEXT,
    layout_owner TEXT,
    schematic_freeze DATE,
    lvs_clean DATE,
    layout_leader_schematic_freeze DATE,
    layout_leader_lvs_clean DATE,
    layout_closed BOOLEAN DEFAULT FALSE,
    weekly_weights TEXT DEFAULT '[]',
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_by TEXT,
    version TEXT DEFAULT '1',
    UNIQUE(project_id, ip_name)
); 