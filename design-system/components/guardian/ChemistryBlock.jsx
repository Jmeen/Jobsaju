import React from 'react';
const { useEffect } = React;
import { findChemistryExtremes, chemistryCopy } from './guardianData';
import { GuardianPortrait } from './GuardianPortrait';
import { Button } from '../core/Button';

/** 결과 화면의 유일한 공유 허브. 찰떡+티격태격을 한 압축 박스에 담는다. */
export function ChemistryBlock({ guardian, assetBase, isSharing, onShare, onView }) {
  const { best, worst } = findChemistryExtremes(guardian.id, assetBase);
  useEffect(() => { onView && onView(); }, [guardian.id]);

  const rows = [
    { label: '찰떡', match: best },
    { label: '티격태격', match: worst },
  ];

  return (
    <section style={{ marginTop: 20, padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--color-card)' }}>
      <h2 style={{ margin: '0 0 12px', color: 'var(--color-ink)', fontSize: 15, fontWeight: 600 }}>함께 일하면?</h2>
      {rows.map((row, i) => (
        <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '46px 1fr auto', gap: 10, alignItems: 'center', padding: '9px 0', borderTop: i === 0 ? 0 : '1px solid color-mix(in srgb, var(--color-line) 70%, transparent)' }}>
          <GuardianPortrait guardian={row.match.guardian} size={46} />
          <div style={{ minWidth: 0 }}>
            <span style={{ display: 'block', color: 'var(--color-brand)', fontSize: 10, fontWeight: 600 }}>{row.label}</span>
            <strong style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{row.match.guardian.nickname}</strong>
            <small style={{ display: 'block', marginTop: 1, color: 'var(--color-muted)', fontSize: 11 }}>{chemistryCopy(row.match.dominantRelation)}</small>
          </div>
          <span style={{ color: 'var(--color-muted)', fontSize: 11, whiteSpace: 'nowrap' }}>직장 케미 {row.match.score}점</span>
        </div>
      ))}
      <p style={{ margin: '12px 0 0', color: 'var(--color-ink)', textAlign: 'center', fontSize: 13, lineHeight: 1.5 }}>
        내 수호신은 {guardian.nickname}.<br />너는?
      </p>
      <div style={{ marginTop: 12 }}>
        <Button variant="primary" disabled={isSharing} onClick={onShare}>
          {isSharing ? '공유 카드를 만드는 중…' : '친구에게 물어보기'}
        </Button>
      </div>
    </section>
  );
}
