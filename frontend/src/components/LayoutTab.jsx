import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { calculateEndDate, calculateMandays } from "../utils/dateUtils";
import { calculateStatus } from "../utils/statusUtils";
import { ThemeToggle } from "./ThemeToggle";

const API_BASE_URL = 'http://localhost:3001/api';

// 狀態標籤樣式
const statusStyles = {
  Unassigned: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  "Waiting for Freeze": "bg-blue-100 text-blue-800 border border-blue-200",
  "In Progress": "bg-green-100 text-green-800 border border-green-200",
  "Postim": "bg-red-100 text-red-800 border border-red-200",
  "Closed": "bg-gray-100 text-gray-800 border border-gray-200"
};

// 表格列配置
const tableColumns = [
  { key: 'projectId', label: 'Project', width: '180px', fixed: true },
  { key: 'ipName', label: 'IP Name', width: '200px', fixed: true },
  { key: 'schematicFreeze', label: 'Schematic Freeze', width: '180px' },
  { key: 'lvsClean', label: 'LVS Clean', width: '180px' },
  { key: 'plannedMandays', label: 'Mandays', width: '120px' },
  { key: 'status', label: 'Status', width: '150px' },
  { key: 'weeklyWeight', label: 'Weekly Weight', width: '200px' }
];

