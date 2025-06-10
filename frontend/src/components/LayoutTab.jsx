import React, { useState, useEffect, useCallback, memo } from "react";
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

// LayoutRow 子元件，僅 re-render 自己
const LayoutRow = memo(function LayoutRow({
  item,
  idx,
  localWeight,
  onWeightChange,
  getWeeklyWeightValue,
  currentWeek,
  getRowClass
}) {
  return (
    <tr key={idx} className={getRowClass(item) + " transition-colors duration-200 hover:bg-blue-50"}>
      <td className={"p-2 text-center " + (item.layoutClosed ? "line-through" : "")}>{item.ipName}</td>
      <td className={"p-2 text-center " + (item.layoutClosed ? "line-through" : "")}> 
        <DatePicker
          selected={item.schematicFreeze ? new Date(item.schematicFreeze) : null}
          onChange={() => {}}
          dateFormat="yyyy-MM-dd"
          placeholderText="Select date"
          customInput={
            <input className={`w-full px-2 py-1 rounded border border-border bg-card text-card-foreground ${item.layoutClosed ? 'line-through' : ''}`} disabled />
          }
          disabled
        />
      </td>
      <td className={"p-2 text-center " + (item.layoutClosed ? "line-through" : "")}> 
        <DatePicker
          selected={item.lvsClean ? new Date(item.lvsClean) : null}
          onChange={() => {}}
          dateFormat="yyyy-MM-dd"
          placeholderText="Select date"
          customInput={
            <input className={`w-full px-2 py-1 rounded border border-border bg-card text-card-foreground ${item.layoutClosed ? 'line-through' : ''}`} disabled />
          }
          disabled
        />
      </td>
      <td className={"p-2 text-center " + (item.layoutClosed ? "line-through" : "")}>{item.plannedMandays}</td>
      <td className={"p-2 text-center " + (item.layoutClosed ? "line-through" : "")}> 
        <span
          className={
            item.status === "Unassigned"
              ? "bg-yellow-100 text-yellow-800 font-semibold px-3 py-1 rounded-full border border-yellow-200"
              : item.status === "Waiting for Freeze"
              ? "bg-blue-100 text-blue-800 font-semibold px-3 py-1 rounded-full border border-blue-200"
              : item.status === "In Progress"
              ? "bg-green-100 text-green-800 font-semibold px-3 py-1 rounded-full border border-green-200"
              : item.status === "Postim"
              ? "bg-red-100 text-red-800 font-semibold px-3 py-1 rounded-full border border-red-200"
              : item.status === "Closed"
              ? "bg-gray-200 text-gray-600 font-semibold px-3 py-1 rounded-full border border-gray-300"
              : "font-semibold px-3 py-1 rounded-full"
          }
        >
          {item.status}
        </span>
      </td>
      <td className="p-2 text-center">
        <input
          type="range"
          min={0}
          max={1.5}
          step={0.1}
          value={localWeight ?? getWeeklyWeightValue(item)}
          onChange={e => onWeightChange(item.projectId, item.ipName, e.target.value)}
          className="w-[100px] align-middle"
          disabled={item.layoutClosed}
        />
        <span className="ml-2 font-semibold text-base">
          {Number(localWeight ?? getWeeklyWeightValue(item)).toFixed(1)}
        </span>
        <div className="text-xs text-blue-600 font-bold mt-1 bg-blue-50 rounded px-2">
          {currentWeek}
        </div>
      </td>
    </tr>
  );
});

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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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
    const loadData = async () => {
      if (projectFilterId) {
        try {
          setLoading(true);
          console.log('Loading data for project:', projectFilterId);
          
          const response = await fetch(`${API_BASE_URL}/layouts/${projectFilterId}`);
          const result = await response.json();
          
          if (!response.ok || !result.success) {
            throw new Error(result.message || 'Failed to fetch data');
          }

          console.log('Received data:', result);

          // 確保使用正確的數據結構
          const projectData = Array.isArray(result.data) ? result.data : [];
          
          // 更新數據並確保 weeklyWeights 存在
          const processedData = projectData.map(item => {
            // 確保 weeklyWeights 是數組
            let weeklyWeights = Array.isArray(item.weeklyWeights) ? [...item.weeklyWeights] : [];
            
            // 如果是當前用戶的項目且沒有當前週的權重，添加一個默認值
            if (item.layoutOwner === currentUser && !weeklyWeights.some(w => w.week === currentWeek)) {
              weeklyWeights.push({
                week: currentWeek,
                value: 0,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser,
                role: 'LAYOUT_OWNER'
              });
            }
            
            console.log('Processed item:', {
              ipName: item.ipName,
              layoutOwner: item.layoutOwner,
              weeklyWeights,
              currentWeek,
              hasCurrentWeek: weeklyWeights.some(w => w.week === currentWeek)
            });
            
            return {
              ...item,
              weeklyWeights
            };
          });

          console.log('Setting processed data:', processedData);

          setProjectsData(prev => ({
            ...prev,
            [currentProjectId]: processedData
          }));

        } catch (err) {
          console.error('Error loading data:', err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      }
    };

    loadData();
  }, [projectFilterId, currentWeek, currentUser]);

  const handleSort = (key) => {
    const direction = layoutSortConfig.key === key && layoutSortConfig.direction === "asc" ? "desc" : "asc";
    setLayoutSortConfig({ key, direction });
  };

  // Dynamically compute sortedData on each render for up-to-date status, plannedMandays, and sorting
  const sortedData = Object.entries(projectsData)
    .flatMap(([projectId, items]) => {
      console.log(`Processing project ${projectId}:`, items);
      const projectItems = Array.isArray(items) ? items : Array.isArray(items?.data) ? items.data : [];
      
      return projectItems
        .filter(item => {
          const isOwner = item.layoutOwner?.trim().toLowerCase() === currentUser.trim().toLowerCase();
          console.log(`Checking item ${item.ipName}:`, {
            layoutOwner: item.layoutOwner,
            currentUser,
            isOwner,
            weeklyWeights: item.weeklyWeights
          });
          return isOwner;
        })
        .map(item => {
          const updatedItem = { ...item, projectId };
          updatedItem.status = calculateStatus(updatedItem);
          updatedItem.plannedMandays = updatedItem.schematicFreeze && updatedItem.lvsClean
            ? calculateMandays(updatedItem.schematicFreeze, updatedItem.lvsClean)
            : updatedItem.plannedMandays || "";
          
          // 確保 weeklyWeights 是一個陣列
          if (!Array.isArray(updatedItem.weeklyWeights)) {
            updatedItem.weeklyWeights = [];
          }
          
          console.log(`Processed item ${updatedItem.ipName}:`, {
            status: updatedItem.status,
            plannedMandays: updatedItem.plannedMandays,
            weeklyWeights: updatedItem.weeklyWeights
          });
          
          return updatedItem;
        });
    })
    .sort((a, b) => {
      const valA = a[layoutSortConfig.key] || "";
      const valB = b[layoutSortConfig.key] || "";
      return layoutSortConfig.direction === "asc"
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    })
    .filter(Boolean);

  console.log('Final sortedData:', sortedData);

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

  // 添加獲取權重的函數
  const fetchWeights = async (projectId, ipName) => {
    try {
      const response = await fetch(`${API_BASE_URL}/layouts/${projectId}`);
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to fetch weights');
      }

      const item = result.data.find(item => item.ipName === ipName);
      if (!item) {
        throw new Error('Item not found');
      }

      return item.weeklyWeights || [];
    } catch (err) {
      console.error('Error fetching weights:', err);
      return [];
    }
  };

  // Weekly weight bar value 取值處加 debug 並修正 week 格式
  const getWeeklyWeightValue = (item) => {
    if (!item) {
      console.log('No item provided');
      return 0;
    }

    // 確保 weeklyWeights 是一個數組
    const weights = Array.isArray(item.weeklyWeights) ? item.weeklyWeights : [];
    
    console.log('Getting weekly weight value:', {
      ipName: item.ipName,
      currentWeek,
      weeklyWeights: weights,
      hasWeights: weights.length > 0,
      layoutOwner: item.layoutOwner,
      currentUser,
      isOwner: item.layoutOwner === currentUser
    });

    // 如果是當前用戶的項目，確保有當前週的權重
    if (item.layoutOwner === currentUser) {
      const weekObj = weights.find(w => w && w.week === currentWeek);
      if (weekObj) {
        const value = parseFloat(weekObj.value);
        if (!isNaN(value)) {
          return value;
        }
      }
      
      // 如果沒有找到當前週的權重，初始化為 0
      const newWeight = {
        week: currentWeek,
        value: 0,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser,
        role: 'LAYOUT_OWNER',
        version: 1
      };
      
      // 更新本地狀態
      setProjectsData(prev => {
        const updatedData = { ...prev };
        const projectItems = updatedData[item.projectId] || [];
        const itemIndex = projectItems.findIndex(i => i.ipName === item.ipName);
        
        if (itemIndex !== -1) {
          const updatedItem = { ...projectItems[itemIndex] };
          updatedItem.weeklyWeights = [...weights, newWeight];
          projectItems[itemIndex] = updatedItem;
          updatedData[item.projectId] = projectItems;
        }
        
        return updatedData;
      });

      return 0;
    }

    // 如果不是當前用戶的項目，返回已存在的權重或 0
    const weekObj = weights.find(w => w && w.week === currentWeek);
    return weekObj && !isNaN(parseFloat(weekObj.value)) ? parseFloat(weekObj.value) : 0;
  };

  const handleWeightChange = (projectId, ipName, newWeight) => {
    setLocalWeights(prev => ({
      ...prev,
      [`${projectId}-${ipName}`]: newWeight
    }));
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

      for (const [projectId, items] of Object.entries(projectGroups)) {
        try {
          // 取得最新資料
          const latestResponse = await fetch(`${API_BASE_URL}/layouts/${projectId}`);
          if (!latestResponse.ok) {
            throw new Error(`Failed to fetch latest data for project ${projectId}`);
          }
          const latestResult = await latestResponse.json();
          if (!latestResult.success) {
            throw new Error(`Invalid response for project ${projectId}`);
          }
          const latestData = Array.isArray(latestResult.data) ? latestResult.data : [];

          // 整合 localWeights 到 weeklyWeights
          const updatedData = items.map(item => {
            const latestItem = latestData.find(serverItem => serverItem.ipName === item.ipName);
            const currentVersion = parseInt(latestItem?.version || '1', 10);
            const key = `${projectId}-${item.ipName}`;
            const localWeight = localWeights[key];
            let weeklyWeights = [...(latestItem?.weeklyWeights || [])];
            if (localWeight !== undefined) {
              const weekIndex = weeklyWeights.findIndex(w => w.week === currentWeek);
              if (weekIndex >= 0) {
                weeklyWeights[weekIndex] = {
                  ...weeklyWeights[weekIndex],
                  value: localWeight,
                  updatedAt: new Date().toISOString(),
                  updatedBy: currentUser,
                  role: 'LAYOUT_OWNER'
                };
              } else {
                weeklyWeights.push({
                  week: currentWeek,
                  value: localWeight,
                  updatedAt: new Date().toISOString(),
                  updatedBy: currentUser,
                  role: 'LAYOUT_OWNER'
                });
              }
            }
            return {
              ip_name: item.ipName,
              designer: item.designer,
              layout_owner: item.layoutOwner,
              schematic_freeze: item.schematicFreeze ? item.schematicFreeze.slice(0, 10) : null,
              lvs_clean: item.lvsClean ? item.lvsClean.slice(0, 10) : null,
              planned_mandays: Number(item.plannedMandays) || 0,
              version: Number(currentVersion) + 1,
              layout_closed: item.layoutClosed ? 1 : 0,
              weekly_weights: JSON.stringify(weeklyWeights),
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
              userId: currentUser,
              role: 'layout_owner'
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to submit updates for project ${projectId}`);
          }

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.message || `Failed to submit updates for project ${projectId}`);
          }

          await refreshData();
        } catch (err) {
          throw new Error(`Error processing ${projectId}: ${err.message}`);
        }
      }

      setLocalWeights({});
      alert("All changes submitted successfully!");
    } catch (err) {
      console.error('Error submitting changes:', err);
      alert(err.message);
    }
  };

  // 狀態顏色與刪除線
  const getRowClass = (item) => {
    if (item.layoutClosed) return "bg-muted text-muted-foreground";
    switch (item.status) {
      case "Closed": return "bg-muted text-muted-foreground";
      case "In Progress": return "bg-green-100";
      case "Waiting for Freeze": return "bg-blue-100";
      case "Unassigned": return "bg-yellow-100";
      default: return "";
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
      <div className="flex justify-end mb-2 mt-5">
        <button
          className="bg-destructive text-destructive-foreground px-4 py-2 text-base rounded font-bold hover:bg-destructive/80"
          onClick={handleSubmit}
        >
          Submit
        </button>
      </div>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse bg-card text-card-foreground rounded-lg shadow">
          <thead>
            <tr>
              <th className="min-w-[160px] max-w-[160px] text-center px-3 py-3 font-semibold text-base bg-muted/50">IP Name</th>
              <th className="min-w-[160px] max-w-[160px] text-center px-3 py-3 font-semibold text-base bg-muted/50">Schematic Freeze</th>
              <th className="min-w-[160px] max-w-[160px] text-center px-3 py-3 font-semibold text-base bg-muted/50">LVS Clean</th>
              <th className="min-w-[100px] max-w-[100px] text-center px-3 py-3 font-semibold text-base bg-muted/50">Mandays</th>
              <th className="min-w-[100px] max-w-[100px] text-center px-3 py-3 font-semibold text-base bg-muted/50">Status</th>
              <th className="min-w-[200px] max-w-[200px] text-center px-3 py-3 font-semibold text-base bg-muted/50">Weekly Weight</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-4 text-gray-400 italic">No records found.</td>
              </tr>
            ) : (
              sortedData.map((item, idx) => (
                <LayoutRow
                  key={item.projectId + item.ipName}
                  item={item}
                  idx={idx}
                  localWeight={localWeights[`${item.projectId}-${item.ipName}`]}
                  onWeightChange={handleWeightChange}
                  getWeeklyWeightValue={getWeeklyWeightValue}
                  currentWeek={currentWeek}
                  getRowClass={getRowClass}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      {/* Total weight 顯示區塊 */}
      <div className="flex justify-end mt-4 mb-8 pr-2">
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-5 py-2 shadow-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 10c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8z" /></svg>
          <span className="font-bold text-lg text-primary">
            Total weight:
          </span>
          <span className="font-extrabold text-2xl text-primary">
            {sortedData.reduce((sum, item) => sum + Number(localWeights[`${item.projectId}-${item.ipName}`] ?? getWeeklyWeightValue(item)), 0).toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
}