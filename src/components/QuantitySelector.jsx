import React from 'react';

export default function QuantitySelector({ 
  value, 
  onChange, 
  placeholder = '0', 
  style = {}, 
  readOnly = false,
  min = '0',
  step = '1'
}) {
  if (readOnly) {
    return (
      <input
        type="number"
        value={value ?? ''}
        readOnly
        className="input-field"
        style={{ ...style, cursor: 'not-allowed', opacity: 0.8 }}
      />
    );
  }

  const handleDecrement = (e) => {
    e.preventDefault();
    const current = Number(value) || 0;
    const stepNum = Number(step) || 1;
    const nextVal = Math.max(Number(min) || 0, current - stepNum);
    onChange(nextVal === 0 ? '' : String(nextVal));
  };

  const handleIncrement = (e) => {
    e.preventDefault();
    const current = Number(value) || 0;
    const stepNum = Number(step) || 1;
    onChange(String(current + stepNum));
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
      <button
        type="button"
        onClick={handleDecrement}
        className="qty-btn"
      >
        -
      </button>
      <input
        type="number"
        min={min}
        step={step}
        placeholder={placeholder}
        className="input-field qty-input-no-spin"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        style={{ 
          ...style, 
          width: '56px', 
          margin: 0, 
          textAlign: 'center',
          height: '32px',
          padding: '0 4px'
        }}
      />
      <button
        type="button"
        onClick={handleIncrement}
        className="qty-btn"
      >
        +
      </button>
    </div>
  );
}
