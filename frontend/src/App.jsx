import React, { useState, useRef, useEffect, useContext } from "react";
import './index.css';
import { calculateMandays, calculateEndDate, getRandomDate } from './utils/dateUtils';
import { getISOWeek, projectBarInfo, dailyWorkloads } from './utils/ganttUtils';
import { exportCSV } from './utils/csvUtils';
import { calculateStatus } from "./utils/statusUtils";
import Papa from "papaparse";
import { API_BASE_URL } from './config';
import { AuthContext } from './contexts/AuthContext';
import Login from './components/Login';

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
  const { user, logout } = useContext(AuthContext);
  const now = new Date().toLocaleString();

  const [projectsData, setProjectsData] = useState({});
  const [currentProjectId, setCurrentProjectId] = useState("PJT-2025-Alpha");
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

  // Initialize data loading
  useEffect(() => {
    if (!user) return;
    const initializeData = async () => {
      try {
        // Fetch all project data
        const response = await fetch(`${API_BASE_URL}/layouts`);
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }
        const result = await response.json();
        
        if (!result.success) {
          throw new Error('Failed to fetch initial data');
        }

        // Set project data
        const projectData = result.data || {};
        setProjectsData(projectData);

        // Update project ID list
        const projectIds = Object.keys(projectData);
        if (projectIds.length > 0) {
          setAllProjectIds(projectIds);
          setCurrentProjectId(projectIds[0]);
        }

        // Fetch user lists from database instead of extracting from project data
        try {
          const userResponse = await fetch(`${API_BASE_URL}/users/lists`);
          if (userResponse.ok) {
            const userResult = await userResponse.json();
            if (userResult.success) {
              console.log('User data loaded:', userResult.data.summary);
              setAllDesigners(userResult.data.designers);
              setAllLayoutOwners(userResult.data.layoutOwners);
            } else {
              console.warn('Failed to load user lists, falling back to project data extraction');
              // Fallback to old method if API fails
              const designers = new Set();
              const layoutOwners = new Set();

              Object.values(projectData).forEach(items => {
                items.forEach(item => {
                  if (item.designer) designers.add(item.designer);
                  if (item.layoutOwner) layoutOwners.add(item.layoutOwner);
                });
              });

              setAllDesigners(Array.from(designers));
              setAllLayoutOwners(Array.from(layoutOwners));
            }
          }
        } catch (userErr) {
          console.warn('Error loading user lists:', userErr);
          // Fallback to old method if API call fails
          const designers = new Set();
          const layoutOwners = new Set();

          Object.values(projectData).forEach(items => {
            items.forEach(item => {
              if (item.designer) designers.add(item.designer);
              if (item.layoutOwner) layoutOwners.add(item.layoutOwner);
            });
          });

          setAllDesigners(Array.from(designers));
          setAllLayoutOwners(Array.from(layoutOwners));
        }

      } catch (err) {
        console.error('Error initializing data:', err);
        alert(`Failed to initialize data: ${err.message}`);
      }
    };

    initializeData();
  }, [user]);

  // Function to refresh data
  const refreshData = async () => {
    try {
      // Fetch latest data for all projects
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
        
        // Update project data
        setProjectsData(prev => ({
          ...prev,
          [projectId]: result.data || []
        }));

        // Update user lists
        const designers = new Set();
        const layoutOwners = new Set();
        (result.data || []).forEach(item => {
          if (item.designer) designers.add(item.designer);
          if (item.layoutOwner) layoutOwners.add(item.layoutOwner);
        });

        setAllDesigners(prev => Array.from(new Set([...prev, ...designers])));
        setAllLayoutOwners(prev => Array.from(new Set([...prev, ...layoutOwners])));
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
      alert(`Failed to refresh data: ${err.message}`);
    }
  };

  if (!user) {
    return <Login />;
  }

  const currentUser = user.pernr;

  return (
    <>
      <div className="header-bar">
        <img src="/assets/logo-lrps.png" alt="LRPS Logo" className="header-logo" />
        <div>
          <div className="header-title">LRPS</div>
          <div className="header-subtitle">Layout Resource Plan System</div>
        </div>
      </div>
      <div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <label style={{ marginRight: "8px" }}>Logged in as:</label>
              <span className="font-semibold">{user.pernr} {user.EMP_NAME}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div style={{ color: "#666", marginRight: "16px" }}>
                Current Time: {now}
              </div>
              <button onClick={logout} className="logout-button">Logout</button>
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