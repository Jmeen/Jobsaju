import React from 'react';

const ASPECTS = {
  square: { w: 800, h: 800, art: 340, pad: 32, nameSize: 36, copySize: 15, hookSize: 12, ctaSize: 18, gap: 8 },
  story: { w: 900, h: 1600, art: 560, pad: 56, nameSize: 46, copySize: 18, hookSize: 14, ctaSize: 22, gap: 14 },
};

/**
 * 공유 카드 — 60종 모두 같은 템플릿. 얼굴 → 이름 → "너는?" → 브랜드 순으로 시선이 가도록 배치한다.
 * 개인정보(생년월일 등)나 찰떡/티격태격 상대는 절대 넣지 않는다.
 * aspect="square"(1:1, 카톡/피드) | "story"(9:16, 인스타 스토리) — 같은 템플릿을 공유한다.
 * hookLine: 유료 리포트 쪽으로 아주 약하게 여지를 남기는 한 줄. 존재감을 최소화하려 CTA 필 밑, 워터마크보다 작게 둔다.
 */
export function ShareCard({ guardian, size = 400, aspect = 'square', hookLine = '이직·협상·잔류, 내 답은?' }) {
  const A = ASPECTS[aspect] || ASPECTS.square;
  const scale = size / A.w;
  const height = size * (A.h / A.w);
  const badgeFont = Math.max(11, 10 * scale);
  const badgeIcon = Math.max(16, 16 * scale);
  const badgeIconFont = Math.max(9, 8 * scale);
  const accent = `var(--color-element-${guardian.element}-accent)`;
  const soft = `var(--color-element-${guardian.element}-soft)`;
  const dot = 26 * scale;
  return (
    <div style={{
      width: size, height, position: 'relative', overflow: 'hidden', borderRadius: 28 * scale,
      background: `radial-gradient(120% 90% at 50% 0%, ${soft} 0%, var(--color-share-bg) 62%)`,
      fontFamily: 'var(--font-body)', boxSizing: 'border-box',
      border: `1px solid ${accent}`, boxShadow: `inset 0 0 0 ${6 * scale}px var(--color-share-bg), inset 0 0 0 ${7 * scale}px ${accent}`,
    }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.5, backgroundImage: `radial-gradient(${accent} 1px, transparent 1px)`, backgroundSize: `${dot} ${dot}`, backgroundPosition: '10px 10px', maskImage: 'radial-gradient(circle at 50% 40%, transparent 30%, black 78%)', WebkitMaskImage: 'radial-gradient(circle at 50% 40%, transparent 30%, black 78%)' }} />

      <span style={{
        position: 'absolute', top: 18 * scale, left: 18 * scale, display: 'flex', alignItems: 'center', gap: 5 * scale,
        padding: `${Math.max(4, 4 * scale)}px ${Math.max(10, 10 * scale)}px ${Math.max(4, 4 * scale)}px ${Math.max(4, 4 * scale)}px`, borderRadius: 999, background: 'var(--color-share-bg)', border: `1px solid ${accent}`,
        fontSize: badgeFont, fontWeight: 700, color: 'var(--color-share-ink)', whiteSpace: 'nowrap',
      }}>
        <span style={{ display: 'grid', placeItems: 'center', width: badgeIcon, height: badgeIcon, borderRadius: '50%', background: accent, color: 'var(--color-share-bg)', fontSize: badgeIconFont, fontWeight: 700 }}>{String(guardian.sequence).padStart(2, '0')}</span>
        60마리 중 {guardian.sequence}번째
      </span>
      <span style={{ position: 'absolute', top: 18 * scale, right: 18 * scale, fontSize: badgeFont, fontWeight: 700, color: 'var(--color-share-brand)', whiteSpace: 'nowrap' }}>{guardian.elementLabel}</span>

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: A.gap * scale, padding: A.pad * scale }}>
        <div style={{ position: 'relative', width: A.art * scale, height: A.art * scale, display: 'grid', placeItems: 'center' }}>
          <div style={{ position: 'absolute', width: '125%', height: '125%', borderRadius: '50%', background: `radial-gradient(circle, color-mix(in srgb, ${accent} 38%, transparent) 0%, transparent 70%)` }} />
          <img src={guardian.imageUrl} alt={guardian.nickname} style={{ position: 'relative', width: A.art * scale, height: A.art * scale, objectFit: 'contain', filter: 'drop-shadow(0 10px 16px rgba(47,55,50,.2))' }} />
        </div>
        <strong style={{ fontFamily: 'var(--font-display)', fontSize: Math.max(14, A.nameSize * scale), fontWeight: 500, color: 'var(--color-share-ink)', whiteSpace: 'nowrap' }}>{guardian.nickname}</strong>
        <span style={{ fontSize: Math.max(10, A.copySize * scale), color: 'var(--color-share-muted)', textAlign: 'center', lineHeight: 1.5, maxWidth: '84%' }}>{guardian.copy}</span>
        <strong style={{ marginTop: 10 * scale, padding: `${8 * scale}px ${18 * scale}px`, borderRadius: 999, background: accent, fontSize: Math.max(12, A.ctaSize * scale), fontWeight: 700, color: 'var(--color-share-bg)', whiteSpace: 'nowrap', width: 'max-content' }}>너는 어떤 수호신일까?</strong>
        {hookLine ? <span style={{ fontSize: Math.max(9, A.hookSize * scale), color: 'var(--color-share-muted)', opacity: 0.85, whiteSpace: 'nowrap' }}>{hookLine}</span> : null}
        <span style={{ position: 'absolute', bottom: 16 * scale, fontSize: 12 * scale, color: 'var(--color-share-brand)', fontWeight: 600, letterSpacing: '.02em' }}>jobsaju.kr</span>
      </div>
    </div>
  );
}

