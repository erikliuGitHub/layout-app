// src/components/SplitIpModal.jsx

import React, { useState, useEffect } from "react";

export default function SplitIpModal({ projectsData, setProjectsData, allLayoutOwners }) {
  const [isOpen, setIsOpen] = useState(false);
  const [parentIp, setParentIp] = useState(null);
  const [splitCount, setSplitCount] = useState(2);

  useEffect(() => {
    const handler = (e) => {
      if (e.detail && e.detail.item) {
        setParentIp(e.detail.item);
        setIsOpen(true);
      }
    };
    window.addEventListener("openSplitIpModal", handler);
    return () => window.removeEventListener("openSplitIpModal", handler);
  }, []);

  const handleSplit = () => {
    if (!parentIp || !projectsData[parentIp.projectId]) return;

    const newEntries = [];
    for (let i = 1; i <= splitCount; i++) {
      newEntries.push({
        ...parentIp,
        ipName: `${parentIp.ipName}_part${i}`,
        parentIp: parentIp.ipName
      });
    }

    const updated = [...projectsData[parentIp.projectId]];
    const idx = updated.findIndex(row => row.ipName === parentIp.ipName);
    if (idx !== -1) {
      updated.splice(idx + 1, 0, ...newEntries);
      setProjectsData(prev => ({
        ...prev,
        [parentIp.projectId]: updated
      }));
    }

    setIsOpen(false);
    setParentIp(null);
    setSplitCount(2);
  };

  if (!isOpen || !parentIp) return null;

  return (
    <div className="fixed top-0 left-0 w-screen h-screen bg-black/40 flex justify-center items-center z-[9999]">
      <div className="bg-card text-card-foreground p-6 rounded-lg min-w-[300px]">
        <h3 className="mb-4 text-lg font-semibold">Split IP: {parentIp.ipName}</h3>
        <div className="mb-3">
          <label className="font-semibold">Number of Parts:</label>
          <input
            type="number"
            min={2}
            max={10}
            value={splitCount}
            onChange={e => setSplitCount(Math.max(2, Math.min(10, parseInt(e.target.value))))}
            className="ml-2 w-16 px-2 py-1 rounded border border-border bg-card text-card-foreground"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSplit}
            className="bg-emerald-500 text-white px-4 py-2 rounded hover:bg-emerald-600"
          >
            Confirm
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="bg-muted text-muted-foreground px-4 py-2 rounded hover:bg-accent hover:text-accent-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
