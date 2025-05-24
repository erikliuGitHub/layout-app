import React from "react";
import Papa from "papaparse";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { calculateStatus } from "../utils/statusUtils";

export default function DesignerTab({
  projectsData,
  setProjectsData,
  currentProjectId,
  setCurrentProjectId,
  showNewProjectAlert,
  setShowNewProjectAlert,
  sortConfig,
  setSortConfig,
  designerFilter,
  setDesignerFilter,
  allDesigners,
  fileInputRef,
  exportCSV,
  importCSV,
  allProjectIds,
  currentUser,
  userRole,
  allUsers,
}) {
  const data = Array.isArray(projectsData?.[currentProjectId]) ? projectsData[currentProjectId] : [];

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const handleCopy = (index) => {
    // Deep copy and reset versioning info
    const copiedItem = {
      ...sortedData[index],
      lastModified: "",
      modifiedBy: "",
      version: "1"
    };
    const newData = [...data];
    newData.splice(index + 1, 0, copiedItem);
    setProjectsData(prev => ({
      ...prev,
      [currentProjectId]: newData
    }));
  };

  const handleDelete = (index) => {
    const newData = [...data];
    newData.splice(index, 1);
    setProjectsData(prev => ({
      ...prev,
      [currentProjectId]: newData
    }));
  };


  // Always use latest projectsData for sortedData, and recalc status on each render
  const sortedData = React.useMemo(() => {
    // Always use up-to-date data from projectsData for currentProjectId
    const dataSource = Array.isArray(projectsData?.[currentProjectId]) ? projectsData[currentProjectId] : [];
    // Add status field on-the-fly
    const enriched = dataSource.map(item => ({
      ...item,
      status: calculateStatus(item)
    }));
    if (!sortConfig.key) return enriched;
    return enriched.sort((a, b) => {
      const valA = a[sortConfig.key] ?? "";
      const valB = b[sortConfig.key] ?? "";
      if (sortConfig.key === "plannedMandays") {
        return sortConfig.direction === "asc"
          ? parseFloat(valA || 0) - parseFloat(valB || 0)
          : parseFloat(valB || 0) - parseFloat(valA || 0);
      }
      return sortConfig.direction === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [projectsData, currentProjectId, sortConfig]);

  const isEditable = (item) => true;


  return (
    <div style={{ padding: "0 16px", overflowX: "auto" }}>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 600, marginLeft: 16 }}>Project:</label>
        <select
          value={currentProjectId}
          onChange={(e) => setCurrentProjectId(e.target.value)}
        >
          {allProjectIds.map((pid) => (
            <option key={pid} value={pid}>{pid}</option>
          ))}
        </select>
        <button
          style={{ marginLeft: 12, padding: "4px 8px", fontSize: "13px", cursor: "pointer" }}
          onClick={async () => {
            const modal = document.createElement("div");
            modal.style.position = "fixed";
            modal.style.left = "0";
            modal.style.top = "0";
            modal.style.width = "100vw";
            modal.style.height = "100vh";
            modal.style.backgroundColor = "rgba(0,0,0,0.3)";
            modal.style.display = "flex";
            modal.style.justifyContent = "center";
            modal.style.alignItems = "center";
            modal.style.zIndex = "9999";

            const dialog = document.createElement("div");
            dialog.style.backgroundColor = "white";
            dialog.style.padding = "24px";
            dialog.style.borderRadius = "8px";
            dialog.style.display = "flex";
            dialog.style.flexDirection = "column";
            dialog.style.gap = "12px";
            dialog.style.width = "300px";

            const title = document.createElement("h3");
            title.textContent = "Create New Project";
            dialog.appendChild(title);

            const nameInput = document.createElement("input");
            nameInput.placeholder = "Enter new project name";
            nameInput.style.padding = "8px";
            nameInput.style.fontSize = "14px";
            nameInput.style.border = "1px solid #ccc";
            nameInput.style.borderRadius = "4px";
            dialog.appendChild(nameInput);

            const select = document.createElement("select");
            select.style.padding = "8px";
            select.style.fontSize = "14px";
            select.style.border = "1px solid #ccc";
            select.style.borderRadius = "4px";

            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.text = "-- Don't Copy (Blank Project) --";
            select.appendChild(defaultOption);

            Object.keys(projectsData).forEach(pid => {
              const option = document.createElement("option");
              option.value = pid;
              option.text = pid;
              select.appendChild(option);
            });

            dialog.appendChild(select);

            const buttonRow = document.createElement("div");
            buttonRow.style.display = "flex";
            buttonRow.style.justifyContent = "flex-end";
            buttonRow.style.gap = "8px";

            const cancelBtn = document.createElement("button");
            cancelBtn.textContent = "Cancel";
            cancelBtn.style.padding = "6px 12px";
            cancelBtn.onclick = () => {
              document.body.removeChild(modal);
            };

            const confirmBtn = document.createElement("button");
            confirmBtn.textContent = "Confirm";
            confirmBtn.style.padding = "6px 12px";
            confirmBtn.style.backgroundColor = "#2563eb";
            confirmBtn.style.color = "white";
            confirmBtn.style.border = "none";
            confirmBtn.style.borderRadius = "4px";
            confirmBtn.style.cursor = "pointer";
            confirmBtn.onclick = () => {
              const newName = nameInput.value.trim();
              if (!newName || projectsData[newName]) {
                alert("Invalid or duplicate project name.");
                return;
              }
            const copyFrom = select.value;
            const copied = copyFrom
              ? JSON.parse(JSON.stringify(projectsData[copyFrom])).map(item => ({
                  ...item,
                  lastModified: "",
                  modifiedBy: "",
                  version: "1"
                }))
              : [{
                  ipName: "",
                  designer: "",
                  schematicFreeze: "",
                  lvsClean: "",
                  plannedMandays: "",
                  layoutClosed: false,
                  lastModified: "",
                  modifiedBy: "",
                  version: "1"
                }];
            setProjectsData(prev => ({
              ...prev,
              [newName]: copied
            }));
              if (!allProjectIds.includes(newName)) {
                allProjectIds.push(newName);
              }
              setCurrentProjectId(newName);
              document.body.removeChild(modal);
            };

            buttonRow.appendChild(cancelBtn);
            buttonRow.appendChild(confirmBtn);
            dialog.appendChild(buttonRow);
            modal.appendChild(dialog);
            document.body.appendChild(modal);
          }}
        >
          + New Project
        </button>
        <label style={{ fontWeight: 600, marginLeft: 16 }}>Filter by Designer:</label>
        <select
          value={designerFilter}
          onChange={(e) => setDesignerFilter(e.target.value)}
        >
          <option value="">All</option>
          {allDesigners.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: "12px", alignItems: "center" }}>
        <button
          onClick={() => {
            try {
              if (projectsData && currentProjectId && exportCSV) {
                const dataToExport = projectsData[currentProjectId] || [];
                if (dataToExport.length === 0) {
                  alert("No data to export.");
                  return;
                }
                const csv = Papa.unparse(dataToExport, {
                  columns: [
                    "ipName",
                    "designer",
                    "schematicFreeze",
                    "lvsClean",
                    "plannedMandays"
                  ]
                });
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.setAttribute("download", `${currentProjectId}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                alert("Exported CSV successfully!");
              } else {
                alert("Export failed: Missing project data or ID.");
              }
            } catch (error) {
              console.error("Export CSV failed:", error);
              alert("An error occurred during export.");
            }
          }}
          style={{
            backgroundColor: "#10b981",
            color: "#fff",
            padding: "6px 12px",
            fontSize: "13px",
            borderRadius: 4,
            border: "none",
            cursor: "pointer"
          }}
        >
          Export CSV
        </button>
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files[0];
            if (file) {
              importCSV(file, (result) => {
                try {
                  let parsed = result?.data;
                  if (Array.isArray(parsed)) {
                    parsed = parsed.filter(row => typeof row === "object" && row !== null);
                  } else if (Array.isArray(result?.data?.data)) {
                    parsed = result.data.data.filter(row => typeof row === "object" && row !== null);
                  } else {
                    throw new Error("CSV data is not an array");
                  }

                  const cleaned = parsed.map((item) => ({
                    ipName: typeof item.ipName === "string" ? item.ipName.trim() : (typeof item.ip_name === "string" ? item.ip_name.trim() : ""),
                    designer: typeof item.designer === "string" ? item.designer.trim() : "",
                    schematicFreeze: typeof item.schematicFreeze === "string"
                      ? item.schematicFreeze.trim()
                      : (typeof item.schematic_freeze === "string" ? item.schematic_freeze.trim() : ""),
                    lvsClean: typeof item.lvsClean === "string"
                      ? item.lvsClean.trim()
                      : (typeof item.lvs_clean === "string" ? item.lvs_clean.trim() : ""),
                    plannedMandays: "",
                    layoutClosed: false,
                    lastModified: "",
                    modifiedBy: "",
                    version: "1"
                  }));

                  setProjectsData(prev => ({
                    ...prev,
                    [currentProjectId]: cleaned
                  }));
                } catch (e) {
                  alert("Failed to import CSV: " + e.message);
                  console.error("CSV import error:", e);
                }
              });
            }
          }}
        />
        <button
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          style={{
            backgroundColor: "#3b82f6",
            color: "#fff",
            padding: "6px 12px",
            fontSize: "13px",
            borderRadius: 4,
            border: "none",
            cursor: "pointer"
          }}
        >
          Import CSV
        </button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", minWidth: "1000px" }}>
        <thead>
          <tr>
            <th style={{ minWidth: "160px", maxWidth: "160px", textAlign: "center" }} onClick={() => handleSort("ipName")}>IP Name</th>
            <th style={{ minWidth: "160px", maxWidth: "160px", textAlign: "center" }} onClick={() => handleSort("designer")}>Designer</th>
            <th style={{ minWidth: "160px", maxWidth: "160px", textAlign: "center" }} onClick={() => handleSort("schematicFreeze")}>Schematic Freeze</th>
            <th style={{ minWidth: "160px", maxWidth: "160px", textAlign: "center" }} onClick={() => handleSort("lvsClean")}>LVS Clean</th>
            <th style={{ minWidth: "60px", maxWidth: "60px", textAlign: "center" }} onClick={() => handleSort("plannedMandays")}>Mandays</th>
            <th style={{ minWidth: "240px", maxWidth: "240px", fontSize: "13px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedData
            .filter(item => (!designerFilter || item.designer === designerFilter))
            .map((item, index) => {
              // Ensure camelCase usage for all fields
              // (Assume all data is already camelCase from backend)
              const today = new Date();
              // Always use camelCase keys; fallback for legacy keys if present
              const schematicFreeze = item.schematicFreeze ?? item.schematic_freeze;
              const lvsClean = item.lvsClean ?? item.lvs_clean;
              const ipName = item.ipName ?? item.ip_name;
              const layoutClosed = item.layoutClosed ?? item.layout_closed;
              const schematicDate = schematicFreeze ? new Date(schematicFreeze) : null;
              const lvsDate = lvsClean ? new Date(lvsClean) : null;
              let backgroundColor = "#fff";
              if (
                schematicDate &&
                (today - schematicDate) >= 0 &&
                (today - schematicDate) < 3 * 24 * 60 * 60 * 1000
              ) {
                backgroundColor = "#fef3c7"; // 3天內橘黃色
              } else if (schematicDate && schematicDate < today) {
                backgroundColor = "#fecaca"; // 已超過schematic，紅色
              } else if (lvsDate && lvsDate < today) {
                backgroundColor = "#fde68a"; // 已超過lvs，黃色
              }
              const rowBackgroundColor = layoutClosed ? "#d1d5db" : backgroundColor;
              const rowTextDecoration = layoutClosed ? "line-through" : "none";
              const hasMissingFields = !ipName || !item.designer || !schematicFreeze || !lvsClean;
              const hasDateError = schematicFreeze && lvsClean &&
                new Date(lvsClean) < new Date(schematicFreeze);
              const calcBusinessDays = (startDate, endDate) => {
                let count = 0;
                const cur = new Date(startDate);
                while (cur <= endDate) {
                  const day = cur.getDay();
                  if (day !== 0 && day !== 6) count++;
                  cur.setDate(cur.getDate() + 1);
                }
                return count;
              };
              const mandays = schematicFreeze && lvsClean
                ? calcBusinessDays(new Date(schematicFreeze), new Date(lvsClean))
                : "";
              const getButtonTextDecoration = (btnLabel) =>
                layoutClosed && btnLabel !== "Open" ? "line-through" : "none";
              return (
                <React.Fragment key={index}>
                  <tr style={{ backgroundColor: rowBackgroundColor }}>
                    <td
                      style={{
                        padding: "6px 8px",
                        minWidth: "160px",
                        maxWidth: "160px",
                        textAlign: "center",
                        textDecoration: rowTextDecoration,
                      }}
                    >
                      <input
                        list={`ip-options-${index}`}
                        value={ipName ?? ""}
                        onChange={(e) => {
                          const newData = [...data];
                          newData[index].ipName = e.target.value;
                          setProjectsData(prev => ({
                            ...prev,
                            [currentProjectId]: newData
                          }));
                        }}
                        onBlur={(e) => {
                          const newData = [...data];
                          newData[index].ipName = e.target.value;
                          setProjectsData(prev => ({
                            ...prev,
                            [currentProjectId]: newData
                          }));
                        }}
                        style={{
                          padding: "6px",
                          width: "100%",
                          textAlign: "center",
                          textDecoration: rowTextDecoration,
                          border: "1px solid",
                          borderColor: hasMissingFields && !ipName ? "red" : "#ccc",
                          borderRadius: "4px",
                          backgroundColor: "#fff",
                          cursor: "text",
                          transition: "background-color 0.2s ease",
                        }}
                        title={hasMissingFields && !ipName ? "IP Name is required" : ""}
                      />
                      <datalist id={`ip-options-${index}`}>
                        {[...new Set(data.map(d => d.ipName ?? d.ip_name).filter(Boolean))].map(name => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        minWidth: "160px",
                        maxWidth: "160px",
                        textAlign: "center",
                        textDecoration: rowTextDecoration,
                      }}
                    >
                      <input
                        list={`designer-options-${index}`}
                        value={item.designer ?? ""}
                        onChange={(e) => {
                          const newData = [...data];
                          newData[index].designer = e.target.value;
                          setProjectsData(prev => ({
                            ...prev,
                            [currentProjectId]: newData
                          }));
                        }}
                        onBlur={(e) => {
                          const newData = [...data];
                          newData[index].designer = e.target.value;
                          setProjectsData(prev => ({
                            ...prev,
                            [currentProjectId]: newData
                          }));
                        }}
                        style={{
                          padding: "6px",
                          width: "100%",
                          textAlign: "center",
                          textDecoration: rowTextDecoration,
                          border: "1px solid",
                          borderColor: hasMissingFields && !item.designer ? "red" : "#ccc",
                          borderRadius: "4px",
                          backgroundColor: "#fff",
                          cursor: "text",
                          transition: "background-color 0.2s ease",
                        }}
                        title={hasMissingFields && !item.designer ? "Designer is required" : ""}
                      />
                      <datalist id={`designer-options-${index}`}>
                        {[...new Set(data.map(d => d.designer).filter(Boolean))].map(name => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        minWidth: "160px",
                        maxWidth: "160px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          padding: "6px",
                          border: "1px solid",
                          borderColor: hasMissingFields && !item.schematicFreeze ? "red" : "#ccc",
                          borderRadius: "4px",
                          backgroundColor: "#fff",
                          cursor: "pointer",
                          transition: "background-color 0.2s ease",
                          textDecoration: item.layoutClosed ? "line-through" : "none",
                          width: "100%",
                          boxSizing: "border-box"
                        }}
                        title={hasMissingFields && !item.schematicFreeze ? "Schematic Freeze is required" : ""}
                      >
                        <DatePicker
                          selected={schematicFreeze ? new Date(schematicFreeze) : null}
                          onChange={(date) => {
                            const newData = [...data];
                            newData[index].schematicFreeze = date.toISOString().split("T")[0];
                            const start = new Date(newData[index].schematicFreeze);
                            const end = new Date(newData[index].lvsClean ?? newData[index].lvs_clean);
                            if (!isNaN(start) && !isNaN(end) && end >= start) {
                              let days = 0;
                              const cur = new Date(start);
                              while (cur <= end) {
                                const day = cur.getDay();
                                if (day !== 0 && day !== 6) days++;
                                cur.setDate(cur.getDate() + 1);
                              }
                              newData[index].plannedMandays = days.toString();
                            }
                            setProjectsData(prev => ({
                              ...prev,
                              [currentProjectId]: newData
                            }));
                          }}
                          wrapperClassName="date-picker-wrapper"
                          popperPlacement="bottom"
                          dateFormat="yyyy-MM-dd"
                          style={{
                            width: "100%",
                            textAlign: "center"
                          }}
                          disabled={false}
                        />
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        minWidth: "160px",
                        maxWidth: "160px",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          padding: "6px",
                          border: "1px solid",
                          borderColor: hasDateError ? "red" : (hasMissingFields && !item.lvsClean ? "red" : "#ccc"),
                          borderRadius: "4px",
                          backgroundColor: "#fff",
                          cursor: "pointer",
                          transition: "background-color 0.2s ease",
                          textDecoration: item.layoutClosed ? "line-through" : "none",
                          width: "100%",
                          boxSizing: "border-box"
                        }}
                        title={
                          hasDateError
                            ? "LVS Clean must be later than Schematic Freeze"
                            : (hasMissingFields && !item.lvsClean ? "LVS Clean is required" : "")
                        }
                      >
                        <DatePicker
                          selected={lvsClean ? new Date(lvsClean) : null}
                          onChange={(date) => {
                            const newData = [...data];
                            newData[index].lvsClean = date.toISOString().split("T")[0];
                            const start = new Date(newData[index].schematicFreeze ?? newData[index].schematic_freeze);
                            const end = new Date(newData[index].lvsClean);
                            if (!isNaN(start) && !isNaN(end) && end >= start) {
                              let days = 0;
                              const cur = new Date(start);
                              while (cur <= end) {
                                const day = cur.getDay();
                                if (day !== 0 && day !== 6) days++;
                                cur.setDate(cur.getDate() + 1);
                              }
                              newData[index].plannedMandays = days.toString();
                            }
                            setProjectsData(prev => ({
                              ...prev,
                              [currentProjectId]: newData
                            }));
                          }}
                          wrapperClassName="date-picker-wrapper"
                          popperPlacement="bottom"
                          dateFormat="yyyy-MM-dd"
                          style={{
                            width: "100%",
                            textAlign: "center"
                          }}
                          disabled={false}
                        />
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "6px 8px",
                        minWidth: "60px",
                        maxWidth: "60px",
                        textAlign: "center",
                        textDecoration: rowTextDecoration,
                      }}
                    >
                      <input
                        value={mandays}
                        readOnly
                        style={{
                          padding: "6px",
                          width: "100%",
                          minWidth: "60px",
                          maxWidth: "60px",
                          textAlign: "center",
                          textDecoration: rowTextDecoration,
                          backgroundColor: rowBackgroundColor
                        }}
                      />
                    </td>
                    <td
                      style={{
                        backgroundColor: rowBackgroundColor,
                        padding: "6px 0",
                        boxSizing: "border-box",
                        textAlign: "center",
                        verticalAlign: "middle",
                        minWidth: "240px",
                        maxWidth: "240px",
                        fontSize: "13px"
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          flexWrap: "nowrap",
                          gap: "4px",
                          padding: "0 6px",
                          boxSizing: "border-box"
                        }}
                      >
                        <button
                          onClick={() => handleCopy(index)}
                          disabled={false}
                          style={{
                            backgroundColor: "#6366f1",
                            color: "#fff",
                            padding: "4px 8px",
                            fontSize: "13px",
                            borderRadius: 4,
                            border: "none",
                            fontWeight: 600,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            textDecoration: getButtonTextDecoration("Copy"),
                            cursor: "pointer"
                          }}
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => handleDelete(index)}
                          disabled={false}
                          style={{
                            backgroundColor: "#ef4444",
                            color: "#fff",
                            padding: "4px 8px",
                            fontSize: "13px",
                            borderRadius: 4,
                            border: "none",
                            fontWeight: 600,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            textDecoration: getButtonTextDecoration("Delete"),
                            cursor: "pointer"
                          }}
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => {
                            const newData = [...data];
                            newData[index].layoutClosed = true;
                            setProjectsData(prev => ({
                              ...prev,
                              [currentProjectId]: newData
                            }));
                          }}
                          disabled={layoutClosed}
                          style={{
                            backgroundColor: "#f97316",
                            color: "#fff",
                            padding: "4px 8px",
                            fontSize: "13px",
                            borderRadius: 4,
                            border: "none",
                            fontWeight: 600,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            cursor: item.layoutClosed ? "not-allowed" : "pointer",
                            textDecoration: getButtonTextDecoration("Close")
                          }}
                        >
                          Close
                        </button>
                        <button
                          onClick={() => {
                            const newData = [...data];
                            newData[index].layoutClosed = false;
                            setProjectsData(prev => ({
                              ...prev,
                              [currentProjectId]: newData
                            }));
                          }}
                          disabled={!layoutClosed}
                          style={{
                            backgroundColor: layoutClosed ? "#3b82f6" : "#d1d5db",
                            color: "#fff",
                            padding: "4px 8px",
                            fontSize: "13px",
                            borderRadius: 4,
                            border: "none",
                            fontWeight: 600,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                            cursor: layoutClosed ? "pointer" : "not-allowed",
                            textDecoration: getButtonTextDecoration("Open")
                          }}
                        >
                          Open
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Version info row removed */}
                </React.Fragment>
              );
            })}
          {sortedData.filter(item => (!designerFilter || item.designer === designerFilter)).length === 0 && (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", padding: "12px", color: "#888" }}>
                No records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
