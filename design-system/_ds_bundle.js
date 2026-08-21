/* @ds-bundle: {"format":4,"namespace":"JobSajuDesignSystem_b79c07","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"TextLink","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"ScreenShell","sourcePath":"components/core/Card.jsx"},{"name":"ChemistryScore","sourcePath":"components/core/ChemistryScore.jsx"},{"name":"CollectionBadge","sourcePath":"components/core/CollectionBadge.jsx"},{"name":"ScoreGrid","sourcePath":"components/core/ScoreGrid.jsx"},{"name":"ChemistryBlock","sourcePath":"components/guardian/ChemistryBlock.jsx"},{"name":"ChemistryShareCard","sourcePath":"components/guardian/ChemistryShareCard.jsx"},{"name":"GuardianPortrait","sourcePath":"components/guardian/GuardianPortrait.jsx"},{"name":"GuardianNameplate","sourcePath":"components/guardian/GuardianPortrait.jsx"},{"name":"ShareCard","sourcePath":"components/guardian/ShareCard.jsx"},{"name":"GAN_HANJA","sourcePath":"components/guardian/guardianData.js"},{"name":"ZHI_HANJA","sourcePath":"components/guardian/guardianData.js"},{"name":"ELEMENT_BY_GAN_INDEX","sourcePath":"components/guardian/guardianData.js"},{"name":"ELEMENT_LABEL","sourcePath":"components/guardian/guardianData.js"}],"sourceHashes":{"components/core/Badge.jsx":"f18524fb0511","components/core/Button.jsx":"a56d3af34a34","components/core/Card.jsx":"05be92462b7f","components/core/ChemistryScore.jsx":"dfa08a982d13","components/core/CollectionBadge.jsx":"f30c2a6d640b","components/core/ScoreGrid.jsx":"5a1da7684f37","components/guardian/ChemistryBlock.jsx":"06c467ed55a6","components/guardian/ChemistryShareCard.jsx":"a9d49824196c","components/guardian/GuardianPortrait.jsx":"5d0c6e873498","components/guardian/ShareCard.jsx":"23490eb1c947","components/guardian/guardianData.js":"8151635c8d12"},"inlinedExternals":[],"unexposedExports":[{"name":"chemistryCopy","sourcePath":"components/guardian/guardianData.js"},{"name":"drawShareCardToCanvas","sourcePath":"components/guardian/ShareCard.jsx"},{"name":"findChemistryExtremes","sourcePath":"components/guardian/guardianData.js"},{"name":"getGuardian","sourcePath":"components/guardian/guardianData.js"},{"name":"guardianElement","sourcePath":"components/guardian/guardianData.js"},{"name":"guardianIdBySequence","sourcePath":"components/guardian/guardianData.js"},{"name":"guardianImageUrl","sourcePath":"components/guardian/guardianData.js"},{"name":"listGuardians","sourcePath":"components/guardian/guardianData.js"}]} */

