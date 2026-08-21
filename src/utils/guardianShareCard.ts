// 공유 카드. 스펙상 내 수호신 이미지·이름·성향 한 줄과 "너는 어떤 수호신일까?"만 담는다.
// 찰떡·티격태격 상대나 생년월일 같은 개인정보는 넣지 않는다.
import type { GuardianAsset } from './guardianAssets.ts';

export const SHARE_CARD_SIZE = 800;

const BG = '#faf8f2';
const INK = '#2f3732';
const MUTED = '#858b83';
const GREEN = '#66866e';

// 디자인 시스템 토큰(--font-display / --font-body)과 같은 스택을 캔버스에서도 쓴다.
// CSS 변수는 캔버스에서 못 읽으므로 문자열로 옮겨 적는다 — 토큰을 바꾸면 여기도 같이 고친다.
const DISPLAY_FONT = '"BM DOHYEON", "Nanum Gothic", system-ui, sans-serif';
const BODY_FONT = 'Pretendard, "Nanum Gothic", system-ui, sans-serif';

// 실제로 카드에 쓰는 폰트 조합. 아래 ensureShareCardFonts가 이 목록을 먼저 확보한다.
const CARD_FONT_SPECS = [
  `400 60px ${DISPLAY_FONT}`,
  `28px ${BODY_FONT}`,
  `30px ${BODY_FONT}`,
  `600 34px ${BODY_FONT}`,
];

/**
 * 캔버스는 웹폰트 로딩을 스스로 촉발하지 않는다 — 아직 내려받지 않은 폰트를 ctx.font에 넣으면
 * 경고 없이 시스템 폰트로 그려버린다. 카드를 그리기 전에 쓸 폰트를 먼저 확보한다.
 */
export async function ensureShareCardFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    // 한글 글리프가 실제로 필요하므로 샘플 문자를 같이 넘긴다(서브셋 폰트 대응).
    await Promise.all(CARD_FONT_SPECS.map(spec => document.fonts.load(spec, '수호신')));
  } catch {
    // 폰트를 못 받아도 카드는 시스템 폰트로 그려진다 — 공유 자체를 막지 않는다.
  }
}

/** 카드를 그릴 때 쓰는 최소 캔버스 인터페이스 — 테스트에서 가짜 컨텍스트를 넣을 수 있다. */
export type ShareCardCanvas = {
  width: number;
  height: number;
  getContext(type: '2d'): CanvasRenderingContext2D | null;
};

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** 수호신 그림을 불러온다. 실패하면 null — 카드는 그림 없이도 그려진다. */
export function loadGuardianImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    if (typeof Image === 'undefined') { resolve(null); return; }
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

export function drawGuardianShareCard(
  canvas: ShareCardCanvas,
  guardian: GuardianAsset,
  image: HTMLImageElement | null,
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = SHARE_CARD_SIZE;
  canvas.width = size;
  canvas.height = size;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, size, size);

  if (image) {
    const box = 360;
    ctx.drawImage(image, (size - box) / 2, 96, box, box);
  } else {
    ctx.fillStyle = INK;
    ctx.font = '200px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(guardian.animalEmoji, size / 2, 360);
  }

  ctx.textAlign = 'center';

  ctx.fillStyle = INK;
  // 수호신 이름만 Display 폰트다. BM DOHYEON은 400 한 벌뿐이라 굵기를 흉내 내지 않는다.
  ctx.font = `400 60px ${DISPLAY_FONT}`;
  ctx.fillText(guardian.nickname, size / 2, 540);

  ctx.fillStyle = GREEN;
  ctx.font = `28px ${BODY_FONT}`;
  ctx.fillText(`${guardian.ganzhiKo} · ${guardian.elementLabel} 기운의 수호신`, size / 2, 586);

  ctx.fillStyle = MUTED;
  ctx.font = `30px ${BODY_FONT}`;
  const lines = wrap(ctx, guardian.copy, size - 140).slice(0, 2);
  lines.forEach((line, index) => ctx.fillText(line, size / 2, 648 + index * 42));

  ctx.fillStyle = INK;
  ctx.font = `600 34px ${BODY_FONT}`;
  ctx.fillText('너는 어떤 수호신일까?', size / 2, 748);
}

/** 카카오·Web Share에 실을 문구. 개인정보 없이 수호신만 드러낸다. */
export function buildGuardianShareText(guardian: GuardianAsset): { hook: string; description: string } {
  return {
    hook: `내 직장생활 수호신은 ${guardian.nickname}`,
    description: `${guardian.copy}\n너는 어떤 수호신일까? 생년월일이면 10초면 나와요.`,
  };
}
