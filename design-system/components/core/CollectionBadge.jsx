import React from 'react';

/** 수집형 컬렉션 번호 배지 — "No.51 · 60마리 중". 결과 발표 직후 소유욕을 자극하는 용도. */
export function CollectionBadge({ sequence, total = 60, element }) {
  const accent = element ? `var(--color-element-${element}-accent)` : 'var(--color-brand)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px 5px 6px',
      borderRadius: 'var(--radius-pill)', background: 'var(--color-page)', border: `1px solid ${accent}`,
      fontSize: 11, fontWeight: 600, color: 'var(--color-ink)',
    }}>
      <span style={{ display: 'grid', placeItems: 'center', width: 20, height: 20, borderRadius: '50%', background: accent, color: 'var(--color-page)', fontSize: 9, fontWeight: 700 }}>
        {String(sequence).padStart(2, '0')}
      </span>
      No.{sequence} · {total}마리 중
    </span>
  );
}
