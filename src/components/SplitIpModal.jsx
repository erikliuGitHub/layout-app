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
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999
    }}>
      <div style={{ background: "white", padding: 24, borderRadius: 8, minWidth: 300 }}>
        <h3 style={{ marginBottom: 16 }}>Split IP: {parentIp.ipName}</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontWeight: 600 }}>Number of Parts:</label>
          <input
            type="number"
            min={2}
            max={10}
            value={splitCount}
            onChange={e => setSplitCount(Math.max(2, Math.min(10, parseInt(e.target.value))))}
            style={{ marginLeft: 8, width: 60 }}
          />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={handleSplit}
            style={{ background: "#10b981", color: "white", padding: "6px 12px", borderRadius: 6, border: "none" }}
          >
            Confirm
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{ background: "#e5e7eb", color: "#374151", padding: "6px 12px", borderRadius: 6, border: "none" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
