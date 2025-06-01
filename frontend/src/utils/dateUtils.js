// src/utils/dateUtils.js
export function calculateMandays(start, end) {
  if (!start || !end) return "";
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return "";
  let count = 0;
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const day = currentDate.getDay();
    if (day !== 0 && day !== 6) count++;
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return count.toString();
}

export function calculateEndDate(start, mandays) {
  if (!start || !mandays) return "";
  const startDate = new Date(start);
  let addedDays = 0;
  let currentDate = new Date(startDate);
  while (addedDays < mandays) {
    currentDate.setDate(currentDate.getDate() + 1);
    const day = currentDate.getDay();
    if (day !== 0 && day !== 6) addedDays++;
  }
  return currentDate.toISOString().slice(0, 10);
}

export function getRandomDate(start, end) {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().slice(0, 10);
}