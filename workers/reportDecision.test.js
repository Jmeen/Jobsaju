import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyScorePattern, deriveReportDecision } from './reportDecision.js';

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
    ['2026-11', '조건 재협상'],
  ]);
  assert.match(decision.strategy, /8월 외부 탐색 → 9월 내부 협상 → 10월 조건부 이직 판단 → 11월 조건 재협상/);
  assert.equal(decision.steps.at(-1).year_month, '2026-11');
  assert.equal(decision.strategy_roadmap.length, 4);
  assert.equal(decision.decision_guide.must_haves.length, 3);
  assert.equal(decision.decision_guide.red_flags.length, 3);
  assert.equal(decision.decision_guide.now_actions.length, 3);
  assert.ok(decision.decision_guide.checks.length <= 4);
  assert.ok(decision.decision_guide.if_then.length <= 3);
  assert.ok(decision.decision_guide.if_then.every(item => item.summary));
  assert.match(decision.decision_guide.if_then[0].then, /2026년 10월/);
});

test('평탄하고 낮은 점수는 억지 이직 고점 대신 기반 정리 흐름으로 처리한다', () => {
  const decision = deriveReportDecision([
    month('2026-08', 40, 42, 44, 2), month('2026-09', 43, 41, 43, 2),
    month('2026-10', 45, 44, 42, 3), month('2026-11', 41, 42, 44, 2),
    month('2026-12', 44, 43, 43, 2), month('2027-01', 42, 41, 44, 2),
  ]);
  assert.equal(decision.is_flat, true);
  assert.match(decision.report_summary.headline, /뚜렷한 외부 이동 고점은 없습니다/);
  assert.equal(decision.timing_highlights.best_job_change.title, '뚜렷한 이동 고점이 없는 6개월');
  assert.equal(decision.timing_highlights.best_job_change.year_month, null);
  assert.equal(decision.timing_highlights.best_job_change.score, null);
  assert.equal(decision.timing_highlights.best_negotiation, null);
  assert.equal(decision.steps.some(step => step.phase.includes('이직')), false);
  assert.match(decision.decision_guide.if_then[1].then, /반드시 이동해야 한다고 보지/);
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

test('캐릭터와 오행은 관찰 가능한 Red Flag와 Must Have를 바꾼다', () => {
  const timeline = [
    month('2026-08', 45, 42, 62, 0), month('2026-09', 52, 44, 55, 1),
    month('2026-10', 78, 41, 24, 12), month('2026-11', 38, 64, 61, 0),
    month('2026-12', 40, 45, 65, 0), month('2027-01', 42, 46, 63, 0),
  ];
  const autonomy = deriveReportDecision(timeline, { character: { id: '甲子', keywords: ['주도성'] }, elements: { wood: 4, fire: 1, earth: 1, metal: 0, water: 0 } });
  const relationship = deriveReportDecision(timeline, { character: { id: '乙丑', keywords: ['관계감각'] }, elements: { wood: 0, fire: 1, earth: 1, metal: 0, water: 4 } });
  assert.notDeepEqual(autonomy.decision_guide.must_haves, relationship.decision_guide.must_haves);
  assert.notDeepEqual(autonomy.decision_guide.red_flags, relationship.decision_guide.red_flags);
  assert.match(autonomy.decision_guide.red_flags[1].text, /결정권자 설명도 계속 바뀜/);
  assert.match(relationship.decision_guide.red_flags[1].text, /면접 내내 갈등 수습 사례/);
  assert.equal(autonomy.decision_guide.checks.filter(item => item.reason).length, 1);
});

test('파동형 안정성을 단순 하락으로 말하지 않고 마지막 달 출구까지 연결한다', () => {
  const timeline = [
    month('2026-08', 36, 45, 59, 2), month('2026-09', 51, 44, 30, 3),
    month('2026-10', 33, 47, 72, 1), month('2026-11', 64, 36, 13, 12),
    month('2026-12', 55, 43, 23, 4), month('2027-01', 45, 55, 74, 1),
  ];
  const pattern = classifyScorePattern(timeline, item => item.scores.stay);
  const decision = deriveReportDecision(timeline, { generatedAt: '2026-08-29T03:00:00.000Z' });

  assert.equal(pattern.type, 'wave');
  assert.match(decision.report_summary.headline, /내부 안정성이 크게 출렁/);
  assert.doesNotMatch(decision.report_summary.headline, /점차 약해/);
  assert.match(decision.report_summary.headline, /2027년 1월에는 협상 여지와 내부 안정성이 다시 강해/);
  assert.equal(decision.timing_highlights.best_job_change.title, '외부 이동 기회가 가장 강한 시기');
  assert.equal(decision.steps.at(-1).year_month, '2027-01');
  assert.match(decision.strategy, /1월 조건 재협상$/);
  assert.deepEqual(decision.strategy_roadmap, [
    { when: '8~10월', action: '기준 정비' },
    { when: '11월', action: '외부 제안 판단' },
    { when: '12월', action: '기준 미충족 시 관망' },
    { when: '1월', action: '조건 재협상' },
  ]);
  assert.deepEqual(decision.decision_guide.if_then.map(item => item.summary), [
    '내부 조건이 개선됐다면 → 비교 유지',
    '더 좋은 외부 제안이 왔다면 → 서면 검증',
    '보상만 좋아졌다면 → 보류',
  ]);
  assert.match(decision.decision_guide.now_actions[0], /8월 말부터 9월 초까지/);
  assert.notEqual(decision.report_summary.one_line_action, decision.decision_guide.now_actions[0]);
});

test('월별 배열의 형태를 상승·하락·파동·평탄으로 구분한다', () => {
  const classify = values => classifyScorePattern(values.map((stay, index) => month(`2026-${String(index + 1).padStart(2, '0')}`, 50, 50, stay, 0)), item => item.scores.stay).type;
  assert.equal(classify([30, 40, 50, 60, 70]), 'rising');
  assert.equal(classify([70, 60, 50, 40, 30]), 'falling');
  assert.equal(classify([60, 30, 70, 20, 40, 75]), 'wave');
  assert.equal(classify([44, 46, 42, 45, 43]), 'flat');
});
