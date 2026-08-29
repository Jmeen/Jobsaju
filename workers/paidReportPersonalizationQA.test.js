import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPaidReportContext } from './paidReportContext.js';
import { validateAndRepairPaidReport } from './paidReportValidator.js';

const FIXED_NOW = new Date('2026-08-29T03:00:00.000Z');
const BIRTH_SAMPLES = [
  '1970-01-05', '1970-01-17', '1970-03-05', '1970-03-26', '1970-05-05',
  '1973-01-17', '1976-03-26', '1979-07-17', '1982-09-05', '1985-11-17',
  '1988-11-26', '1991-03-05', '1994-05-17', '1997-09-26', '2000-07-26',
  '2003-01-05', '1986-07-05', '1993-11-26', '1998-03-17', '2004-05-26',
];

function birthFrom(value) {
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day, hour: null, minute: 0, gender: 1, isSolar: true };
}

function generatedNarrative(timeline) {
  return JSON.stringify({
    timeline: timeline.map(month => {
      const [year, rawMonth] = month.year_month.split('-');
      return {
        year_month: month.year_month,
        scores: month.scores,
        keyword: '조건 점검',
        summary: '점수 흐름을 바탕으로 현실 조건을 확인하는 시기입니다.',
        action: `${year}년 ${Number(rawMonth)}월에는 역할 범위와 평가 기준을 문서로 확인하세요.`,
      };
    }),
    personalized_advice: {
      question_summary: '현재 커리어 선택의 우선순위',
      diagnosis: '월별 점수와 현실 조건을 함께 비교해야 합니다.',
      character_connection: '캐릭터 성향을 실제 역할과 권한 확인 방식에 연결합니다.',
      recommendation: '모델의 추천은 서버 판단으로 교체됩니다.',
      action_steps: [],
      watch_out: [],
    },
  });
}

test('실제 생년월일 20개로 전체 결정 리포트 QA를 통과한다', () => {
  const reports = BIRTH_SAMPLES.map(value => {
    const context = buildPaidReportContext(birthFrom(value), { now: FIXED_NOW });
    const report = validateAndRepairPaidReport(
      generatedNarrative(context.timeline),
      context.timeline,
      context.precomputedHighlights,
      { generated_at: FIXED_NOW.toISOString(), timezone: 'Asia/Seoul', analysis_period: '2026-08 ~ 2027-01' },
      context.decisionContext,
    );
    return { value, context, report };
  });

  assert.equal(reports.length, 20);
  for (const { context, report } of reports) {
    assert.equal(report.timeline.length, 6);
    assert.equal(report.snapshot.analysis_period, '2026-08 ~ 2027-01');
    assert.equal(report.decision.personalization.character_id, context.characterData.id);
    assert.equal(report.decision.decision_guide.must_haves.length >= 2, true);
    assert.equal(report.decision.decision_guide.checks.length >= 3, true);
    assert.equal(report.decision.decision_guide.red_flags.length >= 2, true);
    assert.equal(report.decision.decision_guide.now_actions.length, 3);
    assert.ok(report.decision.decision_guide.red_flags.every(flag => flag.text));
    assert.ok(report.decision.decision_guide.checks.filter(item => item.reason).length <= 1);
    assert.equal(report.decision.steps.at(-1).year_month, report.timeline.at(-1).year_month);
    assert.match(report.personalized_advice.question_summary, /무엇을 우선하는 것이 좋을까요/);
    assert.doesNotMatch(report.personalized_advice.question_summary, /예상되는 가운데|흐름이 강해/);
    assert.equal(new Set(report.timeline.map(month => month.action)).size, 6);
    if (!report.decision.has_distinct_job_peak) {
      assert.equal(report.timing_highlights.best_job_change.year_month, null);
      assert.equal(report.timing_highlights.best_job_change.score, null);
    }
  }

  assert.ok(reports.some(({ report }) => report.decision.is_flat), '평탄형이 포함되어야 한다');
  assert.ok(reports.some(({ report }) => report.decision.has_distinct_job_peak), '이직 고점형이 포함되어야 한다');
  assert.ok(reports.some(({ report }) => report.decision.has_distinct_negotiation_peak), '협상 고점형이 포함되어야 한다');

  const sameCharacter = reports.filter(({ context }) => context.characterData.id === '乙酉');
  assert.ok(sameCharacter.length >= 3, '같은 캐릭터의 다른 생년월일 표본이 필요하다');
  assert.ok(new Set(sameCharacter.map(({ report }) => JSON.stringify(report.decision.decision_guide.if_then))).size >= 2,
    '같은 캐릭터라도 월별 패턴이 다르면 If-Then이 달라야 한다');

  const first = reports[0];
  const generic = validateAndRepairPaidReport(
    generatedNarrative(first.context.timeline), first.context.timeline, first.context.precomputedHighlights, null, {},
  );
  assert.notDeepEqual(
    first.report.decision.decision_guide.red_flags,
    generic.decision.decision_guide.red_flags,
    '오행·캐릭터를 제거하면 개인화된 Red Flag와 이유가 달라져야 한다',
  );
});
