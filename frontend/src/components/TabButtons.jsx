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
    <div className="flex gap-3 mb-5">
      {tabs.map(({ label }) => (
        <button
          key={label}
          onClick={() => setCurrentTab(label)}
          className={`text-sm font-semibold px-4 py-2 rounded transition-transform duration-100
            ${currentTab === label
              ? 'bg-primary text-primary-foreground shadow'
              : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'}
          `}
          style={{ transform: undefined }}
          onMouseOver={e => e.currentTarget.style.transform = "scale(1.05)"}
          onMouseOut={e => e.currentTarget.style.transform = "scale(1)"}
        >
          {label}
        </button>
      ))}
    </div>
  );
}