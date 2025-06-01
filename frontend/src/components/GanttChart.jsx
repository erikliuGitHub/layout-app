import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { getISOWeek, projectBarInfo, getISOWeekLabel } from "../utils/ganttUtils";
import { API_BASE_URL } from "../config";

// 在檔案最上方加上動畫 CSS
if (typeof window !== 'undefined' && !document.getElementById('gantt-bar-anim-style')) {
  const style = document.createElement('style');
  style.id = 'gantt-bar-anim-style';
  style.innerHTML = `
    .gantt-bar-anim {
      opacity: 0;
      transform: scaleX(0.8);
      animation: barFadeIn 0.5s cubic-bezier(.4,2,.6,1) forwards;
    }
    @keyframes barFadeIn {
      to { opacity: 1; transform: scaleX(1); }
    }

    .timeline-cell {
      position: relative;
      transition: all 0.2s ease;
    }

    .timeline-cell:hover {
      background-color: #f8fafc;
    }

    .timeline-cell.current {
      background-color: #fef2f2;
    }

    .timeline-cell.weekend {
      background-color: #f8fafc;
    }

    .timeline-header {
      position: sticky;
      top: 0;
      z-index: 20;
      background: white;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .timeline-month {
      background: linear-gradient(to bottom, #f8fafc, #f1f5f9);
      border-bottom: 1px solid #e2e8f0;
      font-weight: 600;
      color: #1e293b;
    }

    .timeline-week {
      background: white;
      border-bottom: 1px solid #e2e8f0;
    }

    .timeline-day {
      min-width: 60px;
      text-align: center;
      padding: 8px 4px;
      font-size: 14px;
      color: #475569;
      border-right: 1px solid #e2e8f0;
      position: relative;
    }

    .timeline-day.current {
      background-color: #fef2f2;
      color: #ef4444;
      font-weight: 600;
    }

    .timeline-day.weekend {
      color: #ef4444;
    }

    .timeline-total {
      background: white;
      border-bottom: 1px solid #e2e8f0;
      font-weight: 500;
      color: #1e293b;
    }

    .custom-tooltip {
      position: fixed;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
      font-size: 13px;
      color: #1e293b;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      z-index: 9999;
      pointer-events: none;
      white-space: nowrap;
      max-width: 320px;
      transform: translate(10px, 10px);
      backdrop-filter: blur(4px);
      background-color: rgba(255, 255, 255, 0.98);
    }

    .custom-tooltip .tooltip-header {
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      margin-bottom: 8px;
    }

    .custom-tooltip .tooltip-title {
      font-size: 14px;
      font-weight: 600;
      color: #0f766e;
      margin-bottom: 4px;
    }

    .custom-tooltip .tooltip-subtitle {
      font-size: 12px;
      color: #0369a1;
      font-weight: 500;
    }

    .custom-tooltip .tooltip-section {
      margin-bottom: 8px;
    }

    .custom-tooltip .tooltip-section:last-child {
      margin-bottom: 0;
    }

    .custom-tooltip .tooltip-row {
      display: flex;
      align-items: center;
      margin-bottom: 4px;
      font-size: 12px;
    }

    .custom-tooltip .tooltip-row:last-child {
      margin-bottom: 0;
    }

    .custom-tooltip .tooltip-label {
      color: #64748b;
      font-weight: 500;
      margin-right: 8px;
      min-width: 80px;
    }

    .custom-tooltip .tooltip-value {
      color: #1e293b;
      font-weight: 500;
    }

    .custom-tooltip .tooltip-status {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
    }

    .custom-tooltip .tooltip-status.completed {
      background-color: #dcfce7;
      color: #166534;
    }

    .custom-tooltip .tooltip-status.in-progress {
      background-color: #fef3c7;
      color: #92400e;
    }

    .custom-tooltip .tooltip-status.not-started {
      background-color: #f1f5f9;
      color: #475569;
    }

    .custom-tooltip .tooltip-status.cancel {
      background-color: #fee2e2;
      color: #991b1b;
    }

    .custom-tooltip .tooltip-status.review {
      background-color: #ede9fe;
      color: #6d28d9;
    }

    .custom-tooltip .tooltip-weight {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 12px;
      background-color: #fce7f3;
      color: #be185d;
      font-weight: 600;
    }

    .custom-tooltip .tooltip-date {
      color: #0f766e;
      font-weight: 500;
    }

    .custom-tooltip .tooltip-note {
      color: #dc2626;
      font-style: italic;
      font-size: 11px;
      padding: 4px 8px;
      background-color: #fee2e2;
      border-radius: 4px;
      margin-top: 4px;
    }

    .custom-tooltip::before {
      content: '';
      position: absolute;
      top: 50%;
      left: -5px;
      transform: translateY(-50%);
      border-width: 5px 5px 5px 0;
      border-style: solid;
      border-color: transparent #e2e8f0 transparent transparent;
    }

    .custom-tooltip::after {
      content: '';
      position: absolute;
      top: 50%;
      left: -4px;
      transform: translateY(-50%);
      border-width: 5px 5px 5px 0;
      border-style: solid;
      border-color: transparent white transparent transparent;
    }

    .custom-tooltip.right {
      transform: translate(-10px, 10px);
    }

    .custom-tooltip.right::before {
      left: auto;
      right: -5px;
      border-width: 5px 0 5px 5px;
      border-color: transparent transparent transparent #e2e8f0;
    }

    .custom-tooltip.right::after {
      left: auto;
      right: -4px;
      border-width: 5px 0 5px 5px;
      border-color: transparent transparent transparent white;
    }

    .custom-tooltip.top {
      transform: translate(10px, -10px);
    }

    .custom-tooltip.top::before {
      top: auto;
      bottom: -5px;
      left: 50%;
      transform: translateX(-50%);
      border-width: 5px 5px 0 5px;
      border-color: #e2e8f0 transparent transparent transparent;
    }

    .custom-tooltip.top::after {
      top: auto;
      bottom: -4px;
      left: 50%;
      transform: translateX(-50%);
      border-width: 5px 5px 0 5px;
      border-color: white transparent transparent transparent;
    }
  `;
  document.head.appendChild(style);
}

// 定義角色的時間安排數據結構
const ROLE_SCHEDULES = {
  designer: {
    color: "#4ade80",
    label: "Designer",
    timeField: "designerSchedule",
    weightField: "designerWeeklyWeights"
  },
  layoutLeader: {
    color: "#60a5fa",
    label: "Layout Leader",
    timeField: "layoutLeaderSchedule",
    weightField: "layoutLeaderWeeklyWeights"
  },
  layout: {
    color: "#f472b6",
    label: "Layout",
    timeField: "layoutSchedule",
    weightField: "layoutWeeklyWeights"
  }
};

