import React, { useState } from "react";
import { getISOWeek } from "../utils/ganttUtils";

export default function GanttChart({
  projectsData,
  ganttDesignerFilter,
  setGanttDesignerFilter,
  ganttLayoutOwnerFilter,
  setGanttLayoutOwnerFilter,
  ganttProjectFilter,
  setGanttProjectFilter
}) {
  const [viewMode, setViewMode] = useState("week"); // "day" | "week" | "month"
  const pxPerWeek = 50;
  const barColor = "#4ade80";

  function generateTimeUnits(mode) {
    const units = [];
    const start = new Date();
    start.setDate(start.getDate() - (mode === "week" ? 28 : 0));

    if (mode === "day") {
      for (let i = 0; i < 60; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        units.push({ label: d.toISOString().slice(0, 10), date: d });
      }
    } else if (mode === "week") {
      for (let i = 0; i < 20; i++) {
        const monday = new Date(start);
        monday.setDate(start.getDate() + i * 7);
        const iso = getISOWeek(monday);
        units.push({ label: `W${iso.split("-")[1]}`, date: monday });
      }
    } else if (mode === "month") {
      for (let i = 0; i < 6; i++) {
        const first = new Date(start);
        first.setMonth(start.getMonth() + i);
        first.setDate(1);
        units.push({ label: first.toLocaleString("en-US", { month: "short", year: "numeric" }), date: first });
      }
    }

    return units;
  }

  const timeUnits = generateTimeUnits(viewMode);
  console.log(viewMode, timeUnits);
  const chartWidth = timeUnits.length * (viewMode === "day" ? 16 : viewMode === "week" ? 50 : 80);

  const allItems = Object.entries(projectsData)
    .flatMap(([projectId, items]) =>
      items.map((item) => ({ ...item, projectId }))
    )
    .filter((item) => {
      if (!item.schematicFreeze || !item.lvsClean) return false;
      if (ganttProjectFilter && item.projectId !== ganttProjectFilter) return false;
      if (ganttDesignerFilter && item.designer !== ganttDesignerFilter) return false;
      if (ganttLayoutOwnerFilter && item.layoutOwner !== ganttLayoutOwnerFilter) return false;
      return true;
    });

  const weekTaskCount = timeUnits.map((u) => {
    const unitStart = u.date;
    const unitEnd = new Date(unitStart);
    if (viewMode === "day") {
      unitEnd.setDate(unitEnd.getDate());
    } else if (viewMode === "week") {
      unitEnd.setDate(unitEnd.getDate() + 6);
    } else if (viewMode === "month") {
      unitEnd.setMonth(unitEnd.getMonth() + 1);
      unitEnd.setDate(0);
    }
    return allItems.reduce((count, item) => {
      const s = new Date(item.schematicFreeze);
      const e = new Date(item.lvsClean);
      return s <= unitEnd && e >= unitStart ? count + 1 : count;
    }, 0);
  });

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <label>
          Project:
          <select
            value={ganttProjectFilter}
            onChange={(e) => setGanttProjectFilter(e.target.value)}
          >
            <option value="">All</option>
            {Object.keys(projectsData).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label>
          Designer:
          <select
            value={ganttDesignerFilter}
            onChange={(e) => setGanttDesignerFilter(e.target.value)}
          >
            <option value="">All</option>
            {[...new Set(allItems.map((i) => i.designer))].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          Layout Owner:
          <select
            value={ganttLayoutOwnerFilter}
            onChange={(e) => setGanttLayoutOwnerFilter(e.target.value)}
          >
            <option value="">All</option>
            {[...new Set(allItems.map((i) => i.layoutOwner))].map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </label>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label htmlFor="view-mode-select" style={{ fontWeight: 600, marginRight: 8 }}>View Mode:</label>
        <select
          id="view-mode-select"
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value)}
          style={{ display: "inline-block", marginRight: "16px", padding: "4px 8px", borderRadius: 4, fontSize: 14 }}
        >
          <option value="day">Daily</option>
          <option value="week">Weekly</option>
          <option value="month">Monthly</option>
        </select>
      </div>
      <h3>
        Gantt Chart ({viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} Schedule)
      </h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: chartWidth + 200 }}>
          <thead>
            <tr>
              <th></th>
              {timeUnits.map((u, idx) => (
                <th key={idx} style={{ textAlign: "center", fontSize: "12px", background: idx % 2 === 0 ? "#f8fafc" : "#e2e8f0" }}>
                  {u.label}
                </th>
              ))}
            </tr>
            <tr>
              <th>Total</th>
              {weekTaskCount.map((cnt, idx) => (
                <th key={`cnt-${idx}`} style={{ textAlign: "center", fontSize: "12px", color: "#555" }}>
                  {cnt}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allItems.map((item, i) => {
              const start = new Date(item.schematicFreeze);
              const end = new Date(item.lvsClean);
              console.log("Gantt item:", item.projectId, item.ipName, "Start:", start, "End:", end);
              return (
                <tr key={i}>
                  <td>{item.projectId} - {item.ipName}</td>
                  {timeUnits.map((u, idx) => {
                    const unitStart = u.date;
                    const unitEnd = new Date(unitStart);
                    if (viewMode === "day") {
                      unitEnd.setDate(unitEnd.getDate());
                    } else if (viewMode === "week") {
                      unitEnd.setDate(unitEnd.getDate() + 6);
                    } else if (viewMode === "month") {
                      unitEnd.setMonth(unitEnd.getMonth() + 1);
                      unitEnd.setDate(0);
                    }
                    const inRange = start <= unitEnd && end >= unitStart;
                    return (
                      <td key={idx} style={{ padding: 0 }}>
                        {inRange ? (
                          <div style={{
                            height: "18px",
                            backgroundColor: barColor,
                            borderRadius: "4px",
                            margin: "2px 0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#fff",
                            fontSize: "12px"
                          }}>
                            {item.ipName}
                          </div>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
