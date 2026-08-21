import React from 'react';

export function Button({ children, variant = 'primary', element, disabled, onClick, type = 'button' }) {
  const base = {
    width: '100%', margin: 0, padding: '14px 16px', border: 0, borderRadius: 'var(--radius-md)',
    font: 'inherit', fontSize: 14, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1, boxSizing: 'border-box',
  };
  const accent = element ? `var(--color-element-${element}-accent)` : 'var(--color-brand)';
  const soft = element ? `var(--color-element-${element}-soft)` : 'var(--color-brand-soft)';
  const variants = {
    primary: { background: 'var(--color-brand)', color: 'var(--color-page)' },
    secondary: { background: 'var(--color-brand-soft)', color: 'var(--color-brand)' },
    guardian: { background: soft, color: 'var(--color-brand)', border: `1px solid ${accent}` },
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, ...variants[variant] }}>
      {children}
    </button>
  );
}

export function TextLink({ children, onClick }) {
  return (
    <button
      type="button" onClick={onClick}
      style={{ appearance: 'none', display: 'block', margin: '13px auto 0', padding: 7, border: 0, background: 'transparent', color: 'var(--color-brand)', font: 'inherit', fontSize: 12, cursor: 'pointer' }}
    >
      {children}
    </button>
  );
}
