import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveReportDecision } from './reportDecision.js';

const month = (year_month, job_change, negotiation, stay, risk) => ({
  year_month,
  scores: { job_change, negotiation, stay },
  debug: { semantic_signals: { Risk: risk } },
});

test('월별 흐름만으로 핵심 시기와 복합 행동 순서를 만든다', () => {
  const decision = deriveReportDecision([
    month('2026-08', 69, 39, 13, 2),
    month('2026-09', 26, 72, 88, 1),
    month('2026-10', 79, 36, 11, 10),
    month('2026-11', 34, 51, 75, 0),
  ]);

  assert.equal(decision.timing_highlights.best_job_change.year_month, '2026-10');
  assert.equal(decision.timing_highlights.best_negotiation.year_month, '2026-09');
  assert.equal(decision.timing_highlights.caution_month.year_month, '2026-10');
  assert.deepEqual(decision.steps.map(step => [step.year_month, step.phase]), [
    ['2026-08', '외부 탐색'],
    ['2026-09', '내부 협상'],
    ['2026-10', '조건부 이직 판단'],
  ]);
  assert.match(decision.strategy, /외부 탐색 → 내부 협상 → 조건부 이직 판단/);
  assert.equal(decision.decision_guide.now_actions.length, 3);
  assert.match(decision.decision_guide.if_then[0].then, /2026년 10월/);
});

test('평탄하고 낮은 점수는 억지 이직 고점 대신 기반 정리 흐름으로 처리한다', () => {
  const decision = deriveReportDecision([
    month('2026-08', 40, 42, 44, 2), month('2026-09', 43, 41, 43, 2),
    month('2026-10', 45, 44, 42, 3), month('2026-11', 41, 42, 44, 2),
    month('2026-12', 44, 43, 43, 2), month('2027-01', 42, 41, 44, 2),
  ]);
  assert.equal(decision.is_flat, true);
  assert.match(decision.report_summary.headline, /특정 달에 승부/);
  assert.equal(decision.timing_highlights.best_job_change.title, '뚜렷한 이동 고점이 없는 6개월');
  assert.equal(decision.timing_highlights.best_job_change.year_month, null);
  assert.equal(decision.timing_highlights.best_job_change.score, null);
  assert.equal(decision.timing_highlights.best_negotiation, null);
  assert.equal(decision.steps.some(step => step.phase.includes('이직')), false);
  assert.match(decision.decision_guide.if_then[0].then, /이동해야 한다고 보지/);
});

test('분포 기준 경계 아래의 작은 최고점은 이직 적기로 만들지 않는다', () => {
  const decision = deriveReportDecision([
    month('2026-08', 52, 48, 60, 0), month('2026-09', 55, 49, 59, 0),
    month('2026-10', 59, 50, 57, 0), month('2026-11', 53, 51, 58, 0),
    month('2026-12', 56, 48, 61, 0), month('2027-01', 54, 50, 60, 0),
  ]);
  assert.equal(decision.has_distinct_job_peak, false);
  assert.equal(decision.timing_highlights.best_job_change.year_month, null);
  assert.equal(decision.timing_highlights.caution_month, null);
});

test('캐릭터와 오행은 Red Flag 우선순위와 개인화 이유를 바꾼다', () => {
  const timeline = [
    month('2026-08', 45, 42, 62, 0), month('2026-09', 52, 44, 55, 1),
    month('2026-10', 78, 41, 24, 12), month('2026-11', 38, 64, 61, 0),
    month('2026-12', 40, 45, 65, 0), month('2027-01', 42, 46, 63, 0),
  ];
  const autonomy = deriveReportDecision(timeline, { character: { id: '甲子', keywords: ['주도성'] }, elements: { wood: 4, fire: 1, earth: 1, metal: 0, water: 0 } });
  const relationship = deriveReportDecision(timeline, { character: { id: '乙丑', keywords: ['관계감각'] }, elements: { wood: 0, fire: 1, earth: 1, metal: 0, water: 4 } });
  assert.notDeepEqual(autonomy.decision_guide.must_haves, relationship.decision_guide.must_haves);
  assert.notDeepEqual(autonomy.decision_guide.red_flags, relationship.decision_guide.red_flags);
  assert.match(autonomy.decision_guide.red_flags[1].reason, /권한 없는 책임/);
  assert.match(relationship.decision_guide.red_flags[1].reason, /조직의 빈틈/);
});
