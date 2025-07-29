import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { calculateStatus } from "../utils/statusUtils";
import { API_BASE_URL } from '../config';
import EditableIpName from './EditableIpName';

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

// 新增日期格式化 function
const formatDateForSubmit = (date) => {
  if (!date) return null;
  try {
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch (e) {
    console.error('Date formatting error:', e);
    return null;
  }
};

function toDateString(val) {
  if (!val) return "";
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  const d = new Date(val);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// 驗證必要欄位
function validateData(data) {
  return (Array.isArray(data) ? data : []).map((item, idx) => {
    const errors = [];
    if (!item || typeof item.ipName !== 'string' || !item.ipName.trim()) {
      errors.push('IP Name 必填');
    }
    if (!item || typeof item.layoutOwner !== 'string' || !item.layoutOwner.trim()) {
      errors.push('Layout Owner 必填');
    }
    if (!item || !item.layoutLeaderSchematicFreeze || !/^\d{4}-\d{2}-\d{2}$/.test(toDateString(item.layoutLeaderSchematicFreeze))) {
      errors.push('Schematic Freeze 必填且需為 YYYY-MM-DD 格式');
    }
    if (!item || !item.layoutLeaderLvsClean || !/^\d{4}-\d{2}-\d{2}$/.test(toDateString(item.layoutLeaderLvsClean))) {
      errors.push('LVS Clean 必填且需為 YYYY-MM-DD 格式');
    }
    return { idx, errors };
  }).filter(r => r.errors.length > 0);
}

// 將 fetchData 提取為可重用函數
const fetchData = async (projectId, setProjectsData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/layouts/${projectId}`);
    if (!response.ok) throw new Error(`Failed to fetch data: ${response.status}`);
    const result = await response.json();
    if (!result.success) throw new Error('Failed to fetch data');
    const serverData = Array.isArray(result.data) ? result.data : [];
    setProjectsData(prev => ({
      ...prev,
      [projectId]: serverData
    }));
  } catch (err) {
    alert(`Failed to fetch data: ${err.message}`);
  }
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
  const [showDateDiff, setShowDateDiff] = useState(false);
  const [itemsToDelete, setItemsToDelete] = useState([]); // New state for deferred deletions
  const [pendingSplitItems, setPendingSplitItems] = useState([]); // New state for pending split items

  // Removed useEffect that recalculates status on currentProjectId change

  // Debug logging for initial state
  console.log("Initial Project Data:", projectsData);
  console.log("Current Project ID:", currentProjectId);
  console.log("Selected Project Rows:", projectsData[currentProjectId]);
  const handleSort = (key) => {
    const direction = layoutLeaderSortConfig.key === key && layoutLeaderSortConfig.direction === "asc" ? "desc" : "asc";
    setLayoutLeaderSortConfig({ key, direction });
  };

  const handleFieldChange = (identifier, field, value) => {
    const newValue = value instanceof Date ? value.toISOString().split("T")[0] : value;

    // Try to update existing projectsData
    let updatedInProjectsData = false;
    setProjectsData(prev => ({
      ...prev,
      [currentProjectId]: prev[currentProjectId].map(item => {
        // Use item.id for pending items, item.ipName for existing items
        const itemIdentifier = item.isPending ? item.id : item.ipName;
        if (itemIdentifier === identifier) {
          updatedInProjectsData = true;
          return { ...item, [field]: newValue };
        }
        return item;
      })
    }));

    // If not found in projectsData, try to update pendingSplitItems
    if (!updatedInProjectsData) {
      setPendingSplitItems(prev =>
        prev.map(item =>
          item.id === identifier ? { ...item, [field]: newValue } : item
        )
      );
    }
  };

  const sortedData = React.useMemo(() => {
    const existingData = Array.isArray(projectsData[currentProjectId]) ? projectsData[currentProjectId] : [];
    // Filter out items that are marked for deletion
    const filteredExistingData = existingData.filter(item => !itemsToDelete.includes(item.ipName));

    const displayData = [];
    const addedPendingIpNames = new Set(); // To keep track of pending items already added

    filteredExistingData.forEach(item => {
      displayData.push(item);
      // Check if this item has a corresponding pending split item
      const splitItem = pendingSplitItems.find(
        pending => pending.ipName === `${item.ipName}_part1`
      );
      if (splitItem) {
        displayData.push(splitItem);
        addedPendingIpNames.add(splitItem.ipName);
      }
    });

    // Add any pending items that were not associated with an existing item (e.g., if the original was deleted)
    pendingSplitItems.forEach(pending => {
      if (!addedPendingIpNames.has(pending.ipName)) {
        displayData.push(pending);
      }
    });

    return displayData
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
  }, [projectsData, currentProjectId, layoutOwnerFilter, layoutLeaderSortConfig, itemsToDelete, pendingSplitItems]);

  const columnStyles = {
    ipName: { width: 260, padding: 8 }, // Increased width
    designer: { width: 160, padding: 8 },
    schematicFreeze: { width: 140, padding: 8 },
    lvsClean: { width: 140, padding: 8 },
    mandays: { width: 80, padding: 8 },
    layoutOwner: { width: 160, padding: 8 },
    status: { width: 160, padding: 8 },
    actions: { width: 300, padding: 8 },
  };

  const handleSplitRow = (originalItem) => {
    const confirmSplit = window.confirm("Are you sure you want to split this item?");
    if (!confirmSplit) return;

    const newEntry = {
      ...originalItem,
      id: `${originalItem.ipName}_part1_${Date.now()}`, // Ensure unique ID for React
      ipName: `${originalItem.ipName}_part1`, // Suggest a new name
      isSubIp: true, // Mark as sub-task
      layoutClosed: 0, // Ensure it's not closed
      version: 1, // Start with version 1
      isPending: true, // Mark as pending
      // Reset dates and owner for the new split task
      layoutLeaderSchematicFreeze: null,
      layoutLeaderLvsClean: null,
      layoutOwner: originalItem.layoutOwner, // Inherit original layoutOwner
      reworkNote: "",
      actualHours: null,
    };

    setPendingSplitItems(prev => [...prev, newEntry]);
  };

  const handleCloseRow = (ipName) => {
    const updated = projectsData[currentProjectId].map(item =>
      item.ipName === ipName ? {
        ...item,
        layoutClosed: 1,
        lastModified: new Date().toISOString(),
        modifiedBy: currentUser
      } : item
    );

    // 只更新前端狀態
    setProjectsData(prev => ({
      ...prev,
      [currentProjectId]: updated
    }));
  };

  const handleReopenRow = (ipName) => {
    const updated = projectsData[currentProjectId].map(item =>
      item.ipName === ipName ? {
        ...item,
        layoutClosed: 0,
        lastModified: new Date().toISOString(),
        modifiedBy: currentUser
      } : item
    );

    // 只更新前端狀態
    setProjectsData(prev => ({
      ...prev,
      [currentProjectId]: updated
    }));
  };

  const handleDeleteRow = (itemToDelete) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this row?");
    if (!confirmDelete) return;

    // Add the item's IP name to the itemsToDelete state
    setItemsToDelete(prev => [...prev, itemToDelete.ipName]);

    // Immediately remove the item from the displayed data
    setProjectsData(prev => ({
      ...prev,
      [currentProjectId]: prev[currentProjectId].filter(item => item.ipName !== itemToDelete.ipName)
    }));
  };

  const handleSubmit = async () => {
    try {
      const dataSource = Array.isArray(projectsData?.[currentProjectId]) ? projectsData[currentProjectId] : [];
      // Filter out items that are marked for deletion from the existing data before combining
      const dataToSubmit = dataSource.filter(item => !itemsToDelete.includes(item.ipName));
      const finalDataToSubmit = [...dataToSubmit, ...pendingSplitItems]; // Include pending split items

      // enrich 一次資料，強制格式化日期
      const enriched = finalDataToSubmit.map(item => {
        const layoutLeaderSchematicFreeze = toDateString(item.layoutLeaderSchematicFreeze) || toDateString(item.schematicFreeze);
        const layoutLeaderLvsClean = toDateString(item.layoutLeaderLvsClean) || toDateString(item.lvsClean);
        return {
          ...item,
          layoutLeaderSchematicFreeze,
          layoutLeaderLvsClean
        };
      });
      // 驗證
      const invalids = validateData(enriched);
      if (invalids.length === enriched.length) {
        alert('請至少填寫一筆正確資料再送出！');
        return;
      }
      if (invalids.length > 0) {
        alert('有異常資料，請檢查 IP Name、Layout Owner、Schematic Freeze、LVS Clean！');
        return;
      }
      if (!finalDataToSubmit.length && !itemsToDelete.length) { // Check if there's anything to submit or delete
        alert('No data to submit or delete');
        return;
      }
      // mapping 成送出格式
      const formattedData = enriched.map(item => ({
        ip_name: item.ipName.trim(),
        designer: item.designer?.trim() || "",
        layout_owner: item.layoutOwner?.trim() || "",
        schematic_freeze: formatDateForSubmit(item.schematicFreeze),
        lvs_clean: formatDateForSubmit(item.lvsClean),
        layout_leader_schematic_freeze: formatDateForSubmit(item.layoutLeaderSchematicFreeze),
        layout_leader_lvs_clean: formatDateForSubmit(item.layoutLeaderLvsClean),
        planned_mandays: Number.isFinite(Number(item.plannedMandays)) ? Number(item.plannedMandays) : 0,
        version: Number(item.version),
        layout_closed: item.layoutClosed ? 1 : 0,
        // 其他欄位如有需要可補上
      }));
      // Fetch latest data from the server
      const response = await fetch(`${API_BASE_URL}/layouts/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: currentProjectId,
          data: formattedData,
          itemsToDelete: itemsToDelete, // Send items to delete
          userId: currentUser,
          role: 'layoutLeader'
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
      // Submit 成功後自動 fetch 最新資料
      await fetchData(currentProjectId, setProjectsData);
      setItemsToDelete([]); // Clear items to delete after successful submission
      setPendingSplitItems([]); // Clear pending split items after successful submission
      alert("Changes submitted successfully!");
    } catch (err) {
      console.error('Error submitting changes:', err);
      // catch 內也不再自動刷新 version conflict，只顯示錯誤
      if (err.message && err.message.includes('Version conflict')) {
        alert('版本衝突：資料已被他人修改，請重新整理頁面！');
        return;
      }
      alert(`Failed to submit changes: ${err.message}`);
    }
  };

  // useEffect 內 fetchData 也改用新函數
  useEffect(() => {
    if (currentProjectId) {
      fetchData(currentProjectId, setProjectsData);
    }
  }, [currentProjectId]);

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
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 
                  focus:ring-primary focus:ring-offset-2 ${
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
                  {/* Corrected syntax for mapping table headers */}
                  {([{ 
                    key: 'ipName',
                    label: 'IP Name',
                    width: '200px'
                  },
                  {
                    key: 'designer',
                    label: 'Designer',
                    width: '180px'
                  },
                  {
                    key: 'schematicFreeze',
                    label: 'Schematic Freeze',
                    width: '180px'
                  },
                  {
                    key: 'lvsClean',
                    label: 'LVS Clean',
                    width: '180px'
                  },
                  {
                    key: 'mandays',
                    label: 'Mandays',
                    width: '100px'
                  },
                  {
                    key: 'layoutOwner',
                    label: 'Layout Owner',
                    width: '180px'
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    width: '160px'
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    width: '300px'
                  }]).map(({
                    key,
                    label,
                    width
                  }) => (
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
                  sortedData.map((row) => (
                    <tr
                      key={row.id || row.ipName} // Use row.id for stability, fallback to ipName
                      className={`transition-colors duration-200 ${getRowStyle(row)} ${row.isPending ? 'bg-blue-50' : ''}`}
                    >
                      <td className="p-3" style={{ minWidth: columnStyles.ipName.width, maxWidth: columnStyles.ipName.width, textAlign: 'center' }}>
                        <div className="flex items-center gap-1">
                          {row.isSubIp && <span className="ml-3">↳</span>}
                          {row.isSubIp ? (
                            <EditableIpName
                              initialIpName={row.ipName}
                              id={row.id} // Pass the stable ID
                              onSave={(id, newIpName) => handleFieldChange(id, "ipName", newIpName)}
                              disabled={row.layoutClosed}
                              layoutClosed={row.layoutClosed}
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
                            selected={
                              row.layoutLeaderSchematicFreeze
                                ? new Date(row.layoutLeaderSchematicFreeze)
                                : row.schematicFreeze
                                  ? new Date(row.schematicFreeze)
                                  : null
                            }
                            onChange={date => handleFieldChange(row.isSubIp ? row.id : row.ipName, "schematicFreeze", date)} // Pass stable identifier
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
                            selected={
                              row.layoutLeaderLvsClean
                                ? new Date(row.layoutLeaderLvsClean)
                                : row.lvsClean
                                  ? new Date(row.lvsClean)
                                  : null
                            }
                            onChange={date => handleFieldChange(row.isSubIp ? row.id : row.ipName, "lvsClean", date)} // Pass stable identifier
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
                          onChange={e => handleFieldChange(row.isSubIp ? row.id : row.ipName, "layoutOwner", e.target.value)} // Pass stable identifier
                          disabled={row.layoutClosed}
                          className={selectStyles}
                          style={{ textDecoration: row.layoutClosed ? 'line-through' : 'none' }}
                        >
                          <option value="">選擇Layout Owner</option>
                          {allLayoutOwners.map(layoutOwner => (
                            <option key={layoutOwner} value={layoutOwner}>{layoutOwner}</option>
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
                              onClick={() => handleSplitRow(row)} // Pass the entire row object
                              className={`w-20 px-2 py-1.5 bg-blue-500 text-white rounded-md text-xs font-medium 
                                transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 
                                focus:ring-blue-500 focus:ring-offset-2 ${row.layoutClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={row.layoutClosed}
                            >
                              Split
                            </button>
                            {row.layoutClosed ? (
                              <span style={{ textDecoration: 'none' }}>
                                <button
                                  onClick={() => handleReopenRow(row.ipName)} // Pass ipName instead of idx
                                  className={`w-20 px-2 py-1.5 bg-emerald-500 text-white rounded-md text-xs font-medium \
                                    transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 \
                                    focus:ring-emerald-500 focus:ring-offset-2 shadow-sm hover:shadow-md`}
                                >
                                  Reopen
                                </button>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleCloseRow(row.ipName)} // Pass ipName instead of idx
                                className="w-20 px-2 py-1.5 bg-orange-500 text-white rounded-md text-xs font-medium \
                                  transition-colors hover:bg-orange-600 focus:outline-none focus:ring-2 \
                                  focus:ring-orange-500 focus:ring-offset-2 shadow-sm hover:shadow-md"
                              >
                                Close
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteRow(row)}
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