// utils/ganttUtils.js

export function getISOWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNum.toString().padStart(2, '0'); // Return only week number like "19"
}

export function getISOWeekLabel(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `W${weekNum.toString().padStart(2, '0')}`; // e.g. "W19"
}

export function projectBarInfo(item, timeUnits, pxPerUnit = 50) {
  if (!timeUnits || timeUnits.length === 0) return { offsetPx: 0, widthPx: 0 };
  if (!item.schematicFreeze || !item.lvsClean) return { offsetPx: 0, widthPx: 0 };

  const startDateStr = new Date(item.schematicFreeze).toISOString().slice(0, 10);
  const endDateStr = new Date(item.lvsClean).toISOString().slice(0, 10);

  // 日視圖: label 為 YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(timeUnits[0].label)) {
    const startIndex = timeUnits.findIndex(unit => unit.label === startDateStr);
    const endIndex = timeUnits.findIndex(unit => unit.label === endDateStr);
    if (startIndex === -1 || endIndex === -1) return { offsetPx: 0, widthPx: 0 };
    const durationUnits = Math.max(1, endIndex - startIndex + 1);
    return {
      offsetPx: startIndex * pxPerUnit,
      widthPx: durationUnits * pxPerUnit
    };
  }

  // 其他視圖維持原本邏輯（可擴充）
  return { offsetPx: 0, widthPx: 0 };
}

export function dailyWorkloads(projectsData) {
  const workload = {};
  Object.values(projectsData).flat().forEach(item => {
    if (!item.schematicFreeze || !item.lvsClean || !item.layoutOwner) return;
    const start = new Date(item.schematicFreeze);
    const end = new Date(item.lvsClean);
    for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400000)) {
      const key = d.toISOString().slice(0, 10);
      if (!workload[key]) workload[key] = {};
      if (!workload[key][item.layoutOwner]) workload[key][item.layoutOwner] = 0;
      workload[key][item.layoutOwner] += 1;
    }
  });
  return workload;
}
