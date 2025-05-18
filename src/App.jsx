import React, { useState, useRef, useEffect } from "react";
import './index.css';
import { calculateMandays, calculateEndDate, getRandomDate } from './utils/dateUtils';
import { getISOWeek, projectBarInfo, dailyWorkloads } from './utils/ganttUtils';
import { exportCSV } from './utils/csvUtils';
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

// Define large unique designers and layoutOwners arrays
const designers = [
  "Alice Chen", "Ben Lin", "Cindy Wang", "Daniel Wu", "Eva Liu", "Frank Huang",
  "Grace Lee", "Henry Zhang", "Irene Chou", "Jack Tsai", "Karen Sun", "Leo Ma",
  "Mia Tang", "Nathan Hsu", "Olivia Yeh", "Peter Kuo", "Queenie Ho", "Ryan Shih",
  "Sophie Lin", "Tony Cheng", "Una Huang", "Victor Lin", "Wendy Hsieh", "Xander Liu",
  "Yvonne Lin", "Zach Wang", "Amber Chang", "Brian Su", "Claire Yang", "Derek Pan",
  "Elise Fan", "Felix Tseng", "Gina Liao", "Howard Liu", "Isabel Wang", "Jason Lee",
  "Kelly Chen", "Louis Chou", "Maggie Hsu", "Neil Kao", "Opal Lin", "Paul Wu",
  "Queena Chu", "Rex Lee", "Sandy Chang", "Tommy Lin", "Ursula Ho", "Vincent Kuo",
  "Willa Su", "Xenia Lin"
];
const layoutOwners = [
  "Alex Wu", "Betty Lin", "Charles Tsai", "Diana Lee", "Ethan Chang", "Fiona Cheng",
  "George Wu", "Hannah Wang", "Ian Liao", "Jenny Kuo", "Kevin Lin", "Linda Huang",
  "Michael Chou", "Nina Pan", "Oscar Yang", "Peggy Hsieh", "Quinn Fan", "Rachel Tseng",
  "Sam Su", "Tina Wang", "Ulysses Chu", "Vera Liu", "Willie Ma", "Xiao Mei",
  "Yuki Lin", "Zoe Hsu", "Alan Chen", "Bella Liu", "Calvin Ho", "Debbie Sun",
  "Edward Lo", "Frida Yeh", "Gordon Kwan", "Helen Lin"
];

export default function App() {
  const now = new Date().toLocaleString();
  const analogIPs = [
    "ADC_Core", "DAC_Unit", "VCO_Block", "Bandgap_Ref", "OpAmp_Cell",
    "ChargePump", "TempSensor", "LDO_Regulator", "Comparator", "Filter_Block"
  ];
  // Dynamically extract all designers and layout owners from the initial project data

  function generateProjectData(offsetDays = 0, rotateLayout = 0, rotateDesigner = 0) {
    return Array.from({ length: 50 }, (_, i) => {
      const mid = Math.floor(i < 25 ? -1 : 1);
      const today = new Date();
      const pastStart = new Date();
      pastStart.setDate(pastStart.getDate() - 30 + offsetDays);
      const futureEnd = new Date();
      futureEnd.setDate(futureEnd.getDate() + 30 + offsetDays);
      const start = getRandomDate(
        mid < 0 ? pastStart : today,
        mid < 0 ? today : futureEnd
      );
      const mandays = Math.floor(Math.random() * (66 - 5 + 1)) + 5;
      // Use the large arrays for assignment
      const lo = i < 3 ? "" : layoutOwners[(i + rotateLayout) % layoutOwners.length];
      const ds = designers[(i + rotateDesigner) % designers.length];
      return {
        ipName: `${analogIPs[i % analogIPs.length]}_${i + 1}`,
        designer: ds,
        schematicFreeze: start,
        lvsClean: calculateEndDate(start, mandays),
        plannedMandays: mandays.toString(),
        layoutOwner: lo,
        weeklyWeights: [],
        status: ""
      };
    });
  }

  const rawProjectsData = {
    "PJT-2025-Alpha": generateProjectData(0, 0, 0),
    "PJT-2025-Beta": generateProjectData(20, 1, 2),
    "PJT-2025-Gamma": generateProjectData(40, 2, 4)
  };

  const initialProjectsData = Object.fromEntries(
    Object.entries(rawProjectsData).map(([projectId, rows]) => [
      projectId,
      rows.map(row => ({ ...row, projectId }))
    ])
  );

  const allDesigners = [...new Set(Object.values(initialProjectsData).flat().map(d => d.designer))].filter(Boolean);
  const allLayoutOwners = [...new Set(Object.values(initialProjectsData).flat().map(d => d.layoutOwner))].filter(Boolean);

  const [projectsData, setProjectsData] = useState(initialProjectsData);
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
  const [allProjectIds, setAllProjectIds] = useState(Object.keys(initialProjectsData));

  // === TOP NAV BAR and Tabs ===
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
          <LayoutTab
            projectsData={projectsData}
            setProjectsData={setProjectsData}
            currentUser={currentUser}
            layoutSortConfig={layoutSortConfig}
            setLayoutSortConfig={setLayoutSortConfig}
            layoutLeaderSortConfig={layoutLeaderSortConfig}
            setLayoutLeaderSortConfig={setLayoutLeaderSortConfig}
            projectFilterId={projectFilterId}
          />
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