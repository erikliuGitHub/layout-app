// src/components/TopNavBar.jsx
import React from 'react';

export default function TopNavBar({ currentUser, now }) {
  return (
    <div className="sticky top-0 z-[999] bg-card text-card-foreground border-b border-border py-2 text-center font-bold text-2xl tracking-wide">
      Layout Resource Plan System
    </div>
  );
}