import React, { useState, useEffect } from "react";
// Set API base URL from env or fallback
const API_BASE_URL = 'http://localhost:3001/api';
console.log("API Base URL:", API_BASE_URL);
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
  refreshData
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const data = Array.isArray(projectsData?.[currentProjectId]) ? projectsData[currentProjectId] : [];

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Always use latest projectsData for sortedData, and recalc status on each render
  const sortedData = React.useMemo(() => {
    // Always use up-to-date data from projectsData for currentProjectId
    const dataSource = Array.isArray(projectsData?.[currentProjectId]) ? projectsData[currentProjectId] : [];
    
    // 計算工作日的函數
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

    // Add status and plannedMandays
    const enriched = dataSource.map(item => {
      const schematicDate = item.schematicFreeze ? new Date(item.schematicFreeze) : null;
      const lvsCleanDate = item.lvsClean ? new Date(item.lvsClean) : null;
      const today = new Date();
      const mandays = schematicDate && lvsCleanDate ? calcBusinessDays(schematicDate, lvsCleanDate) : "";
      return {
        ...item,
        status: calculateStatus(item),
        plannedMandays: mandays
      };
    });
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

  const handleCopy = (index) => {
    try {
      console.log('DesignerTab - Starting copy operation for index:', index);
      
      if (!sortedData || !sortedData[index]) {
        throw new Error('Invalid data or index');
      }

      // Deep copy and reset versioning info
      const { status, ...itemWithoutStatus } = sortedData[index];
      const copiedItem = {
        ...itemWithoutStatus,
        lastModified: new Date().toISOString(),
        modifiedBy: currentUser,
        version: "1"
      };

      const newData = [...projectsData[currentProjectId] || []];
      newData.splice(index + 1, 0, copiedItem);

      // Only update frontend state
      setProjectsData(prev => ({
        ...prev,
        [currentProjectId]: newData
      }));

      console.log('Item copied in frontend state');

    } catch (err) {
      console.error('Error copying item:', err);
      alert(`Failed to copy item: ${err.message}`);
    }
  };

  const handleSubmit = async () => {
    try {
      const dataSource = Array.isArray(projectsData?.[currentProjectId]) ? projectsData[currentProjectId] : [];
      
      // Fetch latest data from the server
      const latestResponse = await fetch(`${API_BASE_URL}/layouts/${currentProjectId}`);
      if (!latestResponse.ok) {
        throw new Error(`Failed to fetch latest data from server. Status: ${latestResponse.status}`);
      }
      const latestResult = await latestResponse.json();
      
      if (!latestResult.success || !Array.isArray(latestResult.updatedProjectData)) {
        throw new Error("Invalid response from server");
      }

      const latestData = latestResult.updatedProjectData;

      // Version check and data preparation
      const updatedData = dataSource.map(localItem => {
        const { status, layoutLeaderSchematicFreeze, layoutLeaderLvsClean, ...itemWithoutStatus } = localItem;
        
        if (!itemWithoutStatus.ipName) {
          throw new Error("Local item missing ipName");
        }

        const latestItem = latestData.find(item => item.ipName === itemWithoutStatus.ipName);
        
        // If this is a new item (e.g., from copy), don't do version check
        if (latestItem && localItem.version !== latestItem.version) {
          throw new Error(`Version conflict for ${itemWithoutStatus.ipName}. Please refresh and try again.`);
        }

        return {
          ...itemWithoutStatus,
          modifiedBy: currentUser,
          lastModified: new Date().toISOString()
        };
      });

      // Submit updates
      const response = await fetch(`${API_BASE_URL}/layouts/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: currentProjectId,
          data: updatedData,
          userId: currentUser,
          role: 'designer' // 添加角色標識
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to submit updates');
      }

      // Update frontend state with server response
      setProjectsData(prev => ({
        ...prev,
        [currentProjectId]: result.updatedProjectData || []
      }));

      // Refresh data across all tabs
      await refreshData();

      alert("Changes submitted successfully!");

    } catch (err) {
      console.error('Error submitting changes:', err);
      alert(err.message);
    }
  };

  const handleDelete = async (index) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newData = [...data];
      newData.splice(index, 1);

      // 發送更新到後端
      const response = await fetch(`${API_BASE_URL}/layouts/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: currentProjectId,
          data: newData
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete item');
      }

      // 更新前端狀態
      setProjectsData(prev => ({
        ...prev,
        [currentProjectId]: newData
      }));

    } catch (err) {
      console.error('Error deleting item:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch project data when currentProjectId changes
  useEffect(() => {
    if (!currentProjectId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/layouts/${encodeURIComponent(currentProjectId)}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error ${response.status}: ${errorText}`);
        }

        const result = await response.json();

        if (!result.success || !Array.isArray(result.updatedProjectData)) {
          throw new Error(result.message || 'Invalid data structure');
        }

        setProjectsData(prev => ({
          ...prev,
          [currentProjectId]: result.updatedProjectData
        }));

      } catch (err) {
        console.error('Error fetching project data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentProjectId]);

  const handleStatusUpdate = async (index, isClosing) => {
    try {
      // 先更新前端狀態
      const newData = [...data];
      newData[index] = { 
        ...newData[index], 
        layoutClosed: isClosing,
        lastModified: new Date().toISOString(),
        modifiedBy: currentUser
      };
      
      // 更新前端顯示
      setProjectsData(prev => ({
        ...prev,
        [currentProjectId]: newData
      }));

      // 提交到後端
      const response = await fetch(`${API_BASE_URL}/layouts/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: currentProjectId,
          data: newData,
          userId: currentUser
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update status');
      }

      // 更新前端狀態為後端返回的數據
      setProjectsData(prev => ({
        ...prev,
        [currentProjectId]: result.updatedProjectData || []
      }));

      // 刷新所有分頁的數據
      if (typeof refreshData === 'function') {
        await refreshData();
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert(`Failed to update status: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 overflow-x-auto">
      {error && (
        <div className="mb-3 rounded bg-destructive/20 text-destructive px-3 py-2 text-sm">
          Error: {error}
        </div>
      )}
      {loading && (
        <div className="mb-3 rounded bg-primary/10 text-primary px-3 py-2 text-sm">
          Loading...
        </div>
      )}
      <div className="flex flex-nowrap items-center gap-4 mb-3">
        <label className="font-semibold">Project:</label>
        <select
          value={currentProjectId || ""}
          onChange={e => setCurrentProjectId(e.target.value)}
          className="px-2 py-1 rounded border border-border bg-card text-card-foreground"
        >
          {allProjectIds.map(pid => (
            <option key={pid} value={pid}>{pid}</option>
          ))}
        </select>
        <button
          className="px-2 py-1 text-sm font-semibold rounded bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => {
            const newName = prompt("Enter new project name:");
            if (newName && !projectsData[newName]) {
              setProjectsData(prev => ({
                ...prev,
                [newName]: [{
                  ipName: "",
                  designer: "",
                  schematicFreeze: "",
                  lvsClean: "",
                  plannedMandays: "",
                  layoutClosed: false,
                  lastModified: "",
                  modifiedBy: "",
                  version: "1"
                }]
              }));
              if (!allProjectIds.includes(newName)) {
                allProjectIds.push(newName);
              }
              setCurrentProjectId(newName);
            } else if (projectsData[newName]) {
              alert("Project name already exists!");
            }
          }}
        >
          + New Project
        </button>
        <label className="font-semibold">Filter by Designer:</label>
        <select
          value={designerFilter || ""}
          onChange={e => setDesignerFilter(e.target.value)}
          className="px-2 py-1 rounded border border-border bg-card text-card-foreground"
        >
          <option value="">All</option>
          {allDesigners.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <button
          onClick={() => {
            if (currentProjectId && projectsData?.[currentProjectId]) {
              exportCSV(currentProjectId, projectsData[currentProjectId]);
            }
          }}
          className="bg-emerald-500 text-white px-3 py-1 rounded text-sm font-semibold hover:bg-emerald-600"
        >
          Export CSV
        </button>
        <input
          type="file"
          accept=".csv"
          ref={fileInputRef}
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) {
              importCSV(file);
            }
          }}
        />
        <button
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          className="bg-blue-500 text-white px-3 py-1 rounded text-sm font-semibold hover:bg-blue-600"
        >
          Import CSV
        </button>
      </div>
      <div className="flex justify-end mb-2 mt-5">
        <button
          className="bg-destructive text-destructive-foreground px-4 py-2 text-base rounded font-bold hover:bg-destructive/80"
          onClick={handleSubmit}
        >
          Submit
        </button>
      </div>
      <table className="w-full border-collapse bg-card text-card-foreground">
        <thead>
          <tr>
            <th style={{ minWidth: "160px", maxWidth: "160px", textAlign: "center" }} onClick={() => handleSort("ipName")}>
              IP Name {sortConfig.key === "ipName" && (sortConfig.direction === "asc" ? "▲" : "▼")}
            </th>
            <th style={{ minWidth: "160px", maxWidth: "160px", textAlign: "center" }} onClick={() => handleSort("designer")}>
              Designer {sortConfig.key === "designer" && (sortConfig.direction === "asc" ? "▲" : "▼")}
            </th>
            <th style={{ minWidth: "160px", maxWidth: "160px", textAlign: "center" }} onClick={() => handleSort("schematicFreeze")}>
              Schematic Freeze {sortConfig.key === "schematicFreeze" && (sortConfig.direction === "asc" ? "▲" : "▼")}
            </th>
            <th style={{ minWidth: "160px", maxWidth: "160px", textAlign: "center" }} onClick={() => handleSort("lvsClean")}>
              LVS Clean {sortConfig.key === "lvsClean" && (sortConfig.direction === "asc" ? "▲" : "▼")}
            </th>
            <th style={{ minWidth: "60px", maxWidth: "60px", textAlign: "center" }} onClick={() => handleSort("plannedMandays")}>
              Mandays {sortConfig.key === "plannedMandays" && (sortConfig.direction === "asc" ? "▲" : "▼")}
            </th>
            <th style={{ minWidth: "100px", maxWidth: "100px", textAlign: "center" }} onClick={() => handleSort("status")}>
              Status {sortConfig.key === "status" && (sortConfig.direction === "asc" ? "▲" : "▼")}
            </th>
            <th style={{ minWidth: "240px", maxWidth: "240px", textAlign: "center" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedData.length > 0 ? (
            sortedData.map((item, idx) => {
              let rowClass = "";
              const status = calculateStatus(item);
              
              // 根據狀態設置整行背景色
              switch (status) {
                case "Closed":
                  rowClass = "bg-muted text-muted-foreground";
                  break;
                case "Unassigned":
                  rowClass = "bg-yellow-100";
                  break;
                case "Waiting for Freeze":
                  rowClass = "bg-blue-100";
                  break;
                case "In Progress":
                  rowClass = "bg-green-100";
                  break;
                case "Postim":
                  rowClass = "bg-red-100";
                  break;
                default:
                  rowClass = "";
              }

              return (
                <tr key={idx} className={rowClass}>
                  <td className="p-2 text-center">
                    <input
                      type="text"
                      value={item.ipName || ""}
                      onChange={(e) => {
                        const newData = [...data];
                        newData[idx] = { ...newData[idx], ipName: e.target.value };
                        setProjectsData(prev => ({
                          ...prev,
                          [currentProjectId]: newData
                        }));
                      }}
                      className={`w-full px-2 py-1 rounded border border-border bg-card text-card-foreground ${item.layoutClosed ? 'line-through' : ''}`}
                    />
                  </td>
                  <td className="p-2 text-center">
                    <select
                      value={item.designer || ""}
                      onChange={(e) => {
                        const newData = [...data];
                        newData[idx] = { ...newData[idx], designer: e.target.value };
                        setProjectsData(prev => ({
                          ...prev,
                          [currentProjectId]: newData
                        }));
                      }}
                      className={`w-full px-2 py-1 rounded border border-border bg-card text-card-foreground ${item.layoutClosed ? 'line-through' : ''}`}
                    >
                      <option value="">Select Designer</option>
                      {allDesigners.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 text-center">
                    <DatePicker
                      selected={item.schematicFreeze ? new Date(item.schematicFreeze) : null}
                      onChange={(date) => {
                        const newData = [...data];
                        newData[idx] = {
                          ...newData[idx],
                          schematicFreeze: date ? date.toISOString().split('T')[0] : null
                        };
                        setProjectsData(prev => ({
                          ...prev,
                          [currentProjectId]: newData
                        }));
                      }}
                      dateFormat="yyyy-MM-dd"
                      placeholderText="Select date"
                      customInput={
                        <input className={`w-full px-2 py-1 rounded border border-border bg-card text-card-foreground ${item.layoutClosed ? 'line-through' : ''}`} />
                      }
                    />
                  </td>
                  <td className="p-2 text-center">
                    <DatePicker
                      selected={item.lvsClean ? new Date(item.lvsClean) : null}
                      onChange={(date) => {
                        const newData = [...data];
                        newData[idx] = {
                          ...newData[idx],
                          lvsClean: date ? date.toISOString().split('T')[0] : null
                        };
                        setProjectsData(prev => ({
                          ...prev,
                          [currentProjectId]: newData
                        }));
                      }}
                      dateFormat="yyyy-MM-dd"
                      placeholderText="Select date"
                      customInput={
                        <input className={`w-full px-2 py-1 rounded border border-border bg-card text-card-foreground ${item.layoutClosed ? 'line-through' : ''}`} />
                      }
                    />
                  </td>
                  <td className="p-2 text-center">
                    <span className={item.layoutClosed ? 'line-through' : ''}>
                      {item.plannedMandays || "-"}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <span className={
                      status === "Unassigned" ? "text-yellow-800 px-2 py-1 rounded" :
                      status === "Waiting for Freeze" ? "text-blue-800 px-2 py-1 rounded" :
                      status === "In Progress" ? "text-green-800 px-2 py-1 rounded" :
                      status === "Postim" ? "text-red-800 px-2 py-1 rounded" :
                      ""
                    }>
                      {status}
                    </span>
                  </td>
                  <td className="p-2 text-center">
                    <div className="flex flex-col gap-2 min-w-[240px]">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleCopy(idx)}
                          className={`flex-1 px-3 py-1.5 bg-blue-500 text-white rounded-md text-xs font-medium transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${item.layoutClosed ? 'line-through' : ''}`}
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => handleDelete(idx)}
                          className={`flex-1 px-3 py-1.5 bg-red-500 text-white rounded-md text-xs font-medium transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${item.layoutClosed ? 'line-through' : ''}`}
                        >
                          Delete
                        </button>
                      </div>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleStatusUpdate(idx, true)}
                          disabled={item.layoutClosed}
                          className={`flex-1 px-3 py-1.5 text-white rounded-md text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${item.layoutClosed ? 'line-through' : ''} ${
                            item.layoutClosed 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-500'
                          }`}
                        >
                          Close
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(idx, false)}
                          disabled={!item.layoutClosed}
                          className={`flex-1 px-3 py-1.5 text-white rounded-md text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 no-underline ${
                            !item.layoutClosed 
                              ? 'bg-gray-400 cursor-not-allowed' 
                              : 'bg-green-500 hover:bg-green-600 focus:ring-green-500 shadow-md hover:shadow-lg transform hover:scale-105'
                          }`}
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="7" className="text-center p-3 text-gray-400 italic">No records found.</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="flex justify-center mt-4">
        <button
          className="bg-primary text-primary-foreground px-4 py-2 rounded font-semibold hover:bg-primary/90 shadow"
          onClick={() => {
            const newRow = {
              ipName: "",
              designer: "",
              schematicFreeze: "",
              lvsClean: "",
              plannedMandays: "",
              layoutClosed: false,
              lastModified: "",
              modifiedBy: "",
              version: "1"
            };
            setProjectsData(prev => ({
              ...prev,
              [currentProjectId]: [...(prev[currentProjectId] || []), newRow]
            }));
          }}
        >
          + 新增一行
        </button>
      </div>
    </div>
  );
}