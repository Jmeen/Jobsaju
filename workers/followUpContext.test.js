import assert from 'node:assert/strict';
import test from 'node:test';
import { locateQuestionDate, loadStoredFollowUpContext } from './followUpContext.js';

const report = {
  snapshot: { analysis_period: '2026-08 ~ 2027-01' },
  timeline: ['2026-08', '2026-09', '2026-10', '2026-11', '2026-12', '2027-01']
    .map(year_month => ({ year_month, scores: { job_change: 50, negotiation: 50, stay: 50 } })),
};

test('질문 날짜가 원본 6개월 안인지 지난 뒤인지 구분한다', () => {
  assert.deepEqual(locateQuestionDate(report, '2026-10-15').status, 'inside');
  assert.equal(locateQuestionDate(report, '2026-10-15').month_index, 3);
  assert.equal(locateQuestionDate(report, '2027-03-01').status, 'after');
  assert.match(locateQuestionDate(report, '2027-03-01').message, /원본 결론은 바꾸지 말고/);
});

test('브라우저 입력 없이 토큰의 원본 리포트와 저장된 질문 이력을 읽는다', async () => {
  const values = new Map([
    ['report:copy-v2:token-123', JSON.stringify({ status: 'success', report: { ...report, decision: { strategy: '서버 전략' } } })],
    ['meta:token-123', JSON.stringify({ user_context: { current_job: '서버 직무' }, saju_data: { dayGan: { gan: '병' } } })],
    ['followups:token-123', JSON.stringify([{ question: '첫 질문', answer: '첫 답변' }])],
  ]);
  const kv = { async get(key) { return values.get(key) ?? null; } };
  const context = await loadStoredFollowUpContext(kv, 'token-123', '2026-09-01');
  assert.equal(context.original_report.decision.strategy, '서버 전략');
  assert.equal(context.user_context.current_job, '서버 직무');
  assert.equal(context.previous_followups[0].question, '첫 질문');
  assert.equal(context.question_date_position.month_index, 2);
});
