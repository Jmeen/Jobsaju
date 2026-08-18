import assert from 'node:assert/strict';
import test from 'node:test';
import { SHARE_CARD_SIZE, buildGuardianShareText, drawGuardianShareCard } from './guardianShareCard.ts';
import { getGuardianAsset } from './guardianAssets.ts';

const tiger = getGuardianAsset('甲寅');

/** 무엇을 그렸는지만 기록하는 가짜 2D 컨텍스트. */
function fakeCanvas() {
  const texts: string[] = [];
  const ctx = {
    fillStyle: '', font: '', textAlign: '',
    fillRect() {},
    drawImage() { texts.push('[image]'); },
    fillText(text: string) { texts.push(text); },
    measureText: (text: string) => ({ width: text.length * 15 }),
  };
  return {
    texts,
    canvas: { width: 0, height: 0, getContext: () => ctx as unknown as CanvasRenderingContext2D },
  };
}

test('카드에 수호신 이름·간지·성향·유도 문구를 그린다', () => {
  const { canvas, texts } = fakeCanvas();

  drawGuardianShareCard(canvas, tiger, {} as HTMLImageElement);

  assert.equal(canvas.width, SHARE_CARD_SIZE);
  assert.equal(canvas.height, SHARE_CARD_SIZE);
  assert.ok(texts.includes('[image]'), '그림을 받았으면 그린다');
  assert.ok(texts.includes(tiger.nickname));
  assert.ok(texts.some(t => t.includes(tiger.ganzhiKo)));
  assert.ok(texts.includes('너는 어떤 수호신일까?'));
});

test('그림을 못 받으면 띠 이모지로 대신 그린다', () => {
  const { canvas, texts } = fakeCanvas();

  drawGuardianShareCard(canvas, tiger, null);

  assert.equal(texts.includes('[image]'), false);
  assert.ok(texts.includes(tiger.animalEmoji));
  assert.ok(texts.includes(tiger.nickname), '그림이 없어도 이름은 남는다');
});

test('카드에 개인정보나 궁합 상대를 넣지 않는다', () => {
  const { canvas, texts } = fakeCanvas();

  drawGuardianShareCard(canvas, tiger, null);
  const all = texts.join(' ');

  for (const word of ['생년월일', '찰떡', '티격태격', '@']) {
    assert.equal(all.includes(word), false, `카드에 "${word}"가 들어가면 안 된다`);
  }
});

test('공유 문구는 수호신 이름과 성향만 쓴다', () => {
  const { hook, description } = buildGuardianShareText(tiger);

  assert.ok(hook.includes(tiger.nickname));
  assert.ok(description.includes(tiger.copy));
  assert.ok(description.includes('너는 어떤 수호신일까?'));
});
