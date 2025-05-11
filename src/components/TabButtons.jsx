// src/components/TabButtons.jsx
import React from 'react';

export default function TabButtons({ currentTab, setCurrentTab }) {
  const tabs = [
    { label: 'Designer', color: '#4f46e5', light: '#c7d2fe', text: '#3730a3' },
    { label: 'Layout Leader', color: '#0284c7', light: '#bae6fd', text: '#0369a1' },
    { label: 'Layout', color: '#059669', light: '#bbf7d0', text: '#065f46' },
    { label: 'Gantt', color: '#7c3aed', light: '#ddd6fe', text: '#5b21b6' }
  ];

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
      {tabs.map(({ label, color, light, text }) => (
        <button
          key={label}
          onClick={() => setCurrentTab(label)}
          style={{
            fontSize: "14px", padding: "7px 14px", borderRadius: 6, fontWeight: 600,
            background: currentTab === label ? color : light,
            color: currentTab === label ? "#fff" : text,
            border: "none", transition: "transform 0.07s", cursor: "pointer"
          }}
          onMouseOver={e => e.currentTarget.style.transform = "scale(1.05)"}
          onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
        >
          {label}
        </button>
      ))}
    </div>
  );
}