import React, { useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { calculateStatus } from "../utils/statusUtils";
import { API_BASE_URL } from '../config';

const getRowStyle = (row) => {
  if (row.layoutClosed) return "bg-muted text-muted-foreground line-through"; // Completed
  if (row.status === "Unassigned") return "bg-yellow-100 hover:bg-yellow-200"; // Unassigned
  if (row.status === "Waiting for Freeze") return "bg-blue-100 hover:bg-blue-200"; // Waiting for Freeze
  if (row.status === "In Progress") return "bg-green-100 hover:bg-green-200"; // In Progress
  if (row.status === "Postim") return "bg-red-100 hover:bg-red-200"; // Postim
  return "bg-white hover:bg-gray-50"; // Default
};

const calculateMandaysFromDates = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return 0;
  }

  let workingDays = 0;
  let current = new Date(start);
  
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) { // 不計算週六日
      workingDays++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return workingDays;
};

// 添加一個通用的輸入框樣式類
const inputStyles = "w-full px-3 py-1.5 rounded-md border border-border bg-card text-card-foreground " +
  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 " +
  "disabled:opacity-50 disabled:cursor-not-allowed " +
  "transition-colors duration-200";

// 添加一個通用的選擇框樣式類
const selectStyles = "w-full px-3 py-1.5 rounded-md border border-border bg-card text-card-foreground " +
  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 " +
  "disabled:opacity-50 disabled:cursor-not-allowed " +
  "transition-colors duration-200";

const getDateDifference = (layoutDate, designerDate) => {
  if (!layoutDate || !designerDate) return null;
  const layout = new Date(layoutDate);
  const designer = new Date(designerDate);
  if (isNaN(layout.getTime()) || isNaN(designer.getTime())) return null;
  return Math.floor((layout - designer) / (1000 * 60 * 60 * 24));
};

const getDateStyle = (layoutDate, designerDate) => {
  const diff = getDateDifference(layoutDate, designerDate);
  if (diff === null) return "";
  if (diff > 0) return "border-2 border-orange-500 bg-orange-50";
  if (diff < 0) return "border-2 border-blue-500 bg-blue-50";
  return "";
};