(() => {

const __ds_ns = (window.JobSajuDesignSystem_b79c07 = window.JobSajuDesignSystem_b79c07 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function Badge({
  children,
  tone = 'muted'
}) {
  const color = tone === 'brand' ? 'var(--color-brand)' : 'var(--color-muted)';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      padding: '7px 11px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--color-card)',
      color,
      fontSize: 12
    }
  }, children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function Button({
  children,
  variant = 'primary',
  element,
  disabled,
  onClick,
  type = 'button'
}) {
  const base = {
    width: '100%',
    margin: 0,
    padding: '14px 16px',
    border: 0,
    borderRadius: 'var(--radius-md)',
    font: 'inherit',
    fontSize: 14,
    fontWeight: 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    boxSizing: 'border-box'
  };
  const accent = element ? `var(--color-element-${element}-accent)` : 'var(--color-brand)';
  const soft = element ? `var(--color-element-${element}-soft)` : 'var(--color-brand-soft)';
  const variants = {
    primary: {
      background: 'var(--color-brand)',
      color: 'var(--color-page)'
    },
    secondary: {
      background: 'var(--color-brand-soft)',
      color: 'var(--color-brand)'
    },
    guardian: {
      background: soft,
      color: 'var(--color-brand)',
      border: `1px solid ${accent}`
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    type: type,
    disabled: disabled,
    onClick: onClick,
    style: {
      ...base,
      ...variants[variant]
    }
  }, children);
}
function TextLink({
  children,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    style: {
      appearance: 'none',
      display: 'block',
      margin: '13px auto 0',
      padding: 7,
      border: 0,
      background: 'transparent',
      color: 'var(--color-brand)',
      font: 'inherit',
      fontSize: 12,
      cursor: 'pointer'
    }
  }, children);
}
Object.assign(__ds_scope, { Button, TextLink });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function Card({
  children,
  tone = 'card',
  style
}) {
  const bg = tone === 'strong' ? 'var(--color-card-strong)' : tone === 'brand-soft' ? 'var(--color-brand-soft)' : 'var(--color-card)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 17,
      borderRadius: 'var(--radius-lg)',
      background: bg,
      boxSizing: 'border-box',
      ...style
    }
  }, children);
}
function ScreenShell({
  children,
  element = 'wood'
}) {
  return /*#__PURE__*/React.createElement("div", {
    "data-element": element,
    style: {
      '--jg-guardian-accent': `var(--color-element-${element}-accent)`,
      '--jg-guardian-soft': `var(--color-element-${element}-soft)`,
      width: 'min(100%, var(--screen-max-width))',
      margin: '0 auto',
      padding: '0 22px 26px',
      color: 'var(--color-ink)',
      background: 'var(--color-page)',
      fontFamily: 'var(--font-body)',
      boxSizing: 'border-box'
    }
  }, children);
}
Object.assign(__ds_scope, { Card, ScreenShell });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/ChemistryScore.jsx
try { (() => {
/** "직장 케미 92점" 처럼 %가 아닌 라벨+점수 조합으로 보여주는 칩. */
function ChemistryScore({
  label,
  score
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-muted)',
      fontSize: 11,
      whiteSpace: 'nowrap'
    }
  }, label, " ", score, "점");
}
Object.assign(__ds_scope, { ChemistryScore });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/ChemistryScore.jsx", error: String((e && e.message) || e) }); }

// components/core/CollectionBadge.jsx
try { (() => {
/** 수집형 컬렉션 번호 배지 — "No.51 · 60마리 중". 결과 발표 직후 소유욕을 자극하는 용도. */
function CollectionBadge({
  sequence,
  total = 60,
  element
}) {
  const accent = element ? `var(--color-element-${element}-accent)` : 'var(--color-brand)';
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '5px 12px 5px 6px',
      borderRadius: 'var(--radius-pill)',
      background: 'var(--color-page)',
      border: `1px solid ${accent}`,
      fontSize: 11,
      fontWeight: 600,
      color: 'var(--color-ink)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      placeItems: 'center',
      width: 20,
      height: 20,
      borderRadius: '50%',
      background: accent,
      color: 'var(--color-page)',
      fontSize: 9,
      fontWeight: 700
    }
  }, String(sequence).padStart(2, '0')), "No.", sequence, " \xB7 ", total, "마리 중");
}
Object.assign(__ds_scope, { CollectionBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/CollectionBadge.jsx", error: String((e && e.message) || e) }); }

// components/core/ScoreGrid.jsx
try { (() => {
function ScoreGrid({
  items
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: `repeat(${items.length}, 1fr)`,
      gap: 7,
      marginTop: 13
    }
  }, items.map((item, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: '12px 6px',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--color-page)',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      color: 'var(--color-muted)',
      fontSize: 10
    }
  }, item.icon, " ", item.label), /*#__PURE__*/React.createElement("b", {
    style: {
      display: 'block',
      marginTop: 4,
      fontSize: 19,
      fontWeight: 500,
      filter: item.locked ? 'blur(4px)' : 'none',
      userSelect: item.locked ? 'none' : 'auto'
    }
  }, item.value))));
}
Object.assign(__ds_scope, { ScoreGrid });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/ScoreGrid.jsx", error: String((e && e.message) || e) }); }

