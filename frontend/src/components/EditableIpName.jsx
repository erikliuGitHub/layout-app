import React, { useState, useEffect } from 'react';

const inputStyles = "w-full px-3 py-1.5 rounded-md border border-border bg-card text-card-foreground " +
  "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 " +
  "disabled:opacity-50 disabled:cursor-not-allowed " +
  "transition-colors duration-200";

const EditableIpName = ({ initialIpName, id, onSave, disabled, layoutClosed }) => {
  const [value, setValue] = useState(initialIpName);

  // Update local state if initialIpName changes from parent (e.g., on initial load or external update)
  useEffect(() => {
    setValue(initialIpName);
  }, [initialIpName]);

  const handleChange = (e) => {
    setValue(e.target.value);
  };

  const handleBlur = () => {
    // Only save if the value has actually changed
    if (value !== initialIpName) {
      onSave(id, value);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      e.target.blur(); // Trigger blur to save the value
    }
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={inputStyles + " italic"}
      style={{ textDecoration: layoutClosed ? 'line-through' : 'none' }}
      disabled={disabled}
    />
  );
};

export default EditableIpName;
