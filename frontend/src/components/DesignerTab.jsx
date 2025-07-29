import React, { useState, useEffect } from "react";
import { API_BASE_URL } from '../config';
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
  const [invalidRows, setInvalidRows] = useState([]);

  const [splitModalOpen, setSplitModalOpen] = useState(false);
  const [itemToSplit, setItemToSplit] = useState(null);
  const [pendingSplitItems, setPendingSplitItems] = useState([]);
  const [itemsToDelete, setItemsToDelete] = useState([]); // New state for deferred deletions

  const handleFieldChange = (id, field, value) => {
    const updateList = (list) => list.map(item => (item._id === id ? { ...item, [field]: value } : item));

    const itemToUpdate = [...(projectsData[currentProjectId] || []), ...pendingSplitItems].find(item => item._id === id);

    if (itemToUpdate?.isPending) {
        setPendingSplitItems(updateList);
    } else {
        setProjectsData(prev => ({
            ...prev,
            [currentProjectId]: updateList(prev[currentProjectId] || [])
        }));
    }
  };

  // 計算工作日的函數（全域可用）
  function calcBusinessDays(startDate, endDate) {
    let count = 0;
    const cur = new Date(startDate);
    while (cur <= endDate) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

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
    const existingData = Array.isArray(projectsData?.[currentProjectId]) ? projectsData[currentProjectId] : [];
    // Filter out items that are marked for deletion
    const filteredExistingData = existingData.filter(item => !itemsToDelete.includes(item.ipName));
    const combinedData = [...filteredExistingData, ...pendingSplitItems]; // Combine existing and pending

    // Add status and plannedMandays
    const enriched = combinedData.map(item => { // Use combinedData here
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
  }, [projectsData, currentProjectId, sortConfig, pendingSplitItems, itemsToDelete]); // Add itemsToDelete to dependencies

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
        _id: `copied_${Date.now()}`,
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

  const formatDateForSubmit = (date) => {
    if (!date) return null;
    try {
      // 若已是 YYYY-MM-DD，直接回傳
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
      const d = new Date(date);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().slice(0, 10);
    } catch (e) {
      console.error('Date formatting error:', e);
      return null;
    }
  };

  // 強制轉換為 YYYY-MM-DD 格式
  function toDateString(val) {
    if (!val) return "";
    if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const d = new Date(val);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  }

  // Helper: 統一送出 snake_case 並型別正確
  function normalizeForBackend(item) {
    // 若 ipName 為空，直接丟棄這筆資料
    if (!item.ipName || typeof item.ipName !== 'string' || !item.ipName.trim()) return null;
    return {
      ip_name: item.ipName.trim(),
      designer: item.designer?.trim() || "",
      layout_owner: item.layoutOwner?.trim() || "",
      schematic_freeze: formatDateForSubmit(item.schematicFreeze),
      lvs_clean: formatDateForSubmit(item.lvsClean),
      layout_leader_schematic_freeze: formatDateForSubmit(item.layoutLeaderSchematicFreeze),
      layout_leader_lvs_clean: formatDateForSubmit(item.layoutLeaderLvsClean),
      planned_mandays: Number.isFinite(Number(item.plannedMandays)) ? Number(item.plannedMandays) : 0,
      version: Number.isFinite(Number(item.version)) ? Number(item.version) : 1,
      layout_closed: item.layoutClosed ? 1 : 0,
      // 其他欄位如有需要可補上
    };
  }

  // 資料驗證函數：只檢查四個必要欄位
  function validateData(data) {
    return (Array.isArray(data) ? data : []).map((item, idx) => {
      const errors = [];
      if (!item || typeof item.ipName !== 'string' || !item.ipName.trim()) {
        errors.push('IP Name 必填');
      }
      if (!item || typeof item.designer !== 'string' || !item.designer.trim()) {
        errors.push('Designer 必填');
      }
      if (!item || !item.schematicFreeze || !/^\d{4}-\d{2}-\d{2}$/.test(item.schematicFreeze)) {
        errors.push('Schematic Freeze 必填且需為 YYYY-MM-DD 格式');
      }
      if (!item || !item.lvsClean || !/^\d{4}-\d{2}-\d{2}$/.test(item.lvsClean)) {
        errors.push('LVS Clean 必填且需為 YYYY-MM-DD 格式');
      }
      return { idx, errors };
    }).filter(r => r.errors.length > 0);
  }

  const handleSubmit = async () => {
    try {
      const existingData = Array.isArray(projectsData?.[currentProjectId]) ? projectsData[currentProjectId] : [];
      // Filter out items that are marked for deletion from the existing data before combining
      const dataToSubmit = existingData.filter(item => !itemsToDelete.includes(item.ipName));
      const dataSource = [...dataToSubmit, ...pendingSplitItems]; // Combine existing (not deleted) and pending for submission

      // enrich 一次資料，強制格式化日期
      const enriched = dataSource.map(item => {
        const schematicFreeze = toDateString(item.schematicFreeze);
        const lvsClean = toDateString(item.lvsClean);
        const schematicDate = schematicFreeze ? new Date(schematicFreeze) : null;
        const lvsCleanDate = lvsClean ? new Date(lvsClean) : null;
        // 如果日期不合法，mandays 補 0
        const mandays = (schematicDate && lvsCleanDate && !isNaN(schematicDate) && !isNaN(lvsCleanDate))
          ? calcBusinessDays(schematicDate, lvsCleanDate)
          : 0;
        return {
          ...item,
          schematicFreeze,
          lvsClean,
          plannedMandays: mandays
        };
      });
      // log enrich 後每一 row 的四個必要欄位與型別
      enriched.forEach((item, idx) => {
        console.log(`Row ${idx}:`, {
          ipName: item.ipName,
          designer: item.designer,
          schematicFreeze: item.schematicFreeze,
          lvsClean: item.lvsClean,
          types: {
            ipName: typeof item.ipName,
            designer: typeof item.designer,
            schematicFreeze: typeof item.schematicFreeze,
            lvsClean: typeof item.lvsClean,
          }
        });
      });
      // 用 enrich 過的資料做驗證
      const invalids = validateData(enriched);
      console.log('驗證未過的 row:', invalids);
      if (invalids.length === enriched.length) {
        alert('請至少填寫一筆正確資料再送出！');
        setInvalidRows(invalids.map(r => r.idx));
        return;
      }
      if (invalids.length > 0) {
        alert('有異常資料，請檢查 IP Name、Designer、Schematic Freeze、LVS Clean！');
        setInvalidRows(invalids.map(r => r.idx));
        return;
      }
      setInvalidRows([]);
      
      if (!dataSource.length && !itemsToDelete.length) { // Check if there's anything to submit or delete
        alert('No data to submit or delete');
        return;
      }

      // 送出前 log 每一筆的 plannedMandays 型別與內容
      console.log('Check plannedMandays:', (Array.isArray(dataSource) ? dataSource : []).map(item => ({
        ipName: item?.ipName,
        layoutClosed: item?.layoutClosed,
        plannedMandays: item?.plannedMandays,
        plannedMandaysType: typeof item?.plannedMandays,
        plannedMandaysIsFinite: Number.isFinite(Number(item?.plannedMandays))
      })));

      // mapping 成送出格式，強制格式化日期，只送出驗證通過且 ipName 嚴格合法的 row
      const validData = enriched.filter((item, idx) =>
        !invalids.map(r => r.idx).includes(idx) &&
        typeof item.ipName === 'string' &&
        item.ipName.trim() !== '' &&
        item.ipName !== undefined &&
        item.ipName !== null
      );
      const formattedData = validData.map(item => ({
        ip_name: item.ipName.trim(),
        designer: item.designer?.trim() || "",
        schematic_freeze: toDateString(item.schematicFreeze),
        lvs_clean: toDateString(item.lvsClean),
        layout_owner: item.layoutOwner?.trim() || "",
        layout_leader_schematic_freeze: item.layoutLeaderSchematicFreeze ? toDateString(item.layoutLeaderSchematicFreeze) : null,
        layout_leader_lvs_clean: item.layoutLeaderLvsClean ? toDateString(item.layoutLeaderLvsClean) : null,
        planned_mandays: Number.isFinite(Number(item.plannedMandays)) ? Number(item.plannedMandays) : 0,
        version: Number.isFinite(Number(item.version)) ? Number(item.version) : 1,
        layout_closed: item.layoutClosed ? 1 : 0,
        // 其他欄位...
      }));
      // 新增 log：送出前每一筆的 ip_name 與 lvs_clean
      formattedData.forEach((row, idx) => {
        console.log(`[handleSubmit] row ${idx}: ip_name=${row.ip_name}, lvs_clean=${row.lvs_clean}`);
      });
      console.log('Submitting formatted data:', formattedData);

      // Fetch latest data from the server
      const latestResponse = await fetch(`${API_BASE_URL}/layouts/${currentProjectId}`);
      if (!latestResponse.ok) {
        throw new Error(`Failed to fetch latest data from server. Status: ${latestResponse.status}`);
      }
      const latestResult = await latestResponse.json();
      
      if (!latestResult.success || !Array.isArray(latestResult.data)) {
        throw new Error("Invalid response from server");
      }

      const latestData = latestResult.data;

      // 在發送前檢查所有數據
      console.log('Submitting formatted data:', formattedData);

      // Submit updates
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
          role: 'designer'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server response:', errorText);
        throw new Error(`Server error: ${error.status} - ${errorText}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to submit updates');
      }

      // Update frontend state with server response
      setProjectsData(prev => ({
        ...prev,
        [currentProjectId]: result.data || []
      }));
      setPendingSplitItems([]); // Clear pending items after successful submission
      setItemsToDelete([]); // Clear items to delete after successful submission

      await refreshData();

      alert("Changes submitted successfully!");

    } catch (err) {
      console.error('Error submitting changes:', err);
      alert(`Failed to submit changes: ${err.message}`);
    }
  };

  const handleDelete = (itemToDelete) => { // Make it synchronous, actual deletion happens on submit
    if (!confirm('Are you sure you want to delete this item?')) {
      return;
    }

    // If it's a pending item, just remove it from the pendingSplitItems state
    if (itemToDelete.isPending) {
      setPendingSplitItems(prev => prev.filter(item => item._id !== itemToDelete._id));
    } else {
      // If it's an existing item, add its IP name to itemsToDelete
      setItemsToDelete(prev => [...prev, itemToDelete.ipName]);
      // Also remove it from the current projectsData view immediately
      setProjectsData(prev => ({
        ...prev,
        [currentProjectId]: prev[currentProjectId].filter(item => item._id !== itemToDelete._id)
      }));
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
        console.log('Fetched data:', result);

        if (!result.success) {
          throw new Error(result.message || 'Failed to fetch data');
        }

        // 檢查並使用正確的數據結構，並加上穩定的 _id
        const projectData = (Array.isArray(result.data) ? result.data : []).map(
            (item, index) => ({
                ...item,
                _id: item.id || `loaded_${item.ipName}_${index}`
            })
        );
        
        console.log('Processed project data:', projectData);

        setProjectsData(prev => ({
          ...prev,
          [currentProjectId]: projectData
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

  const handleCloseRow = (id) => {
    handleFieldChange(id, 'layoutClosed', 1);
    handleFieldChange(id, 'lastModified', new Date().toISOString());
    handleFieldChange(id, 'modifiedBy', currentUser);
  };

  const handleReopenRow = (id) => {
    handleFieldChange(id, 'layoutClosed', 0);
    handleFieldChange(id, 'lastModified', new Date().toISOString());
    handleFieldChange(id, 'modifiedBy', currentUser);
  };

  const handleSplitConfirm = (splitCount) => {
    if (!itemToSplit) return;

    const newEntries = [];
    for (let i = 1; i <= splitCount; i++) {
      newEntries.push({
        ...itemToSplit,
        _id: `split_${itemToSplit._id}_part${i}`,
        ipName: `${itemToSplit.ipName}_part${i}`,
        parentIp: itemToSplit.ipName,
        layoutClosed: 0,
        isPending: true, // Mark as pending
      });
    }

    setPendingSplitItems(prev => [...prev, ...newEntries]);
    setSplitModalOpen(false);
    setItemToSplit(null);
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
                  _id: `new_${Date.now()}`,
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
            <th style={{ minWidth: "200px", maxWidth: "200px", textAlign: "center" }} onClick={() => handleSort("ipName")}>
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
                <tr key={item._id} className={`${rowClass} ${item.isPending ? 'bg-blue-50' : ''}`}>
                  <td className="p-2 text-center">
                    <input
                      type="text"
                      value={item.ipName || ""}
                      onChange={(e) => handleFieldChange(item._id, "ipName", e.target.value)}
                      className={`w-full px-2 py-1 rounded border border-border bg-card text-card-foreground ${item.layoutClosed ? 'line-through' : ''}`}
                    />
                  </td>
                  <td className="p-2 text-center">
                    <select
                      value={item.designer || ""}
                      onChange={(e) => handleFieldChange(item._id, "designer", e.target.value)}
                      className={`w-full px-2 py-1 rounded border border-border bg-card text-card-foreground ${item.layoutClosed ? 'line-through' : ''}`}
                    >
                      <option value="">選擇Designer</option>
                      {allDesigners.map(designer => (
                        <option key={designer} value={designer}>{designer}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 text-center">
                    <DatePicker
                      selected={item.schematicFreeze ? new Date(item.schematicFreeze) : null}
                      onChange={(date) => handleFieldChange(item._id, "schematicFreeze", date ? date.toISOString().split('T')[0] : null)}
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
                      onChange={(date) => handleFieldChange(item._id, "lvsClean", date ? date.toISOString().split('T')[0] : null)}
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
                          onClick={() => handleDelete(item)}
                          className={`flex-1 px-3 py-1.5 bg-red-500 text-white rounded-md text-xs font-medium transition-colors hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${item.layoutClosed ? 'line-through' : ''}`}
                        >
                          Delete
                        </button>
                      </div>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleCloseRow(item._id)}
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
                          onClick={() => handleReopenRow(item._id)}
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
                  {/* 新增錯誤提示 */}
                  {invalidRows.includes(idx) && (
                    <td colSpan="7" style={{ color: 'red', fontWeight: 'bold' }}>
                      資料有誤，請檢查 IP Name 與 Mandays
                    </td>
                  )}
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
              _id: `new_${Date.now()}`,
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