// components/guardian/GuardianPortrait.jsx
try { (() => {
const {
  useEffect,
  useState
} = React;

/**
 * 수호신 아트워크. 로드 실패 시 띠 이모지로 자리를 채운다.
 * glow=true면 오행 색 후광을 뒤에 깔아 "발표/공유" 같은 하이라이트 순간에 쓴다 — 목록/작은 썸네일에는 쓰지 않는다.
 */
function GuardianPortrait({
  guardian,
  size = 270,
  alt,
  eager,
  glow
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [guardian.imageUrl]);
  const style = {
    display: 'block',
    width: size,
    height: size,
    objectFit: 'contain',
    position: 'relative',
    filter: 'drop-shadow(var(--shadow-guardian))'
  };
  const content = failed ? /*#__PURE__*/React.createElement("div", {
    style: {
      ...style,
      display: 'grid',
      placeItems: 'center',
      fontSize: size * 0.55
    },
    "aria-label": alt ?? `${guardian.nickname} 수호신`
  }, guardian.animalEmoji) : /*#__PURE__*/React.createElement("img", {
    style: style,
    src: guardian.imageUrl,
    alt: alt ?? `${guardian.nickname} 수호신`,
    loading: eager ? 'eager' : 'lazy',
    decoding: "async",
    onError: () => setFailed(true)
  });
  if (!glow) return /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '2px auto -4px'
    }
  }, content);
  const accent = `var(--color-element-${guardian.element}-accent)`;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: size,
      height: size,
      margin: '2px auto -4px',
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      width: size * 1.35,
      height: size * 1.35,
      borderRadius: '50%',
      background: `radial-gradient(circle, color-mix(in srgb, ${accent} 32%, transparent) 0%, transparent 70%)`
    }
  }), content);
}

/** 수호신 이름 — Display 폰트로 크게, 간지·오행은 브랜드 그린 캡션으로. */
function GuardianNameplate({
  guardian,
  align = 'center'
}) {
  return /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      textAlign: align,
      fontSize: 'var(--text-guardian-name)',
      fontFamily: 'var(--font-display)',
      fontWeight: 500,
      color: 'var(--color-ink)'
    }
  }, guardian.nickname, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginTop: 7,
      color: 'var(--color-brand)',
      fontSize: 12,
      fontFamily: 'var(--font-body)'
    }
  }, guardian.ganzhiKo, " ", guardian.id, " \xB7 ", guardian.elementLabel, " 기운의 수호신"));
}
Object.assign(__ds_scope, { GuardianPortrait, GuardianNameplate });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guardian/GuardianPortrait.jsx", error: String((e && e.message) || e) }); }

