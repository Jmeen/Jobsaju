import React from 'react';
import { chemistryCopy } from './guardianData';

const ASPECTS = {
  square: { w: 800, h: 800, art: 190, pad: 40, gap: 10, scoreSize: 64, nameSize: 20, ctaSize: 17, capSize: 13, relSize: 14 },
  story: { w: 900, h: 1600, art: 260, pad: 56, gap: 18, scoreSize: 84, nameSize: 24, ctaSize: 21, capSize: 15, relSize: 16 },
};

/**
 * 궁합 비교 공유 카드 — 내 수호신 vs 상대 수호신, "직장 케미 N점"이 히어로.
 * 개인 카드보다 태그·재도전을 유도해 단체 카톡방/친구 태그로 2차 바이럴을 노리는 카드라 개인 정보·번호 배지는 넣지 않는다.
 * aspect="square"(1:1) | "story"(9:16) — 같은 템플릿을 공유한다.
 */
export function ChemistryShareCard({ a, b, score, relation, size = 400, aspect = 'square' }) {
  const A = ASPECTS[aspect] || ASPECTS.square;
  const scale = size / A.w;
  const height = size * (A.h / A.w);
  const accentA = `var(--color-element-${a.element}-accent)`;
  const accentB = `var(--color-element-${b.element}-accent)`;
  const relCopy = relation ?? chemistryCopy();
  return (
    <div style={{
      width: size, height, position: 'relative', overflow: 'hidden', borderRadius: 28 * scale,
      background: `radial-gradient(70% 60% at 22% 12%, color-mix(in srgb, ${accentA} 30%, transparent) 0%, transparent 60%), radial-gradient(70% 60% at 78% 12%, color-mix(in srgb, ${accentB} 30%, transparent) 0%, transparent 60%), var(--color-share-bg)`,
      fontFamily: 'var(--font-body)', boxSizing: 'border-box', border: '1px solid var(--color-line)',
      boxShadow: `inset 0 0 0 ${6 * scale}px var(--color-share-bg), inset 0 0 0 ${7 * scale}px var(--color-brand)`,
    }}>
      <span style={{ position: 'absolute', top: 18 * scale, left: '50%', transform: 'translateX(-50%)', fontSize: Math.max(11, A.capSize * scale * 0.85), fontWeight: 700, color: 'var(--color-share-brand)', letterSpacing: '.04em', whiteSpace: 'nowrap' }}>잡사주 궁합</span>

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: A.gap * scale, padding: A.pad * scale }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 * scale }}>
          <div style={{ position: 'relative', width: A.art * scale, height: A.art * scale, display: 'grid', placeItems: 'center' }}>
            <div style={{ position: 'absolute', width: '130%', height: '130%', borderRadius: '50%', background: `radial-gradient(circle, color-mix(in srgb, ${accentA} 40%, transparent) 0%, transparent 70%)` }} />
            <img src={a.imageUrl} alt={a.nickname} style={{ position: 'relative', width: A.art * scale, height: A.art * scale, objectFit: 'contain', filter: 'drop-shadow(0 8px 14px rgba(47,55,50,.18))' }} />
          </div>
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: A.scoreSize * 0.4 * scale, color: 'var(--color-share-muted)', fontWeight: 400 }}>×</strong>
          <div style={{ position: 'relative', width: A.art * scale, height: A.art * scale, display: 'grid', placeItems: 'center' }}>
            <div style={{ position: 'absolute', width: '130%', height: '130%', borderRadius: '50%', background: `radial-gradient(circle, color-mix(in srgb, ${accentB} 40%, transparent) 0%, transparent 70%)` }} />
            <img src={b.imageUrl} alt={b.nickname} style={{ position: 'relative', width: A.art * scale, height: A.art * scale, objectFit: 'contain', filter: 'drop-shadow(0 8px 14px rgba(47,55,50,.18))' }} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 * scale, fontFamily: 'var(--font-display)', fontSize: Math.max(13, A.nameSize * scale), color: 'var(--color-share-ink)', fontWeight: 500, whiteSpace: 'nowrap' }}>
          <span>{a.nickname}</span><span style={{ color: 'var(--color-share-muted)', fontWeight: 400 }}>×</span><span>{b.nickname}</span>
        </div>

        <div style={{ marginTop: 4 * scale, textAlign: 'center' }}>
          <span style={{ display: 'block', fontSize: Math.max(10, A.capSize * scale), color: 'var(--color-share-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>직장 케미</span>
          <strong style={{ fontFamily: 'var(--font-display)', fontSize: Math.max(28, A.scoreSize * scale), color: 'var(--color-share-brand)', fontWeight: 500, lineHeight: 1 }}>{score}<span style={{ fontSize: Math.max(11, A.scoreSize * 0.4 * scale) }}>점</span></strong>
        </div>
        <span style={{ fontSize: Math.max(10, A.relSize * scale), color: 'var(--color-share-muted)', textAlign: 'center', maxWidth: '80%' }}>{relCopy}</span>

        <strong style={{ marginTop: 8 * scale, padding: `${8 * scale}px ${18 * scale}px`, borderRadius: 999, background: 'var(--color-brand)', fontSize: Math.max(12, A.ctaSize * scale), fontWeight: 700, color: 'var(--color-share-bg)', whiteSpace: 'nowrap', width: 'max-content' }}>너랑 나랑 몇 점?</strong>
        <span style={{ position: 'absolute', bottom: 16 * scale, fontSize: 12 * scale, color: 'var(--color-share-brand)', fontWeight: 600, letterSpacing: '.02em' }}>jobsaju.kr</span>
      </div>
    </div>
  );
}