export default function LayoutLeaderTab({
  projectsData,
  setProjectsData,
  allLayoutOwners,
  layoutOwnerFilter,
  setLayoutOwnerFilter,
  layoutLeaderSortConfig,
  setLayoutLeaderSortConfig,
  currentProjectId,
  setCurrentProjectId,
  currentUser
}) {
  const [showDateDiff, setShowDateDiff] = React.useState(false);

  // Removed useEffect that recalculates status on currentProjectId change

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
    
    // Map the field names to their layout leader specific versions
    const fieldMapping = {
      'schematicFreeze': 'layoutLeaderSchematicFreeze',
      'lvsClean': 'layoutLeaderLvsClean'
    };
    
    // Always use the layout leader specific field names
    const actualField = fieldMapping[field] || field;
    updated[idx][actualField] = value instanceof Date ? value.toISOString().split("T")[0] : value;

    // Recalculate mandays if dates are present and valid
    const startDateStr = updated[idx].layoutLeaderSchematicFreeze;
    const endDateStr = updated[idx].layoutLeaderLvsClean;
    if (startDateStr && endDateStr) {
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
        updated[idx].mandays = calculateMandaysFromDates(startDateStr, endDateStr).toString();
      }
    }

    // Update the status explicitly using calculateStatus
    updated[idx].status = calculateStatus(updated[idx]);

    setProjectsData({
      ...projectsData,
      [currentProjectId]: updated
    });
  };

  const sortedData = (Array.isArray(projectsData[currentProjectId]) ? projectsData[currentProjectId] : [])
    .filter((row) =>
      (!layoutOwnerFilter || row.layoutOwner === layoutOwnerFilter) &&
      (
        currentProjectId === "" ||
        row.projectId === undefined ||
        row.projectId === "" ||
        currentProjectId === row.projectId
      )
    )
    .map(row => {
      // 優先用 layoutLeader 欄位，否則用 designer 欄位
      const start = row.layoutLeaderSchematicFreeze || row.schematicFreeze;
      const end = row.layoutLeaderLvsClean || row.lvsClean;
      const mandays = calculateMandaysFromDates(start, end);
      return {
        ...row,
        status: calculateStatus(row),
        mandays: mandays || 0,
        layoutClosed: row.layoutClosed === true || row.layoutClosed === 1
      };
    })
    .sort((a, b) => {
      const key = layoutLeaderSortConfig.key;
      if (!key) return 0;
      
      if (key === 'mandays') {
        return layoutLeaderSortConfig.direction === "asc"
          ? (a.mandays || 0) - (b.mandays || 0)
          : (b.mandays || 0) - (a.mandays || 0);
      }
      
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
    newRow.status = calculateStatus(newRow);

    const updated = [...projectsData[currentProjectId]];
    updated.splice(idx + 1, 0, newRow);
    setProjectsData({
      ...projectsData,
      [currentProjectId]: updated
    });
  };

  const handleCloseRow = async (idx) => {
    try {
      const updated = [...projectsData[currentProjectId]];
      updated[idx] = {
        ...updated[idx],
        layoutClosed: true,
        lastModified: new Date().toISOString(),
        modifiedBy: currentUser
      };

      // 更新前端顯示
      setProjectsData(prev => ({
        ...prev,
        [currentProjectId]: updated
      }));

      // 提交到後端
      const response = await fetch(`${API_BASE_URL}/layouts/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: currentProjectId,
          data: updated,
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

      // 如果有 refreshData 函數則調用
      if (typeof refreshData === 'function') {
        await refreshData();
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleReopenRow = async (idx) => {
    try {
      const updated = [...projectsData[currentProjectId]];
      updated[idx] = {
        ...updated[idx],
        layoutClosed: false,
        lastModified: new Date().toISOString(),
        modifiedBy: currentUser
      };

      // 更新前端顯示
      setProjectsData(prev => ({
        ...prev,
        [currentProjectId]: updated
      }));

      // 提交到後端
      const response = await fetch(`${API_BASE_URL}/layouts/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: currentProjectId,
          data: updated,
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

      // 如果有 refreshData 函數則調用
      if (typeof refreshData === 'function') {
        await refreshData();
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert(`Failed to update status: ${err.message}`);
    }
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

  const handleSubmit = async () => {
    try {
      const dataSource = Array.isArray(projectsData?.[currentProjectId]) ? projectsData[currentProjectId] : [];
      
      if (!dataSource.length) {
        alert('No data to submit');
        return;
      }

      // Fetch latest data from the server
      const latestResponse = await fetch(`${API_BASE_URL}/layouts/${currentProjectId}`);
      if (!latestResponse.ok) {
        const errorText = await latestResponse.text();
        throw new Error(`Failed to fetch latest data from server. Status: ${latestResponse.status} - ${errorText}`);
      }
      const latestResult = await latestResponse.json();
      
      if (!latestResult.success || !Array.isArray(latestResult.updatedProjectData)) {
        throw new Error("Invalid response from server");
      }

      const latestData = latestResult.updatedProjectData;

      // Version check and data preparation
      const updatedData = dataSource.map(localItem => {
        const { 
          status, 
          plannedMandays,
          schematicFreeze,
          lvsClean,
          ...itemWithoutCalculatedFields 
        } = localItem;
        
        if (!itemWithoutCalculatedFields.ipName) {
          throw new Error("Local item missing ipName");
        }

        const latestItem = latestData.find(item => item.ipName === itemWithoutCalculatedFields.ipName);
        
        if (latestItem && localItem.version !== latestItem.version) {
          throw new Error(`Version conflict for ${itemWithoutCalculatedFields.ipName}. Please refresh and try again.`);
        }

        // 只提交 layout leader 相關的欄位
        return {
          ...itemWithoutCalculatedFields,
          layoutLeaderSchematicFreeze: itemWithoutCalculatedFields.layoutLeaderSchematicFreeze,
          layoutLeaderLvsClean: itemWithoutCalculatedFields.layoutLeaderLvsClean,
          layoutOwner: itemWithoutCalculatedFields.layoutOwner,
          layoutClosed: itemWithoutCalculatedFields.layoutClosed,
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
          role: 'layoutLeader' // 添加角色標識
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

      // 檢查並調用 refreshData
      if (typeof refreshData === 'function') {
        await refreshData();
      }

      alert("Changes submitted successfully!");

    } catch (err) {
      console.error('Error submitting changes:', err);
      alert(`Failed to submit changes: ${err.message}`);
    }
  };

  // 在組件加載時獲取最新數據
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("Fetching data for project:", currentProjectId);
        const response = await fetch(`${API_BASE_URL}/layouts/${currentProjectId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }
        const result = await response.json();
        console.log("Received data from server:", result);
        
        if (!result.success) {
          throw new Error('Failed to fetch data');
        }

        setProjectsData(prev => {
          console.log("Updating projects data:", {
            previous: prev[currentProjectId],
            new: result.updatedProjectData
          });
          return {
            ...prev,
            [currentProjectId]: result.updatedProjectData.map(item => {
              // 獲取現有的 layoutLeader 數據
              const existingItem = prev[currentProjectId]?.find(prevItem => prevItem.ipName === item.ipName) || {};
              
              // 檢查是否已經有 layoutLeader 的時間數據
              const hasExistingLayoutLeaderData = existingItem.layoutLeaderSchematicFreeze || existingItem.layoutLeaderLvsClean;
              
              return {
                ...item,
                // 只在沒有現有 layoutLeader 數據時才使用 designer 的數據作為初始值
                layoutLeaderSchematicFreeze: hasExistingLayoutLeaderData ? 
                  existingItem.layoutLeaderSchematicFreeze : 
                  item.schematicFreeze,
                layoutLeaderLvsClean: hasExistingLayoutLeaderData ? 
                  existingItem.layoutLeaderLvsClean : 
                  item.lvsClean,
                layoutClosed: item.layoutClosed === true || item.layoutClosed === 1
              };
            })
          };
        });
      } catch (err) {
        console.error('Error fetching data:', err);
        alert(`Failed to fetch data: ${err.message}`);
      }
    };

    if (currentProjectId) {
      fetchData();
    }
  }, [currentProjectId]); // 只在 currentProjectId 改變時觸發

  // Debug logging for data
  useEffect(() => {
    console.log("Current project data:", {
      projectId: currentProjectId,
      data: projectsData[currentProjectId]
    });
  }, [projectsData, currentProjectId]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto max-w-[1600px] px-6 py-6">
        {/* 過濾器區域 */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <label className="font-semibold whitespace-nowrap">Filter by Project:</label>
              <select
                value={currentProjectId}
                onChange={e => setCurrentProjectId(e.target.value)}
                className={selectStyles + " min-w-[200px]"}
              >
                {Object.keys(projectsData).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="font-semibold whitespace-nowrap">Filter by Layout Owner:</label>
              <select
                value={layoutOwnerFilter}
                onChange={e => setLayoutOwnerFilter(e.target.value)}
                className={selectStyles + " min-w-[200px]"}
              >
                <option value="">All</option>
                {allLayoutOwners.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="font-semibold whitespace-nowrap">Show Date Difference:</label>
              <button
                onClick={() => setShowDateDiff(!showDateDiff)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  showDateDiff ? 'bg-primary' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showDateDiff ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* 提交按鈕 */}
        <div className="flex justify-end mb-4">
          <button
            className="bg-destructive text-destructive-foreground px-4 py-2 text-base rounded font-bold 
              hover:bg-destructive/80 transition-colors focus:outline-none focus:ring-2 
              focus:ring-destructive focus:ring-offset-2 shadow-sm"
            onClick={handleSubmit}
          >
            Submit
          </button>
        </div>

        {/* 表格容器 */}
        <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-muted/50">
                <tr>
                  {[
                    { key: 'ipName', label: 'IP Name', width: '180px' },
                    { key: 'designer', label: 'Designer', width: '180px' },
                    { key: 'schematicFreeze', label: 'Schematic Freeze', width: '180px' },
                    { key: 'lvsClean', label: 'LVS Clean', width: '180px' },
                    { key: 'mandays', label: 'Mandays', width: '100px' },
                    { key: 'layoutOwner', label: 'Layout Owner', width: '180px' },
                    { key: 'status', label: 'Status', width: '160px' },
                    { key: 'actions', label: 'Actions', width: '300px' }
                  ].map(({ key, label, width }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key)}
                      className="cursor-pointer text-left p-3 font-semibold text-sm"
                      style={{ 
                        minWidth: width,
                        maxWidth: width,
                        textAlign: 'center'
                      }}
                    >
                      {label}
                      {layoutLeaderSortConfig.key === key && (layoutLeaderSortConfig.direction === "asc" ? " ▲" : " ▼")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center p-6 text-muted-foreground italic">
                      No records found
                    </td>
                  </tr>
                ) : (
                  sortedData.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`transition-colors duration-200 ${getRowStyle(row)}`}
                    >
                      <td className="p-3" style={{ minWidth: '180px', maxWidth: '180px', textAlign: 'center' }}>
                        <div className="flex items-center gap-1">
                          {row.isSubIp && <span className="ml-3">↳</span>}
                          {row.isSubIp ? (
                            <input
                              type="text"
                              value={row.ipName}
                              onChange={e => handleFieldChange(idx, "ipName", e.target.value)}
                              className={inputStyles + " italic"}
                              style={{ textDecoration: row.layoutClosed ? 'line-through' : 'none' }}
                              disabled={row.layoutClosed}
                            />
                          ) : (
                            <span style={{ textDecoration: row.layoutClosed ? 'line-through' : 'none' }}>{row.ipName}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3" style={{ minWidth: '180px', maxWidth: '180px', textAlign: 'center' }}>{row.designer}</td>
                      <td className="p-3" style={{ minWidth: '180px', maxWidth: '180px', textAlign: 'center' }}>
                        <div className="relative">
                          <DatePicker
                            selected={row.layoutLeaderSchematicFreeze ? new Date(row.layoutLeaderSchematicFreeze) : null}
                            onChange={date => handleFieldChange(idx, "schematicFreeze", date)}
                            dateFormat="yyyy-MM-dd"
                            className="date-picker"
                            disabled={row.layoutClosed}
                            customInput={
                              <input 
                                className={`${inputStyles} ${getDateStyle(row.layoutLeaderSchematicFreeze, row.schematicFreeze)}`}
                                disabled={row.layoutClosed}
                              />
                            }
                          />
                          {showDateDiff && getDateDifference(row.layoutLeaderSchematicFreeze, row.schematicFreeze) !== null && (
                            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs">
                              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                                {getDateDifference(row.layoutLeaderSchematicFreeze, row.schematicFreeze) > 0 ? '+' : ''}
                                {getDateDifference(row.layoutLeaderSchematicFreeze, row.schematicFreeze)} days
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3" style={{ minWidth: '180px', maxWidth: '180px', textAlign: 'center' }}>
                        <div className="relative">
                          <DatePicker
                            selected={row.layoutLeaderLvsClean ? new Date(row.layoutLeaderLvsClean) : null}
                            onChange={date => handleFieldChange(idx, "lvsClean", date)}
                            dateFormat="yyyy-MM-dd"
                            className="date-picker"
                            disabled={row.layoutClosed}
                            customInput={
                              <input 
                                className={`${inputStyles} ${getDateStyle(row.layoutLeaderLvsClean, row.lvsClean)}`}
                                disabled={row.layoutClosed}
                              />
                            }
                          />
                          {showDateDiff && getDateDifference(row.layoutLeaderLvsClean, row.lvsClean) !== null && (
                            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs">
                              <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                                {getDateDifference(row.layoutLeaderLvsClean, row.lvsClean) > 0 ? '+' : ''}
                                {getDateDifference(row.layoutLeaderLvsClean, row.lvsClean)} days
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3" style={{ minWidth: '100px', maxWidth: '100px', textAlign: 'center' }}>{row.mandays}</td>
                      <td className="p-3" style={{ minWidth: '180px', maxWidth: '180px', textAlign: 'center' }}>
                        <select
                          value={row.layoutOwner || ""}
                          onChange={e => handleFieldChange(idx, "layoutOwner", e.target.value)}
                          disabled={row.layoutClosed}
                          className={selectStyles}
                          style={{ textDecoration: row.layoutClosed ? 'line-through' : 'none' }}
                        >
                          <option value="">-- Select --</option>
                          {allLayoutOwners.map(owner => (
                            <option key={owner} value={owner}>{owner}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3" style={{ minWidth: '160px', maxWidth: '160px', textAlign: 'center' }}>
                        <span className="font-medium">
                          {row.status}
                        </span>
                      </td>
                      <td className="p-3" style={{ minWidth: '300px', maxWidth: '300px', textAlign: 'left' }}>
                        <div className="flex flex-col gap-2 min-w-[300px]">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSplitRow(idx)}
                              className={`w-20 px-2 py-1.5 bg-blue-500 text-white rounded-md text-xs font-medium 
                                transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 
                                focus:ring-blue-500 focus:ring-offset-2 ${row.layoutClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={row.layoutClosed}
                            >
                              Split
                            </button>
                            {row.layoutClosed ? (
                              <button
                                onClick={() => handleReopenRow(idx)}
                                className="w-20 px-2 py-1.5 bg-emerald-500 text-white rounded-md text-xs font-medium 
                                  transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 
                                  focus:ring-emerald-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
                              >
                                Reopen
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCloseRow(idx)}
                                className="w-20 px-2 py-1.5 bg-orange-500 text-white rounded-md text-xs font-medium 
                                  transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 
                                  focus:ring-orange-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
                              >
                                Close
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteRow(idx)}
                              className="w-20 px-2 py-1.5 bg-red-500 text-white rounded-md text-xs font-medium 
                                transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 
                                focus:ring-red-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 新增行按鈕 */}
        <div className="flex justify-center mt-6">
          <button
            className="bg-primary text-primary-foreground px-4 py-2 rounded font-semibold 
              hover:bg-primary/90 shadow-sm hover:shadow-md transition-all 
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            onClick={() => {
              const newRow = {
                ipName: "",
                layoutOwner: "",
                layoutLeaderSchematicFreeze: "",
                layoutLeaderLvsClean: "",
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
    </div>
  );
}