import assert from 'node:assert/strict';
import test from 'node:test';
import { buildElementInsight, buildCharacterName } from './reportInsights.ts';
import { buildVerdictView } from './reportViewModel.ts';

test('오행 풀이는 실제 최강·최약 오행을 짚는다', () => {
  const metalHeavy = buildElementInsight({ wood: 1, fire: 0, earth: 2, metal: 4, water: 1 });
  assert.match(metalHeavy, /금\(쇠\) 기운이 4개로 가장 강합니다/);
  assert.match(metalHeavy, /화\(불\)/);

  // 목이 강한 사주에는 금 이야기가 나오면 안 된다 (고정 문구 회귀 방지)
  const woodHeavy = buildElementInsight({ wood: 4, fire: 2, earth: 1, metal: 0, water: 1 });
  assert.match(woodHeavy, /목\(나무\) 기운이 4개로 가장 강합니다/);
  assert.doesNotMatch(woodHeavy, /금\(쇠\) 기운이 .*가장 강합니다/);
});

test('오행이 고르면 균형형으로 설명한다', () => {
  assert.match(buildElementInsight({ wood: 2, fire: 2, earth: 2, metal: 1, water: 1 }), /균형형/);
});

test('캐릭터명은 일간과 최고 점수 축을 함께 반영한다', () => {
  assert.equal(
    buildCharacterName('을', { jobChange: 63, stay: 61, negotiation: 87 }),
    '유연한 생존 전략가 · 협상 지배형 💼',
  );
  assert.equal(
    buildCharacterName('병', { jobChange: 40, stay: 80, negotiation: 50 }),
    '판을 밝히는 스포트라이터 · 뿌리 성장형 🛡️',
  );
});

test('결론과 지금 할 일은 가장 높은 점수에 맞춰 함께 바뀐다', () => {
  const nego = buildVerdictView({ jobChange: 63, stay: 61, negotiation: 87 });
  assert.match(nego.title, /협상할 때입니다/);
  assert.match(nego.action.title, /협상 자료/);

  const stay = buildVerdictView({ jobChange: 48, stay: 76, negotiation: 52 });
  assert.match(stay.title, /현재 자리에서/);
  assert.match(stay.action.title, /남을 조건/);

  const change = buildVerdictView({ jobChange: 83, stay: 49, negotiation: 61 });
  assert.match(change.action.title, /이력서/);
});
