import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { calculateEndDate, calculateMandays } from "../utils/dateUtils";

export default function LayoutTab({
  projectsData,
  setProjectsData,
  currentUser,
  layoutSortConfig,
  setLayoutSortConfig
}) {
  const getISOWeek = (date = new Date()) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
  };

  const currentWeek = getISOWeek();

  const handleSort = (key) => {
    const direction = layoutSortConfig.key === key && layoutSortConfig.direction === "asc" ? "desc" : "asc";
    setLayoutSortConfig({ key, direction });
  };

  const sortedData = Object.entries(projectsData)
    .flatMap(([projectId, items]) =>
      items
        .filter(item => item.layoutOwner === currentUser)
        .map(item => ({ ...item, projectId, status: item.status || "Unassigned" }))
    )
    .sort((a, b) => {
      const valA = a[layoutSortConfig.key] || "";
      const valB = b[layoutSortConfig.key] || "";
      return layoutSortConfig.direction === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    })
    .filter(Boolean);

  const updateItem = (projectId, ipName, field, value) => {
    const updated = [...projectsData[projectId]];
    const index = updated.findIndex(row => row.ipName === ipName);
    if (index !== -1) {
      updated[index][field] = value;
      if (field === "schematicFreeze" && updated[index].plannedMandays) {
        updated[index].lvsClean = calculateEndDate(value, parseInt(updated[index].plannedMandays, 10));
      } else if (field === "lvsClean" && updated[index].schematicFreeze) {
        updated[index].plannedMandays = calculateMandays(updated[index].schematicFreeze, value).toString();
      } else if (field === "plannedMandays" && updated[index].schematicFreeze) {
        updated[index].lvsClean = calculateEndDate(updated[index].schematicFreeze, parseInt(value, 10));
      }
      setProjectsData(prev => ({ ...prev, [projectId]: updated }));
    }
  };

  return (
    <div style={{ overflowX: "auto", background: "#fff", padding: 12, borderRadius: 8, boxShadow: "0 1px 2px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {['projectId', 'ipName', 'schematicFreeze', 'lvsClean', 'plannedMandays'].map(col => (
              <th key={col} style={col === 'projectId' ? { padding: "10px", fontWeight: "600", fontSize: 15, cursor: "pointer", textAlign: "left" } : col === 'plannedMandays' ? { padding: "4px 10px", fontWeight: "600", fontSize: 15, cursor: "pointer", textAlign: "center" } : { padding: "10px", fontWeight: "600", fontSize: 15, cursor: "pointer", textAlign: "center" }} onClick={() => handleSort(col)}>
                {{
                  projectId: "Project",
                  ipName: "IP Name",
                  schematicFreeze: "Schematic Freeze",
                  lvsClean: "LVS Clean",
                  plannedMandays: "Mandays"
                }[col] || col}
                {layoutSortConfig.key === col && (layoutSortConfig.direction === "asc" ? " ▲" : " ▼")}
              </th>
            ))}
            <th style={{ padding: "4px 10px", fontWeight: "600", fontSize: 15, textAlign: "center" }}>Weekly Weight</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.length > 0 ? (
            sortedData.map((item, idx) => (
              <tr key={idx} style={{
                borderTop: "1px solid #e5e7eb",
                backgroundColor:
                  item.status?.includes("Unassigned") ? "#fef3c7" :
                  item.status?.includes("Waiting for Freeze") ? "#e0f2fe" :
                  item.status?.includes("In Progress") ? "#dcfce7" :
                  item.status?.includes("Completed") ? "#e0e7ff" :
                  item.status?.includes("Reopened") ? "#fee2e2" : "#ffffff"
              }}>
                <td style={{ padding: 8, textAlign: "left" }}>{item.projectId}</td>
                <td style={{ padding: 8, textAlign: "center" }}>
                  <input
                    type="text"
                    value={item.ipName}
                    readOnly
                    style={{ width: "100%", backgroundColor: "#f9fafb", border: "none", textAlign: "center" }}
                  />
                </td>
                <td style={{
                  padding: 8,
                  textAlign: "center",
                  verticalAlign: "middle",
                  whiteSpace: "nowrap"
                }}>
                  <div style={{ display: "inline-block", width: "100%" }}>
                    <DatePicker
                      selected={item.schematicFreeze ? new Date(item.schematicFreeze) : null}
                      onChange={() => {}}
                      disabled
                      wrapperClassName="date-picker-wrapper"
                      popperPlacement="bottom"
                      style={{ width: "100%", textAlign: "center" }}
                    />
                  </div>
                </td>
                <td style={{
                  padding: 8,
                  textAlign: "center",
                  verticalAlign: "middle",
                  whiteSpace: "nowrap"
                }}>
                  <div style={{ display: "inline-block", width: "100%" }}>
                    <DatePicker
                      selected={item.lvsClean ? new Date(item.lvsClean) : null}
                      onChange={() => {}}
                      disabled
                      wrapperClassName="date-picker-wrapper"
                      popperPlacement="bottom"
                      style={{ width: "100%", textAlign: "center" }}
                    />
                  </div>
                </td>
                <td style={{ padding: 8, textAlign: "center" }}>
                  <input
                    type="text"
                    value={item.plannedMandays}
                    readOnly
                    style={{ width: "80%", backgroundColor: "#f9fafb", border: "none", padding: "2px 4px", textAlign: "center" }}
                  />
                </td>
                <td style={{ padding: 8, textAlign: "center" }}>
                  <input
                    type="text"
                    step="0.1"
                    value={item.weeklyWeights?.find(w => w.week === currentWeek)?.value || ""}
                    onChange={(e) => {
                      const newWeight = parseFloat(e.target.value);
                      const updated = [...projectsData[item.projectId]];
                      const target = updated.find(row => row.ipName === item.ipName);
                      const week = currentWeek;
                      if (target) {
                        const history = [...(target.weeklyWeights || [])];
                        const index = history.findIndex(w => w.week === week);
                        if (index >= 0) history[index].value = newWeight;
                        else history.push({ week, value: newWeight, updatedAt: new Date().toISOString() });
                        target.weeklyWeights = history;
                        setProjectsData(prev => ({ ...prev, [item.projectId]: updated }));
                      }
                    }}
                    style={{ width: "80%", padding: "2px 4px", textAlign: "center" }}
                  />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "16px", color: "#999" }}>
                No records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
