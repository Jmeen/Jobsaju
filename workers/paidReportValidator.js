import { deriveReportDecision } from './reportDecision.js';

const RELATIVE_DATE_PATTERN = /이번\s*달|다음\s*달|다다음\s*달|곧|조만간|향후\s*몇\s*달/i;

function formatYearMonth(yearMonth) {
  const [year, month] = String(yearMonth || '').split('-');
  return year && month ? `${year}년 ${Number(month)}월` : String(yearMonth || '해당 월');
}

function normalizeAction(action) {
  return String(action || '').replace(/\s+/g, ' ').trim();
}

function fallbackAction(month) {
  const label = formatYearMonth(month.year_month);
  const scores = month.scores || {};
  if (scores.job_change >= scores.negotiation && scores.job_change >= scores.stay) {
    return `${label}에는 목표 역할과 최소 보상·권한 조건을 한 장에 적고, 맞는 공고 5개를 골라 비교하세요.`;
  }
  if (scores.negotiation >= scores.stay) {
    return `${label}에는 최근 성과를 해결한 문제·수치 결과·다음 역할 순서로 정리해 역할·보상 협상 자료를 만드세요.`;
  }
  return `${label}에는 현재 역할의 성과·관계·업무 범위를 점검하고 다음 선택에 필요한 기준을 문서로 남기세요.`;
}

function repairAction(generatedAction, month, usedActions) {
  const action = normalizeAction(generatedAction);
  const label = formatYearMonth(month.year_month);
  const normalizedKey = action.toLocaleLowerCase('ko-KR');
  const isValid = action.length >= 20
    && action.length <= 120
    && action.includes(label)
    && !RELATIVE_DATE_PATTERN.test(action)
    && !usedActions.has(normalizedKey);
  const repaired = isValid ? action : fallbackAction(month);
  usedActions.add(normalizeAction(repaired).toLocaleLowerCase('ko-KR'));
  return repaired;
}

export function validateAndRepairPaidReport(rawJsonText, timeline, precomputed_highlights, snapshot = null, decisionContext = {}) {
  let report;
  try {
    report = JSON.parse(rawJsonText);
  } catch {
    throw new Error("Failed to parse LLM JSON output.");
  }

  // 1. Force restore timeline. 월별 점수가 유일한 원천 데이터다.
  if (!Array.isArray(report.timeline)) {
    report.timeline = [];
  }
  
  const repairedTimeline = [];
  const usedActions = new Set();
  for (let i = 0; i < timeline.length; i++) {
    const t = timeline[i];
    const generatedMonth = report.timeline.find(m => m && m.year_month === t.year_month) || report.timeline[i] || {};
    
    repairedTimeline.push({
      year_month: t.year_month,
      scores: {
        job_change: t.scores.job_change,
        negotiation: t.scores.negotiation,
        stay: t.scores.stay
      },
      keyword: generatedMonth.keyword || "흐름 전환",
      summary: generatedMonth.summary || "조용히 내실을 다지며 때를 기다리는 것이 좋은 시기입니다.",
      action: repairAction(generatedMonth.action, t, usedActions)
    });
  }
  report.timeline = repairedTimeline;

  // 2. 타임라인에서 핵심 시기·요약 결론·복합 행동 전략을 다시 계산한다.
  // LLM 출력이나 사주 원국의 별도 점수는 이 판단에 개입하지 않는다.
  const decisionSourceTimeline = timeline.map((month, index) => ({ ...month, index }));
  const decision = deriveReportDecision(decisionSourceTimeline, decisionContext);
  report.report_summary = decision.report_summary;
  report.timing_highlights = decision.timing_highlights;
  report.decision = decision;
  if (snapshot) report.snapshot = snapshot;

  // 3. Guarantee other structures. 행동 가이드와 추천 방향도 위의 타임라인 전략으로 고정한다.
  if (!report.personalized_advice) {
    report.personalized_advice = {
      question_summary: "현재 커리어 상황에 대한 방향성 고민",
      diagnosis: "전반적으로 흐름이 변동하는 시기입니다.",
      character_connection: "현재 성향상 너무 급한 결정은 독이 될 수 있습니다.",
      recommendation: decision.recommendation,
      action_steps: decision.decision_guide.now_actions,
      watch_out: decision.watch_out
    };
  }
  report.personalized_advice.recommendation = decision.recommendation;
  report.personalized_advice.action_steps = decision.decision_guide.now_actions;
  report.personalized_advice.watch_out = decision.watch_out;

  return report;
}
