import { deriveReportDecision } from './reportDecision.js';

export function validateAndRepairPaidReport(rawJsonText, timeline, precomputed_highlights) {
  let report;
  try {
    report = JSON.parse(rawJsonText);
  } catch (e) {
    throw new Error("Failed to parse LLM JSON output.");
  }

  // 1. Force restore timeline. 월별 점수가 유일한 원천 데이터다.
  if (!Array.isArray(report.timeline)) {
    report.timeline = [];
  }
  
  const repairedTimeline = [];
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
      action: generatedMonth.action || "현재의 안정성에 집중하세요."
    });
  }
  report.timeline = repairedTimeline;

  // 2. 타임라인에서 핵심 시기·요약 결론·복합 행동 전략을 다시 계산한다.
  // LLM 출력이나 사주 원국의 별도 점수는 이 판단에 개입하지 않는다.
  const decisionSourceTimeline = timeline.map((month, index) => ({ ...month, index }));
  const decision = deriveReportDecision(decisionSourceTimeline);
  report.report_summary = decision.report_summary;
  report.timing_highlights = decision.timing_highlights;
  report.decision = decision;

  // 3. Guarantee other structures. 행동 가이드와 추천 방향도 위의 타임라인 전략으로 고정한다.
  if (!report.personalized_advice) {
    report.personalized_advice = {
      question_summary: "현재 커리어 상황에 대한 방향성 고민",
      diagnosis: "전반적으로 흐름이 변동하는 시기입니다.",
      character_connection: "현재 성향상 너무 급한 결정은 독이 될 수 있습니다.",
      recommendation: decision.recommendation,
      action_steps: decision.steps.map(step => step.detail),
      watch_out: decision.watch_out
    };
  }
  report.personalized_advice.recommendation = decision.recommendation;
  report.personalized_advice.action_steps = decision.steps.map(step => step.detail);
  report.personalized_advice.watch_out = decision.watch_out;

  return report;
}
