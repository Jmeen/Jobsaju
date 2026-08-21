import React from 'react';

export function Card({ children, tone = 'card', style }) {
  const bg = tone === 'strong' ? 'var(--color-card-strong)' : tone === 'brand-soft' ? 'var(--color-brand-soft)' : 'var(--color-card)';
  return (
    <div style={{ padding: 17, borderRadius: 'var(--radius-lg)', background: bg, boxSizing: 'border-box', ...style }}>
      {children}
    </div>
  );
}

export function ScreenShell({ children, element = 'wood' }) {
  return (
    <div
      data-element={element}
      style={{
        '--jg-guardian-accent': `var(--color-element-${element}-accent)`,
        '--jg-guardian-soft': `var(--color-element-${element}-soft)`,
        width: 'min(100%, var(--screen-max-width))', margin: '0 auto', padding: '0 22px 26px',
        color: 'var(--color-ink)', background: 'var(--color-page)', fontFamily: 'var(--font-body)', boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  );
}
