// 공유 카드. 스펙상 내 수호신 이미지·이름·성향 한 줄과 "너는 어떤 수호신일까?"만 담는다.
// 찰떡·티격태격 상대나 생년월일 같은 개인정보는 넣지 않는다.
import type { GuardianAsset } from './guardianAssets.ts';

export const SHARE_CARD_SIZE = 800;

const BG = '#faf8f2';
const INK = '#2f3732';
const MUTED = '#858b83';
const GREEN = '#66866e';

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
  ctx.font = '600 60px Pretendard, system-ui, sans-serif';
  ctx.fillText(guardian.nickname, size / 2, 540);

  ctx.fillStyle = GREEN;
  ctx.font = '28px Pretendard, system-ui, sans-serif';
  ctx.fillText(`${guardian.ganzhiKo} · ${guardian.elementLabel} 기운의 수호신`, size / 2, 586);

  ctx.fillStyle = MUTED;
  ctx.font = '30px Pretendard, system-ui, sans-serif';
  const lines = wrap(ctx, guardian.copy, size - 140).slice(0, 2);
  lines.forEach((line, index) => ctx.fillText(line, size / 2, 648 + index * 42));

  ctx.fillStyle = INK;
  ctx.font = '600 34px Pretendard, system-ui, sans-serif';
  ctx.fillText('너는 어떤 수호신일까?', size / 2, 748);
}

/** 카카오·Web Share에 실을 문구. 개인정보 없이 수호신만 드러낸다. */
export function buildGuardianShareText(guardian: GuardianAsset): { hook: string; description: string } {
  return {
    hook: `내 직장생활 수호신은 ${guardian.nickname}`,
    description: `${guardian.copy}\n너는 어떤 수호신일까? 생년월일이면 10초면 나와요.`,
  };
}
