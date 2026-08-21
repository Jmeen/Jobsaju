import React from 'react';
const { useEffect, useState } = React;

/**
 * 수호신 아트워크. 로드 실패 시 띠 이모지로 자리를 채운다.
 * glow=true면 오행 색 후광을 뒤에 깔아 "발표/공유" 같은 하이라이트 순간에 쓴다 — 목록/작은 썸네일에는 쓰지 않는다.
 */
export function GuardianPortrait({ guardian, size = 270, alt, eager, glow }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [guardian.imageUrl]);
  const style = { display: 'block', width: size, height: size, objectFit: 'contain', position: 'relative', filter: 'drop-shadow(var(--shadow-guardian))' };
  const content = failed
    ? <div style={{ ...style, display: 'grid', placeItems: 'center', fontSize: size * 0.55 }} aria-label={alt ?? `${guardian.nickname} 수호신`}>{guardian.animalEmoji}</div>
    : <img style={style} src={guardian.imageUrl} alt={alt ?? `${guardian.nickname} 수호신`} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)} />;

  if (!glow) return <div style={{ margin: '2px auto -4px' }}>{content}</div>;

  const accent = `var(--color-element-${guardian.element}-accent)`;
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '2px auto -4px', display: 'grid', placeItems: 'center' }}>
      <div style={{ position: 'absolute', width: size * 1.35, height: size * 1.35, borderRadius: '50%', background: `radial-gradient(circle, color-mix(in srgb, ${accent} 32%, transparent) 0%, transparent 70%)` }} />
      {content}
    </div>
  );
}

/** 수호신 이름 — Display 폰트로 크게, 간지·오행은 브랜드 그린 캡션으로. */
export function GuardianNameplate({ guardian, align = 'center' }) {
  return (
    <h1 style={{ margin: 0, textAlign: align, fontSize: 'var(--text-guardian-name)', fontFamily: 'var(--font-display)', fontWeight: 500, color: 'var(--color-ink)' }}>
      {guardian.nickname}
      <span style={{ display: 'block', marginTop: 7, color: 'var(--color-brand)', fontSize: 12, fontFamily: 'var(--font-body)' }}>
        {guardian.ganzhiKo} {guardian.id} · {guardian.elementLabel} 기운의 수호신
      </span>
    </h1>
  );
}
