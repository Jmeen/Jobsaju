import assert from 'node:assert/strict';
import test from 'node:test';
import { buildShareCardModel, canvasToPngBlob, drawShareCard } from './shareCard.ts';

function baseInput(overrides: Partial<Parameters<typeof buildShareCardModel>[0]> = {}) {
  return {
    characterName: '큰 나무의 개척자',
    elementLabel: '목(木)',
    imageUrl: '/creatures/gap-wood.webp',
    collectionNo: 1,
    collectionTotal: 10,
    topAxisIcon: '💼',
    topAxisLabel: '협상운',
    topAxisLevel: '높음' as const,
    topAxisTone: 'elite' as const,
    scores: [
      { axis: 'jobChange' as const, label: '이직운', score: 72, level: '높음' as const },
      { axis: 'stay' as const, label: '잔류운', score: 54, level: '보통' as const },
      { axis: 'negotiation' as const, label: '협상운', score: 88, level: '높음' as const },
    ],
    conclusion: '지금은 결정보다 원하는 조건을 먼저 협상할 때입니다.',
    ...overrides,
  };
}

test('공유 카드 모델은 캐릭터, 컬렉션 번호, 우세 축 스탬프 정보를 함께 담는다', () => {
  const model = buildShareCardModel(baseInput());

  assert.equal(model.characterName, '큰 나무의 개척자');
  assert.equal(model.imageUrl, '/creatures/gap-wood.webp');
  assert.equal(model.collectionNo, 1);
  assert.equal(model.collectionTotal, 10);
  assert.equal(model.topAxisTone, 'elite');
  assert.equal(model.topAxisLevel, '높음');
  assert.equal(model.scores.length, 3);
  assert.match(model.conclusion, /협상/);
  assert.doesNotMatch(JSON.stringify(model), /rank|상위|하위|백분위/);
});

test('컬렉션 번호는 1~total 범위를 벗어나지 않는다', () => {
  const under = buildShareCardModel(baseInput({ collectionNo: 0 }));
  const over = buildShareCardModel(baseInput({ collectionNo: 999 }));
  assert.equal(under.collectionNo, 1);
  assert.equal(over.collectionNo, 10);
});

test('긴 문구는 카드 폭을 넘지 않도록 제한된다', () => {
  const model = buildShareCardModel(baseInput({
    characterName: '아주 긴 캐릭터 이름 '.repeat(20),
    conclusion: '아주 긴 핵심 결론 '.repeat(30),
  }));

  assert.ok(model.characterName.length <= 24);
  assert.ok(model.conclusion.length <= 60);
});

test('캔버스를 PNG Blob으로 변환한다', async () => {
  const expected = new Blob(['png'], { type: 'image/png' });
  const canvas = { toBlob(callback: (blob: Blob | null) => void) { callback(expected); } };
  assert.equal(await canvasToPngBlob(canvas), expected);
});

test('PNG 생성 실패를 명확하게 알린다', async () => {
  const canvas = { toBlob(callback: (blob: Blob | null) => void) { callback(null); } };
  await assert.rejects(() => canvasToPngBlob(canvas), /공유 이미지를 만들지 못했습니다/);
});

test('공유 카드에서 결론과 구분선을 빼고 Jobsaju.kr만 푸터로 표시한다', () => {
  const texts: string[] = [];
  const paths: Array<[string, number, number]> = [];
  const gradient = { addColorStop() {} };
  const ctx = {
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
    fillRect() {},
    beginPath() {},
    roundRect() {},
    stroke() {},
    fill() {},
    save() {},
    clip() {},
    restore() {},
    measureText(text: string) { return { width: text.length * 10 }; },
    fillText(text: string) { texts.push(text); },
    moveTo(x: number, y: number) { paths.push(['moveTo', x, y]); },
    lineTo(x: number, y: number) { paths.push(['lineTo', x, y]); },
  };
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  const model = buildShareCardModel(baseInput({
    conclusion: '현직을 유지하며 면접 전략을 재정비하세요.',
  }));

  drawShareCard(canvas as unknown as HTMLCanvasElement, model);

  assert.ok(texts.includes('Jobsaju.kr'));
  assert.ok(!texts.includes(model.conclusion));
  assert.ok(!paths.some(([, x, y]) => x === 60 && y === 662));
  assert.ok(!paths.some(([, x, y]) => x === 740 && y === 662));
});
