import React, { useRef } from 'react';

const CSVControls = ({ data, onDataChange }) => {
  const fileInputRef = useRef(null);

  const exportCSV = () => {
    if (!data.length) {
      alert('No data to export.');
      return;
    }
    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(h => JSON.stringify(row[h] || '')).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'layout_plan.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const lines = event.target.result.split('\n');
      const headers = lines[0].split(',');
      const newData = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = values[i]?.replace(/\"/g, '').trim();
        });
        return obj;
      });
      onDataChange(newData.filter(item => item.projectId));
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex gap-4 mb-4">
      <button onClick={exportCSV}>Export CSV</button>
      <button onClick={() => fileInputRef.current?.click()}>Import CSV</button>
      <input
        type="file"
        accept=".csv"
        ref={fileInputRef}
        onChange={importCSV}
        className="hidden"
      />
    </div>
  );
};

export default CSVControls;