// 定義狀態的顏色映射
const STATUS_COLORS = {
  "Not Started": "#94a3b8", // 灰色
  "In Progress": "#fbbf24", // 黃色
  "Completed": "#22c55e",   // 綠色
  "On Hold": "#ef4444",     // 紅色
  "Cancel": "#dc2626",      // 深紅色
  "Review": "#8b5cf6"       // 紫色
};

// 計算 Layout 比重的顏色深淺
const getLayoutWeightColor = (weight) => {
  if (!weight) return "#f472b6"; // 預設顏色
  const opacity = weight / 100; // weight 現在是百分比值，所以直接除以 100
  return `rgba(244, 114, 182, ${opacity})`; // 使用 rgba 來控制透明度
};

// 計算項目狀態的函數
const calculateStatus = (item) => {
  if (!item.schematicFreeze || !item.lvsClean) {
    return "Not Started";
  }

  const now = new Date();
  const start = new Date(item.schematicFreeze);
  const end = new Date(item.lvsClean);

  if (item.layoutClosed) {
    return "Completed";
  }

  if (now < start) {
    return "Not Started";
  }

  if (now > end) {
    return "Cancel";
  }

  if (item.reworkNote) {
    return "Review";
  }

  return "In Progress";
};

// 時間標籤優化
const timeLabelStyles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  date: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1e293b'
  },
  weekDay: {
    fontSize: '12px',
    color: '#64748b',
    marginLeft: '4px'
  },
  weekend: {
    color: '#ef4444'
  },
  today: {
    background: '#fef2f2',
    color: '#ef4444',
    fontWeight: '600',
    padding: '2px 6px',
    borderRadius: '4px'
  }
};

// 狀態短標籤與顏色
const STATUS_BADGE = {
  'Completed': { label: '完', color: '#22c55e' },
  'In Progress': { label: '進', color: '#fbbf24' },
  'Cancel': { label: '停', color: '#dc2626' },
  'On Hold': { label: '暫', color: '#ef4444' },
  'Review': { label: '審', color: '#8b5cf6' },
  'Not Started': { label: '未', color: '#94a3b8' },
  'Delay': { label: '遲', color: '#ef4444' }
};
const ABNORMAL_STATUS = ['Cancel', 'On Hold', 'Review', 'Delay'];

