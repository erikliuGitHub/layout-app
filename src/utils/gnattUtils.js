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

export function projectBarInfo(item, weeklyWorkloads, pxPerWeek = 50) {
  if (!weeklyWorkloads || weeklyWorkloads.length === 0) return { offsetPx: 0, widthPx: 0 };
  if (!item.schematicFreeze || !item.lvsClean) return { offsetPx: 0, widthPx: 0 };

  const startDate = new Date(item.schematicFreeze);
  const endDate = new Date(item.lvsClean);

  // Find the start index
  let startIndex = 0;
  for (let i = 0; i < weeklyWorkloads.length; i++) {
    const weekStart = new Date(weeklyWorkloads[i].date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    if (startDate <= weekEnd) {
      startIndex = i;
      break;
    }
  }

  // Find the end index
  let endIndex = weeklyWorkloads.length - 1;
  for (let i = weeklyWorkloads.length - 1; i >= 0; i--) {
    const weekStart = new Date(weeklyWorkloads[i].date);
    if (endDate >= weekStart) {
      endIndex = i;
      break;
    }
  }

  const durationWeeks = Math.max(1, endIndex - startIndex + 1);
  return {
    offsetPx: startIndex * pxPerWeek,
    widthPx: durationWeeks * pxPerWeek
  };
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
