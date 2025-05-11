import React, { useState, useEffect } from "react";

const SplitIpModal = ({ projectsData, setProjectsData, allLayoutOwners }) => {
  const [open, setOpen] = useState(false);
  const [parentItem, setParentItem] = useState(null);
  const [ipName, setIpName] = useState("");
  const [layoutOwner, setLayoutOwner] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (e) => {
      setParentItem(e.detail.item);
      setIpName("");
      setLayoutOwner(e.detail.item.layoutOwner || "");
      setError("");
      setOpen(true);
    };
    window.addEventListener("openSplitIpModal", handler);
    return () => window.removeEventListener("openSplitIpModal", handler);
  }, []);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ipName.trim()) return setError("IP Name required");
    if (!layoutOwner.trim()) return setError("Layout Owner required");
    const siblings = projectsData[parentItem.projectId] || [];
    if (siblings.some(row => row.ipName === ipName)) return setError("Duplicate IP Name in project");

    const newChild = {
      ...parentItem,
      ipName,
      layoutOwner,
      parentIp: parentItem.ipName,
      weeklyWeights: [],
      layoutClosed: false,
    };
    delete newChild.projectId;
    delete newChild._isChild;
    delete newChild._idx;

    const arr = [...siblings];
    let insertIdx = arr.findIndex(row => row.ipName === parentItem.ipName);
    if (insertIdx === -1) insertIdx = arr.length - 1;
    let after = insertIdx;
    for (let i = insertIdx + 1; i < arr.length; ++i) {
      if (arr[i].parentIp === parentItem.ipName) after = i;
      else break;
    }
    arr.splice(after + 1, 0, newChild);
    setProjectsData(prev => ({
      ...prev,
      [parentItem.projectId]: arr
    }));
    setOpen(false);
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.16)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 8, padding: "32px 28px", minWidth: 360, maxWidth: 420 }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 18 }}>
          Split IP for <span style={{ color: "#0284c7" }}>{parentItem?.ipName}</span>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>子 IP Name</label>
            <input type="text" value={ipName} onChange={e => { setIpName(e.target.value); setError(""); }} style={{ width: "100%", fontSize: 15, border: "1px solid #d1d5db", borderRadius: 4, padding: "6px 8px" }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>Layout Owner</label>
            <select value={layoutOwner} onChange={e => { setLayoutOwner(e.target.value); setError(""); }} style={{ width: "100%", fontSize: 15, border: "1px solid #d1d5db", borderRadius: 4, padding: "6px 8px" }}>
              <option value="">Select Layout Owner</option>
              {allLayoutOwners.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          {error && <div style={{ color: "#dc2626", marginBottom: 12, fontWeight: 600 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button type="button" style={{ background: "#e5e7eb", padding: "8px 20px", borderRadius: 6 }} onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" style={{ background: "#0284c7", color: "#fff", padding: "8px 20px", borderRadius: 6 }}>Add 子 IP</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SplitIpModal;