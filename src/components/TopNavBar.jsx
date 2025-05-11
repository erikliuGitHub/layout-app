// src/components/TopNavBar.jsx
import React from 'react';

export default function TopNavBar({ currentUser, now }) {
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 999,
      background: "#1f2937", borderBottom: "1px solid #e5e7eb", padding: "10px 0",
      textAlign: "center", fontWeight: 600, fontSize: "24px", color: "#f9fafb", letterSpacing: "0.05em"
    }}>
      Layout Resource Plan System
    </div>
  );
}