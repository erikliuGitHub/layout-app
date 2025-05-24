const db = require("../config/db");

function safeParse(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

exports.getGroupedByProjectId = (callback) => {
  db.all("SELECT * FROM layout_tasks", [], (err, rows) => {
    if (err) return callback(err);
    const grouped = {};
    rows.forEach(row => {
      const transformedRow = {
        id: row.id,
        projectId: row.project_id,
        ipName: row.ip_name,
        designer: row.designer,
        layoutOwner: row.layout_owner,
        schematicFreeze: row.schematic_freeze,
        lvsClean: row.lvs_clean,
        estimatedHours: safeParse(row.estimated_hours),
        actualHours: safeParse(row.actual_hours),
        version: row.version,
        reworkNote: row.rework_note
      };
      if (!grouped[transformedRow.projectId]) grouped[transformedRow.projectId] = [];
      grouped[transformedRow.projectId].push(transformedRow);
    });
    callback(null, grouped);
  });
};

exports.createTask = (data, callback) => {
  const {
    project_id, ip_name, designer, layout_owner,
    schematic_freeze, lvs_clean, estimated_hours, actual_hours,
    version, rework_note
  } = data;
  db.run(`INSERT INTO layout_tasks 
    (project_id, ip_name, designer, layout_owner, schematic_freeze, lvs_clean,
     estimated_hours, actual_hours, version, rework_note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [project_id, ip_name, designer, layout_owner, schematic_freeze, lvs_clean,
     JSON.stringify(estimated_hours), JSON.stringify(actual_hours),
     version, rework_note], callback);
};

// 之後可再加 update/delete 等方法