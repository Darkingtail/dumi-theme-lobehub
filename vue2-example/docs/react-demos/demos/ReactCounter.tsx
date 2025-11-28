/**
 * Another React component for testing
 * Located in /react-demos/ - should be excluded from Vue2 JSX processing
 */
import React, { useReducer } from 'react';

interface State {
  count: number;
}

type Action = { type: 'increment' } | { type: 'decrement' } | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment': {
      return { count: state.count + 1 };
    }
    case 'decrement': {
      return { count: state.count - 1 };
    }
    case 'reset': {
      return { count: 0 };
    }
    default: {
      return state;
    }
  }
}

const ReactCounter: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, { count: 0 });

  return (
    <div style={{ border: '1px solid #52c41a', borderRadius: '8px', padding: '20px' }}>
      <h3 style={{ color: '#52c41a' }}>React Counter (useReducer)</h3>
      <p>This demonstrates React hooks - should NOT be processed by Vue2 preset.</p>
      <p style={{ fontSize: '24px', fontWeight: 'bold' }}>Count: {state.count}</p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => dispatch({ type: 'decrement' })}
          style={{
            backgroundColor: '#ff4d4f',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            padding: '8px 16px',
          }}
          type="button"
        >
          -
        </button>
        <button
          onClick={() => dispatch({ type: 'reset' })}
          style={{
            backgroundColor: '#faad14',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            padding: '8px 16px',
          }}
          type="button"
        >
          Reset
        </button>
        <button
          onClick={() => dispatch({ type: 'increment' })}
          style={{
            backgroundColor: '#52c41a',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            padding: '8px 16px',
          }}
          type="button"
        >
          +
        </button>
      </div>
    </div>
  );
};

export default ReactCounter;