// components/guardian/ShareCard.jsx
try { (() => {
const ASPECTS = {
  square: {
    w: 800,
    h: 800,
    art: 340,
    pad: 32,
    nameSize: 36,
    copySize: 15,
    hookSize: 12,
    ctaSize: 18,
    gap: 8
  },
  story: {
    w: 900,
    h: 1600,
    art: 560,
    pad: 56,
    nameSize: 46,
    copySize: 18,
    hookSize: 14,
    ctaSize: 22,
    gap: 14
  }
};

/**
 * 공유 카드 — 60종 모두 같은 템플릿. 얼굴 → 이름 → "너는?" → 브랜드 순으로 시선이 가도록 배치한다.
 * 개인정보(생년월일 등)나 찰떡/티격태격 상대는 절대 넣지 않는다.
 * aspect="square"(1:1, 카톡/피드) | "story"(9:16, 인스타 스토리) — 같은 템플릿을 공유한다.
 * hookLine: 유료 리포트 쪽으로 아주 약하게 여지를 남기는 한 줄. 존재감을 최소화하려 CTA 필 밑, 워터마크보다 작게 둔다.
 */
function ShareCard({
  guardian,
  size = 400,
  aspect = 'square',
  hookLine = '이직·협상·잔류, 내 답은?'
}) {
  const A = ASPECTS[aspect] || ASPECTS.square;
  const scale = size / A.w;
  const height = size * (A.h / A.w);
  const badgeFont = Math.max(11, 10 * scale);
  const badgeIcon = Math.max(16, 16 * scale);
  const badgeIconFont = Math.max(9, 8 * scale);
  const accent = `var(--color-element-${guardian.element}-accent)`;
  const soft = `var(--color-element-${guardian.element}-soft)`;
  const dot = 26 * scale;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height,
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 28 * scale,
      background: `radial-gradient(120% 90% at 50% 0%, ${soft} 0%, var(--color-share-bg) 62%)`,
      fontFamily: 'var(--font-body)',
      boxSizing: 'border-box',
      border: `1px solid ${accent}`,
      boxShadow: `inset 0 0 0 ${6 * scale}px var(--color-share-bg), inset 0 0 0 ${7 * scale}px ${accent}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      opacity: 0.5,
      backgroundImage: `radial-gradient(${accent} 1px, transparent 1px)`,
      backgroundSize: `${dot} ${dot}`,
      backgroundPosition: '10px 10px',
      maskImage: 'radial-gradient(circle at 50% 40%, transparent 30%, black 78%)',
      WebkitMaskImage: 'radial-gradient(circle at 50% 40%, transparent 30%, black 78%)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 18 * scale,
      left: 18 * scale,
      display: 'flex',
      alignItems: 'center',
      gap: 5 * scale,
      padding: `${Math.max(4, 4 * scale)}px ${Math.max(10, 10 * scale)}px ${Math.max(4, 4 * scale)}px ${Math.max(4, 4 * scale)}px`,
      borderRadius: 999,
      background: 'var(--color-share-bg)',
      border: `1px solid ${accent}`,
      fontSize: badgeFont,
      fontWeight: 700,
      color: 'var(--color-share-ink)',
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'grid',
      placeItems: 'center',
      width: badgeIcon,
      height: badgeIcon,
      borderRadius: '50%',
      background: accent,
      color: 'var(--color-share-bg)',
      fontSize: badgeIconFont,
      fontWeight: 700
    }
  }, String(guardian.sequence).padStart(2, '0')), "60마리 중 ", guardian.sequence, "번째"), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 18 * scale,
      right: 18 * scale,
      fontSize: badgeFont,
      fontWeight: 700,
      color: 'var(--color-share-brand)',
      whiteSpace: 'nowrap'
    }
  }, guardian.elementLabel), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: A.gap * scale,
      padding: A.pad * scale
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: A.art * scale,
      height: A.art * scale,
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      width: '125%',
      height: '125%',
      borderRadius: '50%',
      background: `radial-gradient(circle, color-mix(in srgb, ${accent} 38%, transparent) 0%, transparent 70%)`
    }
  }), /*#__PURE__*/React.createElement("img", {
    src: guardian.imageUrl,
    alt: guardian.nickname,
    style: {
      position: 'relative',
      width: A.art * scale,
      height: A.art * scale,
      objectFit: 'contain',
      filter: 'drop-shadow(0 10px 16px rgba(47,55,50,.2))'
    }
  })), /*#__PURE__*/React.createElement("strong", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: Math.max(14, A.nameSize * scale),
      fontWeight: 500,
      color: 'var(--color-share-ink)',
      whiteSpace: 'nowrap'
    }
  }, guardian.nickname), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: Math.max(10, A.copySize * scale),
      color: 'var(--color-share-muted)',
      textAlign: 'center',
      lineHeight: 1.5,
      maxWidth: '84%'
    }
  }, guardian.copy), /*#__PURE__*/React.createElement("strong", {
    style: {
      marginTop: 10 * scale,
      padding: `${8 * scale}px ${18 * scale}px`,
      borderRadius: 999,
      background: accent,
      fontSize: Math.max(12, A.ctaSize * scale),
      fontWeight: 700,
      color: 'var(--color-share-bg)',
      whiteSpace: 'nowrap',
      width: 'max-content'
    }
  }, "너는 어떤 수호신일까?"), hookLine ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: Math.max(9, A.hookSize * scale),
      color: 'var(--color-share-muted)',
      opacity: 0.85,
      whiteSpace: 'nowrap'
    }
  }, hookLine) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      bottom: 16 * scale,
      fontSize: 12 * scale,
      color: 'var(--color-share-brand)',
      fontWeight: 600,
      letterSpacing: '.02em'
    }
  }, "jobsaju.kr")));
}

/** 실제 다운로드용 canvas 렌더러 — SNS 저장 이미지를 생성할 때 쓴다. aspect: 'square'(800x800) | 'story'(900x1600). */
function drawShareCardToCanvas(canvas, guardian, image, opts = {}) {
  const {
    aspect = 'square',
    hookLine = '이직·협상·잔류, 내 답은?'
  } = opts;
  const dims = aspect === 'story' ? {
    w: 900,
    h: 1600
  } : {
    w: 800,
    h: 800
  };
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const {
    w,
    h
  } = dims;
  canvas.width = w;
  canvas.height = h;
  const accent = {
    wood: '#7fae9a',
    fire: '#e99a88',
    earth: '#c6a86b',
    metal: '#c7b27a',
    water: '#7893ae'
  }[guardian.element] || '#66866e';
  const cx = w / 2;
  ctx.fillStyle = '#faf8f2';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, w - 6, h - 6);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.arc(56, 56, 16, 0, Math.PI * 2);
  ctx.fill();
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
  const padX = 28,
    padY = 16,
    pillH = (aspect === 'story' ? 38 : 34) + padY * 2;
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
Object.assign(__ds_scope, { ShareCard, drawShareCardToCanvas });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guardian/ShareCard.jsx", error: String((e && e.message) || e) }); }

// components/guardian/guardianData.js
try { (() => {
// 60갑자 수호신 공유 데이터 — 원본: job_saju_codex_handoff/src/utils/guardianProfiles.ts + guardianAssets.ts
const GAN_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const ZHI_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const ELEMENT_BY_GAN_INDEX = ['wood', 'fire', 'earth', 'metal', 'water'];
const ELEMENT_LABEL = {
  wood: '목(木)',
  fire: '화(火)',
  earth: '토(土)',
  metal: '금(金)',
  water: '수(水)'
};
function guardianIdBySequence(sequence) {
  const i = sequence - 1;
  return GAN_HANJA[i % GAN_HANJA.length] + ZHI_HANJA[i % ZHI_HANJA.length];
}
function guardianElement(id) {
  const ganIndex = GAN_HANJA.indexOf(id.charAt(0));
  if (ganIndex < 0) return 'wood';
  return ELEMENT_BY_GAN_INDEX[Math.floor(ganIndex / 2)];
}
Object.assign(__ds_scope, { GAN_HANJA, ZHI_HANJA, ELEMENT_BY_GAN_INDEX, ELEMENT_LABEL, guardianIdBySequence, guardianElement });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guardian/guardianData.js", error: String((e && e.message) || e) }); }

// components/guardian/ChemistryBlock.jsx
try { (() => {
const {
  useEffect
} = React;
/** 결과 화면의 유일한 공유 허브. 찰떡+티격태격을 한 압축 박스에 담는다. */
function ChemistryBlock({
  guardian,
  assetBase,
  isSharing,
  onShare,
  onView
}) {
  const {
    best,
    worst
  } = __ds_scope.findChemistryExtremes(guardian.id, assetBase);
  useEffect(() => {
    onView && onView();
  }, [guardian.id]);
  const rows = [{
    label: '찰떡',
    match: best
  }, {
    label: '티격태격',
    match: worst
  }];
  return /*#__PURE__*/React.createElement("section", {
    style: {
      marginTop: 20,
      padding: 16,
      borderRadius: 'var(--radius-lg)',
      background: 'var(--color-card)'
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 12px',
      color: 'var(--color-ink)',
      fontSize: 15,
      fontWeight: 600
    }
  }, "함께 일하면?"), rows.map((row, i) => /*#__PURE__*/React.createElement("div", {
    key: row.label,
    style: {
      display: 'grid',
      gridTemplateColumns: '46px 1fr auto',
      gap: 10,
      alignItems: 'center',
      padding: '9px 0',
      borderTop: i === 0 ? 0 : '1px solid color-mix(in srgb, var(--color-line) 70%, transparent)'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.GuardianPortrait, {
    guardian: row.match.guardian,
    size: 46
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      color: 'var(--color-brand)',
      fontSize: 10,
      fontWeight: 600
    }
  }, row.label), /*#__PURE__*/React.createElement("strong", {
    style: {
      display: 'block',
      fontSize: 14,
      fontWeight: 600
    }
  }, row.match.guardian.nickname), /*#__PURE__*/React.createElement("small", {
    style: {
      display: 'block',
      marginTop: 1,
      color: 'var(--color-muted)',
      fontSize: 11
    }
  }, __ds_scope.chemistryCopy(row.match.dominantRelation))), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-muted)',
      fontSize: 11,
      whiteSpace: 'nowrap'
    }
  }, "직장 케미 ", row.match.score, "점"))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '12px 0 0',
      color: 'var(--color-ink)',
      textAlign: 'center',
      fontSize: 13,
      lineHeight: 1.5
    }
  }, "내 수호신은 ", guardian.nickname, ".", /*#__PURE__*/React.createElement("br", null), "너는?"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "primary",
    disabled: isSharing,
    onClick: onShare
  }, isSharing ? '공유 카드를 만드는 중…' : '친구에게 물어보기')));
}
Object.assign(__ds_scope, { ChemistryBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guardian/ChemistryBlock.jsx", error: String((e && e.message) || e) }); }

// components/guardian/ChemistryShareCard.jsx
try { (() => {
const ASPECTS = {
  square: {
    w: 800,
    h: 800,
    art: 190,
    pad: 40,
    gap: 10,
    scoreSize: 64,
    nameSize: 20,
    ctaSize: 17,
    capSize: 13,
    relSize: 14
  },
  story: {
    w: 900,
    h: 1600,
    art: 260,
    pad: 56,
    gap: 18,
    scoreSize: 84,
    nameSize: 24,
    ctaSize: 21,
    capSize: 15,
    relSize: 16
  }
};

/**
 * 궁합 비교 공유 카드 — 내 수호신 vs 상대 수호신, "직장 케미 N점"이 히어로.
 * 개인 카드보다 태그·재도전을 유도해 단체 카톡방/친구 태그로 2차 바이럴을 노리는 카드라 개인 정보·번호 배지는 넣지 않는다.
 * aspect="square"(1:1) | "story"(9:16) — 같은 템플릿을 공유한다.
 */
function ChemistryShareCard({
  a,
  b,
  score,
  relation,
  size = 400,
  aspect = 'square'
}) {
  const A = ASPECTS[aspect] || ASPECTS.square;
  const scale = size / A.w;
  const height = size * (A.h / A.w);
  const accentA = `var(--color-element-${a.element}-accent)`;
  const accentB = `var(--color-element-${b.element}-accent)`;
  const relCopy = relation ?? __ds_scope.chemistryCopy();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: size,
      height,
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 28 * scale,
      background: `radial-gradient(70% 60% at 22% 12%, color-mix(in srgb, ${accentA} 30%, transparent) 0%, transparent 60%), radial-gradient(70% 60% at 78% 12%, color-mix(in srgb, ${accentB} 30%, transparent) 0%, transparent 60%), var(--color-share-bg)`,
      fontFamily: 'var(--font-body)',
      boxSizing: 'border-box',
      border: '1px solid var(--color-line)',
      boxShadow: `inset 0 0 0 ${6 * scale}px var(--color-share-bg), inset 0 0 0 ${7 * scale}px var(--color-brand)`
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 18 * scale,
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: Math.max(11, A.capSize * scale * 0.85),
      fontWeight: 700,
      color: 'var(--color-share-brand)',
      letterSpacing: '.04em',
      whiteSpace: 'nowrap'
    }
  }, "잡사주 궁합"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: A.gap * scale,
      padding: A.pad * scale
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 14 * scale
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: A.art * scale,
      height: A.art * scale,
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      width: '130%',
      height: '130%',
      borderRadius: '50%',
      background: `radial-gradient(circle, color-mix(in srgb, ${accentA} 40%, transparent) 0%, transparent 70%)`
    }
  }), /*#__PURE__*/React.createElement("img", {
    src: a.imageUrl,
    alt: a.nickname,
    style: {
      position: 'relative',
      width: A.art * scale,
      height: A.art * scale,
      objectFit: 'contain',
      filter: 'drop-shadow(0 8px 14px rgba(47,55,50,.18))'
    }
  })), /*#__PURE__*/React.createElement("strong", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: A.scoreSize * 0.4 * scale,
      color: 'var(--color-share-muted)',
      fontWeight: 400
    }
  }, "\xD7"), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      width: A.art * scale,
      height: A.art * scale,
      display: 'grid',
      placeItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      width: '130%',
      height: '130%',
      borderRadius: '50%',
      background: `radial-gradient(circle, color-mix(in srgb, ${accentB} 40%, transparent) 0%, transparent 70%)`
    }
  }), /*#__PURE__*/React.createElement("img", {
    src: b.imageUrl,
    alt: b.nickname,
    style: {
      position: 'relative',
      width: A.art * scale,
      height: A.art * scale,
      objectFit: 'contain',
      filter: 'drop-shadow(0 8px 14px rgba(47,55,50,.18))'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8 * scale,
      fontFamily: 'var(--font-display)',
      fontSize: Math.max(13, A.nameSize * scale),
      color: 'var(--color-share-ink)',
      fontWeight: 500,
      whiteSpace: 'nowrap'
    }
  }, /*#__PURE__*/React.createElement("span", null, a.nickname), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--color-share-muted)',
      fontWeight: 400
    }
  }, "\xD7"), /*#__PURE__*/React.createElement("span", null, b.nickname)), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4 * scale,
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: Math.max(10, A.capSize * scale),
      color: 'var(--color-share-muted)',
      fontWeight: 600,
      whiteSpace: 'nowrap'
    }
  }, "직장 케미"), /*#__PURE__*/React.createElement("strong", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: Math.max(28, A.scoreSize * scale),
      color: 'var(--color-share-brand)',
      fontWeight: 500,
      lineHeight: 1
    }
  }, score, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: Math.max(11, A.scoreSize * 0.4 * scale)
    }
  }, "점"))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: Math.max(10, A.relSize * scale),
      color: 'var(--color-share-muted)',
      textAlign: 'center',
      maxWidth: '80%'
    }
  }, relCopy), /*#__PURE__*/React.createElement("strong", {
    style: {
      marginTop: 8 * scale,
      padding: `${8 * scale}px ${18 * scale}px`,
      borderRadius: 999,
      background: 'var(--color-brand)',
      fontSize: Math.max(12, A.ctaSize * scale),
      fontWeight: 700,
      color: 'var(--color-share-bg)',
      whiteSpace: 'nowrap',
      width: 'max-content'
    }
  }, "너랑 나랑 몇 점?"), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      bottom: 16 * scale,
      fontSize: 12 * scale,
      color: 'var(--color-share-brand)',
      fontWeight: 600,
      letterSpacing: '.02em'
    }
  }, "jobsaju.kr")));
}
Object.assign(__ds_scope, { ChemistryShareCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/guardian/ChemistryShareCard.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.TextLink = __ds_scope.TextLink;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.ScreenShell = __ds_scope.ScreenShell;

__ds_ns.ChemistryScore = __ds_scope.ChemistryScore;

__ds_ns.CollectionBadge = __ds_scope.CollectionBadge;

__ds_ns.ScoreGrid = __ds_scope.ScoreGrid;

__ds_ns.ChemistryBlock = __ds_scope.ChemistryBlock;

__ds_ns.ChemistryShareCard = __ds_scope.ChemistryShareCard;

__ds_ns.GuardianPortrait = __ds_scope.GuardianPortrait;

__ds_ns.GuardianNameplate = __ds_scope.GuardianNameplate;

__ds_ns.ShareCard = __ds_scope.ShareCard;

__ds_ns.GAN_HANJA = __ds_scope.GAN_HANJA;

__ds_ns.ZHI_HANJA = __ds_scope.ZHI_HANJA;

__ds_ns.ELEMENT_BY_GAN_INDEX = __ds_scope.ELEMENT_BY_GAN_INDEX;

__ds_ns.ELEMENT_LABEL = __ds_scope.ELEMENT_LABEL;

})();