/** 실제 다운로드용 canvas 렌더러 — SNS 저장 이미지를 생성할 때 쓴다. aspect: 'square'(800x800) | 'story'(900x1600). */
export function drawShareCardToCanvas(canvas, guardian, image, opts = {}) {
  const { aspect = 'square', hookLine = '이직·협상·잔류, 내 답은?' } = opts;
  const dims = aspect === 'story' ? { w: 900, h: 1600 } : { w: 800, h: 800 };
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { w, h } = dims;
  canvas.width = w; canvas.height = h;
  const accent = { wood: '#7fae9a', fire: '#e99a88', earth: '#c6a86b', metal: '#c7b27a', water: '#7893ae' }[guardian.element] || '#66866e';
  const cx = w / 2;

  ctx.fillStyle = '#faf8f2';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, w - 6, h - 6);

  ctx.fillStyle = accent;
  ctx.beginPath(); ctx.arc(56, 56, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#faf8f2';
  ctx.font = '700 14px "Nanum Gothic", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(guardian.sequence).padStart(2, '0'), 56, 61);
  ctx.fillStyle = '#2f3732';
  ctx.font = '700 16px "Nanum Gothic", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`60마리 중 ${guardian.sequence}번째`, 80, 61);

  const artBox = aspect === 'story' ? 560 : 420;
  const artTop = aspect === 'story' ? 140 : 70;
  ctx.textAlign = 'center';
  if (image) {
    ctx.drawImage(image, cx - artBox / 2, artTop, artBox, artBox);
  } else {
    ctx.font = `${artBox / 2.1}px system-ui, sans-serif`;
    ctx.fillStyle = '#2f3732';
    ctx.fillText(guardian.animalEmoji, cx, artTop + artBox * 0.75);
  }

  let y = artTop + artBox + (aspect === 'story' ? 90 : 70);
  ctx.fillStyle = '#2f3732';
  ctx.font = `600 ${aspect === 'story' ? 68 : 60}px "BM DOHYEON", "Nanum Gothic", sans-serif`;
  ctx.fillText(guardian.nickname, cx, y);

  y += aspect === 'story' ? 56 : 60;
  ctx.fillStyle = '#858b83';
  ctx.font = `${aspect === 'story' ? 32 : 30}px "Nanum Gothic", sans-serif`;
  ctx.fillText(guardian.copy.slice(0, 24), cx, y);

  y += aspect === 'story' ? 74 : 50;
  const label = '너는 어떤 수호신일까?';
  ctx.font = `700 ${aspect === 'story' ? 38 : 34}px "Nanum Gothic", sans-serif`;
  const lw = ctx.measureText(label).width;
  ctx.fillStyle = accent;
  const padX = 28, padY = 16, pillH = (aspect === 'story' ? 38 : 34) + padY * 2;
  ctx.beginPath();
  ctx.roundRect(cx - lw / 2 - padX, y - pillH / 2, lw + padX * 2, pillH, pillH / 2);
  ctx.fill();
  ctx.fillStyle = '#faf8f2';
  ctx.fillText(label, cx, y + 12);

  y += aspect === 'story' ? 60 : 46;
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#858b83';
  ctx.font = `${aspect === 'story' ? 24 : 20}px "Nanum Gothic", sans-serif`;
  ctx.fillText(hookLine, cx, y);
  ctx.globalAlpha = 1;

  ctx.fillStyle = '#66866e';
  ctx.font = `600 ${aspect === 'story' ? 24 : 20}px "Nanum Gothic", sans-serif`;
  ctx.fillText('jobsaju.kr', cx, h - (aspect === 'story' ? 60 : 50));
}
