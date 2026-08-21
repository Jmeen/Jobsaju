import React from 'react';

export function ScoreGrid({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 7, marginTop: 13 }}>
      {items.map((item, i) => (
        <div key={i} style={{ padding: '12px 6px', borderRadius: 'var(--radius-sm)', background: 'var(--color-page)', textAlign: 'center' }}>
          <span style={{ display: 'block', color: 'var(--color-muted)', fontSize: 10 }}>{item.icon} {item.label}</span>
          <b style={{ display: 'block', marginTop: 4, fontSize: 19, fontWeight: 500, filter: item.locked ? 'blur(4px)' : 'none', userSelect: item.locked ? 'none' : 'auto' }}>
            {item.value}
          </b>
        </div>
      ))}
    </div>
  );
}
