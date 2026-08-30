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

const GUIDE_EXPECTATIONS = {
  stay: {
    title: '현재 회사에서 확인할 질문',
    summaries: ['역할·보상 개선 확정 → 잔류', '일부 개선·구두 약속 → 기한 설정', '기한까지 변화 없음 → 이동 준비'],
  },
  negotiation: {
    title: '협상 전에 확인할 근거',
    summaries: ['핵심 조건 수용 → 적용일 확인', '일부 조건 수용 → 우선순위 재협상', '핵심 조건 거절 → 다음 행동 결정'],
  },
  jobChange: {
    title: '오퍼에서 확인할 질문',
    summaries: ['내부 조건이 개선됐다면 → 비교 유지', '더 좋은 외부 제안이 왔다면 → 서면 검증', '보상만 좋아졌다면 → 보류'],
  },
};

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
    const entryAxis = context.decisionContext.entryAxis;
    const expectation = GUIDE_EXPECTATIONS[entryAxis];
    assert.equal(report.timeline.length, 6);
    assert.equal(report.snapshot.analysis_period, '2026-08 ~ 2027-01');
    assert.equal(report.decision.entry_axis, entryAxis);
    assert.equal(report.decision.personalization.character_id, context.characterData.id);
    assert.equal(report.decision.decision_guide.check_title, expectation.title);
    assert.equal(report.decision.decision_guide.must_haves.length, 3);
    assert.ok(report.decision.decision_guide.checks.length >= 3 && report.decision.decision_guide.checks.length <= 4);
    assert.equal(report.decision.decision_guide.red_flags.length, 3);
    assert.equal(report.decision.decision_guide.if_then.length, 3);
    assert.ok(report.decision.decision_guide.if_then.every(item => item.summary));
    assert.deepEqual(report.decision.decision_guide.if_then.map(item => item.summary), expectation.summaries);
    assert.equal(report.decision.strategy_roadmap.length, 4);
    assert.equal(report.decision.decision_guide.now_actions.length, 3);
    assert.ok(report.decision.decision_guide.red_flags.every(flag => flag.text));
    assert.ok(report.decision.decision_guide.checks.filter(item => item.reason).length <= 1);
    assert.equal(report.decision.steps.at(-1).year_month, report.timeline.at(-1).year_month);
    assert.match(report.personalized_advice.question_summary, /무엇을 우선하는 것이 좋을까요/);
    assert.doesNotMatch(report.personalized_advice.question_summary, /예상되는 가운데|흐름이 강해/);
    assert.equal(new Set(report.timeline.map(month => month.action)).size, 6);
    if (entryAxis !== 'jobChange') {
      assert.doesNotMatch(JSON.stringify(report.decision.decision_guide), /입사 후|면접관|오퍼 비교/);
    }
    if (!report.decision.has_distinct_job_peak) {
      assert.equal(report.timing_highlights.best_job_change.year_month, null);
      assert.equal(report.timing_highlights.best_job_change.score, null);
    }
  }

  assert.ok(reports.some(({ report }) => report.decision.is_flat), '평탄형이 포함되어야 한다');
  assert.ok(reports.some(({ report }) => report.decision.has_distinct_job_peak), '이직 고점형이 포함되어야 한다');
  assert.ok(reports.some(({ report }) => report.decision.has_distinct_negotiation_peak), '협상 고점형이 포함되어야 한다');
  assert.deepEqual(new Set(reports.map(({ report }) => report.decision.entry_axis)), new Set(['jobChange', 'negotiation', 'stay']));

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
