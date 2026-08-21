import React from 'react';

export function Badge({ children, tone = 'muted' }) {
  const color = tone === 'brand' ? 'var(--color-brand)' : 'var(--color-muted)';
  return (
    <span style={{ padding: '7px 11px', borderRadius: 'var(--radius-pill)', background: 'var(--color-card)', color, fontSize: 12 }}>
      {children}
    </span>
  );
}
