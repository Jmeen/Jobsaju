import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCareerSignal } from './careerSignal.ts';
import type { CareerAxis } from './careerSignal.ts';

const scores = (jobChange: number, negotiation: number, stay: number) => ({ jobChange, negotiation, stay });
const markOf = (view: ReturnType<typeof buildCareerSignal>, axis: CareerAxis) =>
  view.items.find(item => item.axis === axis)!.mark;

test('가장 높은 축이 ◎, 중간이 ○, 가장 낮은 축이 △', () => {
  const view = buildCareerSignal(scores(40, 66, 52));

  assert.equal(markOf(view, 'negotiation'), '◎');
  assert.equal(markOf(view, 'stay'), '○');
  assert.equal(markOf(view, 'jobChange'), '△');
  assert.equal(view.topAxis, 'negotiation');
});

test('노출 순서는 이직·협상·잔류로 고정한다', () => {
  const view = buildCareerSignal(scores(70, 40, 30));
  assert.deepEqual(view.items.map(item => item.axis), ['jobChange', 'negotiation', 'stay']);
});

test('마크는 언제나 ◎·○·△ 한 개씩만 나온다', () => {
  const view = buildCareerSignal(scores(51, 51, 51));
  assert.deepEqual([...view.items.map(i => i.mark)].sort(), ['△', '○', '◎'].sort());
});

test('동점이면 협상 → 잔류 → 이직 순으로 결정론적으로 갈린다', () => {
  const view = buildCareerSignal(scores(50, 50, 50));
  assert.equal(view.topAxis, 'negotiation', '완전 동점이면 마찰이 작은 협상이 우선');
  assert.equal(markOf(view, 'negotiation'), '◎');
  assert.equal(markOf(view, 'stay'), '○');
  assert.equal(markOf(view, 'jobChange'), '△');
});

test('한 문장 판단·다음 질문·CTA가 최상위 축을 따라간다', () => {
  const jobTop = buildCareerSignal(scores(80, 40, 30));
  assert.match(jobTop.sentence, /밖의 기회/);
  assert.match(jobTop.bridge, /이직 흐름/);

  const stayTop = buildCareerSignal(scores(30, 40, 80));
  assert.match(stayTop.sentence, /실력을 다지/);
  assert.match(stayTop.bridge, /잔류/);

  assert.equal(jobTop.ctaLabel, stayTop.ctaLabel, 'CTA 문구는 축과 무관하게 동일');
});
