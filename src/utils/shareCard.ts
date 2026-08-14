export type ShareCardAxis = 'jobChange' | 'stay' | 'negotiation';
export type ShareCardTone = 'elite' | 'high' | 'mid' | 'low';

export type ShareCardScore = {
  axis: ShareCardAxis;
  label: string;
  score: number;
  level: '높음' | '보통 이상' | '보통' | '낮음';
};

export type ShareCardInput = {
  characterName: string;
  /** 예: "목(木)" */
  elementLabel: string;
  imageUrl: string;
  collectionNo: number;
  collectionTotal: number;
  /** 가장 우세한 축 — 크리처 위 오버레이 스탬프로 표시된다 */
  topAxisIcon: string;
  topAxisLabel: string;
  topAxisLevel: '높음' | '보통 이상' | '보통' | '낮음';
  topAxisTone: ShareCardTone;
  /** jobChange, stay, negotiation 순서 3개 */
  scores: ShareCardScore[];
  conclusion: string;
};

export type ShareCardModel = Readonly<ShareCardInput>;

type BlobCanvas = { toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: number): void };

const TONE_HEX: Record<ShareCardTone, string> = {
  elite: '#f5c451',
  high: '#a78bfa',
  mid: '#7dd3fc',
  low: '#94a3b8',
};

function cleanText(value: string, maxLength: number): string {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}…` : cleaned;
}

export function buildShareCardModel(input: ShareCardInput): ShareCardModel {
  return {
    characterName: cleanText(input.characterName, 24),
    elementLabel: input.elementLabel,
    imageUrl: input.imageUrl,
    collectionNo: Math.max(1, Math.min(input.collectionTotal, Math.round(input.collectionNo))),
    collectionTotal: input.collectionTotal,
    topAxisIcon: input.topAxisIcon,
    topAxisLabel: input.topAxisLabel,
    topAxisLevel: input.topAxisLevel,
    topAxisTone: input.topAxisTone,
    scores: input.scores.slice(0, 3).map(item => ({
      axis: item.axis,
      label: cleanText(item.label, 8),
      score: Math.max(0, Math.min(100, Math.round(item.score))),
      level: item.level,
    })),
    conclusion: cleanText(input.conclusion, 60),
  };
}

/** 이미지를 자르지 않고 프레임 안에 전부 보이도록 그린다 (크리처가 잘리면 도감 이미지로서 가치가 없다) */
function drawContain(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  let dw = width;
  let dh = height;
  if (sourceRatio > targetRatio) {
    dh = width / sourceRatio;
  } else {
    dw = height * sourceRatio;
  }
  const dx = x + (width - dw) / 2;
  const dy = y + (height - dh) / 2;
  ctx.drawImage(image, dx, dy, dw, dh);
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/**
 * 콜렉팅 카드 스타일 공유 이미지.
 * 크리처 전체가 잘리지 않는 스테이지 + 우세 축 오버레이 스탬프 + 컬렉션 번호로
 * "내가 어떤 카드를 뽑았는지" 한눈에 보이는 도감/포켓몬카드 레이아웃.
 */
export function drawShareCard(
  canvas: HTMLCanvasElement,
  model: ShareCardModel,
  characterImage?: HTMLImageElement,
): void {
  const W = 800;
  const H = 800;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const font = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  const tone = TONE_HEX[model.topAxisTone];

  // 1. 배경
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#1a1530');
  bg.addColorStop(1, '#0b0911');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 2. 카드 프레임 (희귀도 톤 컬러 테두리 — 등급이 높을수록 화려한 색)
  ctx.strokeStyle = tone;
  ctx.lineWidth = 3;
  roundRectPath(ctx, 24, 24, W - 48, H - 48, 28);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, 34, 34, W - 68, H - 68, 22);
  ctx.stroke();

  // 3. 헤더 — 컬렉션 번호 · 브랜드
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.font = `700 18px ${font}`;
  ctx.textAlign = 'left';
  ctx.fillText(`No. ${String(model.collectionNo).padStart(2, '0')} / ${model.collectionTotal}`, 60, 78);

  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.font = `600 15px ${font}`;
  ctx.textAlign = 'right';
  ctx.fillText('직장인 이직사주', W - 60, 78);
  ctx.textAlign = 'left';

  // 4. 크리처 스테이지 — 톤 컬러 글로우 + contain으로 전체가 보이게
  const stage = { x: 60, y: 104, w: W - 120, h: 372 };
  const glow = ctx.createRadialGradient(
    stage.x + stage.w / 2, stage.y + stage.h / 2, 20,
    stage.x + stage.w / 2, stage.y + stage.h / 2, stage.w / 1.6,
  );
  glow.addColorStop(0, `${tone}33`);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(stage.x - 40, stage.y - 40, stage.w + 80, stage.h + 80);

  ctx.save();
  roundRectPath(ctx, stage.x, stage.y, stage.w, stage.h, 20);
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,.03)';
  ctx.fillRect(stage.x, stage.y, stage.w, stage.h);
  if (characterImage) drawContain(ctx, characterImage, stage.x + 16, stage.y + 16, stage.w - 32, stage.h - 32);
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.14)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, stage.x, stage.y, stage.w, stage.h, 20);
  ctx.stroke();

  // 5. 우세 축 오버레이 스탬프 — 크리처 우하단에 얹는 "이 카드의 특기" 배지
  const stampW = 168;
  const stampH = 48;
  const stampX = stage.x + stage.w - stampW - 18;
  const stampY = stage.y + stage.h - stampH - 18;
  ctx.fillStyle = 'rgba(11,9,17,.88)';
  roundRectPath(ctx, stampX, stampY, stampW, stampH, 24);
  ctx.fill();
  ctx.strokeStyle = tone;
  ctx.lineWidth = 2;
  roundRectPath(ctx, stampX, stampY, stampW, stampH, 24);
  ctx.stroke();
  ctx.font = `24px ${font}`;
  ctx.textAlign = 'left';
  ctx.fillText(model.topAxisIcon, stampX + 14, stampY + 32);
  ctx.fillStyle = tone;
  ctx.font = `800 16px ${font}`;
  ctx.fillText(`${model.topAxisLabel} 우세`, stampX + 48, stampY + 22);
  ctx.fillStyle = 'rgba(255,255,255,.82)';
  ctx.font = `600 13px ${font}`;
  ctx.fillText(`${model.topAxisLevel} 흐름`, stampX + 48, stampY + 38);

  // 6. 캐릭터 이름 + 타입
  ctx.fillStyle = '#ffffff';
  ctx.font = `800 30px ${font}`;
  ctx.fillText(model.characterName, 60, 528);

  ctx.fillStyle = tone;
  ctx.font = `700 16px ${font}`;
  const characterType = `${model.characterName.trim().split(/\s+/).at(-1) || '본원'}형`;
  ctx.fillText(`${model.elementLabel} ${characterType}`, 60, 556);

  // 7. 3대 점수 (칩)
  model.scores.forEach((item, index) => {
    const x = 60 + index * 232;
    const y = 578;
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    roundRectPath(ctx, x, y, 212, 60, 14);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 17px ${font}`;
    ctx.fillText(`${item.label} ${item.score}점`, x + 14, y + 24);
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = `500 14px ${font}`;
    ctx.fillText(item.level, x + 14, y + 44);
  });

  // 8. 하단 도메인
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.font = `500 13px ${font}`;
  ctx.fillText('Jobsaju.kr', 60, H - 46);
}

export function canvasToPngBlob(canvas: BlobCanvas): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error('공유 이미지를 만들지 못했습니다'));
  }, 'image/png'));
}
