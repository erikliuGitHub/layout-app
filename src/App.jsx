import React, { useState, useRef, useEffect } from "react";
import './index.css';
import { calculateMandays, calculateEndDate, getRandomDate } from './utils/dateUtils';
import { getISOWeek, projectBarInfo, dailyWorkloads } from './utils/ganttUtils';
import { exportCSV } from './utils/csvUtils';
import { calculateStatus } from "./utils/statusUtils";
import Papa from "papaparse";
const importCSV = (file, callback) => {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      try {
        if (!Array.isArray(results.data)) {
          throw new Error("Parsed data is not an array");
        }
        callback(results);
      } catch (e) {
        console.error("CSV import failed:", e);
        alert("CSV parsing failed: " + e.message);
      }
    },
    error: (err) => {
      console.error("CSV parsing error:", err);
      alert("Error parsing CSV: " + err.message);
    },
  });
};
import DesignerTab from "./components/DesignerTab";
import LayoutLeaderTab from "./components/LayoutLeaderTab";
import LayoutTab from "./components/LayoutTab";
import GanttChart from "./components/GanttChart";


export default function App() {
  const now = new Date().toLocaleString();

  const [projectsData, setProjectsData] = useState({});
  const [currentProjectId, setCurrentProjectId] = useState("PJT-2025-Alpha");
  const [currentUser, setCurrentUser] = useState("Designer_1");
  const [showNewProjectAlert, setShowNewProjectAlert] = useState(false);
  const [currentTab, setCurrentTab] = useState("Designer");
  // Tab state and handlers for modular components
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [layoutLeaderSortConfig, setLayoutLeaderSortConfig] = useState({ key: null, direction: "asc" });
  const [layoutSortConfig, setLayoutSortConfig] = useState({ key: null, direction: "asc" });
  const [designerFilter, setDesignerFilter] = useState("");
  const [layoutOwnerFilter, setLayoutOwnerFilter] = useState("");
  const [ganttDesignerFilter, setGanttDesignerFilter] = useState("");
  const [ganttLayoutOwnerFilter, setGanttLayoutOwnerFilter] = useState("");
  const [ganttProjectFilter, setGanttProjectFilter] = useState("");
  const fileInputRef = useRef(null);
  const data = projectsData[currentProjectId] || [];

  const [projectFilterId, setProjectFilterId] = useState("PJT-2025-Alpha");
  const [allProjectIds, setAllProjectIds] = useState([]);

  const [allDesigners, setAllDesigners] = useState([]);
  const [allLayoutOwners, setAllLayoutOwners] = useState([]);

useEffect(() => {
  // Fetch projects data from backend API
  fetch('/api/layouts')
    .then(response => response.json())
    .then(data => {
      console.log("Fetched grouped data from API:", data);  // 加入 log
      // Initialize status and plannedMandays for each project and row
      const dataWithStatus = {};
      for (const [projectId, rows] of Object.entries(data)) {
        dataWithStatus[projectId] = rows.map(row => ({
          ...row,
          status: calculateStatus(row),
          plannedMandays:
            row.schematicFreeze && row.lvsClean
              ? calculateMandays(row.schematicFreeze, row.lvsClean)
              : row.plannedMandays || "" // 防止 undefined
        }));
      }
      setProjectsData(dataWithStatus);
      setAllProjectIds(Object.keys(dataWithStatus));
      const allRows = Object.values(dataWithStatus).flat();
      const designersSet = new Set(allRows.map(d => d.designer).filter(Boolean));
      const layoutOwnersSet = new Set(allRows.map(d => d.layoutOwner).filter(Boolean));
      setAllDesigners(Array.from(designersSet));
      setAllLayoutOwners(Array.from(layoutOwnersSet));
    })
    .catch(error => {
      console.error("Failed to fetch projects data:", error);
    });
}, []);

  // === TOP NAV BAR and Tabs ===
  // Debugging: preview projectsData for LayoutTab
  console.log("App - projectsData preview for LayoutTab:", projectsData);
  return (
    <>
    <div style={{ fontFamily: "sans-serif", background: "#f7fafc", minHeight: "100vh", fontSize: "16px", padding: "0 12px" }}>
      <div style={{
        position: "sticky", top: 0, zIndex: 999,
        background: "#1f2937", borderBottom: "1px solid #e5e7eb", padding: "10px 0",
        textAlign: "left", fontWeight: 600, fontSize: "24px", color: "#f9fafb", letterSpacing: "0.05em"
      }}>
        Layout Resource Plan System
      </div>
      <div style={{ height: 48 }} />
      <div style={{
        width: "100%",
        padding: "8px 12px",
        margin: 0,
        boxSizing: "border-box"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 14, color: "#555", display: "flex", alignItems: "center", gap: 8 }}>
            Logged in as:
            <select
              value={currentUser}
              onChange={(e) => setCurrentUser(e.target.value)}
              style={{ fontWeight: 700, color: "#2563eb", border: "1px solid #ccc", borderRadius: 4, padding: "2px 6px" }}
            >
              {(currentTab === "Designer" ? allDesigners : allLayoutOwners).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: 12, color: "#888" }}>
            Current Time: {now}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => setCurrentTab("Designer")}
            style={{
              fontSize: "14px",
              padding: "7px 14px",
              borderRadius: 6,
              fontWeight: 600,
              background: currentTab === "Designer" ? "#4f46e5" : "#c7d2fe",
              color: currentTab === "Designer" ? "#fff" : "#3730a3",
              border: "none",
              transition: "transform 0.07s",
              cursor: "pointer"
            }}
            onMouseOver={e => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
          >
            Designer
          </button>
          <button
            onClick={() => setCurrentTab("Layout Leader")}
            style={{
              fontSize: "14px",
              padding: "7px 14px",
              borderRadius: 6,
              fontWeight: 600,
              background: currentTab === "Layout Leader" ? "#0284c7" : "#bae6fd",
              color: currentTab === "Layout Leader" ? "#fff" : "#0369a1",
              border: "none",
              transition: "transform 0.07s",
              cursor: "pointer"
            }}
            onMouseOver={e => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
          >
            Layout Leader
          </button>
          <button
            onClick={() => setCurrentTab("Layout")}
            style={{
              fontSize: "14px",
              padding: "7px 14px",
              borderRadius: 6,
              fontWeight: 600,
              background: currentTab === "Layout" ? "#059669" : "#bbf7d0",
              color: currentTab === "Layout" ? "#fff" : "#065f46",
              border: "none",
              transition: "transform 0.07s",
              cursor: "pointer"
            }}
            onMouseOver={e => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
          >
            Layout
          </button>
          <button
            onClick={() => setCurrentTab("Gantt")}
            style={{
              fontSize: "14px",
              padding: "7px 14px",
              borderRadius: 6,
              fontWeight: 600,
              background: currentTab === "Gantt" ? "#7c3aed" : "#ddd6fe",
              color: currentTab === "Gantt" ? "#fff" : "#5b21b6",
              border: "none",
              transition: "transform 0.07s",
              cursor: "pointer"
            }}
          >
            Gantt
          </button>
        </div>

        {currentTab === "Designer" && (
          <>
            <DesignerTab
              projectsData={projectsData}
              setProjectsData={setProjectsData}
              currentProjectId={currentProjectId}
              setCurrentProjectId={setCurrentProjectId}
              showNewProjectAlert={showNewProjectAlert}
              setShowNewProjectAlert={setShowNewProjectAlert}
              sortConfig={sortConfig}
              setSortConfig={setSortConfig}
              designerFilter={designerFilter}
              setDesignerFilter={setDesignerFilter}
              allDesigners={allDesigners}
              fileInputRef={fileInputRef}
              exportCSV={exportCSV}
              importCSV={importCSV}
              projectFilterId={projectFilterId}
              setProjectFilterId={setProjectFilterId}
              allProjectIds={allProjectIds}
              setAllProjectIds={setAllProjectIds}
              currentUser={currentUser}
            />
          </>
        )}
        {currentTab === "Layout Leader" && (
          <LayoutLeaderTab
            projectsData={projectsData}
            setProjectsData={setProjectsData}
            currentProjectId={currentProjectId}
            setCurrentProjectId={setCurrentProjectId}
            allLayoutOwners={allLayoutOwners}
            layoutOwnerFilter={layoutOwnerFilter}
            setLayoutOwnerFilter={setLayoutOwnerFilter}
            layoutLeaderSortConfig={layoutLeaderSortConfig}
            setLayoutLeaderSortConfig={setLayoutLeaderSortConfig}
          />
        )}
        {currentTab === "Layout" && (
          <div style={{ overflowX: "auto", width: "100%" }}>
            <LayoutTab
              projectsData={projectsData}
              setProjectsData={setProjectsData}
              currentUser={currentUser}
              layoutSortConfig={layoutSortConfig}
              setLayoutSortConfig={setLayoutSortConfig}
              layoutLeaderSortConfig={layoutLeaderSortConfig}
              setLayoutLeaderSortConfig={setLayoutLeaderSortConfig}
              projectFilterId={projectFilterId}
              currentProjectId={currentProjectId}
            />
          </div>
        )}
      </div>
      {currentTab === "Gantt" && (
        <GanttChart
          projectsData={projectsData}
          ganttDesignerFilter={ganttDesignerFilter}
          setGanttDesignerFilter={setGanttDesignerFilter}
          ganttLayoutOwnerFilter={ganttLayoutOwnerFilter}
          setGanttLayoutOwnerFilter={setGanttLayoutOwnerFilter}
          ganttProjectFilter={ganttProjectFilter}
          setGanttProjectFilter={setGanttProjectFilter}
        />
      )}
    </div>
  </>
  );
}