// src/utils/csvUtils.js

import Papa from "papaparse";

function escapeCSV(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") {
    if (value.includes('"') || value.includes(",") || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
  return String(value);
}

export function exportCSV(projectId, data) {
  const headers = ["projectId", "ipName", "designer", "schematicFreeze", "lvsClean", "plannedMandays", "layoutOwner"];
  const rows = data.map((row) =>
    [
      escapeCSV(projectId),
      escapeCSV(row.ipName),
      escapeCSV(row.designer),
      escapeCSV(row.schematicFreeze),
      escapeCSV(row.lvsClean),
      escapeCSV(row.plannedMandays),
      escapeCSV(row.layoutOwner)
    ].join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${projectId}_plan.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  alert("CSV export successful!");
}

export function importCSV(file, callback) {
  if (!file) return;
  const allowedKeys = ["ipName", "designer", "schematicFreeze", "lvsClean", "plannedMandays", "layoutOwner"];
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      if (!Array.isArray(results.data)) {
        alert("Failed to import CSV: CSV data is not an array");
        return;
      }
      const newDataRaw = results.data;
      const newData = newDataRaw.map((row) => {
        const filteredRow = {};
        allowedKeys.forEach((key) => {
          filteredRow[key] = row[key];
        });
        return filteredRow;
      });
      const projectId = newDataRaw[0]?.projectId || "Unknown_Project";
      const projectBody = newData;
      callback(projectId, projectBody.filter((row) => row.ipName));
    },
    error: (err) => {
      alert("CSV parse error: " + err.message);
    }
  });
}