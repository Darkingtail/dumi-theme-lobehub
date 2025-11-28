/**
 * React-style TSX component
 * This file is in /react-demos/ folder - should be EXCLUDED when jsxIncludes is set to ['vue2demo']
 * When excluded, dumi will use default React tech stack to handle this file
 */
import React, { useState } from 'react';

const ReactButton: React.FC = () => {
  const [count, setCount] = useState(0);

  return (
    <div style={{ border: '1px solid #1890ff', borderRadius: '8px', padding: '20px' }}>
      <h3 style={{ color: '#1890ff' }}>React Component</h3>
      <p>This is a React TSX component from /react-demos/ folder.</p>
      <p>Count: {count}</p>
      <button
        onClick={() => setCount(count + 1)}
        style={{
          backgroundColor: '#1890ff',
          border: 'none',
          borderRadius: '4px',
          color: 'white',
          cursor: 'pointer',
          padding: '8px 16px',
        }}
        type="button"
      >
        Click me (React)
      </button>
    </div>
  );
};

export default ReactButton;
