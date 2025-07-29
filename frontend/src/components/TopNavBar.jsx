import React, { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';

export default function TopNavBar() {
  const { user, logout } = useContext(AuthContext);

  return (
    <div className="sticky top-0 z-[999] bg-card text-card-foreground border-b border-border py-2 px-4 text-center font-bold text-2xl tracking-wide flex justify-between items-center">
      <div className="flex-1 text-center">Layout Resource Plan System</div>
      {user && (
        <div className="flex items-center text-sm font-normal">
          <span className="mr-4">Welcome, {user.displayName} ({user.uid})</span>
          <button onClick={logout} className="bg-primary text-primary-foreground px-3 py-1 rounded-md hover:bg-primary/90">
            Logout
          </button>
        </div>
      )}
    </div>
  );
}