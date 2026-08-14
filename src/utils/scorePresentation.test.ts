import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildAllScoreViews,
  buildTopScore,
  getScoreLevel,
} from './scorePresentation.ts';

test('점수 등급은 승인된 경계값에서 바뀐다', () => {
  const cases = [
    [0, '낮음'],
    [39, '낮음'],
    [40, '보통'],
    [54, '보통'],
    [55, '보통 이상'],
    [69, '보통 이상'],
    [70, '높음'],
    [100, '높음'],
  ] as const;

  for (const [score, expected] of cases) {
    assert.equal(getScoreLevel(score), expected, `${score}점 등급`);
  }
});

test('가장 높은 원점수의 축을 대표 흐름으로 고른다', () => {
  assert.equal(buildTopScore({ jobChange: 63, stay: 33, negotiation: 71 }).axis, 'negotiation');
});

test('최고 점수가 같으면 이직, 잔류, 협상 순서로 안정적으로 고른다', () => {
  assert.equal(buildTopScore({ jobChange: 70, stay: 70, negotiation: 50 }).axis, 'jobChange');
  assert.equal(buildTopScore({ jobChange: 40, stay: 70, negotiation: 70 }).axis, 'stay');
});

test('사용자용 점수 모델에는 백분위 표현이 없다', () => {
  const views = buildAllScoreViews({ jobChange: 63, stay: 33, negotiation: 71 });
  assert.deepEqual(views.map(view => view.headline), [
    '이직운 63점 · 보통 이상',
    '잔류운 33점 · 낮음',
    '협상운 71점 · 높음',
  ]);
  assert.doesNotMatch(JSON.stringify(views), /상위|하위|백분위|20,000/);
});
