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
    month('2026-09', 26, 57, 88, 1),
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
});
