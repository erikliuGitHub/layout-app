import React from 'react';

const PlanTableBody = ({ data, onDataChange }) => {
  const handleChange = (index, field, value) => {
    const updated = [...data];
    updated[index][field] = value;
    onDataChange(updated);
  };

  const handleDelete = (index) => {
    const updated = [...data];
    updated.splice(index, 1);
    onDataChange(updated);
  };

  return (
    <tbody>
      {data.map((item, index) => (
        <tr key={index}>
          <td>
            <input
              value={item.projectId || ''}
              onChange={(e) => handleChange(index, 'projectId', e.target.value)}
            />
          </td>
          <td>
            <input
              value={item.ipName || ''}
              onChange={(e) => handleChange(index, 'ipName', e.target.value)}
            />
          </td>
          <td>
            <button onClick={() => handleDelete(index)}>Delete</button>
          </td>
        </tr>
      ))}
    </tbody>
  );
};

export default PlanTableBody;