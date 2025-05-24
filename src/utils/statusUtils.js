// utils/statusUtils.js
export const calculateStatus = (row) => {
  if (!row.layoutOwner) return "Unassigned";
  if (row.closed) return "Completed";
  if (row.reopened) return "Reopened";
  if (new Date(row.lvsClean) < new Date()) return "Overdue";
  if (new Date(row.schematicFreeze) <= new Date()) return "In Progress";
  return "Assigned";
};