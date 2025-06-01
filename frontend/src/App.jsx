import React, { useState, useRef, useEffect } from "react";
import './index.css';
import { calculateMandays, calculateEndDate, getRandomDate } from './utils/dateUtils';
import { getISOWeek, projectBarInfo, dailyWorkloads } from './utils/ganttUtils';
import { exportCSV } from './utils/csvUtils';
import { calculateStatus } from "./utils/statusUtils";
import Papa from "papaparse";
import { API_BASE_URL } from './config';

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
  const [currentUser, setCurrentUser] = useState("");
  const [showNewProjectAlert, setShowNewProjectAlert] = useState(false);
  const [currentTab, setCurrentTab] = useState("Designer");
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
  const [allProjectIds, setAllProjectIds] = useState(["PJT-2025-Alpha"]);

  const [allDesigners, setAllDesigners] = useState([]);
  const [allLayoutOwners, setAllLayoutOwners] = useState([]);

  // 初始化數據加載
  useEffect(() => {
    const initializeData = async () => {
      try {
        // 獲取所有項目數據
        const response = await fetch(`${API_BASE_URL}/layouts`);
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }
        const result = await response.json();
        
        if (!result.success) {
          throw new Error('Failed to fetch initial data');
        }

        // 設置項目數據
        const projectData = result.updatedProjectData || {};
        setProjectsData(projectData);

        // 更新項目ID列表
        const projectIds = Object.keys(projectData);
        if (projectIds.length > 0) {
          setAllProjectIds(projectIds);
          setCurrentProjectId(projectIds[0]);
        }

        // 從所有項目數據中提取設計師和佈局負責人列表
        const designers = new Set();
        const layoutOwners = new Set();

        Object.values(projectData).forEach(items => {
          items.forEach(item => {
            if (item.designer) designers.add(item.designer);
            if (item.layoutOwner) layoutOwners.add(item.layoutOwner);
          });
        });

        const designersList = Array.from(designers);
        const layoutOwnersList = Array.from(layoutOwners);

        setAllDesigners(designersList);
        setAllLayoutOwners(layoutOwnersList);

        // 設置當前用戶（如果未設置）
        if (!currentUser && layoutOwnersList.length > 0) {
          setCurrentUser(layoutOwnersList[0]);
        }

      } catch (err) {
        console.error('Error initializing data:', err);
        alert(`初始化數據失敗: ${err.message}`);
      }
    };

    initializeData();
  }, []);

  // 刷新數據的函數
  const refreshData = async () => {
    try {
      // 獲取所有項目的最新數據
      const projectIds = Object.keys(projectsData);
      for (const projectId of projectIds) {
        const response = await fetch(`${API_BASE_URL}/layouts/${projectId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch data for project ${projectId}`);
        }
        const result = await response.json();
        if (!result.success) {
          throw new Error(`Invalid response for project ${projectId}`);
        }
        
        // 更新項目數據
        setProjectsData(prev => ({
          ...prev,
          [projectId]: result.updatedProjectData || []
        }));

        // 更新用戶列表
        const designers = new Set();
        const layoutOwners = new Set();
        result.updatedProjectData.forEach(item => {
          if (item.designer) designers.add(item.designer);
          if (item.layoutOwner) layoutOwners.add(item.layoutOwner);
        });

        setAllDesigners(prev => Array.from(new Set([...prev, ...designers])));
        setAllLayoutOwners(prev => Array.from(new Set([...prev, ...layoutOwners])));
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
      alert(`刷新數據失敗: ${err.message}`);
    }
  };

  return (
    <>
      <div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <label style={{ marginRight: "8px" }}>Logged in as:</label>
              <select
                value={currentUser}
                onChange={(e) => setCurrentUser(e.target.value)}
                style={{
                  padding: "4px 8px",
                  borderRadius: "4px",
                  border: "1px solid #d1d5db"
                }}
              >
                {allLayoutOwners.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>
            <div style={{ color: "#666" }}>
              Current Time: {now}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            {["Designer", "Layout Leader", "Layout", "Gantt"].map(tab => (
              <button
                key={tab}
                onClick={() => setCurrentTab(tab)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: currentTab === tab ? "#4ade80" : "#e5e7eb",
                  color: currentTab === tab ? "white" : "black",
                  cursor: "pointer",
                  fontWeight: currentTab === tab ? "600" : "normal"
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {currentTab === "Designer" && (
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
            refreshData={refreshData}
          />
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
            currentUser={currentUser}
            refreshData={refreshData}
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
            currentProjectId={currentProjectId}
            refreshData={refreshData}
          />
        )}
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