export default function GanttChart({
  ganttDesignerFilter,
  setGanttDesignerFilter,
  ganttLayoutOwnerFilter,
  setGanttLayoutOwnerFilter,
  ganttProjectFilter,
  setGanttProjectFilter
}) {
  const [viewMode, setViewMode] = useState("week");
  const [showHistory, setShowHistory] = useState(false);
  const [historyDate, setHistoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [projectsData, setProjectsData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pxPerWeek = 50;
  const [selectedProjectId, setSelectedProjectId] = useState("");
  // 狀態圖例收合/展開
  const [showStatusLegend, setShowStatusLegend] = useState(false);
  // 篩選條件
  const [statusFilter, setStatusFilter] = useState(''); // 單選
  const [ownerFilter, setOwnerFilter] = useState('');   // 單選
  const [keyword, setKeyword] = useState('');
  // 新增：用 state 控制 timeUnits 的起始日
  const [timeStartDate, setTimeStartDate] = useState(() => {
    const d = new Date();
    if (viewMode === 'week') d.setDate(d.getDate() - 28);
    return d;
  });
  const [showTotals, setShowTotals] = useState(true); // 新增 totals 顯示開關
  const [tooltip, setTooltip] = useState({
    show: false,
    content: '',
    x: 0,
    y: 0,
    position: 'left'
  });

  // 添加數據更新監聽
  useEffect(() => {
    console.log('Projects data updated:', projectsData);
  }, [projectsData]);

  // 添加過濾條件變化監聽
  useEffect(() => {
    console.log('Filters updated:', { statusFilter, ownerFilter, keyword });
  }, [statusFilter, ownerFilter, keyword]);

  // 添加視圖模式變化監聽
  useEffect(() => {
    console.log('View mode changed:', viewMode);
  }, [viewMode]);

  // 處理 viewMode 切換時自動重設 timeStartDate
  useEffect(() => {
    const d = new Date();
    if (viewMode === 'week') d.setDate(d.getDate() - 28);
    setTimeStartDate(d);
  }, [viewMode]);

  // 直接從 API 取得資料
  const fetchProjectsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/layouts`);
      if (!response.ok) throw new Error(`Failed to fetch data: ${response.status}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Failed to fetch data');
      console.log('API response:', result);
      setProjectsData(result.updatedProjectData || {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 添加自動刷新機制
  useEffect(() => {
    fetchProjectsData();
    
    // 設置自動刷新間隔（每5分鐘）
    const refreshInterval = setInterval(fetchProjectsData, 5 * 60 * 1000);
    
    // 清理函數
    return () => clearInterval(refreshInterval);
  }, [selectedProjectId, statusFilter, ownerFilter, keyword]); // 添加依賴項

  // 添加手動刷新按鈕
  const handleRefresh = () => {
    fetchProjectsData();
  };

  function generateTimeUnits(mode, startDate) {
    const units = [];
    const start = new Date(startDate);
    if (mode === "day") {
      for (let i = 0; i < 60; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        // 只保留週一到週五
        if (d.getDay() !== 0 && d.getDay() !== 6) {
          units.push({
            label: d.toISOString().slice(0, 10),
            date: d,
            isWeekend: false
          });
        }
      }
    } else if (mode === "week") {
      for (let i = 0; i < 20; i++) {
        const monday = new Date(start);
        monday.setDate(start.getDate() + i * 7);
        const iso = getISOWeek(monday); // 只回傳週數（如 '19'）
        const label = `W${iso}`;
        units.push({ label, date: monday, isoWeek: iso });
      }
    } else if (mode === "month") {
      for (let i = 0; i < 6; i++) {
        const first = new Date(start);
        first.setMonth(start.getMonth() + i);
        first.setDate(1);
        units.push({ label: first.toLocaleString("en-US", { month: "short", year: "numeric" }), date: first });
      }
    } else if (mode === "quarter") {
      // 以 startDate 為起點，產生 4 個季度
      let year = start.getFullYear();
      let quarter = Math.floor(start.getMonth() / 3) + 1;
      for (let i = 0; i < 4; i++) {
        const qStartMonth = (quarter - 1) * 3;
        const qStart = new Date(year, qStartMonth, 1);
        units.push({ label: `Q${quarter}`, date: qStart, quarter, year });
        quarter++;
        if (quarter > 4) { quarter = 1; year++; }
      }
    } else if (mode === "halfyear") {
      // 以 startDate 為起點，產生 2 個半年
      let year = start.getFullYear();
      let half = start.getMonth() < 6 ? 1 : 2;
      for (let i = 0; i < 2; i++) {
        const hStartMonth = (half - 1) * 6;
        const hStart = new Date(year, hStartMonth, 1);
        units.push({ label: `H${half}`, date: hStart, half, year });
        half++;
        if (half > 2) { half = 1; year++; }
      }
    }
    return units;
  }

  const [dayCellWidth, setDayCellWidth] = useState(24);
  const timeUnits = generateTimeUnits(viewMode, timeStartDate);
  const chartWidth = timeUnits.length * (viewMode === "day" ? dayCellWidth : viewMode === "week" ? 50 : 80);

  // 新增：左右箭頭與 Today 按鈕的事件
  const handlePrev = () => {
    setTimeStartDate(prev => {
      const d = new Date(prev);
      if (viewMode === 'day') d.setDate(d.getDate() - 10);
      else if (viewMode === 'week') d.setDate(d.getDate() - 7 * 5);
      else if (viewMode === 'month') d.setMonth(d.getMonth() - 2);
      return d;
    });
  };
  const handleNext = () => {
    setTimeStartDate(prev => {
      const d = new Date(prev);
      if (viewMode === 'day') d.setDate(d.getDate() + 10);
      else if (viewMode === 'week') d.setDate(d.getDate() + 7 * 5);
      else if (viewMode === 'month') d.setMonth(d.getMonth() + 2);
      return d;
    });
  };
  const handleToday = () => {
    const d = new Date();
    if (viewMode === 'week') d.setDate(d.getDate() - 28);
    setTimeStartDate(d);
  };

  // 取得所有 projectId
  const allProjectIds = Object.keys(projectsData);

  // 取得所有不重複的 layout owner 名字
  const allLayoutOwners = useMemo(() => {
    const owners = new Set();
    Object.values(projectsData).forEach(items => {
      items.forEach(item => {
        if (item.layoutOwner) {
          owners.add(item.layoutOwner);
        }
      });
    });
    return Array.from(owners).sort();
  }, [projectsData]);

  // 根據展開狀態產生顯示用 items
  const displayItems = useMemo(() => {
    // 分組：projectId => [items]
    const grouped = {};
    Object.entries(projectsData).forEach(([projectId, items]) => {
      grouped[projectId] = items.map(item => ({ ...item, projectId }));
    });
    let result = [];
    allProjectIds.forEach(pid => {
      const items = grouped[pid] || [];
      if (items.length === 0) return;
      // Project row
      result.push({
        isProjectRow: true,
        projectId: pid,
        projectName: pid,
        ipCount: items.length,
        firstItem: items[0],
      });
      // Always show all IP rows
      result = result.concat(items.map(item => ({ ...item, isProjectRow: false })));
    });
    return result;
  }, [projectsData, allProjectIds]);

  // 篩選後的 items（只針對 IP rows 過濾，Project row 只在有子項時顯示）
  const filteredItems = useMemo(() => {
    // 先分組：projectId => [ip rows]
    const grouped = {};
    displayItems.forEach(item => {
      if (!item.isProjectRow) {
        if (!grouped[item.projectId]) grouped[item.projectId] = [];
        grouped[item.projectId].push(item);
      }
    });
    let result = [];
    Object.entries(grouped).forEach(([projectId, ipRows]) => {
      // 過濾 IP rows
      const filteredIps = ipRows.filter(item => {
        if (selectedProjectId && selectedProjectId !== '' && item.projectId !== selectedProjectId) return false;
        const status = calculateStatus(item);
        if (statusFilter && status !== statusFilter) return false;
        if (ownerFilter && ownerFilter !== "" && item.designer !== ownerFilter && item.layoutOwner !== ownerFilter) return false;
        if (keyword) {
          const kw = keyword.toLowerCase();
          const matches = (
            (item.projectId && item.projectId.toLowerCase().includes(kw)) ||
            (item.ipName && item.ipName.toLowerCase().includes(kw)) ||
            (item.reworkNote && item.reworkNote.toLowerCase().includes(kw))
          );
          if (!matches) return false;
        }
        return true;
      });
      // 不再加入 Project row，僅加入過濾後的 IP rows
      result = result.concat(filteredIps);
    });
    return result;
  }, [displayItems, statusFilter, ownerFilter, keyword, selectedProjectId]);

  // 計算每個角色的工作量
  const calculateRoleWorkload = (items, role, unit) => {
    let count = 0;
    let total = 0;
    
    items.forEach(item => {
      const status = calculateStatus(item);
      if (status === 'Cancel') return;
      
      let show = false;
      if (role === 'designer') {
        const barStart = item.schematicFreeze ? new Date(item.schematicFreeze) : null;
        const barEnd = item.lvsClean ? new Date(item.lvsClean) : null;
        if (viewMode === 'day') {
          show = barStart && barEnd && unit.date >= barStart && unit.date <= barEnd;
        } else if (viewMode === 'week') {
          const weekEnd = new Date(unit.date);
          weekEnd.setDate(weekEnd.getDate() + 6);
          show = barStart && barEnd && weekEnd > barStart && unit.date < barEnd;
        } else if (viewMode === 'month') {
          const monthEnd = new Date(unit.date);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          monthEnd.setDate(0);
          show = barStart && barEnd && monthEnd > barStart && unit.date < barEnd;
        } else if (viewMode === 'quarter') {
          const qEnd = new Date(unit.date);
          qEnd.setMonth(qEnd.getMonth() + 3);
          show = barStart && barEnd && qEnd > barStart && unit.date < barEnd;
        } else if (viewMode === 'halfyear') {
          const hEnd = new Date(unit.date);
          hEnd.setMonth(hEnd.getMonth() + 6);
          hEnd.setDate(hEnd.getDate() - 1);
          show = barStart && barEnd && hEnd > barStart && unit.date < barEnd;
        }
      } else if (role === 'layoutLeader') {
        const barStart = item.layoutLeaderSchematicFreeze ? new Date(item.layoutLeaderSchematicFreeze) : null;
        const barEnd = item.layoutLeaderLvsClean ? new Date(item.layoutLeaderLvsClean) : null;
        if (viewMode === 'day') {
          show = barStart && barEnd && unit.date >= barStart && unit.date <= barEnd;
        } else if (viewMode === 'week') {
          const weekEnd = new Date(unit.date);
          weekEnd.setDate(weekEnd.getDate() + 6);
          show = barStart && barEnd && weekEnd > barStart && unit.date < barEnd;
        } else if (viewMode === 'month') {
          const monthEnd = new Date(unit.date);
          monthEnd.setMonth(monthEnd.getMonth() + 1);
          monthEnd.setDate(0);
          show = barStart && barEnd && monthEnd > barStart && unit.date < barEnd;
        } else if (viewMode === 'quarter') {
          const qEnd = new Date(unit.date);
          qEnd.setMonth(qEnd.getMonth() + 3);
          show = barStart && barEnd && qEnd > barStart && unit.date < barEnd;
        } else if (viewMode === 'halfyear') {
          const hEnd = new Date(unit.date);
          hEnd.setMonth(hEnd.getMonth() + 6);
          hEnd.setDate(hEnd.getDate() - 1);
          show = barStart && barEnd && hEnd > barStart && unit.date < barEnd;
        }
      } else if (role === 'layout') {
        if (Array.isArray(item.weeklyWeights)) {
          if (viewMode === 'day') {
            const day = unit.date;
            if (day && typeof day.getDate === 'function' && typeof day.getDay === 'function') {
              const weekMonday = new Date(day);
              weekMonday.setDate(day.getDate() - (day.getDay() === 0 ? 6 : day.getDay() - 1));
              const isoWeek = getISOWeek(weekMonday);
              show = item.weeklyWeights.some(w => w.week && w.week.endsWith('W' + isoWeek));
            }
          } else if (viewMode === 'week') {
            show = item.weeklyWeights.some(w => w.week && w.week.endsWith(unit.label));
          } else if (viewMode === 'month') {
            if (unit.date && typeof unit.date.getMonth === 'function' && typeof unit.date.getFullYear === 'function') {
              const month = unit.date.getMonth();
              const year = unit.date.getFullYear();
              show = item.weeklyWeights.some(w => {
                if (!w.week) return false;
                const match = w.week.match(/(\d{4})?-?W(\d{2})/);
                if (!match) return false;
                let wYear = match[1] ? parseInt(match[1], 10) : year;
                let wNum = parseInt(match[2], 10);
                const jan1 = new Date(wYear, 0, 1);
                const weekMonday = new Date(jan1.setDate(jan1.getDate() + (wNum - 1) * 7));
                return weekMonday.getFullYear() === year && weekMonday.getMonth() === month;
              });
            } else {
              show = false;
            }
          } else if (viewMode === 'quarter') {
            const qStart = unit.date;
            const qEnd = new Date(qStart);
            qEnd.setMonth(qEnd.getMonth() + 3);
            show = item.weeklyWeights.some(w => {
              if (!w.week) return false;
              const match = w.week.match(/(\d{4})?-?W(\d{2})/);
              if (!match) return false;
              let wYear = match[1] ? parseInt(match[1], 10) : unit.year;
              let wNum = parseInt(match[2], 10);
              const jan1 = new Date(wYear, 0, 1);
              const weekMonday = new Date(jan1.setDate(jan1.getDate() + (wNum - 1) * 7));
              return weekMonday >= qStart && weekMonday <= qEnd;
            });
          } else if (viewMode === 'halfyear') {
            const hStart = unit.date;
            const hEnd = new Date(hStart);
            hEnd.setMonth(hEnd.getMonth() + 6);
            hEnd.setDate(hEnd.getDate() - 1);
            show = item.weeklyWeights.some(w => {
              if (!w.week) return false;
              const match = w.week.match(/(\d{4})?-?W(\d{2})/);
              if (!match) return false;
              let wYear = match[1] ? parseInt(match[1], 10) : unit.year;
              let wNum = parseInt(match[2], 10);
              const jan1 = new Date(wYear, 0, 1);
              const weekMonday = new Date(jan1.setDate(jan1.getDate() + (wNum - 1) * 7));
              return weekMonday >= hStart && weekMonday <= hEnd;
            });
          }
        }
      }
      
      if (show) count++;
      if (item[role === 'designer' ? 'schematicFreeze' : role === 'layoutLeader' ? 'layoutLeaderSchematicFreeze' : 'weeklyWeights']) total++;
    });
    
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };

  // 為每個角色計算工作量
  const roleWeights = Object.keys(ROLE_SCHEDULES).reduce((acc, role) => {
    acc[role] = calculateRoleWorkload(filteredItems, role, historyDate);
    return acc;
  }, {});

  // 計算項目在特定時間段的任務數
  const calculateTaskCount = (items, unit) => {
    const unitStart = unit.date;
    const unitEnd = new Date(unitStart);
    
    if (viewMode === "day") {
      unitEnd.setDate(unitEnd.getDate());
    } else if (viewMode === "week") {
      unitEnd.setDate(unitEnd.getDate() + 6);
    } else if (viewMode === "month") {
      unitEnd.setMonth(unitEnd.getMonth() + 1);
      unitEnd.setDate(0);
    }

    return items.reduce((count, item) => {
      let hasActiveSchedule = false;
      
      // 檢查每個角色的時間安排
      Object.values(ROLE_SCHEDULES).forEach(roleConfig => {
        const schedule = item[roleConfig.timeField] || [];
        if (schedule.length === 0 && item.schematicFreeze && item.lvsClean) {
          // fallback: 用舊欄位組一個 schedule
          schedule.push({
            startDate: item.schematicFreeze,
            endDate: item.lvsClean,
            date: '', // 沒有版本資訊
          });
        }
        if (schedule.length === 0) return;
        
        // 如果查看歷史版本，找出該日期之前最近的記錄
        let relevantSchedule;
        if (showHistory) {
          relevantSchedule = schedule
            .filter(s => s.date <= historyDate)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        } else {
          relevantSchedule = schedule[schedule.length - 1];
        }
        
        if (relevantSchedule) {
          const start = new Date(relevantSchedule.startDate);
          const end = new Date(relevantSchedule.endDate);
          if (start <= unitEnd && end >= unitStart) {
            hasActiveSchedule = true;
          }
        }
      });
      
      return hasActiveSchedule ? count + 1 : count;
    }, 0);
  };

  const weekTaskCount = timeUnits.map(unit => calculateTaskCount(filteredItems, unit));

  // Responsive: 動態計算日格寬度
  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth;
      if (w < 600) setDayCellWidth(20);
      else if (w < 900) setDayCellWidth(22);
      else if (w < 1200) setDayCellWidth(24);
      else if (w < 1600) setDayCellWidth(28);
      else setDayCellWidth(32);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 拖曳狀態
  const [dragBar, setDragBar] = useState(null); // {itemIdx, type: 'start'|'end', startX, origDate}
  const ganttTableRef = useRef();

  // Zoom 控制
  const minDayCellWidth = 12;
  const maxDayCellWidth = 48;
  const zoomStep = 4;
  const zoomLevel = Math.round((dayCellWidth / 24) * 10) / 10; // 24px 為 x1

  // 計算每個 cell 內的天數和有任務的天數
  function calculateRoleDayRatio(item, role, unit, viewMode) {
    // 取得 cell 內所有天數
    let days = [];
    let start = new Date(unit.date);
    let end = new Date(unit.date);
    if (viewMode === 'day') {
      days = [new Date(start)];
    } else if (viewMode === 'week') {
      for (let i = 0; i < 7; i++) {
        let d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
      }
    } else if (viewMode === 'month') {
      let month = start.getMonth();
      let d = new Date(start);
      while (d.getMonth() === month) {
        days.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
    } else if (viewMode === 'quarter') {
      let d = new Date(start);
      let endQ = new Date(start);
      endQ.setMonth(endQ.getMonth() + 3);
      while (d < endQ) {
        days.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
    } else if (viewMode === 'halfyear') {
      let d = new Date(start);
      let endH = new Date(start);
      endH.setMonth(endH.getMonth() + 6);
      while (d < endH) {
        days.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
    }

    // 計算有任務的天數
    let hasTaskDays = 0;
    let weight = 0;

    if (role === 'layout') {
      // layout 以 weeklyWeights 判斷
      if (Array.isArray(item.weeklyWeights)) {
        // 找出這一天屬於哪個 ISO week
        if (days.length > 0 && days[0] && typeof days[0].getDate === 'function' && typeof days[0].getDay === 'function') {
          const weekMonday = new Date(days[0]);
          weekMonday.setDate(days[0].getDate() - (days[0].getDay() === 0 ? 6 : days[0].getDay() - 1));
          const isoWeek = getISOWeek(weekMonday);
          const weekWeight = item.weeklyWeights.find(w => w.week && w.week.endsWith('W' + isoWeek));
          if (weekWeight && weekWeight.value > 0) {
            hasTaskDays = days.length;
            // 將小數值轉換為百分比
            weight = Math.round(weekWeight.value * 100);
          }
        }
      }
    } else {
      // 其他角色的計算保持不變
      days.forEach(day => {
        let barStart = null, barEnd = null;
        if (role === 'designer') {
          barStart = item.schematicFreeze ? new Date(item.schematicFreeze) : null;
          barEnd = item.lvsClean ? new Date(item.lvsClean) : null;
        } else if (role === 'layoutLeader') {
          barStart = item.layoutLeaderSchematicFreeze ? new Date(item.layoutLeaderSchematicFreeze) : null;
          barEnd = item.layoutLeaderLvsClean ? new Date(item.layoutLeaderLvsClean) : null;
        }
        if (barStart && barEnd && day && typeof day.getTime === 'function' && day >= barStart && day <= barEnd) {
          hasTaskDays++;
        }
      });
    }

    if (role === 'layout') {
      return {
        ratio: days.length > 0 ? Math.round((hasTaskDays / days.length) * 100) : 0,
        weight: weight
      };
    }
    return days.length > 0 ? Math.round((hasTaskDays / days.length) * 100) : 0;
  }

  // 處理滑鼠移動事件
  const handleMouseMove = useCallback((e) => {
    if (tooltip.show) {
      const tooltipElement = document.querySelector('.custom-tooltip');
      if (!tooltipElement) return;

      const tooltipRect = tooltipElement.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      // 計算 tooltip 的位置
      let x = e.clientX;
      let y = e.clientY;
      let position = 'left';

      // 檢查右側空間
      if (x + tooltipRect.width + 20 > windowWidth) {
        x = e.clientX - tooltipRect.width - 10;
        position = 'right';
      } else {
        x = e.clientX + 10;
      }

      // 檢查底部空間
      if (y + tooltipRect.height + 20 > windowHeight) {
        y = e.clientY - tooltipRect.height - 10;
        position = position === 'right' ? 'right top' : 'left top';
      } else {
        y = e.clientY + 10;
      }

      // 確保不會超出視窗邊界
      x = Math.max(10, Math.min(x, windowWidth - tooltipRect.width - 10));
      y = Math.max(10, Math.min(y, windowHeight - tooltipRect.height - 10));

      setTooltip(prev => ({
        ...prev,
        x,
        y,
        position
      }));
    }
  }, [tooltip.show]);

  // 添加滑鼠移動事件監聽
  useEffect(() => {
    if (tooltip.show) {
      window.addEventListener('mousemove', handleMouseMove);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [tooltip.show, handleMouseMove]);

  // 處理 tooltip 顯示
  const handleTooltipShow = useCallback((e, content) => {
    const x = e.clientX;
    const y = e.clientY;
    setTooltip({
      show: true,
      content,
      x,
      y,
      position: 'left'
    });
  }, []);

  // 處理 tooltip 隱藏
  const handleTooltipHide = useCallback(() => {
    setTooltip(prev => ({
      ...prev,
      show: false
    }));
  }, []);

  // 生成 tooltip 內容
  const generateTooltipContent = (item, role, unit, workload) => {
    const status = calculateStatus(item);
    const statusClass = status.toLowerCase().replace(' ', '-');

    const header = (
      <div className="tooltip-header">
        <div className="tooltip-title">{item.ipName}</div>
        <div className="tooltip-subtitle">{item.projectId}</div>
      </div>
    );

    const statusRow = (
      <div className="tooltip-row">
        <span className="tooltip-label">Status</span>
        <span className={`tooltip-status ${statusClass}`}>{status}</span>
      </div>
    );

    if (role === 'designer') {
      return (
        <>
          {header}
          <div className="tooltip-section">
            {statusRow}
            <div className="tooltip-row">
              <span className="tooltip-label">Designer</span>
              <span className="tooltip-value">{item.designer || 'N/A'}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">Start</span>
              <span className="tooltip-date">
                {item.schematicFreeze ? new Date(item.schematicFreeze).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">End</span>
              <span className="tooltip-date">
                {item.lvsClean ? new Date(item.lvsClean).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </>
      );
    } else if (role === 'layoutLeader') {
      return (
        <>
          {header}
          <div className="tooltip-section">
            {statusRow}
            <div className="tooltip-row">
              <span className="tooltip-label">Layout Leader</span>
              <span className="tooltip-value">{item.layoutOwner || 'N/A'}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">Start</span>
              <span className="tooltip-date">
                {item.layoutLeaderSchematicFreeze ? new Date(item.layoutLeaderSchematicFreeze).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">End</span>
              <span className="tooltip-date">
                {item.layoutLeaderLvsClean ? new Date(item.layoutLeaderLvsClean).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </>
      );
    } else if (role === 'layout') {
      const weightInfo = typeof workload === 'object' ? (
        <div className="tooltip-row">
          <span className="tooltip-label">Weight</span>
          <span className="tooltip-weight">{workload.weight}%</span>
        </div>
      ) : (
        <div className="tooltip-row">
          <span className="tooltip-value">No weight data</span>
        </div>
      );

      return (
        <>
          {header}
          <div className="tooltip-section">
            {statusRow}
            <div className="tooltip-row">
              <span className="tooltip-label">Layout Owner</span>
              <span className="tooltip-value">{item.layoutOwner || 'N/A'}</span>
            </div>
            <div className="tooltip-row">
              <span className="tooltip-label">Week</span>
              <span className="tooltip-value">{unit.label}</span>
            </div>
            {weightInfo}
            {item.reworkNote && (
              <div className="tooltip-note">
                {item.reworkNote}
              </div>
            )}
          </div>
        </>
      );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-4 overflow-x-auto">
      {/* Project 選擇下拉選單等操作區 */}
      <div className="flex flex-wrap gap-4 mb-4 items-center">
        <div>
          <label className="font-semibold mr-2">Project</label>
          <select
            value={selectedProjectId}
            onChange={e => setSelectedProjectId(e.target.value)}
            className="px-2 py-1 rounded border border-border bg-card text-card-foreground min-w-[120px]"
          >
            <option value="">All</option>
            {allProjectIds.map(pid => (
              <option key={pid} value={pid}>{pid}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-semibold mr-2">View Mode</label>
          <select
            value={viewMode}
            onChange={e => setViewMode(e.target.value)}
            className="px-2 py-1 rounded border border-border bg-card text-card-foreground min-w-[100px]"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="quarter">Quarterly</option>
            <option value="halfyear">Half Year</option>
          </select>
        </div>
        <div>
          <label className="font-semibold mr-2">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-2 py-1 rounded border border-border bg-card text-card-foreground min-w-[100px]">
            <option value="">（全部）</option>
            {Object.keys(STATUS_COLORS).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-semibold mr-2">Owner</label>
          <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} className="px-2 py-1 rounded border border-border bg-card text-card-foreground min-w-[100px]">
            <option value="">（全部）</option>
            {allLayoutOwners.map(owner => (
              <option key={owner} value={owner}>{owner}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="font-semibold mr-2">Keyword</label>
          <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Search IP/Project/Note" className="px-2 py-1 rounded border border-border bg-card text-card-foreground min-w-[120px]" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={handleRefresh}
            className="px-3 py-1 bg-primary text-primary-foreground rounded font-semibold hover:bg-primary/90"
            title="Refresh data from database"
          >
            Refresh
          </button>
          <label className="font-medium flex items-center">
            <input
              type="checkbox"
              checked={showHistory}
              onChange={e => setShowHistory(e.target.checked)}
              className="mr-1 accent-primary"
            />
            Show Historical Data
          </label>
          {showHistory && (
            <input
              type="date"
              value={historyDate}
              onChange={e => setHistoryDate(e.target.value)}
              className="px-2 py-1 rounded border border-border bg-card text-card-foreground"
            />
          )}
        </div>
      </div>
      {/* 操作區 + 圖例區分行顯示 */}
      <div className="flex flex-col gap-4 mb-4">
        {/* 圖例區 */}
        <div className="flex gap-4 items-center flex-wrap">
          {/* 角色圖例 */}
          <div className="flex gap-4 items-center">
            {Object.entries(ROLE_SCHEDULES).map(([role, config]) => (
              <div key={role} className="flex items-center gap-2">
                <div className="w-4 h-4 bg-gray-500 rounded" style={{ backgroundColor: config.color }} />
                <span className="text-sm text-gray-900 font-medium">{config.label}</span>
              </div>
            ))}
          </div>
          {/* 狀態圖例收合/展開按鈕與內容 */}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setShowStatusLegend(v => !v)}
              className="px-2 py-1 bg-gray-200 text-gray-900 rounded font-medium hover:bg-gray-300"
            >
              {showStatusLegend ? "隱藏狀態說明" : "顯示狀態說明"}
            </button>
            {showStatusLegend && (
              <div className="flex gap-2 items-center ml-2">
                {Object.entries(STATUS_COLORS).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-500 rounded" style={{ backgroundColor: color }} />
                    <span className="text-sm text-gray-900 font-medium">{status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Totals 顯示開關 */}
      <div className="flex items-center gap-2 mb-2">
        <label className="font-medium flex items-center">
          <input
            type="checkbox"
            checked={showTotals}
            onChange={e => setShowTotals(e.target.checked)}
            className="mr-1 accent-primary"
          />
          顯示Total
        </label>
      </div>
      {loading && <div className="text-primary mb-2">Loading...</div>}
      {error && <div className="text-red-500 mb-2">Error: {error}</div>}
      <div className="overflow-x-auto max-w-full">
        <div className="w-full relative">
          {/* 日期平移按鈕，緊貼時間軸上方 */}
          <div className="flex items-center gap-4 mb-4 ml-200">
            <button onClick={handlePrev} className="px-2 py-1 rounded border border-border bg-card text-card-foreground hover:bg-primary hover:text-primary-foreground">
              &lt;
            </button>
            <button onClick={handleToday} className="px-2 py-1 rounded border border-border bg-card text-card-foreground hover:bg-primary hover:text-primary-foreground">
              Today
            </button>
            <button onClick={handleNext} className="px-2 py-1 rounded border border-border bg-card text-card-foreground hover:bg-primary hover:text-primary-foreground">
              &gt;
            </button>
            {/* Zoom 控制只在日視圖顯示 */}
            {viewMode === 'day' && (
              <>
                <button
                  onClick={() => setDayCellWidth(w => Math.max(minDayCellWidth, w - zoomStep))}
                  className="px-2 py-1 rounded border border-border bg-card text-card-foreground hover:bg-primary hover:text-primary-foreground"
                  title="Zoom Out"
                  disabled={dayCellWidth <= minDayCellWidth}
                >-</button>
                <span className="font-medium text-gray-900 mx-2 min-w-[32px] inline-block text-center">x{zoomLevel}</span>
                <button
                  onClick={() => setDayCellWidth(w => Math.min(maxDayCellWidth, w + zoomStep))}
                  className="px-2 py-1 rounded border border-border bg-card text-card-foreground hover:bg-primary hover:text-primary-foreground"
                  title="Zoom In"
                  disabled={dayCellWidth >= maxDayCellWidth}
                >+</button>
              </>
            )}
          </div>
          <table className="border-collapse gantt-table" style={{ width: chartWidth, borderSpacing: 0 }}>
            <thead>
              {/* 第一行：月份（或空白） */}
              <tr className="sticky top-0 z-20 bg-white border-b-2 border-gray-200 shadow-sm">
                <th className="w-40 bg-white"></th>
                {timeUnits.map((unit, idx) => (
                  <th
                    key={`month-header-${idx}`}
                    colSpan={1}
                    className="text-center font-medium text-base py-4 bg-gradient-to-b from-gray-50 to-white border-b border-gray-200"
                    style={viewMode === 'day' ? { width: dayCellWidth, minWidth: dayCellWidth, maxWidth: dayCellWidth } : {}}
                  >
                    {viewMode === 'month'
                      ? ''
                      : (idx === 0 ||
                        (unit.date && timeUnits[idx - 1]?.date && unit.date?.getMonth?.() !== timeUnits[idx - 1].date?.getMonth?.())
                        ? unit.date?.toLocaleString?.('en-US', { month: 'short', year: 'numeric' })
                        : '')}
                  </th>
                ))}
              </tr>
              {/* 第二行：日/週/月標籤 */}
              <tr className="sticky top-[52px] z-20 bg-white border-b border-gray-200">
                <th className="w-40 bg-white"></th>
                {timeUnits.map((unit, idx) => {
                  const now = new Date();
                  let isCurrent = false;
                  if (viewMode === 'day') {
                    isCurrent = unit.date?.toDateString?.() === now.toDateString();
                  } else if (viewMode === 'week') {
                    const getISOWeek = (date) => {
                      const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                      const dayNum = d.getUTCDay() || 7;
                      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
                      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                      const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
                      return weekNum.toString().padStart(2, '0');
                    };
                    isCurrent = unit.isoWeek === getISOWeek(now);
                  } else if (viewMode === 'month') {
                    isCurrent = unit.date?.getFullYear?.() === now.getFullYear() && unit.date?.getMonth?.() === now.getMonth();
                  } else if (viewMode === 'quarter') {
                    // 當前季度
                    const nowQuarter = Math.floor(now.getMonth() / 3) + 1;
                    isCurrent = unit.year === now.getFullYear() && unit.quarter === nowQuarter;
                  } else if (viewMode === 'halfyear') {
                    const nowHalf = now.getMonth() < 6 ? 1 : 2;
                    isCurrent = unit.year === now.getFullYear() && unit.half === nowHalf;
                  }
                  return (
                    <th
                      key={`unit-${idx}`}
                      className={`font-medium text-base px-2 py-3 min-w-[60px] text-center border-r border-gray-200 transition-colors duration-200 ${
                        isCurrent ? 'bg-red-50 text-red-600 font-semibold' : 'bg-white text-gray-700'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        {viewMode === 'week' ? (
                          <>
                            <span className="text-lg font-semibold">W{unit.isoWeek}</span>
                            <span className="text-xs text-gray-500 mt-1">
                              {unit.date?.toLocaleDateString?.('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </>
                        ) : viewMode === 'month' ? (
                          <>
                            <span className="text-lg font-semibold">{unit.label}</span>
                            <span className="text-xs text-gray-500 mt-1">
                              {unit.date?.getFullYear?.()}
                            </span>
                          </>
                        ) : viewMode === 'quarter' ? (
                          <span className="text-lg font-semibold">{unit.label}</span>
                        ) : viewMode === 'halfyear' ? (
                          <span className="text-lg font-semibold">{unit.label}</span>
                        ) : (
                          <>
                            <span className={`text-lg font-semibold ${isCurrent ? 'text-red-600' : ''}`}>
                              {unit.date?.getDate?.()?.toString().padStart(2, "0")}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">
                              {unit.date?.toLocaleDateString?.('en-US', { weekday: 'short' })}
                            </span>
                          </>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
              {showTotals && (
                <>
                  <tr className="sticky top-[104px] z-20 bg-white border-b border-gray-200">
                    <th className="w-200 min-w-200 max-w-200 font-medium text-base text-primary py-4 bg-white">Designer Total</th>
                    {timeUnits.map((unit, idx) => (
                      <th
                        key={`designer-total-${idx}`}
                        className="w-16 min-w-16 max-w-16 text-center font-medium text-base text-gray-900 py-4 bg-white border-r border-gray-200"
                      >
                        {weekTaskCount[idx]}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th className="w-200 min-w-200 max-w-200 font-medium text-base text-primary py-4">Layout Leader Total</th>
                    {timeUnits.map((unit, idx) => {
                      let count = 0;
                      if (viewMode === 'week') {
                        const weekStart = unit.date;
                        const weekEnd = new Date(weekStart);
                        weekEnd.setDate(weekEnd.getDate() + 6);
                        count = filteredItems.reduce((acc, item) => {
                          const status = calculateStatus(item);
                          if (status === 'Cancel') return acc;
                          const barStart = item.layoutLeaderSchematicFreeze ? new Date(item.layoutLeaderSchematicFreeze) : null;
                          const barEnd = item.layoutLeaderLvsClean ? new Date(item.layoutLeaderLvsClean) : null;
                          if (barStart && barEnd && weekEnd > barStart && weekStart < barEnd) {
                            return acc + 1;
                          }
                          return acc;
                        }, 0);
                      } else {
                        count = filteredItems.reduce((acc, item) => {
                          const status = calculateStatus(item);
                          if (status === 'Cancel') return acc;
                          let show = false;
                          if (viewMode === 'day') {
                            const startDate = item.layoutLeaderSchematicFreeze ? new Date(item.layoutLeaderSchematicFreeze) : null;
                            const endDate = item.layoutLeaderLvsClean ? new Date(item.layoutLeaderLvsClean) : null;
                            const unitDate = unit.date;
                            show = startDate && endDate && unitDate >= startDate && unitDate <= endDate;
                          } else if (viewMode === 'month') {
                            const barStart = item.layoutLeaderSchematicFreeze ? new Date(item.layoutLeaderSchematicFreeze) : null;
                            const barEnd = item.layoutLeaderLvsClean ? new Date(item.layoutLeaderLvsClean) : null;
                            const monthStart = unit.date;
                            const monthEnd = new Date(monthStart);
                            monthEnd.setMonth(monthEnd.getMonth() + 1);
                            monthEnd.setDate(0);
                            show = barStart && barEnd && monthEnd > barStart && monthStart < barEnd;
                          }
                          return show ? acc + 1 : acc;
                        }, 0);
                      }
                      return (
                        <th
                          key={`layoutleader-total-${idx}`}
                          className="w-16 min-w-16 max-w-16 text-center font-medium text-base text-gray-900 py-4"
                        >
                          {count}
                        </th>
                      );
                    })}
                  </tr>
                  <tr>
                    <th className="w-200 min-w-200 max-w-200 font-medium text-base text-primary py-4">Layout Total</th>
                    {timeUnits.map((unit, idx) => {
                      let count = 0;
                      if (viewMode === 'week') {
                        const weekLabel = unit.label;
                        count = filteredItems.reduce((acc, item) => {
                          const status = calculateStatus(item);
                          if (status === 'Cancel') return acc;
                          if (Array.isArray(item.weeklyWeights) && item.weeklyWeights.some(w => w.week && w.week.endsWith(weekLabel) && w.value > 0)) {
                            return acc + 1;
                          }
                          return acc;
                        }, 0);
                      } else {
                        count = filteredItems.reduce((acc, item) => {
                          const status = calculateStatus(item);
                          if (status === 'Cancel') return acc;
                          let show = false;
                          if (Array.isArray(item.weeklyWeights) && item.weeklyWeights.length > 0) {
                            if (viewMode === 'day') {
                              const day = unit.date;
                              const weekMonday = new Date(day);
                              weekMonday.setDate(day.getDate() - (day.getDay() === 0 ? 6 : day.getDay() - 1));
                              const isoWeek = getISOWeek(weekMonday);
                              show = item.weeklyWeights.some(w => w.week && w.week.endsWith('W' + isoWeek));
                            } else if (viewMode === 'month') {
                              if (unit.date && typeof unit.date.getMonth === 'function' && typeof unit.date.getFullYear === 'function') {
                                const month = unit.date.getMonth();
                                const year = unit.date.getFullYear();
                                show = item.weeklyWeights.some(w => {
                                  if (!w.week) return false;
                                  const match = w.week.match(/(\d{4})?-?W(\d{2})/);
                                  if (!match) return false;
                                  let wYear = match[1] ? parseInt(match[1], 10) : year;
                                  let wNum = parseInt(match[2], 10);
                                  const jan1 = new Date(wYear, 0, 1);
                                  const weekMonday = new Date(jan1.setDate(jan1.getDate() + (wNum - 1) * 7));
                                  return weekMonday.getFullYear() === year && weekMonday.getMonth() === month;
                                });
                              } else {
                                show = false;
                              }
                            }
                          }
                          return show ? acc + 1 : acc;
                        }, 0);
                      }
                      return (
                        <th
                          key={`layout-total-${idx}`}
                          className="w-16 min-w-16 max-w-16 text-center font-medium text-base text-gray-900 py-4"
                        >
                          {count}
                        </th>
                      );
                    })}
                  </tr>
                </>
              )}
            </thead>

            {/* Project items */}
            <tbody>
              {filteredItems.map((item, itemIdx) => {
                const status = calculateStatus(item);
                // 斑馬條紋：偶數行 bg-white，奇數行 bg-gray-100（更深）
                const zebraBg = itemIdx % 2 === 0 ? 'bg-white' : 'bg-gray-100';
                // Designer bar 起訖
                const designerStart = item.schematicFreeze ? timeUnits.findIndex(u => u.label === new Date(item.schematicFreeze).toISOString().slice(0, 10)) : -1;
                const designerEnd = item.lvsClean ? timeUnits.findIndex(u => u.label === new Date(item.lvsClean).toISOString().slice(0, 10)) : -1;
                // Layout Leader bar 起訖
                const layoutLeaderStart = item.layoutLeaderSchematicFreeze ? timeUnits.findIndex(u => u.label === new Date(item.layoutLeaderSchematicFreeze).toISOString().slice(0, 10)) : -1;
                const layoutLeaderEnd = item.layoutLeaderLvsClean ? timeUnits.findIndex(u => u.label === new Date(item.layoutLeaderLvsClean).toISOString().slice(0, 10)) : -1;
                // Bar 時間區間
                const barStart = item.schematicFreeze ? new Date(item.schematicFreeze) : null;
                const barEnd = item.lvsClean ? new Date(item.lvsClean) : null;
                const layoutBarStart = item.layoutLeaderSchematicFreeze ? new Date(item.layoutLeaderSchematicFreeze) : null;
                const layoutBarEnd = item.layoutLeaderLvsClean ? new Date(item.layoutLeaderLvsClean) : null;
                return (
                  <tr
                    key={`${item.projectId}-${item.ipName}`}
                    className={`${zebraBg}`}
                    style={{ height: '22px', minHeight: 0, borderBottom: 'none' }}
                  >
                    <td className="w-56 min-w-56 max-w-56 px-2 py-0 align-top" style={{ minHeight: 0, height: '22px', padding: 0, borderBottom: 'none', paddingBottom: '12px' }}>
                      {/* IP Name */}
                      <div className="text-gray-900 text-base truncate leading-none" style={{ margin: 0 }}>{item.ipName}</div>
                      {/* Designer and Layout owner info */}
                      <div className="flex items-center gap-2 text-xs text-gray-600" style={{ margin: '2px 0' }}>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }} />
                          <span className="truncate">{item.designer || 'N/A'}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#60a5fa' }} />
                          <span className="truncate">{item.layoutOwner || 'N/A'}</span>
                        </span>
                      </div>
                      {/* Status（只顯示在 IP row 內） */}
                      <div className="flex items-center gap-0" style={{ margin: 0 }}>
                        <span
                          style={{
                            display: 'inline-block',
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: STATUS_COLORS[status] || '#94a3b8',
                            margin: 0
                          }}
                        />
                        <span className="text-sm font-medium" style={{ color: STATUS_COLORS[status] || '#94a3b8', margin: 0 }}>
                          {status}
                        </span>
                      </div>
                    </td>
                    {timeUnits.map((unit, idx) => {
                      const designerWorkload = calculateRoleDayRatio(item, 'designer', unit, viewMode);
                      const layoutLeaderWorkload = calculateRoleDayRatio(item, 'layoutLeader', unit, viewMode);
                      const layoutWorkload = calculateRoleDayRatio(item, 'layout', unit, viewMode);
                      const layoutRatio = typeof layoutWorkload === 'object' ? layoutWorkload.ratio : layoutWorkload;
                      const layoutWeight = typeof layoutWorkload === 'object' ? layoutWorkload.weight : 0;

                      return (
                        <td key={unit.label + '-' + idx} className="h-14 px-0 py-0 relative">
                          <div className="flex flex-col gap-1 h-full justify-center">
                            {/* Designer bar */}
                            <div className="relative h-4">
                              {designerWorkload > 0 ? (
                                <div 
                                  className="relative"
                                  onMouseEnter={(e) => handleTooltipShow(e, generateTooltipContent(item, 'designer', unit, designerWorkload))}
                                  onMouseLeave={handleTooltipHide}
                                >
                                  <div style={{
                                    height: 16,
                                    borderRadius: 8,
                                    background: '#10b981',
                                    width: '100%',
                                    margin: 0,
                                    opacity: 0.3 + (designerWorkload / 100) * 0.7
                                  }} />
                                </div>
                              ) : (
                                <div style={{ height: 16 }} />
                              )}
                            </div>
                            {/* Layout Leader bar */}
                            <div className="relative h-4">
                              {layoutLeaderWorkload > 0 ? (
                                <div 
                                  className="relative"
                                  onMouseEnter={(e) => handleTooltipShow(e, generateTooltipContent(item, 'layoutLeader', unit, layoutLeaderWorkload))}
                                  onMouseLeave={handleTooltipHide}
                                >
                                  <div style={{
                                    height: 16,
                                    borderRadius: 8,
                                    background: '#60a5fa',
                                    width: '100%',
                                    margin: 0,
                                    opacity: 0.3 + (layoutLeaderWorkload / 100) * 0.7
                                  }} />
                                </div>
                              ) : (
                                <div style={{ height: 16 }} />
                              )}
                            </div>
                            {/* Layout bar */}
                            <div className="relative h-4">
                              {layoutRatio > 0 ? (
                                <div 
                                  className="relative"
                                  onMouseEnter={(e) => handleTooltipShow(e, generateTooltipContent(item, 'layout', unit, layoutWorkload))}
                                  onMouseLeave={handleTooltipHide}
                                >
                                  <div style={{
                                    height: 16,
                                    borderRadius: 8,
                                    background: getLayoutWeightColor(layoutWeight),
                                    width: '100%',
                                    margin: 0,
                                    opacity: 1
                                  }} />
                                </div>
                              ) : (
                                <div style={{ height: 16 }} />
                              )}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Tooltip */}
          {tooltip.show && (
            <div 
              className={`custom-tooltip ${
                tooltip.position.includes('right') ? 'right' : ''
              } ${
                tooltip.position.includes('top') ? 'top' : ''
              }`}
              style={{
                left: `${tooltip.x}px`,
                top: `${tooltip.y}px`
              }}
            >
              {tooltip.content}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