export default function LayoutTab({
  projectsData,
  setProjectsData,
  currentUser,
  layoutSortConfig,
  setLayoutSortConfig,
  projectFilterId,
  currentProjectId,
  refreshData
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [localWeights, setLocalWeights] = useState({});
  const [showActions, setShowActions] = useState({});

  const getISOWeek = (date = new Date()) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
  };

  const currentWeek = getISOWeek();

  // 在組件掛載和 projectFilterId 變化時加載數據
  useEffect(() => {
    if (projectFilterId) {
      refreshData();
    }
  }, [projectFilterId]);

  const handleSort = (key) => {
    const direction = layoutSortConfig.key === key && layoutSortConfig.direction === "asc" ? "desc" : "asc";
    setLayoutSortConfig({ key, direction });
  };

  // Dynamically compute sortedData on each render for up-to-date status, plannedMandays, and sorting
  const sortedData = Object.entries(projectsData)
    .flatMap(([projectId, items]) =>
      (items || [])
        .filter(item => item.layoutOwner === currentUser)
        .map(item => {
          const updatedItem = { ...item, projectId };
          updatedItem.status = calculateStatus(updatedItem);
          updatedItem.plannedMandays = updatedItem.schematicFreeze && updatedItem.lvsClean
            ? calculateMandays(updatedItem.schematicFreeze, updatedItem.lvsClean)
            : updatedItem.plannedMandays || "";
          return updatedItem;
        })
    )
    .sort((a, b) => {
      const valA = a[layoutSortConfig.key] || "";
      const valB = b[layoutSortConfig.key] || "";
      return layoutSortConfig.direction === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    })
    .filter(Boolean);

  const updateItem = async (projectId, ipName, field, value) => {
    setLoading(true);
    setError(null);
    
    try {
      const updated = [...projectsData[projectId]];
      const index = updated.findIndex(row => row.ipName === ipName);
      
      if (index === -1) {
        throw new Error(`Item not found: ${ipName}`);
      }

      const updatedItem = { ...updated[index] };
      updatedItem[field] = value;

      // 計算相關欄位
      if (field === "schematicFreeze" && updatedItem.plannedMandays) {
        updatedItem.lvsClean = calculateEndDate(value, parseInt(updatedItem.plannedMandays, 10));
      } else if (field === "lvsClean" && updatedItem.schematicFreeze) {
        updatedItem.plannedMandays = calculateMandays(updatedItem.schematicFreeze, value).toString();
      } else if (field === "plannedMandays" && updatedItem.schematicFreeze) {
        updatedItem.lvsClean = calculateEndDate(updatedItem.schematicFreeze, parseInt(value, 10));
      }

      // 更新狀態
      updatedItem.status = calculateStatus(updatedItem);
      updatedItem.modifiedBy = currentUser;
      updatedItem.lastModified = new Date().toISOString();

      // 發送更新到後端
      const response = await fetch(`${API_BASE_URL}/layouts/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          data: [updatedItem]
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update item');
      }

      // 更新前端狀態
      setProjectsData(prev => ({
        ...prev,
        [projectId]: prev[projectId].map(row =>
          row.ipName === ipName ? updatedItem : row
        )
      }));

    } catch (err) {
      console.error('Error updating item:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWeightChange = (projectId, ipName, newWeight) => {
    const key = `${projectId}-${ipName}`;
    setLocalWeights(prev => ({
      ...prev,
      [key]: newWeight
    }));

    // 同時更新 projectsData 中的 weeklyWeights
    setProjectsData(prev => {
      const updatedData = { ...prev };
      const projectItems = [...(updatedData[projectId] || [])];
      const itemIndex = projectItems.findIndex(item => item.ipName === ipName);
      
      if (itemIndex !== -1) {
        const item = projectItems[itemIndex];
        const weeklyWeights = [...(item.weeklyWeights || [])];
        const weekIndex = weeklyWeights.findIndex(w => w.week === currentWeek);
        
        if (weekIndex >= 0) {
          weeklyWeights[weekIndex] = {
            ...weeklyWeights[weekIndex],
            week: currentWeek,
            value: newWeight,
            updatedAt: new Date().toISOString()
          };
        } else {
          weeklyWeights.push({
            week: currentWeek,
            value: newWeight,
            updatedAt: new Date().toISOString()
          });
        }
        
        projectItems[itemIndex] = {
          ...item,
          weeklyWeights
        };
        updatedData[projectId] = projectItems;
      }
      
      return updatedData;
    });
  };

  const handleSubmit = async () => {
    try {
      const dataSource = sortedData;
      if (!dataSource.length) {
        alert('No data to submit');
        return;
      }

      // Group data by project
      const projectGroups = dataSource.reduce((acc, item) => {
        if (!acc[item.projectId]) {
          acc[item.projectId] = [];
        }
        acc[item.projectId].push(item);
        return acc;
      }, {});

      // Process each project's data
      for (const [projectId, items] of Object.entries(projectGroups)) {
        try {
          // 獲取最新數據
          const latestResponse = await fetch(`${API_BASE_URL}/layouts/${projectId}`);
          if (!latestResponse.ok) {
            throw new Error(`Failed to fetch latest data for project ${projectId}`);
          }
          const latestResult = await latestResponse.json();
          
          if (!latestResult.success || !Array.isArray(latestResult.updatedProjectData)) {
            throw new Error(`Invalid response for project ${projectId}`);
          }

          const latestData = latestResult.updatedProjectData;

          // 準備更新數據
          const updatedData = items.map(item => {
            const latestItem = latestData.find(serverItem => serverItem.ipName === item.ipName);
            const currentVersion = parseInt(latestItem?.version || '1', 10);
            const key = `${projectId}-${item.ipName}`;
            const localWeight = localWeights[key];
            
            // 準備 weeklyWeights 數據
            let weeklyWeights = [...(latestItem?.weeklyWeights || [])];
            
            // 如果有本地更改，更新當前週的數據
            if (localWeight !== undefined) {
              const weekIndex = weeklyWeights.findIndex(w => w.week === currentWeek);
              if (weekIndex >= 0) {
                weeklyWeights[weekIndex] = {
                  ...weeklyWeights[weekIndex],
                  value: localWeight,
                  updatedAt: new Date().toISOString()
                };
              } else {
                weeklyWeights.push({
                  week: currentWeek,
                  value: localWeight,
                  updatedAt: new Date().toISOString()
                });
              }
            }
            
            return {
              ipName: item.ipName,
              designer: item.designer,
              layoutOwner: item.layoutOwner,
              schematicFreeze: item.schematicFreeze,
              lvsClean: item.lvsClean,
              layoutClosed: item.layoutClosed,
              weeklyWeights,
              modifiedBy: currentUser,
              lastModified: new Date().toISOString(),
              version: (currentVersion + 1).toString()
            };
          });

          // 提交更新
          const response = await fetch(`${API_BASE_URL}/layouts/submit`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              projectId,
              data: updatedData,
              userId: currentUser
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to submit updates for project ${projectId}`);
          }

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.message || `Failed to submit updates for project ${projectId}`);
          }

          // 更新前端狀態
          setProjectsData(prev => ({
            ...prev,
            [projectId]: result.updatedProjectData
          }));

        } catch (err) {
          throw new Error(`Error processing ${projectId}: ${err.message}`);
        }
      }

      // 清除本地緩存
      setLocalWeights({});

      // 立即刷新數據以確保顯示最新狀態
      await refreshData();

      alert("All changes submitted successfully!");

    } catch (err) {
      console.error('Error submitting changes:', err);
      alert(err.message);
    }
  };

  // 計算總權重
  const calculateTotalWeight = () => {
    return sortedData.reduce((total, item) => {
      const key = `${item.projectId}-${item.ipName}`;
      const weight = localWeights[key] ?? 
                    (item.weeklyWeights?.find(w => w.week === currentWeek)?.value || 0);
      return total + weight;
    }, 0);
  };

  // 新增刷新所有項目數據的函數
  const refreshAllProjectsData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/layouts`);
      if (!response.ok) {
        throw new Error('Failed to fetch all projects data');
      }
      const result = await response.json();
      
      if (!result.success) {
        throw new Error('Failed to fetch data');
      }

      setProjectsData(result.updatedProjectData);
    } catch (err) {
      console.error('Error refreshing all projects data:', err);
      throw err;
    }
  };

  // 添加初始化數據加載
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/layouts/${currentProjectId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }
        const result = await response.json();
        
        if (!result.success) {
          throw new Error('Failed to fetch data');
        }

        // 更新前端狀態
        setProjectsData(prev => ({
          ...prev,
          [currentProjectId]: result.updatedProjectData
        }));

        // 清除本地緩存
        setLocalWeights({});
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message);
      }
    };

    if (currentProjectId) {
      fetchData();
    }
  }, [currentProjectId]);

  return (
    <div className="min-h-screen bg-background text-foreground px-4">
      {/* 錯誤和載入狀態顯示 */}
      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}
      
      {loading && (
        <div className="mb-4 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
          <div className="flex items-center">
            <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading...</span>
          </div>
        </div>
      )}

      {/* 操作工具列 */}
      <div className="mb-4 flex justify-end items-center">
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
        >
          Submit
        </button>
      </div>

      {/* 表格容器 */}
      <div className="rounded-lg border border-border bg-card shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                {tableColumns.map(({ key, label, width, fixed }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className={`cursor-pointer p-3 font-semibold text-sm ${
                      fixed ? 'sticky left-0 bg-muted/50 z-20' : ''
                    }`}
                    style={{ 
                      minWidth: width,
                      maxWidth: width,
                      textAlign: 'left'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span>{label}</span>
                      {layoutSortConfig.key === key && (
                        <span className="text-primary">
                          {layoutSortConfig.direction === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedData.length > 0 ? (
                sortedData.map((item, idx) => {
                  const today = new Date().toISOString().slice(0, 10);
                  const isPast = item.schematicFreeze && item.schematicFreeze < today;
                  const isLate = item.lvsClean && item.lvsClean < today && !item.layoutClosed;
                  const rowClass = item.layoutClosed
                    ? "bg-muted/50 text-muted-foreground line-through"
                    : isLate
                    ? "bg-destructive/10"
                    : isPast
                    ? "bg-warning/10"
                    : "hover:bg-muted/30 transition-colors";

                  return (
                    <tr
                      key={idx}
                      className={rowClass}
                      onMouseEnter={() => setShowActions(prev => ({ ...prev, [idx]: true }))}
                      onMouseLeave={() => setShowActions(prev => ({ ...prev, [idx]: false }))}
                    >
                      <td className="p-3 sticky left-0 bg-inherit z-10">
                        <span>{item.projectId}</span>
                      </td>
                      <td className="p-3 sticky left-[180px] bg-inherit z-10">
                        <input
                          type="text"
                          value={item.ipName || ""}
                          readOnly
                          className="w-full bg-transparent border-none focus:outline-none"
                        />
                      </td>
                      <td className="p-3">
                        <DatePicker
                          selected={item.schematicFreeze ? new Date(item.schematicFreeze) : null}
                          onChange={date => updateItem(item.projectId, item.ipName, "schematicFreeze", date.toISOString())}
                          dateFormat="yyyy-MM-dd"
                          disabled={item.layoutClosed}
                          className="w-full px-3 py-1.5 rounded-md border border-border bg-card text-card-foreground"
                        />
                      </td>
                      <td className="p-3">
                        <DatePicker
                          selected={item.lvsClean ? new Date(item.lvsClean) : null}
                          onChange={date => updateItem(item.projectId, item.ipName, "lvsClean", date.toISOString())}
                          dateFormat="yyyy-MM-dd"
                          disabled={item.layoutClosed}
                          className="w-full px-3 py-1.5 rounded-md border border-border bg-card text-card-foreground"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="number"
                          value={item.plannedMandays}
                          onChange={e => updateItem(item.projectId, item.ipName, "plannedMandays", e.target.value)}
                          className="w-full px-3 py-1.5 rounded-md border border-border bg-card text-card-foreground"
                        />
                      </td>
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyles[item.status] || ''}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={localWeights[`${item.projectId}-${item.ipName}`] ?? (item.weeklyWeights?.find(w => w.week === currentWeek)?.value || 0)}
                            onChange={e => {
                              const newWeight = parseFloat(e.target.value);
                              handleWeightChange(item.projectId, item.ipName, newWeight);
                            }}
                            className="w-full accent-primary"
                          />
                          <span className="text-sm text-muted-foreground min-w-[40px]">
                            {((localWeights[`${item.projectId}-${item.ipName}`] ?? (item.weeklyWeights?.find(w => w.week === currentWeek)?.value || 0)) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={tableColumns.length} className="text-center p-8 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-muted-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>No data available</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 總計行 */}
      {sortedData.length > 0 && (
        <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total Weight:</span>
            <span className="text-lg font-bold text-primary">
              {(calculateTotalWeight() * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
