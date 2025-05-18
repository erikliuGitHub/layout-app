import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function LayoutLeaderTab({
  projectsData,
  setProjectsData,
  allLayoutOwners,
  layoutOwnerFilter,
  setLayoutOwnerFilter,
  layoutLeaderSortConfig,
  setLayoutLeaderSortConfig,
  currentProjectId,
  setCurrentProjectId
}) {
  const getStatus = (row) => {
    const now = new Date();
    if (!row.layoutOwner) return "Unassigned";
    if (row.closed) return "Completed";
    if (row.reopened) return "Reopened";
    if (new Date(row.lvsClean) < now) return "Overdue";
    if (new Date(row.schematicFreeze) <= now) return "In Progress";
    return "Assigned";
  };

  const getRowStyle = (row) => {
    if (row.closed) return { backgroundColor: "#e5e7eb" }; // Completed
    if (row.reopened) return { backgroundColor: "#f3e8ff" }; // Reopened
    if (!row.layoutOwner) return { backgroundColor: "#fef2f2" }; // Unassigned
    if (new Date(row.lvsClean) < new Date()) return { backgroundColor: "#fee2e2" }; // Overdue
    if (new Date(row.schematicFreeze) <= new Date()) return { backgroundColor: "#fef9c3" }; // In Progress
    return { backgroundColor: "#e0f2fe" }; // Assigned
  };

  // Debug logging for initial state
  console.log("Initial Project Data:", projectsData);
  console.log("Current Project ID:", currentProjectId);
  console.log("Selected Project Rows:", projectsData[currentProjectId]);
  const handleSort = (key) => {
    const direction = layoutLeaderSortConfig.key === key && layoutLeaderSortConfig.direction === "asc" ? "desc" : "asc";
    setLayoutLeaderSortConfig({ key, direction });
  };

  const handleFieldChange = (idx, field, value) => {
    console.log("Field change triggered:", field, value);
    const updated = [...projectsData[currentProjectId]];
    updated[idx][field] = value instanceof Date ? value.toISOString().split("T")[0] : value;

    // Recalculate mandays if dates are present and valid
    const startDateStr = updated[idx].schematicFreeze;
    const endDateStr = updated[idx].lvsClean;
    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
        let workingDays = 0;
        let current = new Date(start);
        while (current <= end) {
          const day = current.getDay();
          if (day !== 0 && day !== 6) {
            workingDays++;
          }
          current.setDate(current.getDate() + 1);
        }
        updated[idx].mandays = workingDays.toString();
      } else {
        updated[idx].mandays = updated[idx].mandays && updated[idx].mandays !== "" ? updated[idx].mandays : (projectsData[currentProjectId][idx].mandays ?? "0");
      }
    }

    // Update the status explicitly
    updated[idx].status = getStatus(updated[idx]);

    setProjectsData({
      ...projectsData,
      [currentProjectId]: updated
    });
  };

  const sortedRows = (Array.isArray(projectsData[currentProjectId]) ? projectsData[currentProjectId] : [])
    .filter((row) =>
      (!layoutOwnerFilter || row.layoutOwner === layoutOwnerFilter) &&
      (
        currentProjectId === "" ||
        row.projectId === undefined ||
        row.projectId === "" ||
        currentProjectId === row.projectId
      )
    )
    .sort((a, b) => {
      const key = layoutLeaderSortConfig.key;
      if (!key) return 0;
      const valA = a[key]?.toString() || "";
      const valB = b[key]?.toString() || "";
      return layoutLeaderSortConfig.direction === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    });

  const columnStyles = {
    ipName: { width: 200, padding: 8 },
    designer: { width: 160, padding: 8 },
    schematicFreeze: { width: 140, padding: 8 },
    lvsClean: { width: 140, padding: 8 },
    mandays: { width: 80, padding: 8 },
    layoutOwner: { width: 160, padding: 8 },
    status: { width: 100, padding: 8 },
    actions: { width: 220, padding: 8 },
  };

  const handleSplitRow = (idx) => {
    const row = projectsData[currentProjectId][idx];
    const newRow = {
      ...row,
      ipName: `${row.ipName}_1`,
      isSubIp: true,
      closed: false,
      reopened: false
    };
    newRow.status = getStatus(newRow);

    const updated = [...projectsData[currentProjectId]];
    updated.splice(idx + 1, 0, newRow);
    setProjectsData({
      ...projectsData,
      [currentProjectId]: updated
    });
  };

  const handleCloseRow = (idx) => {
    const updated = [...projectsData[currentProjectId]];
    updated[idx].closed = true;
    updated[idx].reopened = false;
    updated[idx].status = getStatus(updated[idx]);
    setProjectsData({
      ...projectsData,
      [currentProjectId]: updated
    });
  };

  const handleReopenRow = (idx) => {
    const updated = [...projectsData[currentProjectId]];
    updated[idx].closed = false;
    updated[idx].reopened = true;
    updated[idx].status = getStatus(updated[idx]);
    setProjectsData({
      ...projectsData,
      [currentProjectId]: updated
    });
  };

  const handleDeleteRow = (idx) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this row?");
    if (!confirmDelete) return;

    // Make a shallow copy of the whole projectsData
    const newProjectsData = { ...projectsData };
    // Make a copy of the current project's array
    const updated = [...(newProjectsData[currentProjectId] || [])];
    // Optionally, store the deleted row for any further cleanup
    const deletedRow = updated[idx];
    updated.splice(idx, 1);
    // Assign back to the shared state
    newProjectsData[currentProjectId] = updated;
    setProjectsData(newProjectsData);
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 600 }}>Filter by Project:</label>
        <select
          value={currentProjectId}
          onChange={(e) => setCurrentProjectId(e.target.value)}
          style={{ marginLeft: 8 }}
        >
          {Object.keys(projectsData).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 600 }}>Filter by Layout Owner:</label>
        <select
          value={layoutOwnerFilter}
          onChange={(e) => setLayoutOwnerFilter(e.target.value)}
          style={{ marginLeft: 8 }}
        >
          <option value="">All</option>
          {allLayoutOwners.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {[
              { key: 'ipName', label: 'IP Name' },
              { key: 'designer', label: 'Designer' },
              { key: 'schematicFreeze', label: 'Schematic Freeze' },
              { key: 'lvsClean', label: 'LVS Clean' },
              { key: 'mandays', label: 'Mandays' },
              { key: 'layoutOwner', label: 'Layout Owner' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: 'Actions' }
            ].map(({ key, label }) => (
              <th
                key={key}
                onClick={() => handleSort(key)}
                style={{ cursor: 'pointer', textAlign: 'left', ...columnStyles[key] }}
              >
                {label}
                {layoutLeaderSortConfig.key === key && (layoutLeaderSortConfig.direction === "asc" ? " ▲" : " ▼")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ padding: 8, textAlign: "center", color: "#888" }}>No records found</td>
            </tr>
          ) : (
            sortedRows.map((row, idx) => (
              <tr
                key={idx}
                style={getRowStyle(row)}
              >
                <td style={columnStyles.ipName}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {row.isSubIp && <span style={{ marginLeft: 12 }}>↳</span>}
                    {row.isSubIp ? (
                      <input
                        type="text"
                        value={row.ipName}
                        onChange={(e) => handleFieldChange(idx, "ipName", e.target.value)}
                        style={{ width: "100%", background: "#fff7ed", fontStyle: "italic" }}
                      />
                    ) : (
                      row.ipName
                    )}
                  </div>
                </td>
                <td style={columnStyles.designer}>{row.designer}</td>
                <td style={columnStyles.schematicFreeze}>
                  <DatePicker
                    selected={row.schematicFreeze ? new Date(row.schematicFreeze) : null}
                    onChange={(date) => handleFieldChange(idx, "schematicFreeze", date)}
                    dateFormat="yyyy-MM-dd"
                    className="date-picker"
                  />
                </td>
                <td style={columnStyles.lvsClean}>
                  <DatePicker
                    selected={row.lvsClean ? new Date(row.lvsClean) : null}
                    onChange={(date) => handleFieldChange(idx, "lvsClean", date)}
                    dateFormat="yyyy-MM-dd"
                    className="date-picker"
                  />
                </td>
                <td style={columnStyles.mandays}>{(row.mandays !== undefined && row.mandays !== "") ? row.mandays : (row.plannedMandays ?? 0)}</td>
                <td style={columnStyles.layoutOwner}>
                  <select
                    value={row.layoutOwner}
                    onChange={(e) => handleFieldChange(idx, "layoutOwner", e.target.value)}
                  >
                    <option value="">-- Select --</option>
                    {allLayoutOwners.map(owner => (
                      <option key={owner} value={owner}>{owner}</option>
                    ))}
                  </select>
                </td>
                <td style={columnStyles.status}>
                  {getStatus(row)}
                </td>
                <td style={columnStyles.actions}>
                  <div style={{ display: "flex", gap: "4px", alignItems: "center", justifyContent: "flex-start" }}>
                    <button onClick={() => handleSplitRow(idx)}>Split</button>
                    {row.closed ? (
                      <button onClick={() => handleReopenRow(idx)}>Reopen</button>
                    ) : (
                      <button onClick={() => handleCloseRow(idx)}>Close</button>
                    )}
                    <button onClick={() => handleDeleteRow(idx)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}